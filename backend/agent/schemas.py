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
    """Agent 五段式结构化输出"""
    summary: str = Field(description="一句话总结")
    data_overview: DataOverview = Field(description="📊 数据概览")
    deep_analysis: str = Field(description="🎯 深度分析")
    recommendation: Recommendation = Field(description="✅ 推荐方案")
    alternatives: list[str] = Field(default_factory=list, description="🔄 备选方案")
    follow_up_options: list[FollowUpOption] = Field(default_factory=list, description="📋 后续追问方向")
