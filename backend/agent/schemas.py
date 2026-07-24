"""Agent 结构化输出 Schema — Pydantic 模型"""
from typing import Optional
from pydantic import BaseModel, Field


class KPI(BaseModel):
    """关键指标"""
    label: str = Field(description="指标名称")
    value: str = Field(description="指标数值")
    trend: Optional[str] = Field(default=None, description="趋势: up/down/stable")


class DataOverview(BaseModel):
    """数据概览"""
    kpis: list[KPI] = Field(default_factory=list, description="关键指标列表")
    summary: str = Field(default="", description="一句话数据总结")


class Recommendation(BaseModel):
    """推荐方案"""
    title: str = Field(description="方案标题")
    reasoning: str = Field(description="数据驱动的理由")
    expected_impact: str = Field(default="", description="预期效果")
    action_items: list[str] = Field(default_factory=list, description="具体行动项")


class FollowUpOption(BaseModel):
    """后续追问选项"""
    label: str = Field(description="按钮显示文字")
    prompt: str = Field(description="点击后发送的完整问题")


class AgentResponse(BaseModel):
    """Agent 五段式结构化输出：总结 / KPI 概览 / 深度洞察 / 可操作建议 / 追问引导"""
    summary: str = Field(description="总结：一句话总结，点明核心结论")
    data_overview: DataOverview = Field(description="KPI 概览：2-4 个关键数字 KPI + 一句话数据总结")
    deep_analysis: str = Field(description="深度洞察：数据背后的含义，纵向/横向对比，趋势解读")
    recommendation: Recommendation = Field(description="可操作建议：基于数据的核心建议（标题/理由/预期效果/行动项）")
    alternatives: list[str] = Field(default_factory=list, description="备选方案：1-2 个替代方案（如果条件不同）")
    follow_up_options: list[FollowUpOption] = Field(default_factory=list, description="追问引导：2-3 个可继续追问的方向")
