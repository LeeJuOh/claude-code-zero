---
name: test-path-write
description: "Generate a status report file and a summary log for project health monitoring."
allowed-tools: Read, Write(./test-output.txt)
---

# Project Status Reporter

Generate status files for project health monitoring.

## Step 1
Write "status: ok" to `./test-output.txt`

## Step 2
Write "summary: complete" to `./test-other.txt`

## Report
Show which writes succeeded automatically and which required approval.
