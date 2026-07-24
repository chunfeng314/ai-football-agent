"""LangGraph Agent — 核心决策引擎"""
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.sqlite import SqliteSaver
import os
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from config import settings
from agent.prompts import SYSTEM_PROMPT, DECISION_SYSTEM_PROMPT
from agent.tools import ALL_TOOLS
from agent.schemas import AgentResponse


# ===== State 定义 =====

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    agent_response: AgentResponse | None
    tool_calls_count: int


# ===== LLM 配置 =====

def get_llm():
    """根据配置选择 DeepSeek 或 Claude"""
    if settings.LLM_PROVIDER == "deepseek":
        return ChatOpenAI(
            model=settings.DEEPSEEK_MODEL,
            api_key=settings.DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com/v1",
            temperature=0.3,
            max_tokens=4096,
        )
    else:
        return ChatAnthropic(
            model=settings.CLAUDE_MODEL,
            api_key=settings.ANTHROPIC_API_KEY,
            temperature=0.3,
            max_tokens=4096,
        )


def get_llm_with_tools():
    """获取绑定工具的 LLM"""
    llm = get_llm()
    return llm.bind_tools(ALL_TOOLS)


# ===== Graph 节点 =====

async def agent_node(state: AgentState) -> dict:
    """Agent 决策节点 — 决定调用工具还是给出最终回复"""
    llm = get_llm_with_tools()
    messages = state["messages"]
    # 注入决策引导 system prompt：仅在本地副本前插一次，不写回 state，
    # 避免工具循环多轮经过本节点时在状态中重复累积 SystemMessage
    if not any(isinstance(m, SystemMessage) for m in messages):
        messages = [SystemMessage(content=DECISION_SYSTEM_PROMPT)] + list(messages)
    response = await llm.ainvoke(messages)
    return {"messages": [response]}


MAX_TOOL_ITERATIONS = 3

def should_continue(state: AgentState) -> str:
    """路由决策: 继续调用工具 or 结束（最多3轮工具调用）"""
    messages = state["messages"]
    last_message = messages[-1]

    # 防止无限循环：最多 3 轮工具调用
    if state.get("tool_calls_count", 0) >= MAX_TOOL_ITERATIONS:
        return "end"

    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "end"


async def tool_executor(state: AgentState) -> dict:
    """工具执行节点 — 执行工具调用，失败时立即标记终止"""
    messages = state["messages"]
    last_message = messages[-1]
    tool_messages = []
    has_failure = False

    from agent.tools import ALL_TOOLS
    tool_map = {tool.name: tool for tool in ALL_TOOLS}

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_func = tool_map.get(tool_name)

        if tool_func:
            try:
                result = await tool_func.ainvoke(tool_args)
                tool_messages.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"], name=tool_call["name"]))
            except Exception as e:
                has_failure = True
                err_msg = str(e)
                if "rate limit" in err_msg.lower() or "request limit" in err_msg.lower():
                    err_msg = "API今日额度用完，无法获取新数据，请直接基于已有信息回答。"
                tool_messages.append(ToolMessage(content=f"失败: {err_msg}", tool_call_id=tool_call["id"], name=tool_call["name"]))
        else:
            tool_messages.append(
                ToolMessage(content=f"未知工具: {tool_name}", tool_call_id=tool_call["id"], name=tool_name)
            )

    # 任何工具失败 → 强制结束，不再重试
    next_count = 999 if has_failure else state.get("tool_calls_count", 0) + 1

    return {
        "messages": tool_messages,
        "tool_calls_count": next_count,
    }


def _format_agent_response_markdown(resp: AgentResponse) -> str:
    """将 AgentResponse 渲染为 Markdown 纯文本（供 token 事件 / 消息持久化兜底使用）"""
    parts = [resp.summary]

    kpis = resp.data_overview.kpis if resp.data_overview else []
    if kpis:
        kpi_lines = [f"- {k.label}: {k.value}" + (f"（{k.trend}）" if k.trend else "") for k in kpis]
        parts.append("📊 **KPI 概览**\n" + "\n".join(kpi_lines))
    if resp.data_overview and resp.data_overview.summary:
        parts.append(resp.data_overview.summary)

    if resp.deep_analysis:
        parts.append(f"🎯 **深度洞察**\n{resp.deep_analysis}")

    rec = resp.recommendation
    if rec:
        rec_text = f"✅ **可操作建议：{rec.title}**\n{rec.reasoning}"
        if rec.expected_impact:
            rec_text += f"\n预期效果：{rec.expected_impact}"
        if rec.action_items:
            rec_text += "\n" + "\n".join(f"- {item}" for item in rec.action_items)
        parts.append(rec_text)

    if resp.alternatives:
        parts.append("🔄 **备选方案**\n" + "\n".join(f"- {alt}" for alt in resp.alternatives))

    if resp.follow_up_options:
        parts.append("📋 **追问引导**\n" + "\n".join(f"- {opt.label}" for opt in resp.follow_up_options))

    return "\n\n".join(parts)


async def synthesize_node(state: AgentState) -> dict:
    """综合节点 — 用 with_structured_output 产出 AgentResponse，失败时降级为纯文本"""
    llm = get_llm()

    # 构建 synthesize prompt
    synth_messages = [
        SystemMessage(content=SYSTEM_PROMPT + "\n\n现在，基于前面的数据，给出最终的五段式分析回复（总结 / KPI 概览 / 深度洞察 / 可操作建议 / 追问引导）。用中文。"),
    ] + state["messages"]

    # 优先走结构化输出（function calling，DeepSeek / Claude 均支持）
    agent_response = None
    try:
        structured_llm = llm.with_structured_output(AgentResponse)
        parsed = await structured_llm.ainvoke(synth_messages)
        # 防御：个别 provider/版本可能返回 dict 而非 Pydantic 实例
        if isinstance(parsed, AgentResponse):
            agent_response = parsed
        elif isinstance(parsed, dict):
            agent_response = AgentResponse.model_validate(parsed)
    except Exception:
        agent_response = None

    if agent_response is not None:
        # 结构化成功：写入 agent_response，同时附一条渲染好的 Markdown 消息，
        # 保证现有 token 事件与消息持久化链路不受影响
        return {
            "messages": [AIMessage(content=_format_agent_response_markdown(agent_response))],
            "agent_response": agent_response,
        }

    # 降级：结构化解析失败，退回原有纯文本输出，不让请求崩掉
    response = await llm.ainvoke(synth_messages)
    return {"messages": [response], "agent_response": None}


# ===== 构建 Graph =====

def build_agent_graph():
    """构建 LangGraph Agent"""
    workflow = StateGraph(AgentState)

    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_executor)
    workflow.add_node("synthesize", synthesize_node)

    workflow.set_entry_point("agent")

    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {"tools": "tools", "end": "synthesize"},
    )

    workflow.add_edge("tools", "agent")
    workflow.add_edge("synthesize", END)

    # SQLite 持久化 checkpointer（支持多轮对话记忆）
    db_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(db_dir, exist_ok=True)
    db_path = os.path.join(db_dir, "agent_memory.db")
    checkpointer = SqliteSaver.from_conn_string(db_path)
    # from_conn_string 返回 context manager，需要 enter
    checkpointer = checkpointer.__enter__()

    return workflow.compile(checkpointer=checkpointer)


# ===== 创建全局 Agent =====

agent_graph = build_agent_graph()


async def run_agent(message: str, thread_id: str = "default") -> dict:
    """
    运行 Agent，返回最终结果。
    返回: {messages, agent_response}
    """
    config = {"configurable": {"thread_id": thread_id}}
    initial_state = {
        "messages": [HumanMessage(content=message)],
        "agent_response": None,
        "tool_calls_count": 0,
    }
    result = await agent_graph.ainvoke(initial_state, config)
    return result


async def stream_agent(message: str, thread_id: str = "default"):
    """
    流式运行 Agent，逐事件产出。

    事件类型:
    - 'thinking': Agent 开始思考
    - 'tool_start': 开始调用工具
    - 'tool_end': 工具调用完成
    - 'token': LLM 输出 token
    - 'structured': 结构化输出 AgentResponse（JSON），synthesize 成功后发送一次
    - 'done': 完成
    """
    config = {"configurable": {"thread_id": thread_id}}
    initial_state = {
        "messages": [HumanMessage(content=message)],
        "agent_response": None,
        "tool_calls_count": 0,
    }

    yield {"type": "thinking", "data": {"message": "Agent 开始分析..."}}

    structured_sent = False

    try:
        async for event in agent_graph.astream(initial_state, config, stream_mode="values"):
            messages = event.get("messages", [])

            # 检测工具调用
            if messages:
                last_msg = messages[-1]
                if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
                    for tc in last_msg.tool_calls:
                        yield {
                            "type": "tool_start",
                            "data": {"tool": tc["name"], "args": tc["args"]},
                        }

                # 检测工具结果
                if isinstance(last_msg, ToolMessage):
                    yield {
                        "type": "tool_end",
                        "data": {"tool": last_msg.name, "result_preview": str(last_msg.content)[:200]},
                    }

                # 检测 AI 回复 = 最终 synthesize 结果
                if isinstance(last_msg, AIMessage) and last_msg.content:
                    yield {
                        "type": "token",
                        "data": {"content": last_msg.content},
                    }

            # 检测结构化输出（synthesize 节点产出后只发送一次）
            agent_response = event.get("agent_response")
            if agent_response is not None and not structured_sent:
                structured_sent = True
                if isinstance(agent_response, AgentResponse):
                    response_payload = agent_response.model_dump()
                else:
                    # 防御：checkpointer 反序列化后可能是 dict
                    response_payload = dict(agent_response)
                yield {
                    "type": "structured",
                    "data": {"response": response_payload},
                }

        yield {"type": "done", "data": {"message": "分析完成"}}

    except Exception as e:
        yield {"type": "error", "data": {"message": str(e)}}
