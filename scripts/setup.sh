#!/bin/bash

# Setup script for Claude Session Infrastructure

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=================================="
echo "Claude Session Infrastructure"
echo "Setup Script"
echo "=================================="
echo ""

# Create data directory
echo "1. Creating data directory..."
sudo mkdir -p /var/claude-sessions/sessions
sudo mkdir -p /var/claude-sessions/recent
sudo chown -R $USER:$USER /var/claude-sessions
echo "✅ Data directory created: /var/claude-sessions"
echo ""

# Install dependencies for session-storage-service
echo "2. Installing session-storage-service dependencies..."
cd session-storage-service
npm install
echo "✅ session-storage-service dependencies installed"
echo ""

# Install dependencies for container-hook-agent
echo "3. Installing container-hook-agent dependencies..."
cd ../container-hook-agent
npm install
echo "✅ container-hook-agent dependencies installed"
echo ""

cd "$PROJECT_ROOT"

# Make scripts executable
echo "4. Making scripts executable..."
chmod +x scripts/*.sh
echo "✅ Scripts are executable"
echo ""

echo "=================================="
echo "✅ Setup complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo ""
echo "  # Option 1: Run with Docker Compose (recommended)"
echo "  docker-compose up -d"
echo ""
echo "  # Option 2: Run locally for development"
echo "  cd session-storage-service && npm start"
echo ""
echo "  # Then open the dashboard"
echo "  open http://localhost:3000"
echo ""
echo "  # Or test the API"
echo "  ./scripts/test-session-storage.sh"
echo ""
