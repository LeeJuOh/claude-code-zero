# claw-mo

[mo](https://github.com/k1LoW/mo)를 Claude Code 안에서 바로 쓸 수 있게 해주는 플러그인.

`mo`는 마크다운을 브라우저에서 라이브 프리뷰하는 CLI 도구인데, 직접 쓰려면 포트 번호 기억하고, watch 패턴 매번 입력하고, 그룹 관리하고, 서버가 이미 떠 있는지 확인해야 합니다. 에이전틱 코딩하면 docs, plans, specs 등 마크다운이 쏟아지는데, 이 플러그인이 프로젝트별 설정을 저장하고 그룹으로 분류해서 한 마디로 끝나게 합니다.

cmux 환경이면 터미널 옆 브라우저 패널에서 바로 확인할 수 있어서 더 좋습니다.

## Prerequisites

- [mo](https://github.com/k1LoW/mo): `brew install k1LoW/tap/mo`
- (Optional) [cmux](https://cmux.dev): 터미널 옆 브라우저 패널로 더 편하게

## Quick Start

```
/claw-mo-setup     ← 처음 한 번: 그룹별로 어떤 .md 파일을 볼지 설정
/claw-mo-up        ← 이후엔 이것만: 서버 시작 + 브라우저 열기
```

## Commands

| Command | Description |
|---------|-------------|
| `/claw-mo-up` | Start server + open browser |
| `/claw-mo-down` | Stop server for current project |
| `/claw-mo-setup` | Configure groups, watch patterns, and port |
| `/claw-mo-open <path>` | Add a file or directory to mo and open it |
| `/claw-mo-manage` | Interactive management (status, patterns, groups, reset) |

## Configuration

`setup`이 생성하는 설정 파일. `${CLAUDE_PLUGIN_DATA}/config.json`에 프로젝트별로 저장됩니다:

```json
{
  "/path/to/project": {
    "port": 6342,
    "groups": {
      "docs": ["docs/**/*.md"],
      "plans": ["plans/*.md"],
      "default": ["*.md"]
    }
  }
}
```

- **port**: 프로젝트 경로 해시 기반 자동 할당 (6300-6399), setup에서 변경 가능
- **groups**: 그룹명 → watch glob 패턴 배열. mo 브라우저에서 탭으로 분리됨
