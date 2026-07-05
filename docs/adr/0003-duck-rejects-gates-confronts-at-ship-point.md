---
status: accepted
---

# 0003 — rubber-duck-tutor: forcing-function gate 거부, ship point에서 confront

## Context

rubber-duck-tutor가 존재하는 이유: AI는 개발자가 *사고*는 외주 줘도 *이해*는 못 주게 함 — 방치하면
개발자는 AI 출력을 파악 없이 rubber-stamp함. 플러그인의 두 원칙이 반대 방향으로 당김:

- **(A) 이해는 외주 불가** → 플러그인은 그것을 *검증할* 의무가 있음.
- **(B) "학습은 생산성과 경쟁하면 안 됨"**(duck 신조) → 그것을 *강제하면* 안 됨.

`references/no-numb`(레퍼런스 플러그인)는 Stop-훅 **forcing function**으로 이를 해결: 개발자가 퀴즈를
통과할 때까지 세션을 막음. 원칙 B를 위반하며 원칙 A를 지키는 방식.

Anthropic 학습 연구("17%" 연구)는 반대를 가리킴: 학습 효과는 *gate*가 아니라 *질문*에서 옴 — 이득을
본 집단은 **자발적** 질문자였지, 벽에 강제된 사람들이 아니었음.

## Decision

차단형 gate(Stop-block)와 객관식 퀴즈를 거부. 핵심을 떠받치는 구분:

- **gate**는 조건 충족까지 작업을 막음 → 원칙 B 위반.
- **confrontation**은 비차단·기본 켜짐 → 두 원칙 모두 지킴.

검증은 **ship-point confrontation**으로 발사: `git push` / `gh pr create` / `glab mr create` 시
방금 배포한 변경에 대한 인라인 이해 질문 하나. 비차단·기본 켜짐·config로 끌 수 있음.

검증 **단위(grain)**는 기본적으로 **artifact** — 산출물이 *무엇을* 하고 *왜* 하는지 — 줄 단위 코드
이해가 아님(전수 검증은 비현실적). code-level 이해는 **자발적** 심층 레이어(`duck-verify`)로 남으며,
강제 기본값이 절대 아님.

duck과 no-numb은 대체재가 아니라 **보완재**. 하드 gate를 원하는 유저는 둘 다 설치; duck은 no-numb의
forcing function을 가져오지 않음.

## Considered options

- **(A) Forcing-function gate (no-numb 스타일)** — 거부: 이질적 정체성을 들여오고 원칙 B 위반
  (마찰-as-기능이 생산성과 경쟁).
- **(B) 객관식 퀴즈** — 거부: gate 형태이고, 효과는 형식이 아니라 질문에 있음. 개방형 소크라테스식이
  가두지 않고 같은 효과를 잡음.
- **(C) 순수 자발적 소크라테스식, 아무 때나** — 거부: 기본-켜짐 레이어가 없으면 검증은 opt-in으로
  붕괴하고 대다수 유저에게 원칙 A가 포기됨.
- **(D, 선택) 비차단 ship-point confrontation, artifact 단위, 기본 켜짐** — 원칙 A(항상 confront됨)와
  원칙 B(절대 안 막음)를 모두 지킴.

## Consequences

- **ship-point 훅이 원칙 A의 하중을 짊어짐**. 이를 빼면 자발적 소크라테스식만 남음 — 검증 의무가 소멸.
  §1(gate 거부)과 §3(ship-point confrontation)은 함께 읽어야 함: §1은 차단형 gate를 제거하고, §3이
  비차단 이빨을 공급.
- 기본 검증 단위는 artifact-level; 전수 코드-줄 이해는 명시적으로 대상이 **아님**.
- **shared ship budget** — `{git push, gh pr create, glab mr create}`는 세션당 최대 한 번 발사,
  먼저가 이김 — 플랫폼·도구 간 중복 confrontation을 방지.
- duck은 절대 안 막음. 하드 강제를 원하는 유저는 duck을 gate로 만들기보다 duck + no-numb을 조합.
- **`ducking` 엔진은 스킬이 아님 (2026-07-05 확정).** S4에서 엔진을 "rubber-stamping 감지 시 모델이
  스스로 발동"하는 스킬로 승격했으나, trigger eval 실측 2/8 — 단일턴 도구의 구조적 한계이자 스킬
  일반의 undertriggering 성향. 자발적 모델 발동에 원칙 A의 하중을 얹으면 25% 안전망이 *가짜 안심*을
  만듦. 위 "ship-point 훅이 원칙 A의 하중을 짊어짐"과 레포 원칙(deterministic-over-clever)에 따라
  엔진은 참조 문서(`skills/ducking/engine.md`)로 존치 — 호출 대상이 아니라 모드 스킬이 읽어 들이는
  공유 콘텐츠이고, 자동 confront는 전적으로 훅이 담당. 대화 중간 "lgtm" 순간(훅 미커버)은 의도적으로
  비대상으로 둠; 필요해지면 결정론적 훅(프롬프트 키워드 스캔)으로 별도 처리, 모델 재량 발동으로
  되돌리지 않음.
