#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";

const SECTIONS = ["Why", "What changed", "Scope", "Tradeoffs", "Blast Radius", "Rollback", "Verification"];
const REQUIRED = ["Scope", "Rollback"];
const MAX_LINES = 40;

const file = process.argv[2];
if (!file) {
	console.error("Usage: node check-body.mjs <body.md>");
	process.exit(2);
}

const raw = fs.readFileSync(file, "utf8").replace(/\r?\n$/, "").split(/\r?\n/);
const problems = [];
const fail = (line, message) => problems.push(`${file}:${line}: ${message}`);

const openingFence = (text) => {
	const match = text.match(/^\s*(`{3,}|~{3,})(.*)$/);
	if (!match || (match[1][0] === "`" && match[2].includes("`"))) return null;
	return { char: match[1][0], length: match[1].length };
};
const closingFence = (text, opening) => {
	const match = text.match(/^\s*(`+|~+)[ \t]*$/);
	return Boolean(
		match &&
		match[1][0] === opening.char &&
		match[1].length >= opening.length,
	);
};

const kinds = [];
let fence = null;
for (let i = 0; i < raw.length; i++) {
	const text = raw[i];
	if (fence) {
		kinds.push("fence");
		if (closingFence(text, fence)) fence = null;
	} else if (/^ {4}/.test(text) && (i === 0 || raw[i - 1].trim() === "" || kinds[i - 1] === "indented")) {
		kinds.push("indented");
	} else {
		fence = openingFence(text);
		kinds.push(fence ? "fence" : "prose");
	}
}

const isHeading = (text) => text.startsWith("## ");
const startsBlock = (text) => isHeading(text) || /^\s*([-*+]|\d+[.)])\s/.test(text);
const maskCode = (block) =>
	block.replace(/(?<!`)(`+)(?!`)([\s\S]*?)(?<!`)\1(?!`)/g, (span) => span.replace(/[^\n]/g, "`"));

const prose = raw.map((text, i) => (kinds[i] === "prose" ? text : ""));
for (let start = 0; start < prose.length; ) {
	let end = start + 1;
	if (prose[start].trim() && !isHeading(prose[start])) {
		while (end < prose.length && prose[end].trim() && !startsBlock(prose[end])) end++;
	}
	const masked = maskCode(prose.slice(start, end).join("\n")).split("\n");
	prose.splice(start, masked.length, ...masked);
	start = end;
}

let last = -1;
const seen = new Set();
for (let i = 0; i < raw.length; i++) {
	const n = i + 1;
	if (raw[i].includes("<!--")) fail(n, "HTML comment, the forge hides it");
	if (kinds[i] !== "prose") continue;

	if (isHeading(raw[i])) {
		const title = raw[i].slice(3).replace(/\s+#+\s*$/, "").trim();
		const index = SECTIONS.indexOf(title);
		if (index === -1) fail(n, `unknown section "${title}", allowed are ${SECTIONS.join(", ")}`);
		else if (seen.has(title)) fail(n, `duplicate section "${title}"`);
		else if (index < last) fail(n, `section "${title}" out of order, expected order is ${SECTIONS.join(", ")}`);
		if (index !== -1) {
			seen.add(title);
			last = Math.max(last, index);
		}
	}

	const text = prose[i]
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\]\([^)]*\)/g, "]");
	if (/[–—]/.test(text)) fail(n, "long dash");
	if (/[‘’“”]/.test(text)) fail(n, "curly quote");
	if (/: \S/.test(text)) fail(n, "mid-sentence colon");
}

for (const section of REQUIRED) {
	if (!seen.has(section)) fail(1, `missing section "## ${section}"`);
}

if (raw.length > MAX_LINES) console.log(`${file}: warning, ${raw.length} lines, over ${MAX_LINES}`);
for (const problem of problems) console.log(problem);
console.log(problems.length ? `${problems.length} problem(s) in ${file}` : `${file} ok`);
process.exitCode = problems.length ? 1 : 0;
