# claude-code-zero

[English](README.md) | [한국어](README.ko.md)

> Claude Code를 쓰면서 필요해서 만든 플러그인 마켓플레이스입니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code Plugin Marketplace](https://img.shields.io/badge/Claude_Code-Plugin_Marketplace-orange)](https://github.com/LeeJuOh/claude-code-zero)

<div align="center">

<video src="https://github.com/user-attachments/assets/abb70886-6f82-474c-a956-3c89b77c4ae5" width="600" controls></video>

</div>

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

[skills CLI](https://github.com/vercel-labs/skills)로 SKILL.md 파일만 설치합니다. 마켓플레이스 등록 없이 빠르게 설치 가능하지만, **훅, 에이전트, MCP 서버, 스크립트는 포함되지 않습니다**. 훅 의존 플러그인(worktree-plus, rubber-duck-tutor, claw-mo)이나 에이전트 의존 플러그인(vision-powers, codex-advisor)은 기능이 제한됩니다.

```shell
npx skills add LeeJuOh/claude-code-zero
```

### 확인

`/plugin` 실행 후 **Installed** 탭에서 확인하세요.

## 플러그인

### [codex-advisor](plugins/codex-advisor/README.md)

**문제:** Codex 출력은 자신감 넘치지만 인용을 환각하고 엣지 케이스를 놓칩니다. 읽기만 해서는 걸러낼 수 없습니다.

**해결:** Claude가 Codex 응답을 독립적으로 재검증합니다 — Codex가 반환할 때까지 소스코드를 보지 않습니다. 5단계 분류(Agreed / Disputed / Nuanced / False Positive / Uncited)로 무엇을 신뢰할지 정확히 알려줍니다.

`codex-review` · `codex-adversarial` · `codex-rescue` · `codex-verify` · `codex-research` · `codex-status` · `codex-result` · `codex-cancel` · `codex-setup`

---

### [vision-powers](plugins/vision-powers/README.md)

**문제:** 복잡한 분석이 터미널 텍스트에 묻힙니다 — 아키텍처, 보안 이슈, git diff 모두 구조를 잃습니다. 팀원과 공유도 불가능합니다.

**해결:** 분석을 공유 가능한 리포트로 바꿉니다 — 자기완결형 인터랙티브 HTML 한 파일(Mermaid 다이어그램 + Chart.js 대시보드), PR·채팅용 Markdown, 또는 `--artifact`로 claude.ai Artifact 링크 중 선택. 플러그인(로컬/설치됨/GitHub), git diff, 마크다운 문서를 분석합니다. 전달 전 Claude가 리포트를 렌더링해 이미지로 되읽어 깨진 다이어그램을 잡아냅니다.

`plugin-visual` · `diff-visual` · `doc-visual` · `fact-check` · `context-health-visual` · `report-manager`

---

### [skill-creator-pro](plugins/skill-creator-pro/README.md)

**문제:** 제때 트리거되고 실제로 도움이 되는 스킬을 만드는 건 시행착오의 연속입니다. 트리거 정확도를 측정할 방법도, 체계적인 개선 루프도, 변경이 나아졌는지 알려줄 벤치마크도 없습니다.

**해결:** 초안 작성, 실제 프롬프트 테스트, baseline과 with-skill 결과 비교, 개선으로 이어지는 Anthropic 공식 skill-creator 코칭 루프에 description 트리거 옵티마이저와 HTML 벤치마크 뷰어를 더했습니다. `auto-optimize`는 이미 어느 정도 동작하는 스킬을 손 안 대고 hill-climbing으로 끌어올립니다.

`skill-creator-pro` · `auto-optimize`

---

### [worktree-plus](plugins/worktree-plus/README.md)

**문제:** Claude Code 내장 worktree는 gitignore된 파일(`.env`, 로컬 설정, 로컬 전용 문서)을 두고 가서 프로젝트가 돌지 않습니다. 상태 추적도 없고 제거할 때 커밋 안 한 작업을 삭제할 수 있습니다.

**해결:** `.worktreeinclude`는 작고 복구 불가한 파일(`.env`, 로컬 문서)을 각 worktree로 복사, `.worktreelink`는 크고 브랜치 안 타는 것(다운로드 자산, 공유 캐시)을 디스크 비용 0으로 심링크. 커밋 안 된 변경·푸시 안 된 커밋 있으면 제거 차단. `.worktree.log` 감사 추적.

`worktree-config` · WorktreeCreate/Remove 자동 훅

---

### [notebooklm-connector](plugins/notebooklm-connector/README.md)

**문제:** 리서치 자료가 NotebookLM에 있지만 조회하려면 컨텍스트 전환과 복사-붙여넣기를 거쳐야 하고 근거 없는 답변에 토큰까지 낭비하게 됩니다.

**해결:** Chrome 자동화로 Claude Code에서 직접 NotebookLM을 조회합니다. 출처 기반 답변과 자동 후속 질문(기본 3라운드)으로 놓친 부분을 채웁니다. 프로젝트별 노트북 레지스트리.

`notebooklm-manager` (query · add · list · search · enable/disable · remove)

---

### [claw-mo](plugins/claw-mo/README.md)

**문제:** mo 마크다운 뷰어는 강력하지만 설정이 번거롭습니다 — 포트 번호, 감시 패턴, fsnotify가 파일을 조용히 놓칩니다.

**해결:** 프로젝트마다 자동 동기화 훅을 걸어 둡니다. Claude가 마크다운 파일을 쓰거나 편집할 때마다 mo에 반영됩니다. 그룹 기반 구성, 전문 검색, Mermaid + KaTeX + Shiki 렌더링을 지원합니다.

`claw-mo-setup` · `claw-mo-up` · `claw-mo-down` · `claw-mo-open` · `claw-mo-manage`

---

### [claw-mux](plugins/claw-mux/README.md)

**문제:** Claude Code는 단일 터미널 패널에 갇혀 있습니다. 다른 패널에 명령을 보내거나 출력을 읽거나 병렬 워크플로를 조율할 수 없습니다.

**해결:** 완전한 cmux 통합 — 레이아웃 분할, 어떤 패널이든 명령 전송, 화면 출력 읽기, WKWebView 브라우저 자동화, 사이드바 프리미티브(상태·진행 바·레벨별 로그)로 진행 보고.

`claw-mux` · `cmux-browser` · `cmux-markdown`

---

### [toolbox](plugins/toolbox/README.md)

**문제:** 세션 컨텍스트는 대화 간에 사라집니다. 시크릿은 하드코딩되고 참조는 동기화에서 밀립니다.

**해결:** 4가지 집중 유틸리티 — 재개 순서 핸드오프 문서, 시크릿 추출 + 자동 로드 훅, 사이트맵 탐색, 참조 동기화.

`handoff` · `secret-setup` · `fetch-sitemap` · `sync-references`

---

### [rubber-duck-tutor](plugins/rubber-duck-tutor/README.md)

**문제:** AI 생성 코드를 수동적으로 수락하면 이해도가 17% 떨어집니다. 제대로 이해하지 못한 코드를 머지하게 됩니다.

**해결:** AI 코딩 라이프사이클 전반에 걸친 러버덕 질문법. 플랜/스펙 생성 시엔 브랜치 리뷰를 제안하고 배포 시점(git push / PR)엔 인라인으로 직면시킵니다. 논의하지 않은 가장 위험한 변경을 정조준합니다. 없으면 과거 미해소 갭을 재출제합니다. 3회 연속 무시하면 비차단 스코어보드로 전환됩니다. 힌트 사다리는 답을 드러내지 않고 안내하며 모든 트리거/응답/무시가 기록됩니다.

`duck` · `duck-prebuild` · `duck-verify` · `duck-review` · `duck-orient`

---

### [vibeproxy-kit](plugins/vibeproxy-kit/README.md)

**문제:** VibeProxy를 수동으로 연결(OAuth, 별칭, config.yaml, 셸 편집)하면 오류가 나기 쉽습니다. 어떤 백엔드가 실제로 응답하는지 알기 어렵습니다.

**해결:** 백업/롤백이 포함된 명시적 상태 관리. 백엔드별 격리 프로브로 각 별칭을 정확히 어떤 모델이 처리하는지 알 수 있습니다. 기존 별칭 마이그레이션 Keep / Merge / Reset 모드.

`setup-aliases` · `cc-list`

---

## Lab 플러그인

실험적 — 특정 환경이 필요하거나 안정성이 제한될 수 있습니다.

### [e2e-test-runner](plugins/e2e-test-runner/README.md)

**문제:** E2E 테스트는 취약한 셀렉터와 페이지 오브젝트가 필요합니다. UI가 바뀔 때마다 깨지고 작성에 시간이 오래 걸립니다.

**해결:** 자연어 JSON으로 테스트를 작성합니다. Claude가 페이지를 읽고 무엇을 클릭할지 결정하고 결과를 검증합니다. 테스트별 비디오 녹화, 픽셀 diff 시각적 회귀, 개발 서버 자동 감지(Next / Vite / Remix / Astro 등).

`e2e-test`

---

## 플러그인 관리

```shell
/plugin disable <plugin-name>@claude-code-zero    # 비활성화
/plugin enable <plugin-name>@claude-code-zero     # 재활성화
/plugin update <plugin-name>@claude-code-zero     # 업데이트
/plugin uninstall <plugin-name>@claude-code-zero  # 삭제
```

## 라이선스

[MIT License](LICENSE)
