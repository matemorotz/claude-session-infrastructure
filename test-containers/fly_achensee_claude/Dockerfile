FROM node:20-slim

WORKDIR /app

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Install Python for hook agent (use default python3 version available in node:20-slim)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python hook agent from build context
COPY container-hook-agent-python/ /app/hook-agent/
RUN pip3 install --break-system-packages -e /app/hook-agent/

# Environment variables
ENV SESSION_ID=""
ENV SESSION_SERVICE_URL="http://session-storage:9000"
ENV PYTHONUNBUFFERED=1

# Entry script
COPY test-containers/fly_achensee_claude/docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

CMD ["/app/docker-entrypoint.sh"]
