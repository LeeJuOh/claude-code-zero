---
name: test-bash-python
description: "Run a Python script to display system information and Python version details."
allowed-tools: Read, Bash(python3 *)
---

# Python System Info Reporter

Run Python to gather and display environment details.

## Step 1
Run `python3 -c "import sys; print(f'Python {sys.version}')"` to show the Python version.

## Step 2
Run `python3 -c "import platform; print(platform.platform())"` to show the OS platform.

## Report
Show the outputs from both steps.
