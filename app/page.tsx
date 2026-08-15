"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { MetricsChart } from "@/components/metrics-chart";
import { CryptoCard } from "@/components/crypto-card";
import { ModelsView } from "@/components/models-view";
import { Card } from "@/components/ui/card";
import { MarketState } from "@/lib/trading/current-market-state";
import { MetricData } from "@/lib/types/metrics";

interface CryptoPricing {
  btc: MarketState;
  eth: MarketState;
  sol: MarketState;
  doge: MarketState;
  bnb: MarketState;
}

interface MetricsResponse {
  data: {
    metrics: MetricData[];
    totalCount: number;
    model: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  success: boolean;
}

interface PricingResponse {
  data: {
    pricing: CryptoPricing;
  };
  success: boolean;
}

const SYMBOLS: Array<{
  key: keyof CryptoPricing;
  symbol: string;
  name: string;
  format: (v: number) => string;
}> = [
  { key: "btc", symbol: "BTC", name: "Bitcoin", format: (v) => `$${v.toLocaleString()}` },
  { key: "eth", symbol: "ETH", name: "Ethereum", format: (v) => `$${v.toLocaleString()}` },
  { key: "sol", symbol: "SOL", name: "Solana", format: (v) => `$${v.toLocaleString()}` },
  { key: "bnb", symbol: "BNB", name: "BNB", format: (v) => `$${v.toLocaleString()}` },
  { key: "doge", symbol: "DOGE", name: "Dogecoin", format: (v) => `$${v.toFixed(4)}` },
];

export default function Home() {
  const [metricsData, setMetricsData] = useState<MetricData[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [modelName, setModelName] = useState<string>("Deepseek Trading Bot");
  const [pricing, setPricing] = useState<CryptoPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [lastFetchTime, setLastFetchTime] = useState<number>(Date.now());

  // 获取图表数据
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch("/api/metrics");
      if (!response.ok) return;

      const data: MetricsResponse = await response.json();
      if (data.success && data.data) {
        setMetricsData(data.data.metrics || []);
        setTotalCount(data.data.totalCount || 0);
        if (data.data.name) setModelName(data.data.name);
        const now = Date.now();
        setLastUpdate(new Date(now).toLocaleTimeString("zh-CN", {
          timeZone: "Asia/Shanghai",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }));
        setLastFetchTime(now);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setLoading(false);
    }
  }, []);

  // 获取价格数据
  const fetchPricing = useCallback(async () => {
    try {
      const response = await fetch("/api/pricing");
      if (!response.ok) return;

      const data: PricingResponse = await response.json();
      if (data.success && data.data.pricing) {
        setPricing(data.data.pricing);
      }
    } catch (err) {
      console.error("Error fetching pricing:", err);
    }
  }, []);

  // 数据是否新鲜（最近 60 秒内有更新则视为交易系统运行中）
  const isLive = useMemo(() => {
    return Date.now() - lastFetchTime < 60_000;
  }, [lastFetchTime]);

  // 最新一条指标作为账户摘要
  const latestMetric = useMemo(
    () => metricsData[metricsData.length - 1],
    [metricsData]
  );

  useEffect(() => {
    // 初始加载
    fetchMetrics();
    fetchPricing();

    const metricsInterval = setInterval(fetchMetrics, 10000);

    const pricingInterval = setInterval(fetchPricing, 10000);

    // 每 10 秒刷新一次"是否在线"状态
    const liveInterval = setInterval(() => {
      setLastFetchTime((t) => t);
    }, 10000);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(pricingInterval);
      clearInterval(liveInterval);
    };
  }, [fetchMetrics, fetchPricing]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Open Nof1.ai
              <span className="text-muted-foreground text-sm ml-2">
                灵感来自 Alpha Arena
              </span>
            </h1>
            <p className="text-muted-foreground mt-2">
              实时交易指标与绩效监控
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* 运行状态指示器 */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                isLive
                  ? "border-green-500/30 bg-green-500/10 text-green-500"
                  : "border-red-500/30 bg-red-500/10 text-red-500"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isLive ? "bg-green-400" : "bg-red-400"
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isLive ? "bg-green-500" : "bg-red-500"
                  }`}
                ></span>
              </span>
              <span className="text-xs font-medium">
                {isLive ? "系统运行中" : "数据采集暂停"}
              </span>
            </div>

            {lastUpdate && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">最后更新</div>
                <div className="text-lg font-mono">{lastUpdate}</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-8 border-b">
          <button className="text-sm font-medium border-b-2 border-primary pb-3 -mb-px">
            实盘
          </button>
          <button
            className="text-sm font-medium text-muted-foreground pb-3 hover:text-foreground"
            onClick={() =>
              document
                .querySelector("#model-activity")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            模型活动
          </button>
          <button
            className="text-sm font-medium text-muted-foreground pb-3 hover:text-foreground"
            onClick={() =>
              document
                .querySelector("#account-overview")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            账户概览
          </button>
        </div>

        {/* Crypto Ticker */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {pricing ? (
            SYMBOLS.map(({ key, symbol, name, format }) => (
              <CryptoCard
                key={symbol}
                symbol={symbol}
                name={name}
                price={format(pricing[key].current_price || 0)}
                change={
                  pricing[key].intraday.mid_prices.length > 1
                    ? (() => {
                        const first =
                          pricing[key].intraday.mid_prices[0] || 0;
                        const last =
                          pricing[key].intraday.mid_prices.length > 1
                            ? pricing[key].intraday.mid_prices[
                                pricing[key].intraday.mid_prices.length - 1
                              ]
                            : first;
                        if (!first) return undefined;
                        const pct = ((last - first) / first) * 100;
                        return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
                      })()
                    : undefined
                }
              />
            ))
          ) : (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </Card>
            ))
          )}
        </div>

        {/* 账户概览统计 */}
        <div
          id="account-overview"
          className="grid grid-cols-2 md:grid-cols-4 gap-3 scroll-mt-6"
        >
          <StatCard
            label="账户总值"
            value={
              latestMetric
                ? `$${latestMetric.totalCashValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "--"
            }
          />
          <StatCard
            label="收益率"
            value={
              latestMetric && latestMetric.currentTotalReturn != null
                ? `${(latestMetric.currentTotalReturn * 100).toFixed(2)}%`
                : "--"
            }
            valueClassName={
              latestMetric && (latestMetric.currentTotalReturn || 0) >= 0
                ? "text-green-500"
                : "text-red-500"
            }
          />
          <StatCard
            label="可用余额"
            value={
              latestMetric
                ? `$${latestMetric.availableCash.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "--"
            }
          />
          <StatCard
            label="持仓数"
            value={latestMetric ? `${latestMetric.positions.length}` : "--"}
          />
        </div>

        {/* Main Content - Chart and Models Side by Side */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left: Chart */}
          <div className="flex-[2]">
            <MetricsChart
              metricsData={metricsData}
              loading={loading}
              lastUpdate={lastUpdate}
              totalCount={totalCount}
            />
          </div>

          {/* Right: Models View */}
          <div id="model-activity" className="flex-1 scroll-mt-6">
            <ModelsView />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground pt-8 border-t">
          <p className="font-medium">
            当前模型:{" "}
            <span className="text-primary">🏆 {modelName}</span>
          </p>
          <p>
            Open Nof1.ai · 实时 AI 交易监控 · 每 3 分钟执行一次交易决策
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-lg font-mono font-bold ${valueClassName || ""}`}>
        {value}
      </div>
    </Card>
  );
}