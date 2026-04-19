# Semantic Tokens

vision-powers의 단일 색/폰트 소스. 모든 Layer 1 스킬은 이 파일의 **시맨틱 역할**로만 색과 폰트를 참조한다.

## 시맨틱 역할

| Role | Purpose | Default (light) | Default (dark) |
|---|---|---|---|
| `paper`, `paper-2` | 페이지/컨테이너 배경 | `#faf7f2` | `#1c1917` |
| `ink` | 주 텍스트/주 선 | `#1c1917` | `#faf7f2` |
| `muted`, `soft` | 보조 텍스트/기본 화살표 | `#57534e` | `#a8a29e` |
| `rule` | 헤어라인 | rgba(28,25,23,.12) | rgba(250,247,242,.12) |
| `accent`, `accent-tint` | focal (1–2 / diagram) | `#b5523a` | `#d6724a` |
| `link` | HTTP/API/외부 | `#2563eb` | `#60a5fa` |

## 폰트 3종

| Role | Family | Usage |
|---|---|---|
| `title` | Instrument Serif | 페이지 H1, 리포트 제목 |
| `body` | Geist (sans) | 본문, 노드 이름 |
| `mono` | Geist Mono | 기술 콘텐츠 한정 (포트/URL/경로) |

**JetBrains Mono를 블랭킷 dev 폰트로 쓰지 않는다.** Mono는 기술 콘텐츠 전용.

## Mermaid themeVariables 매핑

```
paper        → canvasColor, background
paper-2      → secondaryColor, tertiaryColor (서브그래프/컨테이너 배경)
ink          → primaryTextColor, primaryBorderColor
muted        → lineColor, secondaryTextColor
accent       → primaryColor (focal 노드)
accent-tint  → primaryColor fill tint (focal 노드 내부 채움)
link         → 외부 edge color
```

사용 예:
```
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#b5523a',
    'primaryBorderColor': '#1c1917',
    'lineColor': '#57534e',
    'primaryTextColor': '#1c1917'
  }
}}%%
```

## 토큰 세트 (aesthetic-rotation.js용)

aesthetic-rotation.js가 다음 세트 중 하나를 선택:

1. **warm-stone** (default, light) — 위 표의 기본값
2. **cool-slate** — paper `#f1f5f9`, ink `#0f172a`, accent `#0369a1`
3. **editorial-ink** — paper `#fafaf9`, ink `#18181b`, accent `#7c2d12`
4. **blueprint** — paper `#eff6ff`, ink `#1e3a8a`, accent `#dc2626`
5. **warm-stone-dark** — 위 dark 컬럼
6. **cool-slate-dark** — cool-slate의 역전

## FORBIDDEN

- `rgba()` in Mermaid classDef (파서 붕괴 — 8-digit hex `#RRGGBBAA` 사용)
- violet/fuchsia 계열 (`#8b5cf6`, `#7c3aed`, `#a78bfa`, `#d946ef`) 기본 팔레트
- JetBrains Mono 블랭킷 사용
