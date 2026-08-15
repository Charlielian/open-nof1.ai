# 🤖 Open-nof1.ai

> [nof1.ai](https://nof1.ai) Alpha Arena 的开源实现 — 一个用真金白银在真实市场中评估 AI 模型加密货币交易能力的基准平台。

> [!NOTE]
> **本仓库搬迁自开源项目** [SnowingFox/open-nof1.ai](https://github.com/SnowingFox/open-nof1.ai)，并在此基础上进行了持续开发与功能增强。原项目基于 MIT License 开源，本项目同样遵循 MIT License。若原作者要求移除，请联系仓库维护者。

![界面截图](./screen-shot-2.png)

## 🌟 什么是 Alpha Arena？

Alpha Arena 是一个革命性的基准测试平台：**给每个 AI 模型 $10,000 初始资金，让它们在真实市场中进行加密货币永续合约交易**，以此评估其能力。与传统基于静态数据集的 AI 基准测试不同，Alpha Arena 在真实金融环境中考验 AI。

**为什么市场是终极智力测试：**
- 市场是动态、对抗性、开放式的
- 对 AI 的挑战远超静态基准测试
- 在不确定性中实时决策，检验真实能力
- 风险管理和战略思维不可或缺

## 🎯 功能特性

本开源实现目前专注于运行 **DeepSeek** 交易模型，具备以下能力：

- 🔄 **实时交易**：通过 CCXT 在 Binance 上自动执行加密货币交易
- 📊 **实时仪表盘**：美观的账户绩效实时图表
- 🧠 **AI 决策**：每笔交易的完整思维链推理过程
- 💹 **多资产支持**：交易 BTC、ETH、SOL、BNB、DOGE
- 📈 **绩效追踪**：详细的指标、交易历史及盈亏追踪
- 🔍 **全透明**：每次决策、提示词和推理过程均记录在案
- ⚡ **定时任务**：每 20 秒采集指标，每 3 分钟执行交易决策

## 🏗️ 技术栈

- **框架**：[Next.js 15](https://nextjs.org/) + App Router + Turbopack
- **AI SDK**：[Vercel AI SDK](https://sdk.vercel.ai/) + DeepSeek 集成
- **数据库**：PostgreSQL + [Prisma ORM](https://www.prisma.io/)
- **交易**：[CCXT](https://github.com/ccxt/ccxt) 交易所连接库
- **图表**：[Recharts](https://recharts.org/) + [shadcn/ui](https://ui.shadcn.com/)
- **样式**：[Tailwind CSS v4](https://tailwindcss.com/)
- **运行时**：[Bun](https://bun.sh/) 快速包管理

## 🚀 快速开始

### 前置条件

- 安装 [Bun](https://bun.sh/)
- PostgreSQL 数据库
- Binance API 凭证（实盘交易用）
- DeepSeek API 密钥

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/Charlielian/open-nof1.ai.git
   cd open-nof1.ai
   ```

2. **安装依赖**
   ```bash
   bun install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   ```

   编辑 `.env` 文件：
   ```env
   # 应用配置
   NEXT_PUBLIC_URL="http://localhost:3000"

   # 数据库
   DATABASE_URL="postgresql://postgres:password@localhost:5432/nof1"

   # AI 模型
   DEEPSEEK_API_KEY="你的deepseek_api_key"
   OPENROUTER_API_KEY="你的openrouter_api_key"  # 可选：其他模型用
   
   # 市场数据（可选）
   EXA_API_KEY="你的exa_api_key"  # 增强市场分析用

   # 交易（Binance）
   BINANCE_API_KEY="你的binance_api_key"
   BINANCE_API_SECRET="你的binance_secret"
   BINANCE_USE_SANDBOX="true"  # 实盘交易设为 "false"
   
   # 交易配置
   START_MONEY=10000  # 初始资金（USDT），例如 10000 = 10,000 USDT

   # 定时任务鉴权
   CRON_SECRET_KEY="你的密钥"
   ```

4. **初始化数据库**
   ```bash
   bunx prisma generate
   bunx prisma db push
   ```

5. **启动开发服务器**
   ```bash
   bun dev
   ```

6. **配置定时任务**（自动交易用）

   设置外部 cron 任务或使用 [Vercel Cron](https://vercel.com/docs/cron-jobs) 调用以下接口：

   - `POST /api/cron/20-seconds-metrics-interval` — 每 20 秒采集指标
   - `POST /api/cron/3-minutes-run-interval` — 每 3 分钟执行交易

   crontab 示例：
   ```bash
   # 指标采集（每 20 秒）
   * * * * * curl -X POST http://localhost:3000/api/cron/20-seconds-metrics-interval -H "Authorization: Bearer 你的CRON密钥"
   * * * * * sleep 20 && curl -X POST http://localhost:3000/api/cron/20-seconds-metrics-interval -H "Authorization: Bearer 你的CRON密钥"
   * * * * * sleep 40 && curl -X POST http://localhost:3000/api/cron/20-seconds-metrics-interval -H "Authorization: Bearer 你的CRON密钥"

   # 交易执行（每 3 分钟）
   */3 * * * * curl -X POST http://localhost:3000/api/cron/3-minutes-run-interval -H "Authorization: Bearer 你的CRON密钥"
   ```

打开 [http://localhost:3000](http://localhost:3000) 查看仪表盘。

## 📁 项目结构

```
open-nof1.ai/
├── app/
│   ├── api/
│   │   ├── cron/              # 定时任务接口
│   │   ├── metrics/           # 指标数据 API
│   │   ├── positions/         # 持仓数据 API
│   │   ├── pricing/           # 行情价格 API
│   │   └── model/chat/        # 聊天记录 API
│   ├── page.tsx               # 主仪表盘
│   └── globals.css
├── components/
│   ├── ui/                    # shadcn/ui 组件
│   ├── metrics-chart.tsx      # 账户价值图表
│   ├── models-view.tsx        # 交易与聊天记录
│   └── crypto-card.tsx        # 价格展示卡片
├── lib/
│   ├── ai/
│   │   ├── model.ts           # 模型配置
│   │   ├── prompt.ts          # 交易提示词
│   │   └── run.ts             # AI 交易主流程
│   ├── trading/
│   │   ├── buy.ts             # 买入执行
│   │   ├── sell.ts            # 卖出执行
│   │   ├── binance.ts         # Binance 交易所连接
│   │   ├── gateio.ts          # Gate.io 行情客户端
│   │   ├── current-market-state.ts
│   │   └── account-information-and-performance.ts
│   └── types/                 # TypeScript 类型定义
└── prisma/
    └── schema.prisma          # 数据库模式
```

## 🎮 工作原理

1. **数据采集**：每 20 秒采集账户指标（余额、持仓、盈亏）
2. **AI 决策**：每 3 分钟 AI 分析市场数据并做出交易决策
3. **执行交易**：决策通过 Binance API 执行
4. **透明记录**：所有推理、提示词、决策均存入数据库
5. **可视化**：仪表盘实时展示绩效和交易历史

### ⚙️ 配置说明

**初始资金**（`START_MONEY`）
- 设置 USDT 初始交易资金
- 例如：`START_MONEY=10000` 表示初始 $10,000 USDT
- 建议测试从小额开始（如 `START_MONEY=30`）
- AI 将基于可用资金做出交易决策
- 盈亏均相对于初始资金计算

**DRY RUN 模式**（`DRY_RUN="true"`）
- 启用后，AI 的 Buy/Sell 决策**不会实际调用 Binance API**
- 交易记录写入数据库，持仓从数据库回放计算
- 推荐初次使用此模式验证全链路

## 🤝 支持的 AI 模型

当前支持：
- **DeepSeek V3 Chat** — 主力交易模型
- **DeepSeek R1** — 高级推理模型（可选）

想添加更多模型？查看 [AI SDK providers](https://sdk.vercel.ai/providers/ai-sdk-providers) 并在 `lib/ai/model.ts` 中添加。

## 📊 仪表盘功能

- **实时行情**：BTC、ETH、SOL、BNB、DOGE 实时价格
- **账户绩效图表**：展示账户总价值随时间变化的交互式图表
- **已完成交易**：所有买入/卖出操作的详细记录
- **模型聊天**：AI 思维链和决策过程的完整透明展示
- **持仓列表**：当前持仓及实时盈亏

## ⚠️ 免责声明

**本软件仅供教育/研究用途。加密货币交易存在重大损失风险。**

- 请从小额或模拟交易开始
- AI 模型可能做出错误决策
- 过往表现不代表未来结果
- 任何财务损失由使用者自行承担
- 使用真金白银前请充分测试

## 🤔 为什么开源？

原 [nof1.ai](https://nof1.ai) Alpha Arena 是一个封闭竞赛。本开源版本旨在：

1. **民主化 AI 交易研究** — 任何人都可以实验 AI 交易代理
2. **教育目的** — 学习 AI 如何做出金融决策
3. **透明性** — 提示词、推理和执行全程可见
4. **社区创新** — 共同改进和迭代交易策略

## 📝 许可证

MIT License — 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- 灵感来自 [nof1.ai](https://nof1.ai) 的 Alpha Arena
- **Fork 自** [SnowingFox/open-nof1.ai](https://github.com/SnowingFox/open-nof1.ai) — 感谢原作者提供的坚实基础
- 基于 [shadcn/ui](https://ui.shadcn.com/) 构建
- 由 [DeepSeek](https://www.deepseek.com/) AI 模型驱动
- 通过 [CCXT](https://github.com/ccxt/ccxt) 连接交易所

## 🔗 链接

- [nof1.ai 官网](https://nof1.ai)
- [Alpha Arena](https://nof1.ai)
- [DeepSeek](https://www.deepseek.com/)

---

**⚡ Built with Bun + Next.js 15 + DeepSeek + CCXT**

*市场是检验智能的终极测试。让我们看看 LLM 是否足够优秀。*