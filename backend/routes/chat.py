"""对话 API — SSE 流式 Agent 响应 + 对话线程管理"""
import asyncio
import json
import os
import sqlite3
import uuid
from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse
from agent.graph import stream_agent

router = APIRouter()

# 消息存储 SQLite
DB_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DB_DIR, exist_ok=True)
MSG_DB = os.path.join(DB_DIR, "chat_messages.db")


def _msg_db():
    conn = sqlite3.connect(MSG_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            thread_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_thread ON messages(thread_id)")
    conn.commit()
    return conn


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
    request: Request,
    message: str = Query(..., description="用户消息"),
    thread_id: str = Query(default="default", description="对话线程 ID"),
):
    """SSE 流式 Agent 对话（支持多轮记忆 + 消息持久化）"""
    # 保存用户消息
    user_id = str(uuid.uuid4())[:8]
    try:
        db = _msg_db()
        db.execute("INSERT INTO messages (id, thread_id, role, content) VALUES (?, ?, ?, ?)",
                   (user_id, thread_id, "user", message))
        db.commit()
        db.close()
    except Exception:
        pass

    assistant_content = []

    async def event_generator():
        try:
            async for event in stream_agent(message, thread_id):
                if await request.is_disconnected():
                    break

                event_type = event["type"]
                event_data = json.dumps(event["data"], ensure_ascii=False)
                yield f"event: {event_type}\ndata: {event_data}\n\n"

                # 收集 assistant 回复内容
                if event_type == "token" and event["data"].get("content"):
                    assistant_content.append(event["data"]["content"])

                if event_type in ("error", "done"):
                    break

                await asyncio.sleep(0.03)

        except asyncio.CancelledError:
            pass
        except Exception as e:
            yield f"event: error\ndata: {{\"message\": \"{str(e)}\"}}\n\n"
        finally:
            # 保存 assistant 消息
            content = "".join(assistant_content).strip()
            if content:
                try:
                    db = _msg_db()
                    db.execute("INSERT INTO messages (id, thread_id, role, content) VALUES (?, ?, ?, ?)",
                               (str(uuid.uuid4())[:8], thread_id, "assistant", content))
                    db.commit()
                    db.close()
                except Exception:
                    pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chat/threads")
async def list_threads():
    """获取所有对话线程列表"""
    try:
        db = _msg_db()
        rows = db.execute("""
            SELECT thread_id, COUNT(*) as msg_count, MAX(created_at) as last_msg
            FROM messages GROUP BY thread_id ORDER BY last_msg DESC
        """).fetchall()
        db.close()
        threads = [
            {"thread_id": r[0], "message_count": r[1], "last_message": r[2]}
            for r in rows
        ]
        return {"code": 0, "data": threads, "message": "ok"}
    except Exception as e:
        return {"code": 1, "data": [], "message": str(e)}


@router.get("/chat/threads/{thread_id}")
async def get_thread_messages(thread_id: str):
    """获取某个对话线程的所有消息"""
    try:
        db = _msg_db()
        rows = db.execute(
            "SELECT role, content, created_at FROM messages WHERE thread_id = ? ORDER BY created_at",
            (thread_id,)
        ).fetchall()
        db.close()
        messages = [
            {"role": r[0], "content": r[1], "timestamp": r[2]}
            for r in rows
        ]
        return {"code": 0, "data": messages, "message": "ok"}
    except Exception as e:
        return {"code": 1, "data": [], "message": str(e)}
