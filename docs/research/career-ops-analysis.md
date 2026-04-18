# Career-Ops 분석

> 분석일: 2026-04-18 | 소스: `references/career-ops/` 로컬 레퍼런스 레포 | 검증: README, CLAUDE.md, SKILL.md, 모드 파일, 핵심 스크립트 교차 확인

## 한 줄 요약

Career-Ops는 Claude Code를 중심으로 만든 **로컬 AI 취업 운영체제**다. 단순 이력서 생성기가 아니라, **채용공고 수집 → 적합도 평가 → 맞춤형 CV/PDF 생성 → 지원 파이프라인 추적 → 인터뷰 준비**까지 이어지는 파일 기반 워크플로우를 제공한다.

---

## 무엇을 하는 도구인가

README 기준 핵심 포지셔닝은 “spray-and-pray 지원 자동화”가 아니라 **좋은 공고만 고르는 필터**다 (`references/career-ops/README.md:45`).

즉, 이 도구의 목적은 대량 지원이 아니라:
- 여러 채용 포털에서 공고를 모으고
- 내 프로필과 맞는지 구조적으로 평가하고
- 맞는 공고에만 JD 맞춤형 CV/PDF를 만들고
- 지원 상태와 후속 액션을 추적하고
- 면접에 들어가면 회사별 인터뷰 준비 문서까지 만드는 것
이다.

윤리 규칙도 분명하다.
- 자동 제출 금지
- 저적합 공고 지원 비권장
- 사람의 최종 검토 필수

이 원칙은 `README.md`와 `CLAUDE.md` 양쪽에 반복해서 들어가 있다.

---

## 어떻게 쓰는가

## 기본 사용 흐름

1. 설치
   - `npm install`
   - `npx playwright install chromium`
2. 환경 점검
   - `npm run doctor`
3. 개인 데이터 준비
   - `cv.md`
   - `config/profile.yml`
   - `portals.yml`
4. Claude Code에서 실행
   - `/career-ops`
   - 또는 JD URL/텍스트를 바로 붙여 넣기

관련 근거:
- 빠른 시작: `references/career-ops/README.md:78`
- 설치 점검 스크립트: `references/career-ops/package.json:5`
- 환경 검사 내용: `references/career-ops/doctor.mjs:152`

## 명령 진입점

실제 진입점은 `.claude/skills/career-ops/SKILL.md`의 라우터다.

이 라우터는 입력에 따라 다음 모드로 보낸다.
- `scan`: 포털 스캔
- `oferta`: 단일 공고 평가
- `ofertas`: 여러 공고 비교
- `pdf`: CV/PDF 생성
- `tracker`: 상태 보기
- `apply`: 지원 보조
- `batch`: 병렬 배치 처리
- `interview-prep`: 면접 준비
- JD 텍스트/URL 직접 입력 시 `auto-pipeline`

즉 `/career-ops`는 하나의 기능이 아니라 **모드 라우터**다 (`references/career-ops/.claude/skills/career-ops/SKILL.md:9`).

---

## 핵심 기능

## 1. 공고 평가

핵심 평가 모드는 `modes/oferta.md`다.

이 모드는 JD를 읽고 먼저 archetype을 분류한다.
예: AI Platform / LLMOps / Agentic / Technical AI PM / Solutions Architect / Forward Deployed / Transformation 등 (`references/career-ops/modes/_shared.md:73`).

그 뒤 평가를 다음 블록으로 만든다.
- A: 역할 요약
- B: CV 매칭 및 갭 분석
- C: 레벨/포지셔닝 전략
- D: 보상/시장 조사
- E: CV/LinkedIn 개인화 계획
- F: 인터뷰 준비용 STAR+R 스토리
- G: 공고 진위성/유효성 평가

근거:
- 평가 블록 정의: `references/career-ops/modes/oferta.md:12`
- 점수 체계: `references/career-ops/modes/_shared.md:26`
- legitimacy 블록: `references/career-ops/modes/oferta.md:88`

## 2. 포털 스캐너

`scan.mjs`는 Greenhouse, Ashby, Lever API를 직접 호출하는 **zero-token scanner**다 (`references/career-ops/scan.mjs:4`).

구현 방식:
- `portals.yml`에서 회사 목록과 필터 로드
- URL 패턴으로 어떤 ATS API를 쓸지 자동 판별 (`detectApi`) (`references/career-ops/scan.mjs:37`)
- API 응답을 공통 job 포맷으로 정규화 (`parseGreenhouse`, `parseAshby`, `parseLever`) (`references/career-ops/scan.mjs:77`)
- 제목 필터 적용 (`references/career-ops/scan.mjs:123`)
- 기존 `scan-history.tsv`, `pipeline.md`, `applications.md`와 비교해 중복 제거 (`references/career-ops/scan.mjs:139`)
- 새 공고만 `data/pipeline.md`와 `data/scan-history.tsv`에 추가 (`references/career-ops/scan.mjs:188`)

즉 이 기능은 LLM 추론보다 **결정론적 수집 + 중복 제거 + 큐 적재**에 가깝다.

## 3. 파이프라인 추적

Career-Ops는 DB 대신 파일을 source of truth로 쓴다.

핵심 파일:
- `data/applications.md` — 메인 지원 트래커
- `data/pipeline.md` — 아직 처리 안 한 URL inbox
- `data/scan-history.tsv` — 스캔 중복 방지 이력
- `reports/` — 평가 리포트
- `output/` — 생성된 PDF

근거: `references/career-ops/CLAUDE.md:50`

무결성 유지 스크립트도 따로 있다.
- `verify-pipeline.mjs`: 상태값, 중복, 링크, 점수 포맷, TSV merge 상태 검사 (`references/career-ops/verify-pipeline.mjs:3`)
- `normalize-statuses.mjs`, `dedup-tracker.mjs`, `merge-tracker.mjs`: 정규화/중복제거/병합

즉 이 시스템은 “AI가 모든 걸 기억하는” 구조가 아니라 **파일을 지속 상태 저장소로 쓰는 작은 로컬 운영체제**에 가깝다.

## 4. 배치 처리

`batch/batch-runner.sh`는 `claude -p` 워커를 띄워 여러 공고를 병렬 처리한다 (`references/career-ops/batch/batch-runner.sh:4`).

구현 포인트:
- `batch-input.tsv`를 입력으로 읽음
- state 파일(`batch-state.tsv`)로 진행 상황과 재시도 횟수 관리 (`references/career-ops/batch/batch-runner.sh:130`)
- 리포트 번호를 잠금 기반으로 예약해 충돌 방지 (`references/career-ops/batch/batch-runner.sh:223`)
- 워커별 로그 저장
- 마지막에 tracker merge + pipeline verify 자동 실행 (`references/career-ops/batch/batch-runner.sh:396`)

즉 “Claude 여러 개 병렬 실행”을 안전하게 파일 잠금과 상태 파일로 감싼 오케스트레이터다.

## 5. TUI 대시보드

Go + Bubble Tea 기반 TUI가 별도로 있다 (`references/career-ops/README.md:171`).

`dashboard/internal/ui/screens/pipeline.go`를 보면:
- 상태별 탭 필터링
- 점수/날짜/회사/상태 정렬
- grouped / flat view
- 리포트 미리보기 lazy loading
- 상태 변경 picker
- 리포트 열기 / URL 열기
같은 흐름이 구현돼 있다 (`references/career-ops/dashboard/internal/ui/screens/pipeline.go:59`, `references/career-ops/dashboard/internal/ui/screens/pipeline.go:239`).

---

## 인터뷰 준비는 어떻게 돌아가나

## 두 단계 구조

Career-Ops의 인터뷰 준비는 두 단계로 나뉜다.

### 1) 평가 시점의 인터뷰 준비 초안

`modes/oferta.md`의 Block F가 먼저 6~10개의 STAR+R 스토리를 뽑는다 (`references/career-ops/modes/oferta.md:67`).

여기서 하는 일:
- JD 요구사항별로 어떤 사례를 말할지 매핑
- STAR뿐 아니라 Reflection까지 요구
- archetype에 맞게 강조점 조정
  - FDE: 빠른 delivery, client-facing
  - SA: 아키텍처 의사결정
  - PM: discovery, trade-off
  - LLMOps: evals, observability, hardening
- `interview-prep/story-bank.md`에 기존 스토리가 있는지 보고, 없으면 누적 (`references/career-ops/modes/oferta.md:74`)

즉 평가 결과 자체가 이미 **행동 면접용 스토리 뼈대**를 만든다.

### 2) 회사별 interview-prep 모드

그다음 면접 단계에 들어가면 `modes/interview-prep.md`가 별도 작동한다 (`references/career-ops/modes/interview-prep.md:1`).

입력:
- 회사명 / 역할명
- 기존 평가 리포트
- story bank
- CV / article-digest
- profile / _profile

진행:
1. WebSearch로 Glassdoor/Blind/LeetCode discuss/엔지니어링 블로그 조사 (`references/career-ops/modes/interview-prep.md:13`)
2. 실제 알려진 라운드와 질문 정리
3. 기술 / 행동 / 역할별 질문 분류
4. 각 질문을 기존 story bank에 매핑 (`references/career-ops/modes/interview-prep.md:80`)
5. 없는 스토리는 gap으로 표시하고, 어떤 경험을 STAR+R로 만들어야 할지 제안 (`references/career-ops/modes/interview-prep.md:90`)
6. 최대 10개까지 기술 준비 체크리스트 생성 (`references/career-ops/modes/interview-prep.md:94`)
7. 회사 문화/용어/피해야 할 표현/역질문까지 정리 (`references/career-ops/modes/interview-prep.md:106`)

최종 결과물은 `interview-prep/{company}-{role}.md`로 저장된다 (`references/career-ops/modes/interview-prep.md:117`).

## 핵심 해석

이 구조의 핵심은 **면접 준비를 JD 기반 개인화된 research artifact로 만든다**는 점이다.

그냥 “면접 질문 모음”이 아니라:
- 실제 후보자 후기
- 해당 회사의 기술 블로그/가치관
- 내 CV와 proof point
- 누적된 story bank
를 합쳐서 **회사별 prep packet**을 만드는 방식이다.

---

## 맞춤형 CV/PDF 생성은 어떻게 돌아가나

## 목적

이 기능은 범용 이력서 첨삭기라기보다 **특정 JD에 맞춘 ATS 최적화 CV 생성기**에 가깝다.

핵심 모드는 `modes/pdf.md`다 (`references/career-ops/modes/pdf.md:1`).

## 생성 흐름

`pdf.md` 기준 전체 흐름은 다음과 같다.

1. `cv.md`를 source of truth로 읽음
2. JD 텍스트/URL 확보
3. JD에서 핵심 키워드 15~20개 추출
4. JD 언어에 따라 CV 언어 결정
5. 지역에 따라 종이 포맷 결정 (`letter`/`a4`) (`references/career-ops/modes/pdf.md:9`)
6. archetype 탐지 후 framing 조정
7. Professional Summary를 JD 중심으로 재작성 (`references/career-ops/modes/pdf.md:13`)
8. 관련 프로젝트 3~4개만 선택 (`references/career-ops/modes/pdf.md:14`)
9. 경력 bullet을 JD 적합도 순으로 재배열 (`references/career-ops/modes/pdf.md:15`)
10. competency grid를 JD 요구사항으로 구성 (`references/career-ops/modes/pdf.md:16`)
11. 기존 경험 표현 안에서만 키워드를 자연 주입 (`references/career-ops/modes/pdf.md:17`)
12. HTML 템플릿 완성
13. 임시 HTML을 `/tmp`에 저장
14. `generate-pdf.mjs`로 PDF 생성 (`references/career-ops/modes/pdf.md:21`)

## 중요한 제약

이 시스템은 **없는 경험을 만들지 않는다.**

문서에서 반복해서 말하는 규칙:
- skills를 발명하지 말 것
- 기존 경험을 JD 문구에 맞게 다시 표현할 것
- ATS 키워드 주입은 truth-preserving 방식으로 할 것

근거:
- keyword injection 규칙: `references/career-ops/modes/pdf.md:55`
- global NEVER rules: `references/career-ops/modes/_shared.md:90`

즉 “resume optimization”은 사실상
**재작성 + 재정렬 + 용어 정합화**다.

## HTML/PDF 구현 메커니즘

템플릿은 `templates/cv-template.html`이며 특징은:
- single-column layout
- ATS 친화적인 표준 section 제목
- 텍스트 selectable PDF 전제
- 이미지 기반 텍스트 없음
- Space Grotesk + DM Sans self-hosted font 사용

근거:
- ATS 규칙: `references/career-ops/modes/pdf.md:24`
- 템플릿 구조: `references/career-ops/templates/cv-template.html:72`

실제 렌더링은 `generate-pdf.mjs`가 담당한다.

이 스크립트는:
- Playwright Chromium headless 실행 (`references/career-ops/generate-pdf.mjs:13`)
- 템플릿 내부 font 경로를 절대 file URL로 치환 (`references/career-ops/generate-pdf.mjs:116`)
- ATS 파싱을 방해하는 Unicode를 ASCII 중심으로 정규화 (`references/career-ops/generate-pdf.mjs:24`)
- `page.pdf()`로 실제 PDF 출력 (`references/career-ops/generate-pdf.mjs:150`)
- 페이지 수와 파일 크기까지 보고
한다.

즉 이 기능은 “LLM이 PDF를 직접 그린다”가 아니라,
**LLM이 HTML 내용을 맞춤 생성하고 Playwright가 렌더링하는 하이브리드 구조**다.

---

## 구조적으로 왜 잘 작동하는가

Career-Ops가 흥미로운 이유는 기능보다도 **구성 방식** 때문이다.

## 1. 프롬프트와 결정론적 스크립트의 분리

- 판단/서술/개인화: mode markdown + Claude
- 수집/검증/병합/PDF 렌더링: `.mjs` 스크립트

이 분리 덕분에 “LLM이 잘하는 것”과 “스크립트가 잘하는 것”이 섞이지 않는다.

## 2. 파일 기반 상태 저장

DB 없이도 다음이 가능하다.
- 공고 inbox
- 지원 tracker
- 스캔 히스토리
- story bank
- 면접 준비 문서
- PDF 산출물

작고 로컬 중심인 개인 시스템에서는 이 방식이 오히려 단순하고 투명하다.

## 3. AI CLI 친화적 구조

이 시스템은 Claude Code/OpenCode 같은 AI CLI를 운영체제처럼 사용한다.
- slash command router
- mode별 prompt contract
- batch worker prompt
- 사람이 수정 가능한 markdown/yaml source of truth

즉 앱보다는 **agent-native workflow kit**에 더 가깝다.

---

## 한계와 해석

## 강점

- 개인 맞춤형 취업 파이프라인을 한 디렉터리 안에 묶는다
- 인터뷰 준비를 story bank 중심의 누적 자산으로 만든다
- CV/PDF 생성을 JD 맞춤으로 세밀하게 조정한다
- 파일과 스크립트가 분리되어 구조가 비교적 투명하다

## 한계

- 사용자가 `cv.md`, `profile.yml`, `portals.yml` 등 초기 세팅을 해줘야 품질이 오른다
- 범용 SaaS보다는 power-user/AI CLI 사용자에게 맞다
- 면접 준비 품질은 외부 검색 신호(Glassdoor/Blind 등)에 의존한다
- CV 생성은 “첨삭 엔진”보다는 “JD 맞춤 최적화 엔진”에 더 가깝다

---

## 최종 정리

Career-Ops는 단순히 “AI로 이력서 만들어주는 레포”가 아니다.

더 정확히 말하면:
- **공고를 수집하고**
- **내 커리어 서사와 맞는지 평가하고**
- **맞는 공고에 한해 CV/PDF를 최적화하고**
- **상태를 파일 기반으로 추적하고**
- **면접 단계에서는 story bank와 외부 리서치를 합쳐 회사별 prep 문서를 만드는**
로컬 agent-native 취업 운영체제다.

특히 인터뷰 준비와 CV/PDF 생성은 서로 분리된 기능이 아니라,
**평가 결과를 재사용하는 후속 단계**로 설계돼 있다는 점이 핵심이다.