"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Trading {
  id: string;
  symbol: string;
  opeartion: "Buy" | "Sell" | "Hold";
  leverage?: number | null;
  amount?: number | null;
  pricing?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  createdAt: string;
}

interface Chat {
  id: string;
  model: string;
  chat: string;
  reasoning: string;
  userPrompt: string;
  tradings: Trading[];
  createdAt: string;
  updatedAt: string;
}

interface Position {
  symbol: string;
  contracts?: number | null;
  entryPrice?: number | null;
  markPrice?: number | null;
  liquidationPrice?: number | null;
  unrealizedPnl?: number | null;
  leverage?: number | null;
  notional?: number | null;
  side?: string | null;
  stopLossPrice?: number | null;
  takeProfitPrice?: number | null;
}

interface PositionsResponse {
  data: {
    positions: Position[];
    totalPositionValue: number;
    totalCashValue: number;
    availableCash: number;
    currentTotalReturn: number;
  };
  success: boolean;
}

type TabType = "completed-trades" | "model-chat" | "positions";

export function ModelsView() {
  const [activeTab, setActiveTab] = useState<TabType>("model-chat");
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  const [positionsData, setPositionsData] = useState<PositionsResponse["data"] | null>(null);
  const [positionsLoading, setPositionsLoading] = useState(false);

  const fetchChats = useCallback(async () => {
    try {
      const response = await fetch("/api/model/chat");
      if (!response.ok) return;

      const data = await response.json();
      setChats(data.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching chats:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 30000);
    return () => clearInterval(interval);
  }, [fetchChats]);

  const fetchPositions = useCallback(async () => {
    setPositionsLoading(true);
    try {
      const response = await fetch("/api/positions");
      if (!response.ok) return;
      const data: PositionsResponse = await response.json();
      if (data.success) {
        setPositionsData(data.data);
      }
    } catch (err) {
      console.error("Error fetching positions:", err);
    } finally {
      setPositionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "positions") {
      fetchPositions();
    }
  }, [activeTab, fetchPositions]);

  // 只获取 Buy 和 Sell 操作的交易
  const completedTrades = chats.flatMap((chat) =>
    chat.tradings
      .filter((t) => t.opeartion === "Buy" || t.opeartion === "Sell")
      .map((t) => ({ ...t, chatId: chat.id, model: chat.model }))
  );

  const renderOperationIcon = (operation: string) => {
    switch (operation) {
      case "Buy":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "Sell":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "Hold":
        return <Minus className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const renderCompletedTrades = () => {
    if (loading) {
      return <div className="text-center py-8 text-sm">加载交易记录中…</div>;
    }

    if (completedTrades.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          暂无已完成交易
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground mb-2">
          {completedTrades.length} 笔已完成交易
        </div>
        {completedTrades.map((trade, idx) => (
          <Card key={`${trade.id}-${idx}`} className="overflow-hidden">
            <CardContent className="p-4">
              {/* Header with operation */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b">
                <div className="flex items-center gap-2">
                  {renderOperationIcon(trade.opeartion)}
                  <span className="font-bold text-base">
                    {trade.opeartion.toUpperCase()}
                  </span>
                  <span className="font-mono font-bold text-base">
                    {trade.symbol}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(trade.createdAt).toLocaleString("zh-CN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZone: "Asia/Shanghai",
                  })}
                </div>
              </div>

              {/* Trade details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Price */}
                {trade.pricing && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">
                      {trade.opeartion === "Buy" ? "入场价" : "出场价"}
                    </div>
                    <div className="font-mono font-bold text-base">
                      $
                      {trade.pricing.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                )}

                {/* Amount */}
                {trade.amount && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">
                      数量
                    </div>
                    <div className="font-mono font-semibold">
                      {trade.amount}{" "}
                      {trade.symbol?.includes("/") ? "units" : trade.symbol}
                    </div>
                  </div>
                )}

                {/* Leverage */}
                {trade.leverage && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">
                      杠杆
                    </div>
                    <div className="font-mono font-semibold text-purple-600">
                      {trade.leverage}x
                    </div>
                  </div>
                )}

                {/* Total Value */}
                {trade.pricing && trade.amount && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">
                      总价值
                    </div>
                    <div className="font-mono font-bold text-base">
                      $
                      {(trade.pricing * trade.amount).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </div>
                  </div>
                )}

                {/* Stop Loss */}
                {trade.stopLoss && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">
                      止损
                    </div>
                    <div className="font-mono font-semibold text-red-500">
                      ${trade.stopLoss.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Take Profit */}
                {trade.takeProfit && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">
                      止盈
                    </div>
                    <div className="font-mono font-semibold text-green-500">
                      ${trade.takeProfit.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Model info at bottom */}
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-muted-foreground">
                  模型:{" "}
                  <span className="font-medium text-foreground">
                    {trade.model}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderModelChat = () => {
    if (loading) {
      return <div className="text-center py-8 text-sm">加载聊天记录中…</div>;
    }

    if (chats.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          暂无聊天记录
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {chats.map((chat) => {
          const isExpanded = expandedChatId === chat.id;
          const decisions = chat.tradings;

          return (
            <Card key={chat.id} className="overflow-hidden max-w-[600px]">
              {/* Collapsed Header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{chat.model}</h3>
                      <span className="text-xs text-muted-foreground">
                        • {decisions.length} 个决策
                      </span>
                    </div>
                    {/* Chat preview with markdown */}
                    <div
                      className={`prose prose-sm max-w-none dark:prose-invert text-xs ${
                        isExpanded ? "" : "line-clamp-2"
                      }`}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {chat.chat}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(chat.createdAt).toLocaleString("zh-CN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      timeZone: "Asia/Shanghai",
                    })}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* 用户提示 */}
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                        <span className="text-sm">📝</span>
                        用户提示
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                        <div className="prose prose-sm max-w-none dark:prose-invert text-xs">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {chat.userPrompt}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>

                    {/* 思维链 */}
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                        <span className="text-sm">🧠</span>
                        思维链
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                        <div className="prose prose-sm max-w-none dark:prose-invert text-xs">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {chat.reasoning}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>

                    {/* Decisions */}
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                        <span className="text-sm">⚡</span>
                        交易决策
                      </div>
                      <div className="space-y-2">
                        {decisions.map((decision, idx) => (
                          <div
                            key={idx}
                            className={`rounded-lg p-3 border-l-4 ${
                              decision.opeartion === "Buy"
                                ? "bg-green-50 dark:bg-green-950/20 border-green-500"
                                : decision.opeartion === "Sell"
                                ? "bg-red-50 dark:bg-red-950/20 border-red-500"
                                : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500"
                            }`}
                          >
                            {/* Decision header */}
                            <div className="flex items-center gap-2 mb-2">
                              {renderOperationIcon(decision.opeartion)}
                              <span className="font-bold text-sm">
                                {decision.opeartion.toUpperCase()}
                              </span>
                              <span className="font-mono font-bold text-sm">
                                {decision.symbol}
                              </span>
                            </div>

                            {/* Decision details */}
                            <div className="space-y-1.5 text-xs">
                              {decision.pricing && (
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">
                                    {decision.opeartion === "Buy"
                                      ? "入场价:"
                                      : decision.opeartion === "Sell"
                                      ? "出场价:"
                                      : "当前价:"}
                                  </span>
                                  <span className="font-mono font-semibold">
                                    ${decision.pricing.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {decision.amount && (
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">
                                    数量:
                                  </span>
                                  <span className="font-mono font-semibold">
                                    {decision.amount}
                                  </span>
                                </div>
                              )}
                              {decision.leverage && (
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">
                                    杠杆:
                                  </span>
                                  <span className="font-mono font-semibold text-purple-600">
                                    {decision.leverage}x
                                  </span>
                                </div>
                              )}
                              {decision.pricing && decision.amount && (
                                <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t border-current/20">
                                  <span className="text-muted-foreground font-semibold">
                                    合计:
                                  </span>
                                  <span className="font-mono font-bold">
                                    $
                                    {(
                                      decision.pricing * decision.amount
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {(decision.stopLoss || decision.takeProfit) && (
                                <div className="pt-1.5 mt-1.5 border-t border-current/20 space-y-1">
                                  {decision.stopLoss && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">
                                        止损:
                                      </span>
                                      <span className="font-mono font-semibold text-red-500">
                                        ${decision.stopLoss.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {decision.takeProfit && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">
                                        止盈:
                                      </span>
                                      <span className="font-mono font-semibold text-green-500">
                                        ${decision.takeProfit.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Expand/Collapse button */}
              <button
                onClick={() => setExpandedChatId(isExpanded ? null : chat.id)}
                className="w-full border-t px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
              >
                <span>{isExpanded ? "收起" : "展开"}</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderPositions = () => {
    if (positionsLoading) {
      return <div className="text-center py-8 text-sm">加载持仓中…</div>;
    }

    if (!positionsData) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          暂无持仓数据
        </div>
      );
    }

    const { positions, totalCashValue, availableCash, currentTotalReturn } =
      positionsData;

    if (positions.length === 0) {
      return (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">账户总值</span>
              <span className="font-mono font-bold">
                ${totalCashValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">可用余额</span>
              <span className="font-mono font-semibold">
                ${availableCash.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">收益率</span>
              <span
                className={`font-mono font-bold ${
                  currentTotalReturn >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {(currentTotalReturn * 100).toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="text-center py-8 text-muted-foreground text-sm">
            当前无持仓
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-lg border p-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">持仓总值</span>
            <span className="font-mono font-bold">
              ${totalCashValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">可用余额</span>
            <span className="font-mono font-semibold">
              ${availableCash.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">收益率</span>
            <span
              className={`font-mono font-bold ${
                currentTotalReturn >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {(currentTotalReturn * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {positions.map((position, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-yellow-500" />
                  <span className="font-bold">{position.symbol}</span>
                  <span className="text-xs text-muted-foreground">
                    {position.side === "long" ? "多单" : "空单"}
                  </span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    (position.unrealizedPnl || 0) >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {(position.unrealizedPnl || 0) >= 0 ? "+" : ""}
                  ${(position.unrealizedPnl || 0).toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">数量</div>
                  <div className="font-mono font-semibold">
                    {position.contracts ?? "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">杠杆</div>
                  <div className="font-mono font-semibold text-purple-600">
                    {position.leverage ? `${position.leverage}x` : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">入场价</div>
                  <div className="font-mono font-semibold">
                    {position.entryPrice
                      ? `$${position.entryPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">当前价</div>
                  <div className="font-mono font-semibold">
                    {position.markPrice
                      ? `$${position.markPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : "-"}
                  </div>
                </div>
                {position.stopLossPrice && (
                  <div>
                    <div className="text-xs text-muted-foreground">止损</div>
                    <div className="font-mono font-semibold text-red-500">
                      ${position.stopLossPrice.toLocaleString()}
                    </div>
                  </div>
                )}
                {position.takeProfitPrice && (
                  <div>
                    <div className="text-xs text-muted-foreground">止盈</div>
                    <div className="font-mono font-semibold text-green-500">
                      ${position.takeProfitPrice.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {position.liquidationPrice && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-muted-foreground text-xs">
                    强平价格
                  </span>
                  <span className="font-mono font-semibold text-red-500">
                    ${position.liquidationPrice.toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-lg">模型活动</CardTitle>
        <CardDescription className="text-xs">
          实时交易决策与AI推理过程
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col px-4 pb-4 min-h-0">
        {/* Tabs */}
        <div className="flex gap-2 border-b mb-4 flex-shrink-0">
          <button
            onClick={() => setActiveTab("model-chat")}
            className={`pb-2 px-3 text-xs font-medium transition-colors ${
              activeTab === "model-chat"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            聊天
          </button>
          <button
            onClick={() => setActiveTab("completed-trades")}
            className={`pb-2 px-3 text-xs font-medium transition-colors ${
              activeTab === "completed-trades"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            交易
          </button>
          <button
            onClick={() => setActiveTab("positions")}
            className={`pb-2 px-3 text-xs font-medium transition-colors ${
              activeTab === "positions"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            持仓
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4">
          {activeTab === "model-chat" && renderModelChat()}
          {activeTab === "completed-trades" && renderCompletedTrades()}
          {activeTab === "positions" && renderPositions()}
        </div>
      </CardContent>
    </Card>
  );
}
