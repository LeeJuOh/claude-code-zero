#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";

const SECTIONS = ["Why", "What changed", "Scope", "Tradeoffs", "Blast Radius", "Rollback", "Verification"];
const REQUIRED = "Rollback";
const MAX_LINES = 40;

const file = process.argv[2];
if (!file) {
	console.error("Usage: node check-body.mjs <body.md>");
	process.exit(2);
}

const raw = fs.readFileSync(file, "utf8").replace(/\r?\n$/, "").split(/\r?\n/);
const problems = [];
const fail = (line, message) => problems.push(`${file}:${line}: ${message}`);

let fence = null;
const openingFence = (text) => {
	const match = text.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
	if (!match || (match[1][0] === "`" && match[2].includes("`"))) return null;
	return { char: match[1][0], length: match[1].length };
};
const closingFence = (text, opening) => {
	const match = text.match(/^ {0,3}(`+|~+)[ \t]*$/);
	return Boolean(
		match &&
		match[1][0] === opening.char &&
		match[1].length >= opening.length,
	);
};

let last = -1;
const seen = new Set();
for (let i = 0; i < raw.length; i++) {
	const text = raw[i];
	const n = i + 1;
	let code = Boolean(fence);
	if (fence && closingFence(text, fence)) {
		code = false;
		fence = null;
	} else if (!fence) {
		fence = openingFence(text);
		code = Boolean(fence);
	}
	if (code) continue;

	if (text.startsWith("## ")) {
		const title = text.slice(3).trim();
		const index = SECTIONS.indexOf(title);
		if (index === -1) fail(n, `unknown section "${title}", allowed are ${SECTIONS.join(", ")}`);
		else if (seen.has(title)) fail(n, `duplicate section "${title}"`);
		else if (index < last) fail(n, `section "${title}" out of order, expected order is ${SECTIONS.join(", ")}`);
		if (index !== -1) {
			seen.add(title);
			last = Math.max(last, index);
		}
	}

	const prose = text
		.replace(/(?<!`)(`+)(?!`)(.*?)(?<!`)\1(?!`)/g, "`")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\]\([^)]*\)/g, "]");
	if (/[–—]/.test(prose)) fail(n, "long dash");
	if (/[‘’“”]/.test(prose)) fail(n, "curly quote");
	if (/: \S/.test(prose)) fail(n, "mid-sentence colon");
}

if (!seen.has(REQUIRED)) fail(1, `missing section "## ${REQUIRED}"`);

if (raw.length > MAX_LINES) console.log(`${file}: warning, ${raw.length} lines, over ${MAX_LINES}`);
for (const problem of problems) console.log(problem);
console.log(problems.length ? `${problems.length} problem(s) in ${file}` : `${file} ok`);
process.exitCode = problems.length ? 1 : 0;
