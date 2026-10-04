# EvallQ - Unified Multi-Stage Production Dockerfile for Railway

# --- Stage 1: Build React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ENV VITE_API_URL=""
RUN npm run build

# --- Stage 2: FastAPI Production Server ---
FROM python:3.12-slim AS runner

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/backend \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install minimal OS dependencies required for ONNX Runtime, audio processing, and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend application source
COPY backend /app/backend

# Copy compiled frontend production assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Ensure persistent storage directories exist
RUN mkdir -p /app/backend/data /app/data

EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Start Uvicorn dynamically binding to Railway's assigned $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
