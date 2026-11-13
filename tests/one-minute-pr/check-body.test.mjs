import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
	new URL("../../plugins/one-minute-pr/skills/one-minute-pr/scripts/check-body.mjs", import.meta.url),
);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-body-"));
let count = 0;
after(() => fs.rmSync(dir, { recursive: true, force: true }));

const check = (body) => {
	const fixture = path.join(dir, `body-${count++}.md`);
	fs.writeFileSync(fixture, body);
	return spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
};
const lines = (...rows) => `${rows.join("\n")}\n`;

const ALL = lines(
	"## Why",
	"Reviewers need a short body.",
	"## What changed",
	"Added a check.",
	"## Scope",
	"One script.",
	"## Tradeoffs",
	"None worth naming.",
	"## Blast Radius",
	"Only this skill.",
	"## Rollback",
	"Revert the commit.",
	"## Verification",
	"Unit tests pass.",
);

test("all seven sections in order pass", () => {
	const result = check(ALL);
	assert.equal(result.status, 0, result.stdout);
	assert.match(result.stdout, /ok/);
});

test("Rollback alone passes", () => {
	assert.equal(check(lines("## Rollback", "Revert the commit.")).status, 0);
});

test("swapped sections fail with an order message", () => {
	const result = check(lines("## Rollback", "Revert.", "## Why", "Because."));
	assert.notEqual(result.status, 0);
	assert.match(result.stdout, /:3: section "Why" out of order/);
});

test("a section outside the list fails", () => {
	const result = check(lines("## Summary", "Text.", "## Rollback", "Revert."));
	assert.notEqual(result.status, 0);
	assert.match(result.stdout, /:1: unknown section "Summary"/);
});

test("a body without Rollback fails", () => {
	const result = check(lines("## Why", "Because.", "## Verification", "Tests."));
	assert.notEqual(result.status, 0);
	assert.match(result.stdout, /missing section "## Rollback"/);
});

test("a duplicate section fails", () => {
	const result = check(lines("## Why", "One.", "## Why", "Two.", "## Rollback", "Revert."));
	assert.notEqual(result.status, 0);
	assert.match(result.stdout, /:3: duplicate section "Why"/);
});

for (const [rule, text] of [
	["long dash", "Revert it — done."],
	["long dash", "Lines 1–2 change."],
	["curly quote", "It’s safe."],
	["curly quote", "Say “yes” to it."],
	["mid-sentence colon", "Note: revert it."],
]) {
	test(`${rule} in prose fails (${JSON.stringify(text)})`, () => {
		const result = check(lines("## Rollback", text));
		assert.notEqual(result.status, 0);
		assert.match(result.stdout, new RegExp(`:2: ${rule}`));
	});
}

test("long dash, curly quote, and colon inside a fenced block pass", () => {
	const result = check(
		lines("## Rollback", "```", "a — b", "it’s “ok”", "key: value", "```", "Revert the commit."),
	);
	assert.equal(result.status, 0, result.stdout);
});

test("long dash, curly quote, and colon inside inline backticks pass", () => {
	const result = check(lines("## Rollback", "Run `a — b`, `it’s`, and `key: value`."));
	assert.equal(result.status, 0, result.stdout);
});

test("a colon before a list passes", () => {
	assert.equal(check(lines("## Rollback", "Do these steps:", "- Revert.")).status, 0);
});

test("## Rollback inside a code fence does not count as the section", () => {
	const result = check(lines("## Why", "Example below.", "```md", "## Rollback", "```"));
	assert.notEqual(result.status, 0);
	assert.match(result.stdout, /missing section "## Rollback"/);
});

const padded = (total) => lines("## Rollback", ...Array(total - 1).fill("Revert the commit."));

test("a 40-line body passes with no warning", () => {
	const result = check(padded(40));
	assert.equal(result.status, 0, result.stdout);
	assert.doesNotMatch(result.stdout, /warning/);
});

test("a 41-line body passes with a warning on stdout", () => {
	const result = check(padded(41));
	assert.equal(result.status, 0, result.stdout);
	assert.match(result.stdout, /warning, 41 lines, over 40/);
});

test("no argument prints usage on stderr and exits 2", () => {
	const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
	assert.equal(result.status, 2);
	assert.match(result.stderr, /Usage/);
});
