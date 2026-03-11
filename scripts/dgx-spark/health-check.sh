#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Health check for the Qwen LLM endpoint (Ollama OpenAI-compatible API)
#
# Usage:
#   ./health-check.sh                          — Check local Ollama
#   ./health-check.sh https://tunnel-url/v1    — Check remote endpoint
#
# Exit codes:
#   0 — Healthy
#   1 — Unhealthy
# ============================================================================

OLLAMA_PORT="${OLLAMA_PORT:-11434}"
BASE_URL="${1:-http://localhost:${OLLAMA_PORT}/v1}"
MODEL="${QWEN_MODEL:-qwen3-coder-next:q4_K_M}"

echo "Checking: $BASE_URL"
echo ""

# 1. Models endpoint
MODELS_RESPONSE=$(curl -sf --max-time 10 "${BASE_URL}/models" 2>/dev/null || echo "")

if [ -z "$MODELS_RESPONSE" ]; then
  echo "UNHEALTHY: Server not responding at ${BASE_URL}/models"
  exit 1
fi

MODEL_ID=$(echo "$MODELS_RESPONSE" | jq -r '.data[].id' 2>/dev/null | head -5 || echo "")
echo "Endpoint:        OK"
echo "Models:          $(echo "$MODEL_ID" | tr '\n' ', ')"

# 2. Check our model is available
if echo "$MODEL_ID" | grep -q "$MODEL"; then
  echo "Target model:    $MODEL (found)"
else
  echo "Target model:    $MODEL (NOT FOUND — pull it with: ollama pull $MODEL)"
  exit 1
fi

# 3. Quick inference test
echo ""
echo "Running inference test..."
START=$(date +%s%3N)

RESPONSE=$(curl -sf --max-time 60 "${BASE_URL}/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"$MODEL"'",
    "messages": [{"role": "user", "content": "Respond with just the word OK"}],
    "max_tokens": 5,
    "temperature": 0
  }' 2>/dev/null || echo "")

END=$(date +%s%3N)
ELAPSED=$(( END - START ))

if [ -z "$RESPONSE" ]; then
  echo "UNHEALTHY: Inference failed (timeout or error)"
  exit 1
fi

REPLY=$(echo "$RESPONSE" | jq -r '.choices[0].message.content // "error"' 2>/dev/null || echo "error")
TOKENS=$(echo "$RESPONSE" | jq -r '.usage.total_tokens // 0' 2>/dev/null || echo "0")
echo "Response:        $REPLY"
echo "Tokens:          $TOKENS"
echo "Latency:         ${ELAPSED}ms"

echo ""
echo "HEALTHY"
exit 0
