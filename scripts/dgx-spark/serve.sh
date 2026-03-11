#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# DGX Spark — Ollama + Cloudflare Tunnel management
#
# Usage:
#   ./serve.sh tunnel    — Start Cloudflare tunnel (exposes Ollama externally)
#   ./serve.sh stop      — Stop the tunnel
#   ./serve.sh warmup    — Pre-load the model into GPU memory
#   ./serve.sh status    — Show Ollama and tunnel status
# ============================================================================

DATA_DIR="${DATA_DIR:-$HOME/.qwen-serve}"
MODEL="${QWEN_MODEL:-qwen3-coder-next:q4_K_M}"
OLLAMA_PORT="${OLLAMA_PORT:-11434}"

# Find cloudflared
CLOUDFLARED="${HOME}/.local/bin/cloudflared"
if [ ! -x "$CLOUDFLARED" ]; then
  CLOUDFLARED=$(command -v cloudflared 2>/dev/null || echo "")
  if [ -z "$CLOUDFLARED" ]; then
    echo "ERROR: cloudflared not found. Run setup.sh first."
    exit 1
  fi
fi

ACTION="${1:-status}"

case "$ACTION" in
  tunnel)
    # Kill existing tunnel if running
    if [ -f "$DATA_DIR/config/tunnel-pid" ]; then
      OLD_PID=$(cat "$DATA_DIR/config/tunnel-pid")
      kill "$OLD_PID" 2>/dev/null && echo "Stopped old tunnel (PID $OLD_PID)" || true
    fi

    # Ensure Ollama is running
    if ! curl -sf "http://localhost:${OLLAMA_PORT}/api/tags" > /dev/null 2>&1; then
      echo "ERROR: Ollama is not running on port $OLLAMA_PORT"
      echo "Start it with: sudo systemctl start ollama"
      exit 1
    fi

    # Use named tunnel (permanent URL) if configured, otherwise quick tunnel
    if [ -f "$HOME/.cloudflared/config.yml" ]; then
      TUNNEL_NAME=$(grep '^tunnel:' "$HOME/.cloudflared/config.yml" | awk '{print $2}')
      TUNNEL_HOSTNAME=$(grep 'hostname:' "$HOME/.cloudflared/config.yml" | awk '{print $3}' | head -1)
      echo "Starting named Cloudflare Tunnel: https://${TUNNEL_HOSTNAME}"

      "$CLOUDFLARED" tunnel run --config "$HOME/.cloudflared/config.yml" \
        > /tmp/cloudflared.log 2>&1 &
      TUNNEL_PID=$!
      echo "$TUNNEL_PID" > "$DATA_DIR/config/tunnel-pid"
      echo "https://${TUNNEL_HOSTNAME}" > "$DATA_DIR/config/tunnel-url"
      sleep 3

      echo ""
      echo "============================================"
      echo "  Tunnel live!"
      echo "  URL:      https://${TUNNEL_HOSTNAME}"
      echo "  API Base: https://${TUNNEL_HOSTNAME}/v1"
      echo "  PID:      $TUNNEL_PID"
      echo "============================================"
      echo ""
      echo "Tunnel running in background. Stop with: $0 stop"
    else
      echo "Starting quick Cloudflare Tunnel (temporary URL)..."

      "$CLOUDFLARED" tunnel --url "http://localhost:${OLLAMA_PORT}" --no-autoupdate \
        > /tmp/cloudflared.log 2>&1 &
      TUNNEL_PID=$!
      echo "$TUNNEL_PID" > "$DATA_DIR/config/tunnel-pid"

      for i in $(seq 1 30); do
        TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cloudflared.log 2>/dev/null | head -1 || true)
        if [ -n "$TUNNEL_URL" ]; then
          echo "$TUNNEL_URL" > "$DATA_DIR/config/tunnel-url"
          echo ""
          echo "============================================"
          echo "  Tunnel live!"
          echo "  URL:      $TUNNEL_URL"
          echo "  API Base: ${TUNNEL_URL}/v1"
          echo "  PID:      $TUNNEL_PID"
          echo "============================================"
          echo ""
          echo "To update GitHub secret:"
          echo "  echo '${TUNNEL_URL}/v1' | gh secret set QWEN_API_BASE -R sarathfranciswork/ignite"
          exit 0
        fi
        sleep 1
      done

      echo "ERROR: Tunnel failed to start in 30 seconds."
      kill "$TUNNEL_PID" 2>/dev/null || true
      exit 1
    fi
    ;;

  stop)
    if [ -f "$DATA_DIR/config/tunnel-pid" ]; then
      PID=$(cat "$DATA_DIR/config/tunnel-pid")
      if kill "$PID" 2>/dev/null; then
        echo "Tunnel stopped (PID $PID)"
        rm -f "$DATA_DIR/config/tunnel-pid"
      else
        echo "Tunnel was not running (PID $PID)"
        rm -f "$DATA_DIR/config/tunnel-pid"
      fi
    else
      echo "No tunnel PID file found."
      pkill -f "cloudflared tunnel" 2>/dev/null && echo "Killed cloudflared processes." || echo "No tunnel running."
    fi
    ;;

  warmup)
    echo "Warming up $MODEL (loading into GPU memory)..."
    curl -sf "http://localhost:${OLLAMA_PORT}/api/generate" \
      -d "{\"model\": \"$MODEL\", \"prompt\": \"Hello\", \"stream\": false}" \
      > /dev/null 2>&1
    echo "Model loaded."
    ollama ps
    ;;

  status)
    echo "=== Ollama ==="
    if curl -sf "http://localhost:${OLLAMA_PORT}/api/tags" > /dev/null 2>&1; then
      echo "Status: Running on port $OLLAMA_PORT"
      echo ""
      echo "Models:"
      ollama list 2>/dev/null
      echo ""
      echo "Loaded:"
      ollama ps 2>/dev/null
    else
      echo "Status: NOT running"
    fi

    echo ""
    echo "=== Tunnel ==="
    if [ -f "$DATA_DIR/config/tunnel-pid" ]; then
      PID=$(cat "$DATA_DIR/config/tunnel-pid")
      if ps -p "$PID" > /dev/null 2>&1; then
        URL=$(cat "$DATA_DIR/config/tunnel-url" 2>/dev/null || echo "unknown")
        echo "Status: Running (PID $PID)"
        echo "URL:    $URL"
      else
        echo "Status: Dead (stale PID file)"
      fi
    else
      echo "Status: Not started"
    fi
    ;;

  *)
    echo "Usage: $0 {tunnel|stop|warmup|status}"
    exit 1
    ;;
esac
