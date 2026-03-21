# Vision Powers Reddit Promotional Post Design

> Date: 2026-03-20
> Plugin: vision-powers (agent-extension-visual skill)

## Overview

r/ClaudeAI에 vision-powers 플러그인 홍보 포스트를 작성한다. 반응을 보고 r/ClaudeCode에도 올린다.

## Strategy

- **톤**: 문제 해결 스토리 + 캐주얼 공유 (B+C 하이브리드)
- **메인 기능**: agent-extension-visual (플러그인 분석 -> 인터랙티브 HTML 위키 리포트)
- **프레이밍**: 플러그인이 점점 복잡해지고 무거워지면서 README만으로는 내부 구조 파악이 어렵다 -> 자동 위키 리포트 생성
- **시큐리티**: 메인 강점으로 내세우지 않음. 언급하더라도 "bonus" 수준 한 줄
- **시각 자료**: 실제 HTML 리포트 스크린샷 2-3장 + 데모 영상 링크
- **포스팅 시간**: EST 8-10am (KST 21-23시)

## Target

- **1차**: r/ClaudeAI (더 넓은 사용자층, 반응 테스트)
- **2차**: r/ClaudeCode (반응 보고 결정, 더 기술적 버전으로 조정 가능)

## Post Format

텍스트 포스트 + 인라인 이미지 (본문에 스크린샷 삽입, 이미지 전용 포스트 아님)

## Title

```
Tired of reading plugin READMEs? I made a tool that auto-generates interactive visual wiki reports for any Claude Code plugin
```

## Body Structure

### 1) Hook (2-3 sentences) — Problem empathy

Claude Code plugins are getting more complex and heavier by the day. Skills, hooks, agents, MCP servers — some plugins have dozens of components wired together. At some point, skimming a README just doesn't cut it anymore.

### 2) Solution (2-3 sentences) — What I built

So I built a plugin that takes any plugin path or GitHub URL and auto-generates an interactive HTML wiki report. Architecture diagrams, skill breakdowns, hook mappings, agent relationships — everything laid out on a single page you can actually navigate.

### 3) Media — Report screenshots

분석 대상: 유명한 서드파티 플러그인 (예: superpowers, taskmaster 등 사용자들이 알만한 것)

스크린샷 구성:
- 1장: 플러그인 프로필 + 개요 섹션 (한눈에 뭔지 파악)
- 1장: 아키텍처 다이어그램 (Mermaid 기반 인터랙티브)
- 1장: 스킬/에이전트 구조 breakdown

데모 영상: video/product-demo/out/product-demo.mp4 활용 가능

### 4) Usage (3 lines) — Install + run

```
claude plugin add vision-powers@claude-code-zero
```

Then just ask Claude:
```
"analyze this plugin at ./plugins/some-plugin"
"analyze github.com/owner/repo"
```

### 5) Closing (2 sentences) — Casual feedback ask

It's part of a personal plugin collection I've been building. Would love to hear if this is useful for your workflow or if you have ideas to improve it.

### 6) Link

GitHub: https://github.com/LeeJuOh/claude-code-zero

## Anticipated Questions (댓글 대응)

| 예상 질문 | 답변 방향 |
|-----------|----------|
| "How is this different from just reading the source?" | README는 구조/관계를 안 보여줌. 이건 아키텍처 다이어그램 + 컴포넌트 관계를 자동 시각화 |
| "Does it work on any repo / non-plugin projects?" | 현재는 Claude Code 플러그인 전용. 향후 확장 가능 |
| "What model does it use? How many tokens?" | Claude가 분석하고 HTML 생성. 토큰은 플러그인 크기에 따라 다름 |
| "Can I see a live demo / hosted report?" | 스크린샷 참고 + GitHub에서 직접 설치해서 돌려볼 수 있음 |
| "Is this safe? Does it execute plugin code?" | 코드 실행 없음. 파일을 읽고 분석만 함 |

## Checklist (before posting)

- [ ] 리포트 스크린샷 2-3장 준비 (다양한 플러그인 분석 결과)
- [ ] 데모 영상 링크 준비 (선택)
- [ ] 포스팅 시간 확인 (KST 21-23시)
- [ ] 실제 설치 커맨드 동작 확인
- [ ] r/ClaudeAI 서브레딧 규칙 확인 (셀프 프로모션 정책)
