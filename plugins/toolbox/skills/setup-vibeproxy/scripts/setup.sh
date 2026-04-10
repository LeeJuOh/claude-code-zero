#!/usr/bin/env bash
set -euo pipefail

# VibeProxy alias setup for Claude Code
# Adds aliases and cc-list to ~/.zshrc (idempotent)

MARKER="# VibeProxy aliases (via localhost:8318)"
ZSHRC="${HOME}/.zshrc"

if grep -qF "$MARKER" "$ZSHRC" 2>/dev/null; then
  echo "[skip] VibeProxy aliases already in $ZSHRC"
  exit 0
fi

cat >> "$ZSHRC" << 'ALIASES'

# VibeProxy aliases (via localhost:8318)
_VP='ANTHROPIC_BASE_URL=http://localhost:8318'
# Codex — GPT-5.4 (effort: low/medium/high/xhigh)
alias cc-codex-low="$_VP ANTHROPIC_MODEL=gpt-5.4(low) claude"
alias cc-codex-med="$_VP ANTHROPIC_MODEL=gpt-5.4(medium) claude"
alias cc-codex-high="$_VP ANTHROPIC_MODEL=gpt-5.4(high) claude"
alias cc-codex-max="$_VP ANTHROPIC_MODEL=gpt-5.4(xhigh) claude"
# Copilot — Claude Opus 4.6 (effort: low/medium/high)
alias cc-cp-opus-low="$_VP ANTHROPIC_MODEL=claude-opus-4.6(low) claude"
alias cc-cp-opus-med="$_VP ANTHROPIC_MODEL=claude-opus-4.6(medium) claude"
alias cc-cp-opus-high="$_VP ANTHROPIC_MODEL=claude-opus-4.6(high) claude"
# Copilot — Claude Sonnet 4.6 (no effort option)
alias cc-cp-sonnet="$_VP ANTHROPIC_MODEL=claude-sonnet-4.6 claude"
# Antigravity — Claude (thinking)
alias cc-ag-opus="$_VP ANTHROPIC_MODEL=claude-opus-4-6-thinking claude"
alias cc-ag-sonnet="$_VP ANTHROPIC_MODEL=claude-sonnet-4-6 claude"
# Antigravity — Gemini 3.1 Pro
alias cc-ag-gemini-high="$_VP ANTHROPIC_MODEL=gemini-3.1-pro-high claude"
alias cc-ag-gemini-low="$_VP ANTHROPIC_MODEL=gemini-3.1-pro-low claude"
# Gemini (직접 OAuth)
alias cc-gemini-pro="$_VP ANTHROPIC_MODEL=gemini-3.1-pro-preview claude"

cc-list() {
  echo "  Codex (GPT-5.4)"
  echo "    cc-codex-low/med/high/max"
  echo ""
  echo "  Copilot (Claude)"
  echo "    cc-cp-opus-low/med/high   Opus 4.6"
  echo "    cc-cp-sonnet              Sonnet 4.6"
  echo ""
  echo "  Antigravity (Google)"
  echo "    cc-ag-opus                Claude Opus 4.6"
  echo "    cc-ag-sonnet              Claude Sonnet 4.6"
  echo "    cc-ag-gemini-high/low     Gemini 3.1 Pro"
  echo ""
  echo "  Gemini (Direct)"
  echo "    cc-gemini-pro             Gemini 3.1 Pro Preview"
}
ALIASES

echo "[done] VibeProxy aliases added to $ZSHRC"
echo "[info] Run: source ~/.zshrc"
