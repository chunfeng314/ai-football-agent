"""Agent Tools — LangChain Function Calling 工具集"""
from typing import Optional
from langchain_core.tools import tool
from services.apifootball import (
    get_standings,
    get_top_scorers,
    get_team_squad,
    get_player_stats,
    get_team_fixtures,
    compare_players,
    get_teams_by_league,
)


@tool
async def tool_get_standings(league_id: int = 39, season: int = 2024) -> str:
    """
    获取英超联赛积分榜。
    返回所有 20 支球队的排名、胜平负、进球失球、积分。
    参数 league_id: 联赛 ID（39=英超, 140=西甲, 78=德甲, 135=意甲, 61=法甲）
    参数 season: 赛季年份（2024=2024-25赛季）
    """
    data = await get_standings(league_id, season)
    lines = [f"## 积分榜 (league={league_id}, season={season})"]
    for entry in data:
        lines.append(
            f"{entry['rank']:>2}. {entry['team']['name']:<25} "
            f"{entry['played']}场 {entry['win']}胜 {entry['draw']}平 {entry['lose']}负 "
            f"GF:{entry['goalsFor']} GA:{entry['goalsAgainst']} GD:{entry['goalsDiff']} "
            f"{entry['points']}分"
        )
    return "\n".join(lines)


@tool
async def tool_get_top_scorers(league_id: int = 39, season: int = 2024, limit: int = 10) -> str:
    """
    获取联赛射手榜。返回进球最多的球员排名。
    参数 limit: 返回前几名，默认 10
    """
    data = await get_top_scorers(league_id, season)
    lines = [f"## 射手榜 Top {limit}"]
    for entry in data[:limit]:
        stats = entry["statistics"][0] if entry["statistics"] else {}
        lines.append(
            f"{entry['player']['name']} ({stats.get('team', {}).get('name', '?')}) — "
            f"进球: {stats.get('goals', {}).get('total', '?')} "
            f"助攻: {stats.get('goals', {}).get('assists', '?')} "
            f"出场: {stats.get('games', {}).get('appearences', '?')}"
        )
    return "\n".join(lines)


@tool
async def tool_get_team_squad(team_id: int) -> str:
    """
    获取球队阵容。返回所有球员的姓名、号码、位置、年龄、国籍。
    参数 team_id: 球队 ID（如 40=Liverpool, 42=Arsenal, 50=Manchester City, 33=Manchester United, 49=Chelsea）
    """
    data = await get_team_squad(team_id)
    lines = [f"## 球队阵容 (team_id={team_id}), {len(data)} 人"]
    # 按位置分组
    by_pos = {}
    for p in data:
        pos = p["position"]
        by_pos.setdefault(pos, []).append(p)
    for pos, players in by_pos.items():
        lines.append(f"\n### {pos} ({len(players)}人)")
        for p in players:
            lines.append(f"  #{p['number']} {p['name']} — {p['age']}岁 {p['nationality']}")
    return "\n".join(lines)


@tool
async def tool_get_player_stats(player_id: int, season: int = 2024) -> str:
    """
    获取球员详细赛季统计数据。包含进球、助攻、传球、射门、盘带、防守、对抗、纪律、评分等。
    参数 player_id: 球员 ID（如 306=Mohamed Salah, 847=Erling Haaland, 278=Kevin De Bruyne, 308=Bruno Fernandes）
    """
    data = await get_player_stats(player_id, season)
    if not data:
        return f"未找到球员 ID={player_id} 的数据"

    p = data["player"]
    stats = data["statistics"][0] if data["statistics"] else {}

    lines = [
        f"## {p['name']} — 赛季统计",
        f"基本信息: {p['age']}岁 | {p['nationality']} | {p.get('height', '?')}/{p.get('weight', '?')}",
        f"球队: {stats.get('team', {}).get('name', '?')} | 位置: {stats.get('games', {}).get('position', '?')}",
        f"",
        f"### 出场",
        f"出场: {stats.get('games', {}).get('appearences', '?')} 首发: {stats.get('games', {}).get('lineups', '?')}",
        f"分钟: {stats.get('games', {}).get('minutes', '?')} 评分: {stats.get('games', {}).get('rating', '?')}",
        f"",
        f"### 进攻",
        f"进球: {stats.get('goals', {}).get('total', '?')} (点球: {stats.get('goals', {}).get('penalty', '?')})",
        f"助攻: {stats.get('goals', {}).get('assists', '?')}",
        f"射门: {stats.get('shots', {}).get('total', '?')} 射正: {stats.get('shots', {}).get('on', '?')}",
        f"",
        f"### 传球",
        f"传球: {stats.get('passes', {}).get('total', '?')} 准确率: {stats.get('passes', {}).get('accuracy', '?')}%",
        f"关键传球: {stats.get('passes', {}).get('key', '?')}",
        f"",
        f"### 盘带 & 防守",
        f"盘带: {stats.get('dribbles', {}).get('success', '?')}/{stats.get('dribbles', {}).get('attempts', '?')}",
        f"抢断: {stats.get('tackles', {}).get('total', '?')} 拦截: {stats.get('tackles', {}).get('interceptions', '?')}",
        f"",
        f"### 对抗 & 纪律",
        f"对抗赢得: {stats.get('duels', {}).get('won', '?')}/{stats.get('duels', {}).get('total', '?')}",
        f"犯规: {stats.get('fouls', {}).get('committed', '?')} 被犯规: {stats.get('fouls', {}).get('drawn', '?')}",
        f"黄牌: {stats.get('cards', {}).get('yellow', '?')} 红牌: {stats.get('cards', {}).get('red', '?')}",
    ]
    return "\n".join(lines)


@tool
async def tool_get_team_fixtures(team_id: int, season: int = 2024, last: int = 10) -> str:
    """
    获取球队近期赛程和结果。
    参数 team_id: 球队 ID
    参数 last: 最近 N 场比赛，默认 10
    """
    data = await get_team_fixtures(team_id, season, last)
    if not data:
        return f"未找到球队 ID={team_id} 的赛程数据"

    lines = [f"## 近期赛程 (team_id={team_id}), 最近 {len(data)} 场"]
    for f in data:
        home = f["teams"]["home"]["name"]
        away = f["teams"]["away"]["name"]
        gh = f["goals"]["home"]
        ga = f["goals"]["away"]
        date = f["fixture"]["date"].split("T")[0] if "T" in f["fixture"]["date"] else f["fixture"]["date"]
        round_name = f.get("league", {}).get("round", "")
        lines.append(f"{date} | {home} {gh}-{ga} {away} | {round_name}")
    return "\n".join(lines)


@tool
async def tool_compare_players(player_ids: list[int], season: int = 2024) -> str:
    """
    批量对比多个球员的数据。同时获取多个球员的赛季统计并对比。
    参数 player_ids: 球员 ID 列表，如 [306, 847] 对比萨拉赫和哈兰德
    """
    data = await compare_players(player_ids, season)
    if not data:
        return "未找到球员数据"

    lines = ["## 球员对比"]
    for d in data:
        p = d["player"]
        s = d["statistics"][0] if d["statistics"] else {}
        lines.append(
            f"\n### {p['name']} ({s.get('team', {}).get('name', '?')})"
        )
        lines.append(f"进球: {s.get('goals', {}).get('total', '?')} | "
                     f"助攻: {s.get('goals', {}).get('assists', '?')} | "
                     f"出场: {s.get('games', {}).get('appearences', '?')} | "
                     f"评分: {s.get('games', {}).get('rating', '?')}")
        lines.append(f"射门/射正: {s.get('shots', {}).get('total', '?')}/{s.get('shots', {}).get('on', '?')} | "
                     f"传球准确率: {s.get('passes', {}).get('accuracy', '?')}%")
    return "\n".join(lines)


# 所有工具列表
ALL_TOOLS = [
    tool_get_standings,
    tool_get_top_scorers,
    tool_get_team_squad,
    tool_get_player_stats,
    tool_get_team_fixtures,
    tool_compare_players,
]
