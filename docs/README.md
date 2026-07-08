# AI 足球数据分析智能体

基于 **LangChain + LangGraph + Claude API** 的足球数据分析 AI Agent，使用真实的英超联赛数据（来自 API-Football）。

## ✨ 功能

- 📊 **联赛仪表盘** — 英超实时积分榜、射手榜、KPI 卡片
- ⚽ **球队分析** — 完整阵容列表、近期赛程
- 👤 **球员详情** — 数据雷达图、完整赛季统计（进球/助攻/传球/防守等）
- 🤖 **AI 对话分析** — 自然语言提问，Agent 调用真实数据给出专业分析

## 🏗️ 技术栈

| 层 | 技术 |
|----|------|
| **Agent 框架** | LangChain + LangGraph |
| **LLM** | Claude API (Anthropic) |
| **后端** | Python 3.11+ / FastAPI |
| **前端** | React 18 / TypeScript / Vite / MUI / Recharts |
| **数据** | API-Football (v3) |
| **流式输出** | SSE (Server-Sent Events) |

## 🚀 快速启动

### 1. 环境准备

```bash
# Python 3.11+
python --version

# Node.js 18+
node --version
```

### 2. 配置 API Keys

编辑 `backend/.env`：

```env
APIFOOTBALL_KEY=你的API-Football密钥
ANTHROPIC_API_KEY=你的Claude API密钥
```

- [API-Football 免费注册](https://dashboard.api-football.com/register)
- [Anthropic Console 获取 Key](https://console.anthropic.com/)

### 3. 启动后端

```bash
cd backend
pip install -r requirements.txt
python main.py
```

后端运行在 `http://localhost:8000`

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:5173`

### 5. 访问应用

打开浏览器 → `http://localhost:5173`

## 📖 项目结构

```
AI足球经理Agent/
├── backend/                    # Python 后端
│   ├── main.py                 # FastAPI 入口
│   ├── config.py               # 配置
│   ├── agent/                  # AI Agent 核心
│   │   ├── graph.py            # LangGraph Agent（5节点决策图）
│   │   ├── tools.py            # 6个 Function Calling 工具
│   │   ├── prompts.py          # System Prompt 设计
│   │   └── schemas.py          # Pydantic 结构化输出
│   ├── services/
│   │   ├── apifootball.py      # API-Football 数据封装
│   │   └── cache.py            # TTL 缓存
│   └── routes/
│       ├── dashboard.py        # 联赛仪表盘 API
│       ├── teams.py            # 球队 API
│       ├── players.py          # 球员 API
│       └── chat.py             # SSE 流式对话 API
├── frontend/                   # React 前端
│   └── src/
│       ├── pages/              # 4 个核心页面
│       ├── stores/             # Zustand 状态管理
│       └── components/         # UI 组件
└── docs/
    └── ARCHITECTURE.md         # Agent 架构文档
```

## 🧠 Agent 架构

```
用户自然语言 → LangGraph Agent
    ├─ intent: 联赛分析 → get_standings / get_top_scorers
    ├─ intent: 球队分析 → get_team_squad / get_fixtures
    ├─ intent: 球员分析 → get_player_stats / compare_players
    └─ synthesize → 五段式结构化输出 → SSE 流式返回
```

详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 🎯 Agent 面试要点

这个项目展示了以下 AI Agent 开发核心能力：

1. **LangChain + LangGraph** — 业界标准的 Agent 框架
2. **Function Calling / Tool Use** — 6 个专注的数据查询工具
3. **Prompt Engineering** — 三层 System Prompt（角色→格式→Few-shot 示例）
4. **Structured Output** — Pydantic 强制校验 JSON Schema
5. **SSE 流式输出** — 实时展示 Agent 思考过程
6. **全栈交付** — Python 后端 + React 前端 + API 集成

## 📝 License

MIT
