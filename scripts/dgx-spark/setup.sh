#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# DGX Spark — Qwen3-Coder-Next Setup (Ollama + Cloudflare Tunnel)
#
# Sets up Qwen3-Coder-Next on DGX Spark via Ollama and exposes it externally
# for GitHub Actions integration (OpenAI-compatible API).
#
# Prerequisites:
#   - NVIDIA DGX Spark with DGX OS (Ubuntu 24.04)
#   - Ollama v0.15.5+ (ships pre-installed, update if needed)
#   - Internet connection
#
# Usage:
#   chmod +x scripts/dgx-spark/setup.sh
#   ./scripts/dgx-spark/setup.sh
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODEL="${QWEN_MODEL:-qwen3-coder-next:q4_K_M}"
OLLAMA_PORT="${OLLAMA_PORT:-11434}"
DATA_DIR="${DATA_DIR:-$HOME/.qwen-serve}"

echo "============================================"
echo "  DGX Spark — Qwen3-Coder-Next Setup"
echo "============================================"
echo ""
echo "Model:    $MODEL"
echo "Port:     $OLLAMA_PORT"
echo "Data dir: $DATA_DIR"
echo ""

# ── Step 1: Create data directory ──
mkdir -p "$DATA_DIR"/config

# ── Step 2: Save API key ──
if [ ! -f "$DATA_DIR/config/api-key" ]; then
  API_KEY=$(openssl rand -hex 32)
  echo "$API_KEY" > "$DATA_DIR/config/api-key"
  chmod 600 "$DATA_DIR/config/api-key"
  echo "[1/5] Generated API key: $API_KEY"
  echo "      SAVE THIS — you'll need it for GitHub secrets (QWEN_API_KEY)"
else
  API_KEY=$(cat "$DATA_DIR/config/api-key")
  echo "[1/5] Using existing API key from $DATA_DIR/config/api-key"
fi

# ── Step 3: Check Ollama version ──
echo ""
echo "[2/5] Checking Ollama..."
if ! command -v ollama &> /dev/null; then
  echo "ERROR: Ollama not found. Install with: curl -fsSL https://ollama.com/install.sh | sh"
  exit 1
fi

OLLAMA_VERSION=$(ollama --version 2>&1 | grep -oP '[\d.]+' | head -1)
echo "Ollama version: $OLLAMA_VERSION"

# Check minimum version (0.15.5 required for qwen3-coder-next)
MAJOR=$(echo "$OLLAMA_VERSION" | cut -d. -f1)
MINOR=$(echo "$OLLAMA_VERSION" | cut -d. -f2)
PATCH=$(echo "$OLLAMA_VERSION" | cut -d. -f3)
if [ "$MAJOR" -eq 0 ] && [ "$MINOR" -lt 15 ]; then
  echo "WARNING: Ollama $OLLAMA_VERSION is too old. Need v0.15.5+ for qwen3-coder-next."
  echo "Update with: curl -fsSL https://ollama.com/install.sh | sh"
  exit 1
elif [ "$MAJOR" -eq 0 ] && [ "$MINOR" -eq 15 ] && [ "${PATCH:-0}" -lt 5 ]; then
  echo "WARNING: Ollama $OLLAMA_VERSION is too old. Need v0.15.5+."
  echo "Update with: curl -fsSL https://ollama.com/install.sh | sh"
  exit 1
fi
echo "Ollama version OK."

# ── Step 4: Pull model ──
echo ""
echo "[3/5] Pulling $MODEL (this may take a while — ~46GB)..."
ollama pull "$MODEL"
echo "Model pulled successfully."

# ── Step 5: Install Cloudflare Tunnel ──
echo ""
echo "[4/5] Installing cloudflared..."
if command -v cloudflared &> /dev/null; then
  echo "cloudflared already installed."
elif [ -x "$HOME/.local/bin/cloudflared" ]; then
  echo "cloudflared found at ~/.local/bin/cloudflared"
else
  mkdir -p "$HOME/.local/bin"
  ARCH=$(uname -m)
  if [ "$ARCH" = "aarch64" ]; then
    CLOUDFLARED_RELEASE=$(curl -s https://api.github.com/repos/cloudflare/cloudflared/releases/latest | grep -oP '"tag_name":\s*"\K[^"]+')
    curl -L -o "$HOME/.local/bin/cloudflared" \
      "https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_RELEASE}/cloudflared-linux-arm64"
  else
    curl -L -o "$HOME/.local/bin/cloudflared" \
      "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
  fi
  chmod +x "$HOME/.local/bin/cloudflared"
  echo "cloudflared installed to ~/.local/bin/"
fi

# ── Step 6: Summary ──
echo ""
echo "[5/5] Setup complete!"
echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Start the Cloudflare tunnel:"
echo "   ${SCRIPT_DIR}/serve.sh tunnel"
echo ""
echo "2. Test locally:"
echo "   ${SCRIPT_DIR}/health-check.sh"
echo ""
echo "3. Add these GitHub secrets to your repo:"
echo "   QWEN_API_KEY  = $(cat "$DATA_DIR/config/api-key")"
echo "   QWEN_API_BASE = <tunnel-url>/v1  (shown when tunnel starts)"
echo ""
echo "4. Test externally:"
echo "   ${SCRIPT_DIR}/health-check.sh <tunnel-url>"
echo ""
