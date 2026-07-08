# Gunicorn 生产配置
import multiprocessing

# 绑定
bind = "0.0.0.0:8000"

# Worker = CPU 核心数 × 2 + 1
workers = multiprocessing.cpu_count() * 2 + 1

# Worker 类型（uvicorn 异步）
worker_class = "uvicorn.workers.UvicornWorker"

# 超时
timeout = 120
graceful_timeout = 30

# 日志
accesslog = "-"
errorlog = "-"
loglevel = "info"

# 进程命名
proc_name = "football-agent"
