"""SQLite 持久化缓存 — 数据不会因重启丢失"""
import sqlite3
import hashlib
import json
import time
import os
import functools
from typing import Callable


DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cache.db")


def _get_db() -> sqlite3.Connection:
    db_dir = os.path.dirname(DB_PATH)
    os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cache (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            expires_at REAL NOT NULL,
            created_at REAL NOT NULL DEFAULT (strftime('%s', 'now'))
        )
    """)
    conn.commit()
    return conn


def cache_get(key: str) -> object | None:
    """从 SQLite 缓存读取"""
    try:
        conn = _get_db()
        row = conn.execute(
            "SELECT value, expires_at FROM cache WHERE key = ?", (key,)
        ).fetchone()
        conn.close()
        if row is None:
            return None
        value_json, expires_at = row
        if time.time() > expires_at:
            # 过期了，删除
            conn2 = _get_db()
            conn2.execute("DELETE FROM cache WHERE key = ?", (key,))
            conn2.commit()
            conn2.close()
            return None
        return json.loads(value_json)
    except Exception:
        return None


def cache_set(key: str, value: object, ttl: int = 300):
    """写入 SQLite 缓存"""
    try:
        conn = _get_db()
        conn.execute(
            "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
            (key, json.dumps(value, default=str, ensure_ascii=False), time.time() + ttl),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass


def cache_invalidate(prefix: str = ""):
    """清除缓存"""
    try:
        conn = _get_db()
        if prefix:
            conn.execute("DELETE FROM cache WHERE key LIKE ?", (f"{prefix}%",))
        else:
            conn.execute("DELETE FROM cache")
        conn.commit()
        conn.close()
    except Exception:
        pass


def cache_stats() -> dict:
    """缓存统计"""
    try:
        conn = _get_db()
        total = conn.execute("SELECT COUNT(*) FROM cache").fetchone()[0]
        valid = conn.execute(
            "SELECT COUNT(*) FROM cache WHERE expires_at > ?", (time.time(),)
        ).fetchone()[0]
        conn.close()
        return {"total_entries": total, "valid_entries": valid, "expired_entries": total - valid}
    except Exception:
        return {"total_entries": 0, "valid_entries": 0, "expired_entries": 0}


def ttl_cache(prefix: str, ttl: int | None = None):
    """装饰器：为异步函数添加 SQLite 持久化缓存"""
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            raw = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
            cache_key = f"{prefix}:{hashlib.md5(raw.encode()).hexdigest()}"

            cached = cache_get(cache_key)
            if cached is not None:
                return cached

            result = await func(*args, **kwargs)
            cache_set(cache_key, result, ttl=ttl or 3600)  # 默认 1 小时
            return result
        return wrapper
    return decorator
