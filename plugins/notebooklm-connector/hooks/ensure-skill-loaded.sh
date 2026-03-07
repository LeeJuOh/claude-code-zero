#!/bin/bash
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

if echo "$PROMPT" | grep -qiE 'notebooklm\.google\.com|노트북|내 노트북|notebook.*(add|query|list|search|show|enable|disable|remove)|추가.*notebook|(query|search|list|show).*notebook'; then
  cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "This request involves NotebookLM. You MUST invoke Skill(notebooklm-connector:notebooklm-manager) before processing. Do not skip skill loading even if you have seen the skill content before in this session."
  }
}
EOF
  exit 0
fi

exit 0
