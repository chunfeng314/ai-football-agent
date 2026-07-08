"""联赛仪表盘 API"""
from fastapi import APIRouter, Query
from config import settings
from services.apifootball import get_standings, get_top_scorers, get_teams_by_league

router = APIRouter()

# 支持的联赛列表
SUPPORTED_LEAGUES = [
    {"id": 39, "name": "英超", "country": "England", "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
    {"id": 140, "name": "西甲", "country": "Spain", "flag": "🇪🇸"},
    {"id": 78, "name": "德甲", "country": "Germany", "flag": "🇩🇪"},
    {"id": 135, "name": "意甲", "country": "Italy", "flag": "🇮🇹"},
    {"id": 61, "name": "法甲", "country": "France", "flag": "🇫🇷"},
]


@router.get("/leagues")
async def list_leagues():
    """获取支持的联赛列表"""
    return {"code": 0, "data": SUPPORTED_LEAGUES, "message": "ok"}


# 可用赛季
AVAILABLE_SEASONS = [2024, 2023, 2022, 2021, 2020]


@router.get("/seasons")
async def list_seasons():
    """获取可用赛季列表"""
    return {"code": 0, "data": AVAILABLE_SEASONS, "message": "ok"}


@router.get("/cache/stats")
async def cache_statistics():
    """获取缓存统计"""
    from services.cache import cache_stats
    return {"code": 0, "data": cache_stats(), "message": "ok"}


@router.post("/cache/clear")
async def clear_cache():
    """清除所有缓存"""
    from services.cache import cache_invalidate
    cache_invalidate()
    return {"code": 0, "data": None, "message": "缓存已清除"}


@router.get("/dashboard")
async def dashboard(
    league: int = Query(default=39, description="联赛 ID"),
    season: int = Query(default=2024, description="赛季"),
):
    """获取联赛仪表盘数据（积分榜 + 射手榜 + 球队列表）"""
    try:
        standings = await get_standings(league, season)
        top_scorers = await get_top_scorers(league, season)
        teams = await get_teams_by_league(league, season)

        league_info = next((l for l in SUPPORTED_LEAGUES if l["id"] == league), SUPPORTED_LEAGUES[0])

        return {
            "code": 0,
            "data": {
                "league": league_info,
                "season": season,
                "standings": standings,
                "top_scorers": top_scorers,
                "teams": teams,
            },
            "message": "ok",
        }
    except Exception as e:
        return {"code": 1, "data": None, "message": str(e)}
