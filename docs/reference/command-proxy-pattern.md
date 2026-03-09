# Command Proxy Pattern

Discovered from **superpowers** plugin (v4.3.1).

## Purpose

Git commit `e59cf65` (Jesse Vincent, superpowers 작성자):
> "These command files provide Claude Code slash commands that invoke the corresponding skills with proper descriptions **for discoverability**."

Git commit `9baedaa`:
> "Claude can still invoke the underlying skills directly, but the slash commands are now restricted to **manual user invocation only**."

두 가지 목적:

1. **Discoverability** — 사용자가 `/brainstorm`처럼 슬래시 커맨드로 스킬을 직접 찾아 호출할 수 있게 함
2. **User-only 진입점** — `disable-model-invocation: true`로 설정하여 모델의 자동 호출을 차단하고, 사용자 수동 호출만 허용

모든 스킬에 커맨드가 필요한 것은 아님. superpowers의 경우 14개 스킬 중 3개만 커맨드를 제공 (brainstorm, write-plan, execute-plan) — 사용자가 직접 시작하는 워크플로우에만 해당.

## How It Works

```
User: /plugin:my-command <args>
  → CLI loads command file (~50 tokens)
  → Command says "Invoke the plugin:my-skill skill"
  → Claude calls Skill tool
  → Skill tool loads full SKILL.md
```

## Implementation

### 1. Command file (thin proxy)

`commands/{command-name}.md`:

```yaml
---
description: "Short description of what this does"
disable-model-invocation: true
---

Invoke the {plugin-name}:{skill-name} skill and follow it exactly as presented to you
```

- `disable-model-invocation: true` — 모델의 자동 호출을 차단, 사용자만 슬래시 커맨드로 호출 가능
- 본문은 Skill 도구를 통해 스킬을 호출하는 단일 지시문

### 2. Skill file (full content)

`skills/{skill-name}/SKILL.md` — 실제 로직이 담긴 스킬. 커맨드 이름과 다른 이름을 사용해야 충돌 방지.

### Naming Convention

Command and skill must have **different names** (if same name, skill takes precedence per Claude Code docs).

Pattern: use a verb form for the command, process/gerund form for the skill.

| Plugin | Command name | Skill name | Pattern |
|--------|-------------|------------|---------|
| superpowers | `brainstorm` | `brainstorming` | verb → gerund |
| superpowers | `write-plan` | `writing-plans` | verb → gerund |
| superpowers | `execute-plan` | `executing-plans` | verb → gerund |

## When to Use

- 사용자가 슬래시 커맨드로 **직접 시작**해야 하는 워크플로우
- 모델이 자동 호출하면 안 되는 스킬 (사용자 의도가 필요한 경우)

Not needed for:
- 모델이 자동으로 트리거하는 스킬 (brainstorming 같은 auto-trigger skills)
- 사용자가 직접 호출할 필요 없는 내부 스킬

## Reference: superpowers commands

```
commands/brainstorm.md:
---
description: "You MUST use this before any creative work..."
disable-model-invocation: true
---
Invoke the superpowers:brainstorming skill and follow it exactly as presented to you

commands/write-plan.md:
---
description: Create detailed implementation plan with bite-sized tasks
disable-model-invocation: true
---
Invoke the superpowers:writing-plans skill and follow it exactly as presented to you

commands/execute-plan.md:
---
description: Execute plan in batches with review checkpoints
disable-model-invocation: true
---
Invoke the superpowers:executing-plans skill and follow it exactly as presented to you
```
