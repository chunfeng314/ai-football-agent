"""LangGraph Agent — 核心决策引擎"""
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_anthropic import ChatAnthropic
from config import settings
from agent.prompts import SYSTEM_PROMPT
from agent.tools import ALL_TOOLS
from agent.schemas import AgentResponse


# ===== State 定义 =====

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    agent_response: AgentResponse | None
    tool_calls_count: int


# ===== LLM 配置 =====

def get_llm():
    """获取 Claude LLM 实例"""
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
    response = await llm.ainvoke(state["messages"])
    return {"messages": [response]}


def should_continue(state: AgentState) -> str:
    """路由决策: 继续调用工具 or 结束"""
    messages = state["messages"]
    last_message = messages[-1]

    # 如果 LLM 请求调用工具
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "end"


async def tool_executor(state: AgentState) -> dict:
    """工具执行节点 — 并行执行所有工具调用"""
    messages = state["messages"]
    last_message = messages[-1]
    tool_messages = []

    from agent.tools import ALL_TOOLS
    tool_map = {tool.name: tool for tool in ALL_TOOLS}

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_func = tool_map.get(tool_name)

        if tool_func:
            try:
                result = await tool_func.ainvoke(tool_args)
                tool_messages.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"]))
            except Exception as e:
                tool_messages.append(ToolMessage(content=f"工具调用错误: {str(e)}", tool_call_id=tool_call["id"]))
        else:
            tool_messages.append(
                ToolMessage(content=f"未知工具: {tool_name}", tool_call_id=tool_call["id"])
            )

    return {
        "messages": tool_messages,
        "tool_calls_count": state.get("tool_calls_count", 0) + 1,
    }


async def synthesize_node(state: AgentState) -> dict:
    """综合节点 — 将工具结果 + 系统提示 转为结构化输出"""
    llm = get_llm()

    # 构建 synthesize prompt
    synth_messages = [
        SystemMessage(content=SYSTEM_PROMPT + "\n\n现在，基于前面的数据，给出最终的五段式分析回复。用中文。"),
    ] + state["messages"]

    response = await llm.ainvoke(synth_messages)
    return {"messages": [response]}


# ===== 构建 Graph =====

def build_agent_graph():
    """构建 LangGraph Agent"""
    workflow = StateGraph(AgentState)

    # 添加节点
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_executor)
    workflow.add_node("synthesize", synthesize_node)

    # 设置入口
    workflow.set_entry_point("agent")

    # 条件路由: agent → tools or synthesize
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {"tools": "tools", "end": "synthesize"},
    )

    # tools → 回到 agent（让 agent 决定是否继续调工具）
    workflow.add_edge("tools", "agent")

    # synthesize → 结束
    workflow.add_edge("synthesize", END)

    # 内存 checkpointer（支持对话记忆）
    memory = MemorySaver()

    return workflow.compile(checkpointer=memory)


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
    - 'done': 完成
    """
    config = {"configurable": {"thread_id": thread_id}}
    initial_state = {
        "messages": [HumanMessage(content=message)],
        "agent_response": None,
        "tool_calls_count": 0,
    }

    yield {"type": "thinking", "data": {"message": "Agent 开始分析..."}}

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

        yield {"type": "done", "data": {"message": "分析完成"}}

    except Exception as e:
        yield {"type": "error", "data": {"message": str(e)}}
