#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Intelligent Story Router — assigns stories to Claude or Qwen
#
# Analyzes issue complexity and Qwen endpoint health to decide which agent
# should handle a story. Prevents conflicts and duplicate assignments.
#
# Usage:
#   ./route-story.sh <issue_number> [dag_file]
#
# Output (to stdout, last line):
#   AGENT=claude|qwen  WORKFLOW=claude.yml|qwen-code.yml  LABEL=claude-code|qwen-code  REASON="..."
#
# Environment:
#   GH_TOKEN          — GitHub token for API calls
#   QWEN_API_BASE     — Qwen endpoint URL (for health check)
#   FORCE_AGENT       — Override routing (set to "claude" or "qwen")
# ============================================================================

ISSUE_NUM="${1:?Usage: route-story.sh <issue_number> [dag_file]}"
DAG_FILE="${2:-.github/story-dag.json}"

# ── Configuration ──
# Stories scoring ABOVE this threshold go to Claude, below go to Qwen
COMPLEXITY_THRESHOLD=50
# Max consecutive Qwen failures before escalating entire epic to Claude
QWEN_FAIL_ESCALATION=2

# ── Output helper ──
route_to() {
  local agent="$1" reason="$2"
  local workflow label
  workflow=$(jq -r --arg a "$agent" '.config.agents[$a].workflow // "claude.yml"' "$DAG_FILE")
  label=$(jq -r --arg a "$agent" '.config.agents[$a].label // "claude-code"' "$DAG_FILE")
  echo "AGENT=$agent WORKFLOW=$workflow LABEL=$label REASON=\"$reason\""
}

# ── Guard: Force override ──
if [ -n "${FORCE_AGENT:-}" ]; then
  route_to "$FORCE_AGENT" "forced via FORCE_AGENT env"
  exit 0
fi

# ── Guard: Check for existing agent labels (prevent duplicates) ──
EXISTING_LABELS=$(gh issue view "$ISSUE_NUM" --json labels --jq '.labels[].name' 2>/dev/null || echo "")
if echo "$EXISTING_LABELS" | grep -qw "claude-code"; then
  route_to "claude" "already labeled claude-code"
  exit 0
fi
if echo "$EXISTING_LABELS" | grep -qw "qwen-code"; then
  route_to "qwen" "already labeled qwen-code"
  exit 0
fi

# ── Guard: Static epic override in DAG config ──
STORY_EPIC=$(jq -r --argjson num "$ISSUE_NUM" '.stories[($num | tostring)].epic // empty' "$DAG_FILE" 2>/dev/null || echo "")
if [ -n "$STORY_EPIC" ]; then
  STATIC_AGENT=$(jq -r --arg ep "$STORY_EPIC" '.config.epic_agents[$ep] // empty' "$DAG_FILE" 2>/dev/null || echo "")
  if [ -n "$STATIC_AGENT" ]; then
    route_to "$STATIC_AGENT" "static epic_agents mapping for epic $STORY_EPIC"
    exit 0
  fi
fi

# ── Check Qwen endpoint health ──
QWEN_HEALTHY=false
if [ -n "${QWEN_API_BASE:-}" ]; then
  QWEN_RESPONSE=$(curl -sf --max-time 8 "${QWEN_API_BASE}/models" 2>/dev/null || echo "")
  if [ -n "$QWEN_RESPONSE" ] && echo "$QWEN_RESPONSE" | jq -e '.data | length > 0' > /dev/null 2>&1; then
    QWEN_HEALTHY=true
  fi
fi

if [ "$QWEN_HEALTHY" != "true" ]; then
  route_to "claude" "qwen endpoint unavailable"
  exit 0
fi

# ── Check Qwen failure history for this epic ──
if [ -n "$STORY_EPIC" ]; then
  EPIC_STORIES=$(jq -r --arg ep "$STORY_EPIC" '.epics[$ep].stories[]' "$DAG_FILE" 2>/dev/null || echo "")
  QWEN_FAILS=0
  for S in $EPIC_STORIES; do
    FAIL_COUNT=$(gh issue view "$S" --json comments --jq '[.comments[] | select(.body | test("Qwen.*failed|qwen-code.*Retry"; "i"))] | length' 2>/dev/null || echo "0")
    QWEN_FAILS=$((QWEN_FAILS + FAIL_COUNT))
  done

  if [ "$QWEN_FAILS" -ge "$QWEN_FAIL_ESCALATION" ]; then
    route_to "claude" "qwen failed ${QWEN_FAILS}x in epic $STORY_EPIC — escalating"
    exit 0
  fi
fi

# ══════════════════════════════════════════════════════════════
# Complexity Analysis
# ══════════════════════════════════════════════════════════════

ISSUE_JSON=$(gh issue view "$ISSUE_NUM" --json title,body,labels 2>/dev/null || echo '{"title":"","body":"","labels":[]}')
TITLE=$(echo "$ISSUE_JSON" | jq -r '.title // ""')
BODY=$(echo "$ISSUE_JSON" | jq -r '.body // ""')
BODY_LENGTH=${#BODY}

SCORE=0

# ── Factor 1: Issue body length (proxy for scope) ──
# Short specs (<500 chars) are simple, long specs (>2000) are complex
if [ "$BODY_LENGTH" -lt 300 ]; then
  SCORE=$((SCORE + 5))
elif [ "$BODY_LENGTH" -lt 800 ]; then
  SCORE=$((SCORE + 15))
elif [ "$BODY_LENGTH" -lt 1500 ]; then
  SCORE=$((SCORE + 30))
elif [ "$BODY_LENGTH" -lt 3000 ]; then
  SCORE=$((SCORE + 45))
else
  SCORE=$((SCORE + 60))
fi

# ── Factor 2: Acceptance criteria count ──
AC_COUNT=$(echo "$BODY" | grep -cE '^\s*-\s' 2>/dev/null || echo "0")
if [ "$AC_COUNT" -gt 10 ]; then
  SCORE=$((SCORE + 20))
elif [ "$AC_COUNT" -gt 6 ]; then
  SCORE=$((SCORE + 10))
elif [ "$AC_COUNT" -gt 3 ]; then
  SCORE=$((SCORE + 5))
fi

# ── Factor 3: Complexity keywords in title + body ──
CONTENT="$TITLE $BODY"

# High complexity indicators (+15 each)
for KW in "refactor" "migration" "architect" "state machine" "RBAC" "permission" "auth" "security" "real-time" "websocket" "queue" "background job" "event-driven" "multi-tenant" "performance" "caching strategy" "database schema" "cross-cutting"; do
  if echo "$CONTENT" | grep -qi "$KW"; then
    SCORE=$((SCORE + 15))
  fi
done

# Medium complexity indicators (+8 each)
for KW in "integration" "API endpoint" "tRPC router" "service layer" "middleware" "webhook" "notification" "email" "file upload" "search" "pagination" "filter" "sort" "workflow" "approval" "voting"; do
  if echo "$CONTENT" | grep -qi "$KW"; then
    SCORE=$((SCORE + 8))
  fi
done

# Low complexity indicators (-10 each, makes it more likely to go to Qwen)
for KW in "CRUD" "simple" "add field" "add column" "UI component" "button" "modal" "form" "card" "table view" "list view" "display" "badge" "tooltip" "documentation" "README" "seed data" "test" "unit test"; do
  if echo "$CONTENT" | grep -qi "$KW"; then
    SCORE=$((SCORE - 10))
  fi
done

# ── Factor 4: Size indicator (if present in body) ──
if echo "$BODY" | grep -qE '\*\*Size:\*\*\s*(XL|L)'; then
  SCORE=$((SCORE + 25))
elif echo "$BODY" | grep -qE '\*\*Size:\*\*\s*M'; then
  SCORE=$((SCORE + 10))
elif echo "$BODY" | grep -qE '\*\*Size:\*\*\s*(S|XS)'; then
  SCORE=$((SCORE - 10))
fi

# ── Factor 5: Priority (high priority = give to Claude for reliability) ──
if echo "$BODY" | grep -qE '\*\*Priority:\*\*\s*P0'; then
  SCORE=$((SCORE + 20))
elif echo "$BODY" | grep -qE '\*\*Priority:\*\*\s*P1'; then
  SCORE=$((SCORE + 10))
fi

# ── Factor 6: Multiple services/files mentioned ──
SERVICE_COUNT=$(echo "$BODY" | grep -coE 'src/server/services/[a-z]+|src/server/routers/[a-z]+' 2>/dev/null || echo "0")
if [ "$SERVICE_COUNT" -gt 3 ]; then
  SCORE=$((SCORE + 20))
elif [ "$SERVICE_COUNT" -gt 1 ]; then
  SCORE=$((SCORE + 10))
fi

# ── Factor 7: First story in epic (higher risk, give to Claude) ──
if [ -n "$STORY_EPIC" ]; then
  STORY_INDEX=$(jq --arg ep "$STORY_EPIC" --argjson num "$ISSUE_NUM" '.epics[$ep].stories | to_entries[] | select(.value == $num) | .key' "$DAG_FILE" 2>/dev/null || echo "0")
  if [ "${STORY_INDEX:-0}" -eq 0 ]; then
    SCORE=$((SCORE + 15))
  fi
fi

# Floor at 0
if [ "$SCORE" -lt 0 ]; then SCORE=0; fi

# ══════════════════════════════════════════════════════════════
# Routing Decision
# ══════════════════════════════════════════════════════════════

if [ "$SCORE" -ge "$COMPLEXITY_THRESHOLD" ]; then
  route_to "claude" "complexity=$SCORE (>=${COMPLEXITY_THRESHOLD}) — high complexity"
else
  route_to "qwen" "complexity=$SCORE (<${COMPLEXITY_THRESHOLD}) — suitable for local LLM"
fi
