"""球队 API"""
from fastapi import APIRouter, Query
from services.apifootball import get_team_squad, get_team_fixtures, get_teams_by_league

router = APIRouter()


@router.get("/teams")
async def list_teams(
    league: int = Query(default=39),
    season: int = Query(default=2024),
):
    """获取联赛所有球队"""
    try:
        teams = await get_teams_by_league(league, season)
        return {"code": 0, "data": teams, "message": "ok"}
    except Exception as e:
        return {"code": 1, "data": None, "message": str(e)}


@router.get("/teams/{team_id}")
async def team_detail(team_id: int):
    """获取球队阵容"""
    try:
        squad = await get_team_squad(team_id)
        return {"code": 0, "data": {"squad": squad}, "message": "ok"}
    except Exception as e:
        return {"code": 1, "data": None, "message": str(e)}


@router.get("/teams/{team_id}/fixtures")
async def team_fixtures(
    team_id: int,
    season: int = Query(default=2024),
    last: int = Query(default=10, ge=1, le=20),
):
    """获取球队近期赛程"""
    try:
        fixtures = await get_team_fixtures(team_id, season, last)
        return {"code": 0, "data": fixtures, "message": "ok"}
    except Exception as e:
        return {"code": 1, "data": None, "message": str(e)}
