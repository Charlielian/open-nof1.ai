import { Position } from "ccxt";
import { prisma } from "@/lib/prisma";

export interface AccountInformationAndPerformance {
  currentPositionsValue: number;
  contractValue: number;
  totalCashValue: number;
  availableCash: number;
  currentTotalReturn: number;
  positions: Position[];
  sharpeRatio: number;
}

const isDryRun = () => process.env.DRY_RUN === "true";

/**
 * Calculate positions from database Trading records (dry-run mode).
 * Replays all Buy/Sell transactions in order to compute net positions and PnL.
 */
async function calculateDryRunPositions(
  initialCapital: number
): Promise<{
  positions: Position[];
  totalCashValue: number;
  availableCash: number;
  currentTotalReturn: number;
}> {
  // Fetch all trading records ordered by time
  const tradings = await prisma.trading.findMany({
    where: { opeartion: { in: ["Buy", "Sell"] } },
    orderBy: { createdAt: "asc" },
  });

  // Per-symbol position state
  // Key: symbol enum value (e.g. "BTC")
  // Value: { contracts, costBasis, lastPrice }
  const stateMap = new Map<
    string,
    { contracts: number; costBasis: number; lastPrice: number }
  >();

  let totalSpent = 0; // total USDT spent on buys
  let totalReturned = 0; // total USDT returned from sells

  for (const t of tradings) {
    if (!stateMap.has(t.symbol)) {
      stateMap.set(t.symbol, { contracts: 0, costBasis: 0, lastPrice: 0 });
    }
    const state = stateMap.get(t.symbol)!;

    if (t.opeartion === "Buy" && t.amount && t.pricing) {
      // amount = USDT spent, pricing = price per unit
      const contracts = t.amount / t.pricing;
      const spent = t.amount;
      // Weighted average cost basis
      state.costBasis = (state.costBasis * state.contracts + spent) / (state.contracts + contracts);
      state.contracts += contracts;
      state.lastPrice = t.pricing;
      totalSpent += spent;
    } else if (t.opeartion === "Sell" && t.amount) {
      // amount = percentage (0-100) of position to close
      const pct = t.amount / 100;
      const soldContracts = state.contracts * pct;
      const soldValue = soldContracts * (t.pricing || state.lastPrice);
      state.contracts -= soldContracts;
      state.contracts = Math.max(0, state.contracts);
      // Realized PnL from this sell
      const costBasisForSold = state.costBasis * soldContracts;
      totalReturned += soldValue;
      // Track realized PnL: soldValue - costBasisForSold
      // We'll include this in totalCashValue
      if (state.lastPrice) {
        // Keep lastPrice updated for remaining position
      }
      state.lastPrice = t.pricing || state.lastPrice;
    }
  }

  // Build positions and calculate account totals
  const positions: Position[] = [];
  let unrealizedPnl = 0;
  let currentPositionsValue = 0;

  for (const [symbol, state] of stateMap.entries()) {
    if (state.contracts <= 0.0001) continue;

    const entryPrice = state.costBasis;
    const upnl = state.contracts * (state.lastPrice - entryPrice);
    const notional = state.contracts * state.lastPrice;
    const initialMargin = notional; // 1x leverage for dry-run

    unrealizedPnl += upnl;
    currentPositionsValue += initialMargin + upnl;

    positions.push({
      symbol: `${symbol}/USDT`,
      contracts: Math.round(state.contracts * 10000) / 10000,
      entryPrice: Math.round(entryPrice * 100) / 100,
      markPrice: state.lastPrice,
      liquidationPrice: null,
      unrealizedPnl: Math.round(upnl * 100) / 100,
      leverage: 1,
      notional: Math.round(notional * 100) / 100,
      side: "long",
      initialMargin: Math.round(initialMargin * 100) / 100,
      stopLossPrice: null,
      takeProfitPrice: null,
      percentage: null,
      collateral: null,
      collateralNotional: null,
      maintenanceMargin: null,
      maintenanceMarginPercentage: null,
      liquidationPercentage: null,
      marginMode: null,
      marginRatio: null,
      lastUpdateTimestamp: undefined,
      hedged: undefined,
      timestamp: undefined,
      datetime: undefined,
      info: {},
    } as unknown as Position);
  }

  // Total cash = initial capital - spent + returned + unrealizedPnl
  // For futures: totalCashValue = initialCapital + realizedPnl + unrealizedPnl
  // realizedPnl = totalReturned - (totalSpent - (remaining cost basis))
  const remainingCostBasis = positions.reduce(
    (sum, p) => sum + (p.entryPrice || 0) * (p.contracts || 0),
    0
  );
  const costBasisClosed = totalSpent - remainingCostBasis;
  const realizedPnl = totalReturned - costBasisClosed;
  const totalCashValue = initialCapital + realizedPnl + unrealizedPnl;
  const availableCash = totalCashValue - currentPositionsValue;
  const currentTotalReturn =
    totalCashValue > 0 ? (totalCashValue - initialCapital) / initialCapital : 0;

  return {
    positions,
    totalCashValue: Math.round(totalCashValue * 100) / 100,
    availableCash: Math.round(availableCash * 100) / 100,
    currentTotalReturn: Math.round(currentTotalReturn * 10000) / 10000,
  };
}

export async function getAccountInformationAndPerformance(
  initialCapital: number
): Promise<AccountInformationAndPerformance> {
  let positions: Position[] = [];
  let totalCashValue = initialCapital;
  let availableCash = initialCapital;

  // DRY_RUN mode: calculate positions from database Trading records
  if (isDryRun()) {
    const dryRunResult = await calculateDryRunPositions(initialCapital);
    positions = dryRunResult.positions;
    totalCashValue = dryRunResult.totalCashValue;
    availableCash = dryRunResult.availableCash;

    return {
      currentPositionsValue: positions.reduce(
        (acc, p) => acc + (p.initialMargin || 0) + (p.unrealizedPnl || 0),
        0
      ),
      contractValue: positions.reduce((acc, p) => acc + (p.contracts || 0), 0),
      totalCashValue,
      availableCash,
      currentTotalReturn: dryRunResult.currentTotalReturn,
      positions,
      sharpeRatio: 0,
    };
  }

  // Live mode: fetch from Binance
  try {
    const { binance } = await import("./binance");
    positions = await binance.fetchPositions(["BTC/USDT"]);
    const balance = await binance.fetchBalance({ type: "future" });
    const usdtInfo = balance.USDT as
      | { total?: number; free?: number }
      | undefined;
    totalCashValue = usdtInfo?.total || initialCapital;
    availableCash = usdtInfo?.free || initialCapital;
  } catch (e) {
    console.warn("Could not fetch account info from exchange:", e);
  }

  const currentPositionsValue = positions.reduce((acc, position) => {
    return acc + (position.initialMargin || 0) + (position.unrealizedPnl || 0);
  }, 0);
  const contractValue = positions.reduce((acc, position) => {
    return acc + (position.contracts || 0);
  }, 0);
  const currentTotalReturn =
    totalCashValue > 0
      ? (totalCashValue - initialCapital) / initialCapital
      : 0;
  const sharpeRatio =
    positions.length > 0 &&
    positions.reduce((s, p) => s + (p.unrealizedPnl || 0), 0) !== 0
      ? currentTotalReturn /
        (positions.reduce((acc, position) => {
          return acc + (position.unrealizedPnl || 0);
        }, 0) /
          initialCapital)
      : 0;

  return {
    currentPositionsValue,
    contractValue,
    totalCashValue,
    availableCash,
    currentTotalReturn,
    positions,
    sharpeRatio,
  };
}

export function formatAccountPerformance(
  accountPerformance: AccountInformationAndPerformance
) {
  const { currentTotalReturn, availableCash, totalCashValue, positions } =
    accountPerformance;

  const output = `## 您的账户信息与绩效
当前总收益率: ${currentTotalReturn * 100}%
可用余额: ${availableCash}
当前账户总值: ${totalCashValue}
持仓: ${positions
    .map((position) =>
      JSON.stringify({
        symbol: position.symbol,
        quantity: position.contracts,
        entry_price: position.entryPrice,
        current_price: position.markPrice,
        liquidation_price: position.liquidationPrice,
        unrealized_pnl: position.unrealizedPnl,
        leverage: position.leverage,
        notional_usd: position.notional,
        side: position.side,
        stopLoss: position.stopLossPrice,
        takeProfit: position.takeProfitPrice,
      })
    )
    .join("\n")}`;
  return output;
}