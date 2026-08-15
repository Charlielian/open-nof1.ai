import dayjs from "dayjs";
import {
  AccountInformationAndPerformance,
  formatAccountPerformance,
} from "../trading/account-information-and-performance";
import {
  formatMarketState,
  MarketState,
} from "../trading/current-market-state";

interface UserPromptOptions {
  currentMarketState: MarketState;
  marketStates?: Record<string, MarketState>;
  accountInformationAndPerformance: AccountInformationAndPerformance;
  startTime: Date;
  invocationCount?: number;
}

export function generateUserPrompt(options: UserPromptOptions) {
  const {
    currentMarketState,
    marketStates,
    accountInformationAndPerformance,
    startTime,
    invocationCount = 0,
  } = options;

  // 格式化所有币种的市场数据用于多币种分析
  const allMarketData = marketStates
    ? Object.entries(marketStates)
        .map(
          ([pair, state]) =>
            `## 供你分析的 ${pair} 数据\n${formatMarketState(state)}`
        )
        .join("\n----------------------------------------------------------\n")
    : formatMarketState(currentMarketState);

  return `
自你开始交易以来已经过去了 ${dayjs(new Date()).diff(startTime, "minute")} 分钟。当前时间是 ${new Date().toISOString()}，你已被调用 ${invocationCount} 次。以下为你提供各种状态数据、价格数据和预测信号，以便你发现阿尔法。以下是你的账户信息、价值、绩效、持仓等。

以下所有价格或信号数据均按顺序排列：旧 → 新

时间周期说明：除非章节标题中另有说明，日内序列以 3 分钟为间隔提供。如果某个币种使用不同的时间间隔，则会在该币种章节中明确说明。

# 当前市场状态
${allMarketData}
----------------------------------------------------------
## 你的账户信息与绩效
${formatAccountPerformance(accountInformationAndPerformance)}

重要输出要求：仅返回一个符合系统消息中提供的 schema 的有效 JSON 对象。不要使用 markdown、注释、额外文本或 ‘json’ 代码块。JSON 必须可被机器解析。`;
}
