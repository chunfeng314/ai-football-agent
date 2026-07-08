"""AI足球经理Agent — FastAPI 入口"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动/关闭生命周期"""
    print(f"AI Football Manager Agent starting...")
    print(f"   Claude Model: {settings.CLAUDE_MODEL}")
    print(f"   API-Football: {'configured' if settings.APIFOOTBALL_KEY else 'NOT configured'}")
    yield
    print("Server shutdown")


app = FastAPI(
    title="AI足球经理Agent",
    description="基于 LangChain + Claude 的足球数据分析智能体",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — 允许前端开发服务器
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "claude_configured": bool(settings.ANTHROPIC_API_KEY),
        "apifootball_configured": bool(settings.APIFOOTBALL_KEY),
    }


# 注册路由
from routes import dashboard, teams, players, chat
app.include_router(dashboard.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(players.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
