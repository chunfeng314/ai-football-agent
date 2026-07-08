FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖（better-sqlite3 编译需要 gcc）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ make \
    && rm -rf /var/lib/apt/lists/*

# Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 8000

# Gunicorn 启动（production）
CMD ["gunicorn", "main:app", \
     "--config", "gunicorn_conf.py", \
     "--worker-class", "uvicorn.workers.UvicornWorker"]
