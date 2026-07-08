# Agent 架构文档 — AI 足球数据分析智能体

> 本文档用于面试时讲解 Agent 设计思路与技术选型。

## 1. Agent 决策图（LangGraph）

```
User: "分析利物浦的进攻效率"
         │
         ▼
   ┌──────────┐
   │  agent   │  ← LLM 接收消息 + System Prompt
   │  node    │    决定: 需要调用哪些工具?
   └────┬─────┘
        │
   ┌────▼────┐
   │  tools  │  ← 并行执行工具:
   │  node   │    get_standings(39, 2024)
   └────┬────┘    get_team_squad(40)
        │         get_player_stats(306)
        │
   ┌────▼────┐  ← 回到 agent → 数据够了吗?
   │  agent  │    够 → 进入 synthesize
   │  node   │    不够 → 继续调工具
   └────┬────┘
        │
   ┌────▼────────┐
   │ synthesize  │  ← 最终综合节点
   │    node     │    System Prompt + 数据 → 结构化输出
   └────┬────────┘
        │
   ┌────▼────┐
   │   END   │  ← 五段式 AgentResponse
   └─────────┘     通过 SSE 流式返回前端
```

## 2. 为什么用 LangGraph 而不是 plain LangChain?

| LangChain AgentExecutor | LangGraph |
|--------------------------|-----------|
| 黑盒执行，看不到内部 | 显式 StateGraph，每个节点可控 |
| 无法中断/调试中间步骤 | 可设置断点，检查每步 state |
| 固定循环模式 | 自定义路由逻辑 |
| 流式支持有限 | `astream_events()` 粒度更细 |

LangGraph 的 **显式状态图** 让面试中能清楚解释 Agent 的内部运行机制。

## 3. Tool Design 工具设计

### 设计原则

1. **单一职责** — 每个工具只做一件事（查积分榜、查球员、查赛程）
2. **清晰文档** — docstring 告诉 LLM 何时用它、参数含义
3. **适度粒度** — 不是越细越好，太细会多轮调用，太粗返回冗余数据

### 6 个工具

| 工具 | 用途 | 典型触发 |
|------|------|---------|
| `get_standings` | 积分榜 | "排名" "谁第一" "保级形势" |
| `get_top_scorers` | 射手榜 | "金靴" "射手王" "谁进球最多" |
| `get_team_squad` | 阵容 | "阵容" "有哪些后卫" |
| `get_player_stats` | 球员统计 | "数据" "表现如何" |
| `get_team_fixtures` | 赛程 | "最近比赛" "赛程" "状态" |
| `compare_players` | 对比 | "对比A和B" "谁更强" |

## 4. Prompt Engineering 策略

### 三层 Prompt 结构

```
Layer 1: 角色与能力
   "你是一位资深的足球数据分析师..."
   定义 Agent 的身份和行为边界

Layer 2: 输出格式规范
   "每次回复必须按五段式输出..."
   明确期望的输出结构

Layer 3: Few-shot 示例
   给出具体分析示例（"分析利物浦进攻"→"对比萨拉赫哈兰德"）
   教会 Agent HOW to think，不只是 WHAT to output
```

### 关键设计

- **数据优先原则**: "做出任何分析前，必须先调用工具获取真实数据。不要编造数据。"
- **引用数据原则**: 强制 Agent 引用具体数字而非泛泛而谈
- **中文回复**: 面向中国用户和面试官

## 5. 结构化输出 (Structured Output)

### Pydantic Schema

```python
class AgentResponse(BaseModel):
    summary: str                    # 一句话总结
    data_overview: DataOverview     # 📊 KPI 概览
    deep_analysis: str              # 🎯 深度洞察
    recommendation: Recommendation  # ✅ 可操作建议
    alternatives: list[str]         # 🔄 备选方案
    follow_up_options: list[...]    # 📋 继续追问
```

### 为什么重要?

- **一致性**: 前端始终按同一结构渲染
- **可测试**: 可以写单元测试验证输出 schema
- **面试亮点**: Pydantic + LangChain Structured Output 是业界标准做法

## 6. 流式输出 (SSE Streaming)

```
SSE Event Flow:
thinking     → "正在分析..."
tool_start   → "正在查询积分榜..."
tool_end     → "数据获取完成"
token        → 逐 token 流式文本
done         → 完整的 AgentResponse
```

### 为什么用 SSE 而不是 WebSocket?

- **更简单**: HTTP 单向流，不需要双向通信
- **LangChain 原生支持**: `astream_events()` 天然映射到 SSE
- **面试加分**: Streaming 是 AI Agent 面试的必问题

## 7. 缓存策略

API-Football 免费套餐限制 100 请求/天。使用 TTL 内存缓存减少重复调用:

```python
@ttl_cache(prefix="standings", ttl=300)  # 5分钟缓存
async def get_standings(league_id, season):
    ...
```

面试中可讨论：为什么用 TTL 而不是 LRU？为什么 5 分钟？生产环境如何升级到 Redis？

## 8. 技术选型理由总结

| 决策 | 选择 | 理由 |
|------|------|------|
| Agent 框架 | LangGraph | 显式图结构、流式支持好、面试可讲 |
| LLM | Claude API | 结构化输出质量最高 |
| 后端 | Python/FastAPI | AI 生态首选、LangChain 原生支持 |
| 前端 | React/TypeScript | 成熟稳定、组件化、类型安全 |
| 流式 | SSE | 简单可靠、LangChain 原生映射 |
| 数据 | API-Football | 真实数据、免费套餐、RESTful |
| 缓存 | TTL 内存缓存 | 轻量、满足 100 req/day 限制 |
| 状态管理 | Zustand | 比 Redux 简洁、TypeScript 友好 |
| 图表 | Recharts | React 原生、雷达图/柱状图支持好 |
