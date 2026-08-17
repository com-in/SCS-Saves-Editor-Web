# 诈骗园区模拟器 - 存档修改器 Web 版 部署镜像
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY templates ./templates
COPY static ./static

ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

CMD ["python", "app.py"]