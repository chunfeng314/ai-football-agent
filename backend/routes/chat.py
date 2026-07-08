"""对话 API — SSE 流式 Agent 响应"""
import asyncio
import json
from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse
from agent.graph import stream_agent

router = APIRouter()


@router.post("/chat")
async def chat_simple(request: Request):
    """非流式对话（备用）"""
    body = await request.json()
    message = body.get("message", "")
    if not message:
        return {"code": 1, "data": None, "message": "请输入消息"}

    result = {"message": "请在 /chat/stream 使用 SSE 流式接口"}
    return {"code": 0, "data": result, "message": "ok"}


@router.get("/chat/stream")
async def chat_stream(
    message: str = Query(..., description="用户消息"),
    thread_id: str = Query(default="default", description="对话线程 ID"),
):
    """SSE 流式 Agent 对话"""
    async def event_generator():
        try:
            async for event in stream_agent(message, thread_id):
                event_type = event["type"]
                event_data = json.dumps(event["data"], ensure_ascii=False)
                yield f"event: {event_type}\ndata: {event_data}\n\n"

                if event_type == "error":
                    break

                # 小延迟，防止事件过快
                await asyncio.sleep(0.05)

        except Exception as e:
            yield f"event: error\ndata: {{\"message\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
