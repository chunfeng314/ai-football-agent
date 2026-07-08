"""API-Football 数据服务 — 封装所有 API 调用"""
from typing import Optional
import httpx
from config import settings
from services.cache import ttl_cache


class APIFootballClient:
    """API-Football v3 异步客户端"""

    def __init__(self):
        self.base_url = settings.APIFOOTBALL_BASE_URL
        self.headers = {
            "x-apisports-key": settings.APIFOOTBALL_KEY,
        }
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self.headers,
                timeout=30.0,
            )
        return self._client

    async def get(self, path: str, params: dict | None = None) -> dict:
        client = await self._get_client()
        resp = await client.get(path, params=params)
        resp.raise_for_status()
        data = resp.json()
        if data.get("errors"):
            raise ValueError(f"API-Football 错误: {data['errors']}")
        return data

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None


# 全局单例
_football_client: Optional[APIFootballClient] = None


async def get_football_client() -> APIFootballClient:
    global _football_client
    if _football_client is None:
        _football_client = APIFootballClient()
    return _football_client


# ============= 数据获取函数 =============

@ttl_cache(prefix="standings", ttl=300)
async def get_standings(league_id: int, season: int) -> list[dict]:
    """获取联赛积分榜"""
    client = await get_football_client()
    data = await client.get("/standings", {"league": league_id, "season": season})
    # API 返回嵌套结构，提取第一个分组
    league_data = data["response"][0]["league"]
    standings = league_data["standings"][0]  # 第一组（总积分榜）
    return [
        {
            "rank": entry["rank"],
            "team": {
                "id": entry["team"]["id"],
                "name": entry["team"]["name"],
                "logo": entry["team"]["logo"],
            },
            "points": entry["points"],
            "goalsDiff": entry["goalsDiff"],
            "played": entry["all"]["played"],
            "win": entry["all"]["win"],
            "draw": entry["all"]["draw"],
            "lose": entry["all"]["lose"],
            "goalsFor": entry["all"]["goals"]["for"],
            "goalsAgainst": entry["all"]["goals"]["against"],
            "form": entry.get("form", ""),
        }
        for entry in standings
    ]


@ttl_cache(prefix="topscorers", ttl=300)
async def get_top_scorers(league_id: int, season: int) -> list[dict]:
    """获取射手榜"""
    client = await get_football_client()
    data = await client.get("/players/topscorers", {"league": league_id, "season": season})
    return data["response"]


@ttl_cache(prefix="squad", ttl=600)
async def get_team_squad(team_id: int) -> list[dict]:
    """获取球队阵容"""
    client = await get_football_client()
    data = await client.get("/players/squads", {"team": team_id})
    players = data["response"][0]["players"]
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "age": p["age"],
            "number": p["number"],
            "position": p["position"],
            "photo": p["photo"],
            "nationality": p.get("nationality", ""),
        }
        for p in players
    ]


async def get_player_stats(player_id: int, season: int) -> dict | None:
    """获取球员详细赛季统计"""
    client = await get_football_client()
    data = await client.get("/players", {"id": player_id, "season": season})
    if not data["response"]:
        return None
    return data["response"][0]  # 包含 player + statistics


async def get_team_fixtures(team_id: int, season: int, last: int = 10) -> list[dict]:
    """获取球队近期赛程"""
    client = await get_football_client()
    data = await client.get("/fixtures", {"team": team_id, "season": season, "last": last})
    return data["response"]


async def compare_players(player_ids: list[int], season: int) -> list[dict]:
    """批量获取多个球员数据"""
    client = await get_football_client()
    results = []
    for pid in player_ids:
        data = await client.get("/players", {"id": pid, "season": season})
        if data["response"]:
            results.append(data["response"][0])
    return results


async def get_teams_by_league(league_id: int, season: int) -> list[dict]:
    """获取联赛所有球队"""
    client = await get_football_client()
    data = await client.get("/teams", {"league": league_id, "season": season})
    return [
        {
            "id": entry["team"]["id"],
            "name": entry["team"]["name"],
            "logo": entry["team"]["logo"],
            "country": entry["team"]["country"],
            "founded": entry["team"]["founded"],
            "venue": entry["venue"]["name"],
            "capacity": entry["venue"]["capacity"],
        }
        for entry in data["response"]
    ]


async def get_player_transfers(player_id: int) -> list[dict]:
    """获取球员转会历史"""
    client = await get_football_client()
    data = await client.get("/transfers", {"player": player_id})
    return [
        {
            "date": t["date"],
            "type": t.get("type", ""),  # Free / Loan / N/A
            "teams": {
                "in": {"id": t["teams"]["in"]["id"], "name": t["teams"]["in"]["name"], "logo": t["teams"]["in"]["logo"]},
                "out": {"id": t["teams"]["out"]["id"], "name": t["teams"]["out"]["name"], "logo": t["teams"]["out"]["logo"]},
            },
            "amount": t.get("amount", ""),  # 转会费（可为空）
        }
        for t in data.get("response", [])
    ]
