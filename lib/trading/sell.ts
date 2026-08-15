import { binance } from "./binance";

export interface SellOrder {
  symbol: string;
  percentage: number;
  pricing?: number;
}

export interface SellResult {
  success: boolean;
  orderId?: string;
  filledPrice?: number;
  filledAmount?: number;
  message: string;
  dryRun?: boolean;
}

const isDryRun = () => process.env.DRY_RUN === "true";

/**
 * Execute a sell (close position) order on Binance futures.
 * When DRY_RUN=true, simulates the order without calling Binance API.
 * @param order - The sell order parameters
 * @returns The result of the sell operation
 */
export async function sell(order: SellOrder): Promise<SellResult> {
  const { symbol, percentage, pricing } = order;

  if (isDryRun()) {
    console.log(`[DRY RUN] SELL ${symbol}: percentage=${percentage}%`);
    return {
      success: true,
      orderId: "dry-run-mock-order",
      filledPrice: pricing,
      filledAmount: percentage,
      message: `[DRY RUN] Sell order simulated: close ${percentage}% of ${symbol}`,
      dryRun: true,
    };
  }

  try {
    // Normalize symbol to Binance futures format
    const normalizedSymbol = symbol.includes(":") ? symbol : `${symbol}:USDT`;

    // Get current position for this symbol
    const positions = await binance.fetchPositions([normalizedSymbol]);
    const position = positions.find((p) => p.symbol === normalizedSymbol);

    if (!position || !position.contracts || position.contracts <= 0) {
      return {
        success: false,
        message: `No open position found for ${symbol}`,
      };
    }

    // Calculate the amount to sell based on percentage
    const contractsToSell = (position.contracts * percentage) / 100;

    // Place market order to close position
    // If we're long, we sell; if we're short, we buy
    const side = position.side === "long" ? "sell" : "buy";

    const createdOrder = await binance.createMarketOrder(
      normalizedSymbol,
      side,
      Math.abs(contractsToSell)
    );

    return {
      success: true,
      orderId: createdOrder.id,
      filledPrice: createdOrder.price || pricing,
      filledAmount: createdOrder.filled || Math.abs(contractsToSell),
      message: `Sell order executed: ${Math.abs(contractsToSell)} contracts of ${symbol} (${percentage}% of position)`,
    };
  } catch (error) {
    console.error("Error executing sell order:", error);
    return {
      success: false,
      message: `Sell order failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}