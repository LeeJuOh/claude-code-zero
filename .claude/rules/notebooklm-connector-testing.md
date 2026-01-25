---
paths:
  - plugins/notebooklm-connector/**
---

Source: Manage Claude's memory - Claude Code Docs
Quote: "Rules can be scoped to specific files using YAML frontmatter with the paths field. These conditional rules only apply when Claude is working with files matching the specified patterns."

# NotebookLM Connector Plugin - Testing Guide

플러그인을 테스트하는 방법입니다.

---

## 사전 준비

### 1. Claude Code CLI 확인
```bash
claude --version
# 2.0.73 이상이어야 함
```

### 2. Chrome 확장 설치 확인
- Chrome 열기 → `chrome://extensions`
- "Claude in Chrome" 확장이 설치되어 있고 활성화되어 있는지 확인
- 버전 1.0.36 이상

### 3. NotebookLM 로그인
- Chrome에서 https://notebooklm.google.com 열기
- Google 계정으로 로그인
- 테스트용 노트북 하나 생성 (아무 문서나 업로드)

---

## 테스트 순서

### Phase 1: 플러그인 인식 확인

**표기 규칙**: `<repo-root>`는 이 저장소 루트( `plugins/` 폴더가 있는 위치 )를 의미합니다.

**1. 플러그인 디렉토리 확인**
```bash
cd <repo-root>
ls -la plugins/notebooklm-connector/
```

**기대 결과:**
```
.claude-plugin/
agents/
skills/
README.md
TESTING.md
```

**2. Claude Code 실행 (Chrome 통합 활성화)**
```bash
cd <repo-root>
claude --chrome --plugin-dir ./plugins/notebooklm-connector
```

**참고**: 플러그인을 이미 전역 설치했다면 `--plugin-dir` 없이 실행해도 됩니다.

**3. 플러그인 로드 확인**
```
[Claude Code 실행됨]

You: "What plugins do I have?"
```

**기대 응답:**
```
You have the notebooklm-connector plugin installed, which includes:
- Skill: notebook-registry
- Agent: notebooklm-chrome-researcher
```

---

### Phase 2: Chrome 통합 테스트

**1. Chrome 연결 확인**
```
You: "/chrome"
```

**기대 응답:**
```
Chrome Integration
Status: ✓ Connected
Extension: Claude in Chrome (v1.0.36+)
```

**문제 발생 시:**
- Chrome이 실행 중인지 확인
- 확장이 활성화되어 있는지 확인
- Claude Code 재시작: Ctrl+C → `claude --chrome --plugin-dir ./plugins/notebooklm-connector`

---

### Phase 3: 레지스트리 스킬 테스트

**1. 빈 노트북 목록 확인**
```
You: "List my notebooks"
```

**기대 응답:**
```
No notebooks found.

To get started:
1. Add a notebook: add <url>
...
```

**2. 노트북 추가 (수동)**
```
You: "Add this notebook:
URL: https://notebooklm.google.com/notebook/<your-notebook-id>
Name: Test Notebook
Topics: Testing, Demo
Description: Test notebook for plugin validation"
```

**기대 응답:**
```
✅ Notebook added successfully!

Name: Test Notebook
ID: test-notebook
Topics: Testing, Demo

Next steps:
- Query: "Ask my test-notebook about [topic]"
...
```

**3. 노트북 목록 다시 확인**
```
You: "List my notebooks"
```

**기대 응답:**
```
📚 Active Notebooks (1)

1. test-notebook
   Topics: Testing, Demo
   Last used: just now
```

**4. 노트북 상세 정보**
```
You: "Show test-notebook details"
```

**기대 응답:**
```
📖 Notebook: Test Notebook (test-notebook)
Status: ✅ Active
URL: https://notebooklm.google.com/notebook/...
...
```

---

### Phase 4: 에이전트 쿼리 테스트

**1. 간단한 쿼리**
```
You: "Ask my test-notebook: What content is in this notebook?"
```

**예상 동작:**
1. Chrome 새 탭 열림
2. NotebookLM 페이지로 이동
3. 채팅 히스토리 삭제 확인 (yes/no 물어봄)
4. 질문 입력
5. 응답 대기 (최대 120초)
6. 답변 추출 및 표시

**기대 응답:**
```
**Answer**: [NotebookLM의 응답]

**Citations**:
[1] "..."
    Source: [문서 이름]

🔍 Follow-up Investigation Needed?
...
```

**2. 오류 상황 테스트 - Chrome 미연결**
```bash
# Claude Code 재시작 (--chrome 없이)
claude --plugin-dir ./plugins/notebooklm-connector
```

```
You: "Ask my test-notebook about something"
```

**기대 응답:**
```
ERROR: Chrome integration not connected.

Solutions:
1. Start Claude Code with Chrome: claude --chrome
2. Or enable in current session: /chrome
...
```

**3. 오류 상황 테스트 - 존재하지 않는 노트북**
```
You: "Ask my nonexistent-notebook about something"
```

**기대 응답:**
```
ERROR: Notebook 'nonexistent-notebook' not found.

Did you mean:
- test-notebook (Topics: Testing, Demo)

Or try:
- View all: list
- Search: search <query>
```

---

### Phase 5: 스마트 추가 테스트 (선택)

**Chrome 통합 활성화 필요**

```
You: "Add this notebook (smart discovery):
https://notebooklm.google.com/notebook/<your-notebook-id>"
```

**예상 동작:**
1. Chrome 탭 열림
2. NotebookLM 접속
3. 자동 질문: "What is the content of this notebook?"
4. 응답 받아서 메타데이터 추출
5. 자동으로 이름, 주제, 설명 생성

**기대 응답:**
```
🔍 Discovering notebook content...
⏳ Querying NotebookLM...
✅ Notebook added successfully!

Name: [자동 추출된 이름]
ID: [자동 생성된 ID]
Topics: [자동 추출된 주제들]

📊 Discovered content:
[NotebookLM 응답 요약]
...
```

---

### Phase 6: 에러 처리 테스트

**1. 모달 대화상자 테스트**
- NotebookLM에서 채팅 히스토리 삭제 시 확인 대화상자가 나타날 수 있음
- 에이전트가 이를 감지하고 사용자에게 알려야 함

**2. 인증 만료 테스트**
- Chrome에서 로그아웃
- 쿼리 시도

**기대 응답:**
```
ERROR: Authentication required.

Status: Not logged in or session expired

Manual steps:
1. In the Chrome tab that just opened, log in to your Google account
...
```

**3. 타임아웃 테스트**
- 매우 큰 문서가 있는 노트북에 복잡한 질문

**기대 응답 (120초 후):**
```
TIMEOUT: Response timeout (120 seconds)

Possible causes:
- Network issues
- Very long document analysis
...

Options:
1. Retry
2. Cancel
3. Continue
```

---

## 테스트 체크리스트

### 필수 테스트
- [ ] 플러그인 로드 확인
- [ ] Chrome 통합 연결 확인
- [ ] 노트북 목록 (빈 상태)
- [ ] 노트북 추가 (수동)
- [ ] 노트북 목록 (1개)
- [ ] 노트북 상세 정보
- [ ] 노트북 쿼리 (성공)
- [ ] 에러: Chrome 미연결
- [ ] 에러: 존재하지 않는 노트북

### 선택 테스트
- [ ] 스마트 추가
- [ ] 노트북 검색
- [ ] 노트북 업데이트
- [ ] 노트북 비활성화/활성화
- [ ] 노트북 삭제
- [ ] 모달 대화상자 처리
- [ ] 인증 만료 처리
- [ ] 타임아웃 처리

---
