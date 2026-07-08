"""混合缓存 — Redis（生产）/ SQLite（本地）自动切换"""
import hashlib
import json
import time
import os
import functools
import sqlite3
from typing import Callable, Optional


# ===== SQLite 后端 =====

SQLITE_DB = os.path.join(os.path.dirname(__file__), "..", "data", "cache.db")


def _sqlite_conn():
    os.makedirs(os.path.dirname(SQLITE_DB), exist_ok=True)
    conn = sqlite3.connect(SQLITE_DB)
    conn.execute("CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT, expires_at REAL)")
    conn.commit()
    return conn


# ===== Redis 后端 =====

_redis_client: Optional[object] = None


def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis
        r = redis.Redis(
            host=os.getenv("REDIS_HOST", "redis"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            password=os.getenv("REDIS_PASSWORD") or None,
            socket_timeout=2,
            decode_responses=True,
        )
        r.ping()  # 测试连接
        _redis_client = r
        return r
    except Exception:
        _redis_client = False  # 标记不可用
        return None


# ===== 统一接口 =====

def cache_get(key: str) -> Optional[object]:
    # 优先 Redis
    r = _get_redis()
    if r:
        try:
            val = r.get(key)
            return json.loads(val) if val else None
        except Exception:
            pass

    # 降级 SQLite
    try:
        conn = _sqlite_conn()
        row = conn.execute("SELECT value, expires_at FROM cache WHERE key = ?", (key,)).fetchone()
        conn.close()
        if row is None:
            return None
        if time.time() > row[1]:
            conn2 = _sqlite_conn()
            conn2.execute("DELETE FROM cache WHERE key = ?", (key,))
            conn2.commit()
            conn2.close()
            return None
        return json.loads(row[0])
    except Exception:
        return None


def cache_set(key: str, value: object, ttl: int = 3600):
    # 优先 Redis
    r = _get_redis()
    if r:
        try:
            r.setex(key, ttl, json.dumps(value, default=str, ensure_ascii=False))
            return
        except Exception:
            pass

    # 降级 SQLite
    try:
        conn = _sqlite_conn()
        conn.execute(
            "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
            (key, json.dumps(value, default=str, ensure_ascii=False), time.time() + ttl),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass


def cache_invalidate(prefix: str = ""):
    r = _get_redis()
    if r:
        try:
            if prefix:
                for k in r.keys(f"{prefix}*"):
                    r.delete(k)
            else:
                r.flushdb()
            return
        except Exception:
            pass

    try:
        conn = _sqlite_conn()
        if prefix:
            conn.execute("DELETE FROM cache WHERE key LIKE ?", (f"{prefix}%",))
        else:
            conn.execute("DELETE FROM cache")
        conn.commit()
        conn.close()
    except Exception:
        pass


def cache_stats() -> dict:
    r = _get_redis()
    if r:
        try:
            size = r.dbsize()
            return {"backend": "redis", "total_entries": size, "valid_entries": size}
        except Exception:
            pass

    try:
        conn = _sqlite_conn()
        total = conn.execute("SELECT COUNT(*) FROM cache").fetchone()[0]
        valid = conn.execute("SELECT COUNT(*) FROM cache WHERE expires_at > ?", (time.time(),)).fetchone()[0]
        conn.close()
        return {"backend": "sqlite", "total_entries": total, "valid_entries": valid, "expired_entries": total - valid}
    except Exception:
        return {"backend": "unknown", "total_entries": 0}


# ===== 装饰器（不变）=====

def ttl_cache(prefix: str, ttl: int | None = None):
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            raw = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
            cache_key = f"{prefix}:{hashlib.md5(raw.encode()).hexdigest()}"

            cached = cache_get(cache_key)
            if cached is not None:
                return cached

            result = await func(*args, **kwargs)
            cache_set(cache_key, result, ttl=ttl or 3600)
            return result
        return wrapper
    return decorator
