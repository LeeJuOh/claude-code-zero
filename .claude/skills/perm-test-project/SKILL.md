---
name: perm-test-project
description: Test allowed-tools permission behavior (project version)
allowed-tools: Read, Write, Bash
---

# Permission Test (Project Version)

Run all 6 tests below IN ORDER. For each test, report whether it was AUTO-APPROVED or PROMPTED.

Do NOT skip any test. Do NOT ask the user anything. Just execute all 6 tests sequentially.

## Test 1: Read CWD file
Read the file `CLAUDE.md` in the current working directory.
- Report: "Test 1 (Read CWD): AUTO / PROMPTED"

## Test 2: Read out-of-CWD file
Read the file `/tmp/perm-test-input.txt`.
- Report: "Test 2 (Read out-of-CWD): AUTO / PROMPTED"

## Test 3: Write CWD file
Write the text "project-test-ok" to a file called `perm-test-output.txt` in the current working directory.
- Report: "Test 3 (Write CWD): AUTO / PROMPTED"

## Test 4: Write out-of-CWD file
Write the text "project-test-ok" to `/tmp/perm-test-output-project.txt`.
- Report: "Test 4 (Write out-of-CWD): AUTO / PROMPTED"

## Test 5: Bash simple command
Run `echo "bash-test-ok"`.
- Report: "Test 5 (Bash simple): AUTO / PROMPTED"

## Test 6: Bash out-of-CWD command
Run `ls /tmp/perm-test-*.txt`.
- Report: "Test 6 (Bash out-of-CWD): AUTO / PROMPTED"

## Summary

After all tests, output a markdown table:

| Test | Tool | Scope | Result |
|------|------|-------|--------|
| 1 | Read | CWD | ? |
| 2 | Read | out-of-CWD | ? |
| 3 | Write | CWD | ? |
| 4 | Write | out-of-CWD | ? |
| 5 | Bash | simple | ? |
| 6 | Bash | out-of-CWD | ? |

State: "Source: PROJECT" at the end.