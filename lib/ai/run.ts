import { generateText } from "ai";
import { generateUserPrompt } from "./prompt";
import { getCurrentMarketState } from "../trading/current-market-state";
import { z } from "zod";
import { deepseekR1 } from "./model";
import { getAccountInformationAndPerformance } from "../trading/account-information-and-performance";
import { buy } from "../trading/buy";
import { sell } from "../trading/sell";
import { prisma } from "../prisma";
import { Opeartion, Symbol } from "@prisma/client";

const tradingSchema = z.object({
  opeartion: z.nativeEnum(Opeartion),
  symbol: z
    .nativeEnum(Symbol)
    .default(Symbol.BTC)
    .describe("The symbol to trade. Defaults to BTC but can be any of BTC, ETH, SOL, BNB, DOGE"),
  buy: z
    .object({
      pricing: z.number().describe("The pricing of you want to buy in."),
      amount: z.number().describe("Amount in USDT to spend on the position"),
      leverage: z.number().min(1).max(20),
    })
    .optional()
    .nullable()
    .describe("If opeartion is buy, generate object"),
  sell: z
    .object({
      percentage: z
        .number()
        .min(0)
        .max(100)
        .describe("Percentage of position to sell"),
    })
    .optional()
    .nullable()
    .describe("If opeartion is sell, generate object"),
  adjustProfit: z
    .object({
      stopLoss: z
        .number()
        .optional()
        .describe("The stop loss of you want to set."),
      takeProfit: z
        .number()
        .optional()
        .describe("The take profit of you want to set."),
    })
    .optional()
    .nullable()
    .describe(
      "If opeartion is hold and you want to adjust the profit, generate object"
    ),
  chat: z
    .string()
    .describe("The reason why you do this opeartion."),
});

const symbolToPair: Record<Symbol, string> = {
  [Symbol.BTC]: "BTC/USDT",
  [Symbol.ETH]: "ETH/USDT",
  [Symbol.SOL]: "SOL/USDT",
  [Symbol.BNB]: "BNB/USDT",
  [Symbol.DOGE]: "DOGE/USDT",
};

/**
 * The DeepSeek reasoning model does not reliably output structured JSON
 * via the AI SDK's generateObject when used through an OpenAI-compatible
 * proxy. We use generateText instead and parse the JSON manually.
 */
export async function run(initialCapital: number) {
  // Build market state for every tradable symbol so the AI can pick the best setup
  const symbols = Object.values(Symbol);
  const marketStates = await Promise.all(
    symbols.map((s) => getCurrentMarketState(symbolToPair[s]))
  );
  const currentMarketState = marketStates[0];
  const accountInformationAndPerformance =
    await getAccountInformationAndPerformance(initialCapital);
  const invocationCount = await prisma.chat.count();

  const userPrompt = generateUserPrompt({
    currentMarketState,
    marketStates: Object.fromEntries(
      symbols.map((s, i) => [symbolToPair[s], marketStates[i]])
    ),
    accountInformationAndPerformance,
    startTime: new Date(),
    invocationCount,
  });

  const jsonPrompt = `你是一个仅输出JSON的交易助手。你的输出必须是一个符合以下格式的JSON对象：

{
  "opeartion": "Hold" | "Buy" | "Sell",
  "symbol": "BTC" | "ETH" | "SOL" | "BNB" | "DOGE",
  "buy": { "pricing": number, "amount": number, "leverage": number } | null,
  "sell": { "percentage": number } | null,
  "adjustProfit": { "stopLoss": number, "takeProfit": number } | null,
  "chat": "你的分析文本"
}

规则：
- "opeartion" 必须严格为 "Hold"、"Buy" 或 "Sell"（首字母大写）
- "symbol" 必须是 "BTC"、"ETH"、"SOL"、"BNB"、"DOGE" 之一
- 如果 opeartion 为 "Buy"，填写 "buy" 字段（amount 为 USDT 金额）
- 如果 opeartion 为 "Sell"，填写 "sell" 字段（percentage 为平仓百分比）
- 如果 opeartion 为 "Hold"，可以设置 "adjustProfit" 或设为 null
- "chat" 必须为非空字符串，用中文写出你的分析推理
- 只输出有效 JSON，不要 markdown 代码块、注释或额外文本

${userPrompt}`;

  const { text } = await generateText({
    model: deepseekR1,
    system: "你是一个仅输出JSON的交易助手。始终只返回有效的JSON。",
    prompt: jsonPrompt,
  });

  // Extract JSON from the response (strip any markdown fences or leading/trailing text)
  const jsonStr = extractJson(text);
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // If parsing fails, try to find JSON object in the response
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error(`Could not parse model response as JSON: ${text.slice(0, 500)}`);
    }
  }

  // Normalize field names — the model may output "recommendation" instead of "opeartion"
  if (parsed.recommendation && !parsed.opeartion) {
    parsed.opeartion = normalizeOperation(parsed.recommendation as string);
  }
  if (parsed.reasoning && !parsed.chat) {
    parsed.chat = parsed.reasoning;
  }

  // Validate with Zod
  const object = tradingSchema.parse(parsed);

  const symbol = object.symbol ?? Symbol.BTC;
  const pair = symbolToPair[symbol];

  if (object.opeartion === Opeartion.Buy) {
    // 实际执行买入订单
    const result = object.buy
      ? await buy({
          symbol: pair,
          amount: object.buy.amount,
          pricing: object.buy.pricing,
          leverage: object.buy.leverage,
          stopLoss: object.adjustProfit?.stopLoss,
          takeProfit: object.adjustProfit?.takeProfit,
        })
      : { success: false, message: "没有提供买入详情" };

    if (result.success) {
      console.log(`✅ 买入执行成功: ${result.message}`);
    } else {
      console.warn(`⚠️ 买入执行失败: ${result.message}`);
    }

    await prisma.chat.create({
      data: {
        reasoning: object.chat,
        chat: object.chat + (result.success ? "" : `\n\n⚠️ 执行失败: ${result.message}`),
        userPrompt,
        tradings: {
          createMany: {
            data: {
              symbol,
              opeartion: object.opeartion,
              pricing: object.buy?.pricing,
              amount: object.buy?.amount,
              leverage: object.buy?.leverage,
            },
          },
        },
      },
    });
  }

  if (object.opeartion === Opeartion.Sell) {
    // 实际执行卖出订单
    const result = object.sell
      ? await sell({
          symbol: pair,
          percentage: object.sell.percentage,
          pricing: currentMarketState.current_price,
        })
      : { success: false, message: "没有提供卖出详情" };

    if (result.success) {
      console.log(`✅ 卖出执行成功: ${result.message}`);
    } else {
      console.warn(`⚠️ 卖出执行失败: ${result.message}`);
    }

    await prisma.chat.create({
      data: {
        reasoning: object.chat,
        chat: object.chat + (result.success ? "" : `\n\n⚠️ 执行失败: ${result.message}`),
        userPrompt,
        tradings: {
          createMany: {
            data: {
              symbol,
              opeartion: object.opeartion,
              pricing: currentMarketState.current_price,
              amount: object.sell?.percentage, // 保存平仓比例用于 dry-run 持仓计算
            },
          },
        },
      },
    });
  }

  if (object.opeartion === Opeartion.Hold) {
    const shouldAdjustProfit =
      object.adjustProfit?.stopLoss && object.adjustProfit?.takeProfit;
    await prisma.chat.create({
      data: {
        reasoning: object.chat,
        chat: object.chat,
        userPrompt,
        tradings: {
          createMany: {
            data: {
              symbol,
              opeartion: object.opeartion,
              stopLoss: shouldAdjustProfit
                ? object.adjustProfit?.stopLoss
                : undefined,
              takeProfit: shouldAdjustProfit
                ? object.adjustProfit?.takeProfit
                : undefined,
            },
          },
        },
      },
    });
  }
}

function normalizeOperation(val: string): string {
  const upper = val.toUpperCase();
  if (upper === "BUY") return "Buy";
  if (upper === "SELL") return "Sell";
  if (upper === "HOLD") return "Hold";
  return val;
}

function extractJson(text: string): string {
  // Remove markdown code fences
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Find the first { and last }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned;
}