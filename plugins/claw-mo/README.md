# claw-mo

[mo](https://github.com/k1LoW/mo)를 Claude Code 안에서 바로 쓸 수 있게 해주는 플러그인.

`mo`는 마크다운을 브라우저에서 라이브 프리뷰하는 CLI 도구인데, 직접 쓰려면 포트 번호 기억하고, watch 패턴 매번 입력하고, 서버가 이미 떠 있는지 확인해야 합니다. 이 플러그인은 프로젝트별 설정을 저장해서 `/claw-mo` 한 마디로 끝나게 합니다.

## Prerequisites

- [mo](https://github.com/k1LoW/mo): `brew install k1LoW/tap/mo`

## Quick Start

```
/claw-mo setup     ← 처음 한 번: 어떤 .md 파일을 볼지 설정
/claw-mo           ← 이후엔 이것만: 서버 시작 + 브라우저 열기
```

## Commands

| Command | Description |
|---------|-------------|
| `/claw-mo` | Start server + open browser (idempotent) |
| `/claw-mo setup` | Configure watch patterns and port for current project |
| `/claw-mo status` | Show running mo servers |
| `/claw-mo stop` | Stop server for current project |
| `/claw-mo add <pattern>` | Add a watch pattern to current config |
| `/claw-mo remove <pattern>` | Remove a watch pattern from current config |
| `/claw-mo reset` | Clear mo session (fresh start) |

## Configuration

`setup`이 생성하는 설정 파일. `${CLAUDE_PLUGIN_DATA}/config.json`에 프로젝트별로 저장됩니다:

```json
{
  "/path/to/project": {
    "port": 6342,
    "patterns": ["docs/**/*.md", "*.md"]
  }
}
```

- **port**: 프로젝트 경로 해시 기반 자동 할당 (6300-6399), setup에서 변경 가능
- **patterns**: mo에 전달할 watch glob 패턴들
