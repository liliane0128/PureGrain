FROM python:3.12-slim

WORKDIR /app

# System deps for asyncpg (C compiler) + clean cache
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (cache layer)
COPY requirements-docker.txt requirements.txt ./
RUN pip install --no-cache-dir -r requirements-docker.txt

# Copy application code
COPY alembic.ini ./
COPY alembic/ ./alembic/
COPY app/ ./app/

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# model.joblib lives in a volume; this dir must exist
RUN mkdir -p app/data

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
