# DeepTutor 분석

> 분석일: 2026-04-10 | 소스: [HKUDS/DeepTutor](https://github.com/HKUDS/DeepTutor) + [deeptutor.knowhiz.us](https://deeptutor.knowhiz.us)

## 한 줄 요약

HKU Data Intelligence Lab(HKUDS)이 만든 agent-native 개인 튜터링 플랫폼. Python/Next.js 기반 OSS 자체 호스팅 버전과 별도 상용 SaaS로 분리 운영.

---

## 사용법

4가지 진입점:

| 방법 | 커맨드 | 특징 |
|---|---|---|
| **Setup Tour (권장)** | `python scripts/start_tour.py` | 대화형 가이드, .env 편집 불필요 |
| Manual Install | `pip install -e ".[server]"` + npm | 직접 제어 |
| Docker | `docker compose -f docker-compose.ghcr.yml up -d` | Python/Node 불필요 |
| CLI Only | `pip install -e ".[cli]"` | 웹 UI 없이 터미널만 |

실행 후: 웹 UI `http://localhost:3782`, FastAPI 백엔드 `:8001`

---

## 인증 메커니즘

### OSS 자체 호스팅 — API key 전용

`.env`에 LLM/Embedding API key만 설정:

```dotenv
LLM_BINDING=openai
LLM_API_KEY=sk-xxx

EMBEDDING_BINDING=openai
EMBEDDING_API_KEY=sk-xxx
```

앱 레벨 사용자 인증(회원가입/로그인) 없음. 멀티유저 로그인은 🔜 로드맵 단계.

### Provider OAuth — provider 레벨만 해당

일부 LLM 서비스는 API key가 없고 OAuth만 지원:

```bash
deeptutor provider login openai-codex    # ChatGPT 계정으로 OAuth → Codex 토큰 획득
deeptutor provider login github-copilot  # 기존 Copilot 세션 검증
```

**이건 DeepTutor 자체 사용자 인증이 아님.** DeepTutor가 LLM 서비스에 대신 로그인해서 API 접근권을 얻는 것.

**실용적 의미**: OpenAI API key 없어도 ChatGPT 구독(Codex) 또는 GitHub Copilot 구독으로 DeepTutor를 돌릴 수 있음.

### 상용 서비스 (deeptutor.knowhiz.us)

이메일 회원가입 + 유료 플랜 있음. Google/GitHub 소셜 로그인 여부는 미확인.

---

## 구현 구조

```
Python 3.11+ + FastAPI (백엔드, :8001)
Next.js 16 + React 19 + TypeScript + Tailwind CSS (프론트엔드, :3782)

LlamaIndex      → RAG pipeline, 문서 인덱싱 backbone
nanobot         → TutorBot agent engine (HKUDS 자체 프레임워크)
ManimCat        → Math Animator (수식 애니메이션)
```

### 지원 LLM 프로바이더 (20개 이상)

OpenAI, Anthropic, DeepSeek, Gemini, Groq, Mistral, Ollama, vLLM, OpenRouter,
Zhipu, DashScope/Qwen, Moonshot, MiniMax, VolcEngine, SiliconFlow, Xiaomi MIMO,
**OpenAI Codex (OAuth)**, **GitHub Copilot (OAuth)** 등

### 주요 기능 모듈

- **Chat**: 5개 모드 (Chat, Deep Solve, Quiz, Deep Research, Math Animator)
- **TutorBot**: 독립 메모리/퍼스널리티를 가진 persistent agent
- **Co-Writer**: AI 협업 Markdown 에디터
- **Guided Learning**: RAG 기반 단계별 학습 경로 생성
- **Knowledge Hub**: PDF/MD/TXT 업로드 → RAG-ready 지식베이스
- **Memory**: 학습자 프로파일 + 진도 요약 영속 유지

### Agent-Native 설계

프로젝트 루트의 `SKILL.md`를 LLM 에이전트에 전달하면 에이전트가 DeepTutor를 자율 조작 가능:

```bash
deeptutor run chat "질문" -f json   # 구조화 JSON 출력 → 파이프라인용
```

---

## 철학

**"Agent-Native Personalized Tutoring"**

- 단순 채팅 wrapper가 아닌 agent 프레임워크 + 학습 플랫폼의 결합
- 핵심 원칙: grounded assistance — RAG, 인용, 영속 메모리, 멀티스텝 추론 우선
- CLI가 AI 에이전트를 위한 JSON 출력 지원 → DeepTutor 자체가 에이전트에게 도구가 됨

**출처**: HKU Data Intelligence Lab (HKUDS). LightRAG, AutoAgent, nanobot을 만든 같은 연구팀 — 학술/연구자 중심 설계.

---

## 주의사항

- **PyPI 패키지 (`realtimex-deeptutor`) 는 v0.5.x로 구버전** — 최신 코드(v1.0.0-beta.4)는 GitHub 클론 필요
- 공개 배포 시 앱 레벨 인증 없어 누구나 접속 가능 — 인트라넷/VPN 뒤에 두거나 멀티유저 auth 로드맵 완료 후 사용 권장
- LightRAG 통합은 로드맵 단계 (같은 팀 프로젝트)
