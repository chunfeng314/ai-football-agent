FROM python:3.11-slim

WORKDIR /app

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
