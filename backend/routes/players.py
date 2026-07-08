"""球员 API"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from services.apifootball import get_player_stats, compare_players, get_player_transfers

router = APIRouter()


class CompareRequest(BaseModel):
    ids: list[int]
    season: int = 2024


@router.get("/players/{player_id}")
async def player_detail(
    player_id: int,
    season: int = Query(default=2024),
):
    """获取球员详细统计"""
    try:
        data = await get_player_stats(player_id, season)
        if data is None:
            return {"code": 1, "data": None, "message": "未找到该球员"}
        return {"code": 0, "data": data, "message": "ok"}
    except Exception as e:
        return {"code": 1, "data": None, "message": str(e)}


@router.post("/players/compare")
async def compare(req: CompareRequest):
    """批量对比球员"""
    try:
        data = await compare_players(req.ids, req.season)
        return {"code": 0, "data": data, "message": "ok"}
    except Exception as e:
        return {"code": 1, "data": None, "message": str(e)}


@router.get("/players/{player_id}/transfers")
async def player_transfers(player_id: int):
    """获取球员转会历史"""
    try:
        data = await get_player_transfers(player_id)
        return {"code": 0, "data": data, "message": "ok"}
    except Exception as e:
        return {"code": 1, "data": None, "message": str(e)}
