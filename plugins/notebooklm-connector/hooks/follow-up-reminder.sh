#!/bin/bash
# SubagentStop hook for chrome-mcp-query agent
# Injects FOLLOW_UP_REMINDER into main agent context

INPUT=$(cat)

# Prevent infinite loops
if echo "$INPUT" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
    echo '{}'
    exit 0
fi

# FOLLOW_UP_REMINDER message
cat << 'EOF'
{"additionalContext": "============================================================\nFOLLOW_UP_REMINDER (Injected by SubagentStop Hook)\n============================================================\n\nThe chrome-mcp-query agent has completed. You MUST now:\n\n1. REVIEW the agent response for the FOLLOW_UP_REQUIRED block\n2. ANALYZE if the user's original request is fully answered\n3. IDENTIFY any missing topics or incomplete information\n4. IF gaps exist: Resume the agent with Task(resume: agentId, prompt: \"Follow-up: [specific question]\")\n5. IF complete: Synthesize all responses and deliver to user\n\nCRITICAL: Do NOT respond to the user until you have verified ALL requested topics are covered!\n\nMaximum 3 follow-up queries allowed before summarizing.\n============================================================"}
EOF
