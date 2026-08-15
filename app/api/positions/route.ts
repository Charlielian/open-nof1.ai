import { NextResponse } from "next/server";
import { getAccountInformationAndPerformance } from "@/lib/trading/account-information-and-performance";

export const GET = async () => {
  try {
    const accountInfo = await getAccountInformationAndPerformance(
      Number(process.env.START_MONEY)
    );

    return NextResponse.json({
      data: {
        positions: accountInfo.positions.map((p) => ({
          symbol: p.symbol,
          contracts: p.contracts,
          entryPrice: p.entryPrice,
          markPrice: p.markPrice,
          liquidationPrice: p.liquidationPrice,
          unrealizedPnl: p.unrealizedPnl,
          leverage: p.leverage,
          notional: p.notional,
          side: p.side,
          stopLossPrice: p.stopLossPrice,
          takeProfitPrice: p.takeProfitPrice,
        })),
        totalPositionValue: accountInfo.currentPositionsValue,
        totalCashValue: accountInfo.totalCashValue,
        availableCash: accountInfo.availableCash,
        currentTotalReturn: accountInfo.currentTotalReturn,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json(
      { error: "Failed to fetch positions", success: false },
      { status: 500 }
    );
  }
};