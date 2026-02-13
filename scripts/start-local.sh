#!/bin/bash

# Start infrastructure locally (without Docker)

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=================================="
echo "Starting Session Storage Service"
echo "=================================="
echo ""
echo "Service will run on http://localhost:9000"
echo "WebSocket will run on ws://localhost:9000/ws"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd "$PROJECT_ROOT/session-storage-service"
npm start
