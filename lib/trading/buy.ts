import { binance } from "./binance";

export interface BuyOrder {
  symbol: string;
  amount: number;
  pricing: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface BuyResult {
  success: boolean;
  orderId?: string;
  filledPrice?: number;
  filledAmount?: number;
  message: string;
  dryRun?: boolean;
}

const isDryRun = () => process.env.DRY_RUN === "true";

/**
 * Execute a buy (long) order on Binance futures.
 * When DRY_RUN=true, simulates the order without calling Binance API.
 * @param order - The buy order parameters
 * @returns The result of the buy operation
 */
export async function buy(order: BuyOrder): Promise<BuyResult> {
  const { symbol, amount, pricing, leverage, stopLoss, takeProfit } = order;

  if (isDryRun()) {
    console.log(`[DRY RUN] BUY ${symbol}: amount=${amount} USDT, price=~$${pricing}, leverage=${leverage}x`);
    if (stopLoss) console.log(`[DRY RUN]   Stop loss: $${stopLoss}`);
    if (takeProfit) console.log(`[DRY RUN]   Take profit: $${takeProfit}`);
    return {
      success: true,
      orderId: "dry-run-mock-order",
      filledPrice: pricing,
      filledAmount: amount,
      message: `[DRY RUN] Buy order simulated: ${amount} USDT of ${symbol} at ~$${pricing}`,
      dryRun: true,
    };
  }

  try {
    // Normalize symbol to Binance futures format (e.g., BTC/USDT:USDT)
    const normalizedSymbol = symbol.includes(":") ? symbol : `${symbol}:USDT`;

    // Set leverage
    await binance.setLeverage(leverage, normalizedSymbol);

    // Place market order to open long position
    const createdOrder = await binance.createMarketBuyOrderWithCost(
      normalizedSymbol,
      amount
    );

    // Set stop-loss and take-profit if provided
    if (stopLoss) {
      try {
        await binance.createOrder(
          normalizedSymbol,
          "STOP_MARKET",
          "sell",
          amount / pricing,
          undefined,
          {
            stopPrice: stopLoss,
            reduceOnly: true,
          }
        );
      } catch (slError) {
        console.warn("Failed to set stop-loss:", slError);
      }
    }

    if (takeProfit) {
      try {
        await binance.createOrder(
          normalizedSymbol,
          "TAKE_PROFIT_MARKET",
          "sell",
          amount / pricing,
          undefined,
          {
            stopPrice: takeProfit,
            reduceOnly: true,
          }
        );
      } catch (tpError) {
        console.warn("Failed to set take-profit:", tpError);
      }
    }

    return {
      success: true,
      orderId: createdOrder.id,
      filledPrice: createdOrder.price || pricing,
      filledAmount: createdOrder.filled || amount,
      message: `Buy order executed: ${createdOrder.filled || amount} USDT of ${symbol} at ~$${pricing}`,
    };
  } catch (error) {
    console.error("Error executing buy order:", error);
    return {
      success: false,
      message: `Buy order failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}