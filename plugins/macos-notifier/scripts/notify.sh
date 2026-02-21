#!/bin/bash

INPUT=$(cat)
NOTIFICATION_TYPE=$(echo "$INPUT" | jq -r '.notification_type // "unknown"')
MESSAGE=$(echo "$INPUT" | jq -r '.message // ""')

case "$NOTIFICATION_TYPE" in
  idle_prompt)
    TITLE="Claude Code - 작업 완료"
    BODY="작업이 완료되었습니다. 다음 입력을 기다리고 있습니다."
    ;;
  permission_prompt)
    TITLE="Claude Code - 권한 요청"
    BODY="권한 승인이 필요합니다."
    ;;
  elicitation_dialog)
    TITLE="Claude Code - 질문"
    BODY="질문에 대한 답변이 필요합니다."
    ;;
  *)
    TITLE="Claude Code"
    BODY="${MESSAGE:-알림이 있습니다.}"
    ;;
esac

osascript -e "display notification \"$BODY\" with title \"$TITLE\""

exit 0
