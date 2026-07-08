"""比赛模拟 API — DeepSeek 生成赛果"""
import json
from fastapi import APIRouter, Request
from pydantic import BaseModel
from services.apifootball import get_team_squad

router = APIRouter()


class PlayerInfo(BaseModel):
    id: int
    name: str
    position: str
    number: int
    team: str = ""


class SimulateRequest(BaseModel):
    my_team: list[PlayerInfo]
    opponent_team_id: int
    opponent_team_name: str = ""


@router.post("/match/simulate")
async def simulate_match(request: Request, body: SimulateRequest):
    """模拟比赛 — 我的球队 vs 真实球队"""
    try:
        # 获取对手阵容
        opponent_squad = await get_team_squad(body.opponent_team_id)

        # 构建 prompt
        my_team_desc = "\n".join(
            f"- {p.name} ({p.position}, 号码{p.number}, {p.team})"
            for p in body.my_team
        )
        opp_team_desc = "\n".join(
            f"- {p['name']} ({p['position']}, 号码{p['number']})"
            for p in opponent_squad[:18]
        )

        prompt = f"""你是一位足球比赛解说员。现在有一场模拟比赛：

## 我的球队（主场）
{my_team_desc}

## 对手球队：{body.opponent_team_name}（客场）
{opp_team_desc}

请根据两队球员的实力和位置，模拟一场真实的足球比赛。严格按照以下 JSON 格式返回，不要输出其他内容：

{{
  "home_score": 2,
  "away_score": 1,
  "goals": [
    {{"minute": 23, "scorer": "球员名", "team": "home", "assist": "助攻球员"}},
    {{"minute": 56, "scorer": "球员名", "team": "home", "assist": null}},
    {{"minute": 78, "scorer": "球员名", "team": "away", "assist": "球员名"}}
  ],
  "possession": {{"home": 52, "away": 48}},
  "shots": {{"home": 14, "away": 11}},
  "summary": "一段精彩的比赛总结，100字以内。要提到关键球员的表现。"
}}

要求：
- 比分要合理，大比分不超过5球
- 进球者必须从两队的球员名单中选择
- 助攻者也必须来自进球者的同一队伍
- summary 要生动，像真实解说一样
"""

        # 调用 LLM
        from agent.graph import get_llm
        llm = get_llm()
        response = await llm.ainvoke(prompt)

        # 解析 JSON
        content = response.content if hasattr(response, 'content') else str(response)
        # 提取 JSON 块
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        result = json.loads(content.strip())

        return {
            "code": 0,
            "data": result,
            "message": "ok",
        }

    except Exception as e:
        # LLM 失败时用随机结果
        import random
        h = random.randint(0, 4)
        a = random.randint(0, 3)
        my_players = [p.name for p in body.my_team]
        opp_players = [p["name"] for p in opponent_squad[:18]]
        scorers_h = random.sample(my_players, min(h, len(my_players))) if h > 0 else []
        scorers_a = random.sample(opp_players, min(a, len(opp_players))) if a > 0 else []

        goals = []
        for s in scorers_h:
            goals.append({"minute": random.randint(5, 90), "scorer": s, "team": "home", "assist": None})
        for s in scorers_a:
            goals.append({"minute": random.randint(5, 90), "scorer": s, "team": "away", "assist": None})
        goals.sort(key=lambda g: g["minute"])

        return {
            "code": 0,
            "data": {
                "home_score": h,
                "away_score": a,
                "goals": goals,
                "possession": {"home": random.randint(35, 65), "away": 0},
                "shots": {"home": random.randint(4, 20), "away": random.randint(4, 18)},
                "summary": f"模拟比赛结束：我的球队 {h}-{a} {body.opponent_team_name}。",
            },
            "message": "ok (fallback random)",
        }
