import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # LLM 配置 — 支持 DeepSeek / Claude / OpenAI
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "deepseek")  # deepseek / claude

    # DeepSeek
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # Claude（备选）
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")

    # API-Football
    APIFOOTBALL_KEY: str = os.getenv("APIFOOTBALL_KEY", "")

    # 服务器
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # API-Football
    APIFOOTBALL_BASE_URL: str = "https://v3.football.api-sports.io"

    # 缓存
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "3600"))
    REDIS_HOST: str = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")

    # 常用联赛 ID
    LEAGUES: dict = {
        "premier_league": 39,
        "la_liga": 140,
        "bundesliga": 78,
        "serie_a": 135,
        "ligue_1": 61,
        "champions_league": 2,
    }

    # 当前赛季
    CURRENT_SEASON: int = int(os.getenv("CURRENT_SEASON", "2024"))


settings = Settings()
