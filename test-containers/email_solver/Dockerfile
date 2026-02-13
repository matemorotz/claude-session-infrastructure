FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python hook agent from build context
COPY container-hook-agent-python/ /app/hook-agent/
RUN pip install -e /app/hook-agent/

# Environment variables (will be overridden by docker-compose)
ENV SESSION_ID=""
ENV SESSION_SERVICE_URL="http://session-storage:9000"
ENV PYTHONUNBUFFERED=1

# Entry script
COPY test-containers/email_solver/docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

CMD ["/app/docker-entrypoint.sh"]
