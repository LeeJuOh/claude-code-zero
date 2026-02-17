# karpathy-guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

## Principles

1. **Think Before Coding** — Surface assumptions and tradeoffs before implementing
2. **Simplicity First** — Minimum code that solves the problem, nothing speculative
3. **Surgical Changes** — Touch only what you must, clean up only your own mess
4. **Goal-Driven Execution** — Define verifiable success criteria, loop until verified

## Usage

The skill triggers automatically when writing, reviewing, or refactoring code.

```bash
claude --plugin-dir ./plugins/karpathy-guidelines
```

## Credits

- Original observations by [Andrej Karpathy](https://x.com/karpathy/status/2015883857489522876)
- Plugin by [forrestchang](https://github.com/forrestchang/andrej-karpathy-skills) (MIT License)

## License

MIT
