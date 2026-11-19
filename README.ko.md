# claude-code-zero

[English](README.md) | [한국어](README.ko.md)

> Claude Code를 쓰면서 필요해서 만든 플러그인 마켓플레이스입니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code Plugin Marketplace](https://img.shields.io/badge/Claude_Code-Plugin_Marketplace-orange)](https://github.com/LeeJuOh/claude-code-zero)

https://github.com/user-attachments/assets/abb70886-6f82-474c-a956-3c89b77c4ae5

## 설치

### 방법 A — 플러그인 마켓플레이스 (권장)

스킬, 훅, 에이전트, MCP 서버, 스크립트 등 플러그인의 모든 구성 요소가 설치됩니다.

```shell
# 1. 마켓플레이스 추가 (최초 1회)
/plugin marketplace add LeeJuOh/claude-code-zero

# 2. 플러그인 설치
/plugin install <plugin-name>@claude-code-zero
```

터미널에서 직접:

```shell
claude plugin add <plugin-name>@claude-code-zero
```

### 방법 B — npx skills (스킬만)

스킬만 쓰려면 [skills CLI](https://github.com/vercel-labs/skills)로 설치하세요. 훅이나 에이전트가 필요한 기능은 위의 마켓플레이스 설치 방법을 사용하세요.

```shell
npx skills add LeeJuOh/claude-code-zero
```

### 확인

`/plugin` 실행 후 **Installed** 탭에서 확인하세요.

## 대표 플러그인

### [codex-advisor](plugins/codex-advisor/README.md)

코드를 쓴 에이전트는 작성자의 의도를 이미 압니다. 다른 관점에서 점검하고 싶을 때 `/codex-review`로 Codex에 리뷰를 맡기세요. 별도 검증 에이전트가 지적한 내용을 코드와 대조해 어떤 지적에 근거가 있는지 알려줍니다.

스킬 · `codex-review` · `codex-adversarial` · `codex-rescue` · `codex-verify` · `codex-research` · `codex-transfer` · `codex-status` · `codex-result` · `codex-cancel` · `codex-setup`

### [one-minute-pr](plugins/one-minute-pr/README.md)

에이전트가 쓴 PR·MR 본문은 너무 길어서 정작 뭘 봐야 할지 찾기 어려웠습니다. 그래서 `one-minute-pr`을 만들었습니다. 왜 바꿨는지, 어디에 영향을 주는지, 무엇을 실행해 확인했는지 짧게 정리합니다.

스킬 · `one-minute-pr`

### [worktree-plus](plugins/worktree-plus/README.md)

새 worktree에 코드는 있어도 앱을 띄우는 데 필요한 `.env`가 빠질 수 있습니다. 복사할 설정 파일과 함께 쓸 캐시를 정해 두세요. worktree를 지울 때는 훅이 커밋하거나 푸시할 작업이 남았는지 확인합니다.

스킬 · `worktree-setup`

### [vision-powers](plugins/vision-powers/README.md)

낯선 코드를 리뷰할 때는 바뀐 줄을 읽고도 그 코드를 어디서 호출하는지 알기 어렵습니다. `diff-visual`은 호출 관계를 그림으로 보여주고 실제 코드 옆에 변경 이유를 설명합니다. 플러그인이나 마크다운 문서도 그림을 곁들인 보고서로 볼 수 있습니다.

스킬 · `diff-visual` · `plugin-visual` · `doc-visual` · `fact-check` · `report-manager`

### [skill-creator-pro](plugins/skill-creator-pro/README.md)

에이전트가 알맞은 요청에서 스킬을 고르는지, 골랐을 때 결과가 나아지는지는 따로 확인해야 합니다. 예시 요청으로 스킬 설명을 시험하고, 같은 작업을 스킬을 쓸 때와 쓰지 않을 때 각각 실행해 결과를 나란히 비교합니다.

스킬 · `skill-creator-pro` · `auto-optimize`

## 보조 도구

### [toolbox](plugins/toolbox/README.md)

새 대화에서 일을 이어갈 때 `handoff`는 앞서 내린 결정과 남은 질문, 먼저 읽을 파일을 정리합니다. 설정 파일의 비밀값을 옮기거나 사이트맵에서 주소를 뽑고 로컬 참고 저장소를 갱신하는 도구도 있습니다.

스킬 · `fetch-sitemap` · `handoff` · `secret-setup` · `sync-references`

### [notebooklm-connector](plugins/notebooklm-connector/README.md)

Claude Code에서 작업하다가 NotebookLM에 모아 둔 자료가 필요하면 그 자리에서 질문하세요. 플러그인이 Chrome에서 노트북을 열고 답과 인용 출처를 대화로 가져옵니다. 질문과 답을 두 앱 사이에서 복사할 일이 줄어듭니다.

스킬 · `notebooklm-manager`

## 실험용 플러그인

- [claw-mo](plugins/claw-mo/README.md) · Claude가 편집 중인 마크다운 파일을 바로 미리 봅니다.
- [claw-mux](plugins/claw-mux/README.md) · 다른 cmux 패널에 명령을 보내고 출력을 읽습니다.
- [vibeproxy-kit](plugins/vibeproxy-kit/README.md) · VibeProxy 별칭을 설정하고 어느 백엔드가 응답하는지 확인합니다.
- [rubber-duck-tutor](plugins/rubber-duck-tutor/README.md) · 배포하려는 코드에 관한 질문에 답하며 이해한 내용을 점검합니다.

## 플러그인 관리

```shell
/plugin disable <plugin-name>@claude-code-zero    # 비활성화
/plugin enable <plugin-name>@claude-code-zero     # 재활성화
/plugin update <plugin-name>@claude-code-zero     # 업데이트
/plugin uninstall <plugin-name>@claude-code-zero  # 삭제
```

## 라이선스

[MIT License](LICENSE)
