#!/usr/bin/env python3
"""Black-box tests for scripts/prepare-verifier.py (stdout, exit code, files).

Run: python3 plugins/codex-advisor/scripts/tests/test_prepare_verifier.py
Needs only python3 and git.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.realpath(__file__))
SCRIPT = os.path.join(os.path.dirname(HERE), "prepare-verifier.py")
FIXTURES = os.path.join(HERE, "fixtures")

AUTH_PY = "".join(f"line {n}\n" for n in range(1, 21))
DB_PY = "def helper():\n    return 1\n"


def run(*args, cwd=None):
    return subprocess.run([sys.executable, SCRIPT, *args], capture_output=True, text=True, cwd=cwd)


def git(repo, *args):
    subprocess.run(
        ["git", "-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *args],
        check=True, capture_output=True, text=True,
    )


def git_out(repo, *args):
    return subprocess.run(["git", "-C", repo, *args], check=True, capture_output=True, text=True).stdout


def read_bytes(path):
    with open(path, "rb") as f:
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(text)


def fixture(name):
    return read(os.path.join(FIXTURES, name))


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def load(path):
    return json.loads(read(path))


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = os.path.realpath(tempfile.mkdtemp(prefix="pv-test-"))
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.repo = os.path.join(self.tmp, "repo")
        os.makedirs(self.repo)
        git(self.repo, "init", "-q")
        write(os.path.join(self.repo, "src/auth.py"), AUTH_PY)
        write(os.path.join(self.repo, "src/db.py"), DB_PY)
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "init")
        self.out = os.path.join(self.tmp, "out")

    def input_file(self, name, data):
        path = os.path.join(self.tmp, name)
        with open(path, "w") as f:
            f.write(data if isinstance(data, str) else json.dumps(data))
        return path

    def review_input(self, text):
        return self.input_file("review.json", {"review": "Review", "codex": {"status": 0, "stderr": "", "stdout": text}})

    def adversarial_input(self, findings):
        return self.input_file("adv.json", {"result": {"findings": findings}, "rawOutput": "{}"})

    def run_ok(self, *args):
        proc = run(*args)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        return json.loads(proc.stdout)

    def assert_failed(self, proc, code, kind):
        self.assertEqual(proc.returncode, code, proc.stderr)
        self.assertEqual(proc.stdout, "")
        self.assertTrue(proc.stderr.startswith(f"{kind}:"), proc.stderr)
        self.assertFalse(os.path.exists(self.out) and os.listdir(self.out))


def finding(file, start, end=None, body="body", title="t"):
    return {"severity": "high", "title": title, "body": body, "file": file,
            "line_start": start, "line_end": end or start, "confidence": 0.5, "recommendation": ""}


class AdversarialTests(Base):
    def test_fixture_matches_expected(self):
        out = self.run_ok("--skill", "adversarial", "--input", os.path.join(FIXTURES, "adversarial.json"),
                          "--repo", self.repo, "--out-dir", self.out)
        self.assertEqual(out["findings"], json.loads(fixture("adversarial.expected.json")))
        self.assertEqual(out["worktree_drift"], [])

    def test_payload_only_for_ok_groups(self):
        out = self.run_ok("--skill", "adversarial", "--input", os.path.join(FIXTURES, "adversarial.json"),
                          "--repo", self.repo, "--out-dir", self.out)
        self.assertEqual(sorted(os.listdir(self.out)), ["group-1.json", "manifest.json"])
        payload = load(os.path.join(self.out, "group-1.json"))
        self.assertEqual([i["id"] for i in payload["items"]], ["F1", "F2"])
        self.assertEqual(payload["items"][0]["finding"]["recommendation"], "Use hmac.compare_digest.")
        self.assertTrue(os.path.isabs(payload["rules"]) and payload["rules"].endswith("references/evaluation.md"))
        self.assertEqual(out["groups"], [{"group_id": 1, "finding_ids": ["F1", "F2"],
                                          "payload": os.path.join(self.out, "group-1.json")}])

    def test_manifest_hash_matches_and_detects_edit(self):
        self.run_ok("--skill", "adversarial", "--input", os.path.join(FIXTURES, "adversarial.json"),
                    "--repo", self.repo, "--out-dir", self.out)
        manifest = load(os.path.join(self.out, "manifest.json"))
        path = os.path.join(self.out, "group-1.json")
        digest = lambda: hashlib.sha256(read_bytes(path)).hexdigest()
        self.assertEqual(manifest["payloads"]["group-1.json"], digest())
        with open(path, "a") as f:
            f.write("the caller already guards this\n")
        self.assertNotEqual(manifest["payloads"]["group-1.json"], digest())

    def test_same_file_same_group_other_file_other_group(self):
        path = self.adversarial_input([finding("src/auth.py", 1), finding("src/db.py", 1), finding("src/auth.py", 5)])
        out = self.run_ok("--skill", "adversarial", "--input", path, "--repo", self.repo, "--out-dir", self.out)
        ids = [f["group_id"] for f in out["findings"]]
        self.assertEqual(ids[0], ids[2])
        self.assertNotEqual(ids[0], ids[1])

    def test_count_cap_splits_in_line_order(self):
        lines = [7, 2, 5, 1, 6, 3, 4]
        path = self.adversarial_input([finding("src/auth.py", n) for n in lines])
        out = self.run_ok("--skill", "adversarial", "--input", path, "--repo", self.repo, "--out-dir", self.out)
        self.assertEqual(len(out["groups"]), 2)
        first = load(out["groups"][0]["payload"])
        second = load(out["groups"][1]["payload"])
        self.assertEqual([i["citation"]["line_start"] for i in first["items"]], [1, 2, 3, 4, 5])
        self.assertEqual([i["citation"]["line_start"] for i in second["items"]], [6, 7])

    def test_size_cap_splits_and_oversize_finding_stands_alone(self):
        long = [finding("src/auth.py", n, body="x" * 2500) for n in (1, 2, 3)]
        path = self.adversarial_input(long)
        out = self.run_ok("--skill", "adversarial", "--input", path, "--repo", self.repo, "--out-dir", self.out)
        self.assertEqual([len(g["finding_ids"]) for g in out["groups"]], [2, 1])

        shutil.rmtree(self.out)
        huge_body = "y" * 7000
        path = self.adversarial_input([finding("src/auth.py", 1), finding("src/auth.py", 2, body=huge_body),
                                       finding("src/auth.py", 3)])
        out = self.run_ok("--skill", "adversarial", "--input", path, "--repo", self.repo, "--out-dir", self.out)
        self.assertEqual([g["finding_ids"] for g in out["groups"]], [["F1"], ["F2"], ["F3"]])
        payload = load(out["groups"][1]["payload"])
        self.assertEqual(payload["items"][0]["finding"]["body"], huge_body)

    def test_absolute_path_normalized_and_outside_repo_missing(self):
        path = self.adversarial_input([finding(os.path.join(self.repo, "src/db.py"), 1, 2),
                                       finding("/etc/hosts", 1), finding("../x.py", 1)])
        out = self.run_ok("--skill", "adversarial", "--input", path, "--repo", self.repo, "--out-dir", self.out)
        self.assertEqual(out["findings"][0]["file"], "src/db.py")
        self.assertEqual(out["findings"][0]["status"], "ok")
        self.assertEqual([f["status"] for f in out["findings"][1:]], ["missing", "missing"])

    def test_unparsed_result_is_parse_error_and_empty_is_no_output(self):
        path = self.input_file("adv.json", {"result": None, "rawOutput": "not json", "parseError": "Unexpected token"})
        self.assert_failed(run("--skill", "adversarial", "--input", path, "--repo", self.repo, "--out-dir", self.out),
                           3, "parse_error")
        path = self.input_file("adv.json", {"result": None, "rawOutput": "", "parseError": "no message"})
        self.assert_failed(run("--skill", "adversarial", "--input", path, "--repo", self.repo, "--out-dir", self.out),
                           4, "no_output")

    def test_invalid_json_fails_without_output(self):
        path = self.input_file("bad.json", "{not json")
        proc = run("--skill", "adversarial", "--input", path, "--repo", self.repo, "--out-dir", self.out)
        self.assert_failed(proc, 2, "invalid_input")


class ReviewTests(Base):
    def review(self, name):
        return self.review_input(fixture(name).replace("{REPO}", self.repo))

    def test_multi_comment_block(self):
        out = self.run_ok("--skill", "review", "--input", self.review("review-multi.txt"),
                          "--repo", self.repo, "--out-dir", self.out)
        self.assertEqual([(f["file"], f["line_start"], f["line_end"], f["status"]) for f in out["findings"]],
                         [("src/auth.py", 3, 5, "ok"), ("src/auth.py", 10, 12, "ok"), ("src/db.py", 1, 2, "ok")])
        payload = load(out["groups"][0]["payload"])
        self.assertEqual(payload["items"][0]["finding"]["title"], "[P1] Token check is not constant time")
        self.assertEqual(payload["items"][0]["finding"]["body"],
                         "The comparison at this line uses == on secrets.\n\nAn attacker can time the response to recover the token.")
        self.assertEqual(payload["items"][1]["finding"]["body"],
                         "Negative values skip the upper bound — retries never stop.")
        self.assertIsNone(payload["items"][0]["severity"])

    def test_single_comment_block(self):
        out = self.run_ok("--skill", "review", "--input", self.review("review-single.txt"),
                          "--repo", self.repo, "--out-dir", self.out)
        self.assertEqual(len(out["findings"]), 1)

    def test_zero_findings_is_normal(self):
        out = self.run_ok("--skill", "review", "--input", self.review("review-zero.txt"),
                          "--repo", self.repo, "--out-dir", self.out)
        self.assertEqual(out["findings"], [])
        self.assertEqual(out["groups"], [])

    def test_broken_item_line_is_parse_error(self):
        proc = run("--skill", "review", "--input", self.review("review-broken.txt"),
                   "--repo", self.repo, "--out-dir", self.out)
        self.assert_failed(proc, 3, "parse_error")
        self.assertNotIn("uncited", proc.stderr)

    def test_header_without_items_is_parse_error(self):
        proc = run("--skill", "review", "--input", self.review("review-header-no-items.txt"),
                   "--repo", self.repo, "--out-dir", self.out)
        self.assert_failed(proc, 3, "parse_error")

    def test_fallback_and_empty_are_no_output(self):
        for text in ("Reviewer failed to output a response.", ""):
            proc = run("--skill", "review", "--input", self.review_input(text),
                       "--repo", self.repo, "--out-dir", self.out)
            self.assert_failed(proc, 4, "no_output")


class DriftTests(Base):
    def cite_line_4(self):
        write(os.path.join(self.repo, "four.txt"), "a\nb\nc\nd\n")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "four")
        return self.adversarial_input([finding("four.txt", 4)])

    def test_shrunk_file_is_drift_not_missing(self):
        path = self.cite_line_4()
        write(os.path.join(self.repo, "four.txt"), "a\n")
        out = self.run_ok("--skill", "adversarial", "--input", path, "--repo", self.repo,
                          "--out-dir", self.out, "--ref", "HEAD")
        self.assertEqual((out["findings"][0]["status"], out["findings"][0]["reason"]), ("unverifiable", "worktree-drift"))
        self.assertEqual(out["worktree_drift"], ["four.txt"])

    def test_clean_worktree_keeps_missing(self):
        path = self.adversarial_input([finding("four.txt", 4)])
        write(os.path.join(self.repo, "four.txt"), "a\n")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "one line")
        out = self.run_ok("--skill", "adversarial", "--input", path, "--repo", self.repo,
                          "--out-dir", self.out, "--ref", "HEAD")
        self.assertEqual(out["findings"][0]["status"], "missing")
        self.assertEqual(out["worktree_drift"], [])

    def test_same_line_count_content_change_is_drift_without_payload(self):
        path = self.cite_line_4()
        write(os.path.join(self.repo, "four.txt"), "a\nb\nc\nCHANGED\n")
        out = self.run_ok("--skill", "adversarial", "--input", path, "--repo", self.repo,
                          "--out-dir", self.out, "--ref", "HEAD")
        self.assertEqual(out["findings"][0]["status"], "unverifiable")
        self.assertIsNone(out["findings"][0]["group_id"])
        self.assertEqual(out["groups"], [])
        self.assertEqual(os.listdir(self.out), ["manifest.json"])


class RescueWholeTests(Base):
    def test_whole_output_is_one_payload_byte_identical(self):
        src = os.path.join(FIXTURES, "rescue-result.json")
        raw = load(src)["storedJob"]["result"]["rawOutput"]
        out = self.run_ok("--skill", "rescue", "--input", src, "--repo", self.repo, "--out-dir", self.out)
        self.assertEqual(out["groups"], [{"group_id": "all", "status": "whole",
                                          "payload": os.path.join(self.out, "group-all.json")}])
        payload = load(os.path.join(self.out, "group-all.json"))
        self.assertEqual(payload["codex_output"].encode("utf-8"), raw.encode("utf-8"))
        self.assertNotIn("items", payload)


class DocModeTests(Base):
    PATH_KEYS = ("rules", "prompt_file", "document", "codex_result")

    def setUp(self):
        super().setUp()
        self.prompt = self.input_file("prompt.txt", "<task>\nVerify this plan.\n</task>\nSECRET-PROMPT-LINE\n")
        self.doc = self.input_file("plan.md", "# Plan\nSECRET-DOC-LINE\n")
        self.result = self.input_file("result.json", json.dumps({"storedJob": {"result": {"rawOutput": "PASS"}}}))

    def test_paths_only(self):
        self.run_ok("--mode", "doc", "--skill", "verify", "--prompt-file", self.prompt, "--document", self.doc,
                    "--result-file", self.result, "--out-dir", self.out)
        text = read(os.path.join(self.out, "group-all.json"))
        payload = json.loads(text)
        self.assertNotIn("SECRET-DOC-LINE", text)
        self.assertNotIn("SECRET-PROMPT-LINE", text)
        self.assertEqual([k for k in self.PATH_KEYS if k in payload], list(self.PATH_KEYS))
        self.assertTrue(all(os.path.isabs(payload[k]) for k in self.PATH_KEYS))
        self.assertEqual(sorted(os.listdir(self.out)), ["group-all.json", "manifest.json"])

    def test_topic_only_has_no_document(self):
        self.run_ok("--mode", "doc", "--skill", "research", "--prompt-file", self.prompt,
                    "--result-file", self.result, "--out-dir", self.out)
        payload = load(os.path.join(self.out, "group-all.json"))
        self.assertEqual([k for k in self.PATH_KEYS if k in payload], ["rules", "prompt_file", "codex_result"])


class SnapshotDiffTests(Base):
    def test_clean_repo_snapshot_returns_tree(self):
        proc = run("snapshot", "--repo", self.repo)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(proc.stdout.strip(), git_out(self.repo, "rev-parse", "HEAD^{tree}").strip())

    def test_diff_contains_codex_changes_only(self):
        r = self.repo
        write(os.path.join(r, "src/auth.py"), AUTH_PY + "USER-WIP-LINE\n")
        git(r, "add", "src/auth.py")  # staged WIP: the real index must stay exactly like this
        write(os.path.join(r, "draft.txt"), "draft v1\n")
        write(os.path.join(r, "scratch.txt"), "scratch\n")
        index_before = git_out(r, "ls-files", "-s")
        status_before = git_out(r, "status", "--porcelain")

        snap = run("snapshot", "--repo", r)
        self.assertEqual(snap.returncode, 0, snap.stderr)
        pre = snap.stdout.strip()
        self.assertEqual(git_out(r, "ls-files", "-s"), index_before)
        self.assertEqual(git_out(r, "status", "--porcelain"), status_before)

        # Codex run: modify tracked, modify one untracked, delete one untracked, create a new file.
        write(os.path.join(r, "src/db.py"), DB_PY + "CODEX-TRACKED-EDIT\n")
        write(os.path.join(r, "draft.txt"), "draft v1\nCODEX-UNTRACKED-EDIT\n")
        os.remove(os.path.join(r, "scratch.txt"))
        write(os.path.join(r, "src/new.py"), "CODEX-NEW-FILE\n")

        prompt = self.input_file("prompt.txt", "<task>\nAdd a helper and update the draft.\n</task>\n")
        out = self.run_ok("--mode", "diff", "--pre", pre, "--prompt-file", prompt, "--repo", r, "--out-dir", self.out)
        diff = read(out["diff"])
        for marker in ("CODEX-TRACKED-EDIT", "CODEX-UNTRACKED-EDIT", "CODEX-NEW-FILE", "deleted file mode", "scratch.txt"):
            self.assertIn(marker, diff)
        self.assertNotIn("USER-WIP-LINE", diff)
        self.assertFalse(out["diff_empty"])
        self.assertEqual(git_out(r, "ls-files", "-s"), index_before)
        self.assertEqual(sorted(os.listdir(r)), [".git", "draft.txt", "src"])

        payload_text = read(os.path.join(self.out, "group-all.json"))
        payload = json.loads(payload_text)
        self.assertEqual(payload["diff"], out["diff"])
        self.assertEqual(payload["prompt_file"], prompt)
        self.assertNotIn("items", payload)
        self.assertNotIn("R1", payload_text)
        self.assertNotIn("CODEX-", payload_text)


if __name__ == "__main__":
    unittest.main(verbosity=1)
