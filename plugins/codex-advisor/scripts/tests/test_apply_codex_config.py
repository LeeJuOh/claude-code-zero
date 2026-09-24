#!/usr/bin/env python3
"""Black-box tests for scripts/apply-codex-config.py (config.toml, stdout).

Run: python3 plugins/codex-advisor/scripts/tests/test_apply_codex_config.py
Needs python3.11+ (tomllib checks where each key landed).
"""
import os
import subprocess
import sys
import tempfile
import tomllib
import unittest

HERE = os.path.dirname(os.path.realpath(__file__))
SCRIPT = os.path.join(os.path.dirname(HERE), "apply-codex-config.py")


class ApplyCodexConfigTest(unittest.TestCase):
    def setUp(self):
        self.home = tempfile.mkdtemp()
        self.config = os.path.join(self.home, ".codex", "config.toml")

    def write(self, text):
        os.makedirs(os.path.dirname(self.config), exist_ok=True)
        with open(self.config, "w") as f:
            f.write(text)

    def run_script(self, model, effort, *extra, cwd=None):
        # cwd defaults to HOME, whose .codex/config.toml is the user config
        # and must not be mistaken for a project one.
        env = dict(os.environ, HOME=self.home)
        r = subprocess.run(
            [sys.executable, SCRIPT, model, effort, *extra],
            capture_output=True, text=True, env=env, cwd=cwd or self.home,
        )
        self.assertEqual(r.returncode, 0, r.stderr)
        return r.stdout.strip()

    def project(self, *parts, config=None, git=False):
        """Make a directory under HOME, optionally a git root, optionally with
        a .codex/config.toml; return its path."""
        d = os.path.join(self.home, *parts)
        os.makedirs(os.path.join(d, ".codex") if config else d, exist_ok=True)
        if git:
            os.makedirs(os.path.join(d, ".git"), exist_ok=True)
        if config:
            with open(os.path.join(d, ".codex", "config.toml"), "w") as f:
                f.write(config)
        return d

    def parsed(self):
        with open(self.config, "rb") as f:
            return tomllib.load(f)

    def test_missing_key_lands_above_trailing_table(self):
        self.write('model = "a"\n\n[projects."/p"]\ntrust_level = "trusted"\n')
        out = self.run_script("", "high")
        data = self.parsed()
        self.assertEqual(data["model_reasoning_effort"], "high")
        self.assertEqual(data["projects"]["/p"], {"trust_level": "trusted"})
        self.assertIn("Effort: (unset) -> high", out)

    def test_table_key_with_same_name_is_left_alone(self):
        self.write('[profiles.fast]\nmodel = "mini"\n')
        out = self.run_script("big", "")
        data = self.parsed()
        self.assertEqual(data["model"], "big")
        self.assertEqual(data["profiles"]["fast"]["model"], "mini")
        self.assertIn("Model: (unset) -> big", out)

    def test_existing_top_level_keys_replaced_in_place(self):
        text = 'model = "a"\nmodel_reasoning_effort = "low"\n\n[features]\nx = true\n'
        self.write(text)
        out = self.run_script("b", "high")
        with open(self.config) as f:
            self.assertEqual(
                f.read(), 'model = "b"\nmodel_reasoning_effort = "high"\n\n[features]\nx = true\n'
            )
        self.assertEqual(out, "Model: a -> b | Effort: low -> high")

    def test_insert_goes_after_last_top_level_key(self):
        self.write('#:schema https://example/schema.json\nmodel = "a"\n\n# flags\n[features]\nx = true\n')
        self.run_script("", "high")
        with open(self.config) as f:
            self.assertEqual(
                f.read(),
                '#:schema https://example/schema.json\nmodel = "a"\nmodel_reasoning_effort = "high"\n'
                "\n# flags\n[features]\nx = true\n",
            )

    def test_header_like_line_inside_multiline_string_is_not_a_table(self):
        self.write('developer_instructions = """\n[not a table]\n"""\n\n[features]\nx = true\n')
        self.run_script("b", "high")
        data = self.parsed()
        self.assertEqual((data["model"], data["model_reasoning_effort"]), ("b", "high"))
        self.assertEqual(data["developer_instructions"], "[not a table]\n")

    def test_missing_file_is_created(self):
        out = self.run_script("b", "high")
        self.assertEqual(self.parsed(), {"model": "b", "model_reasoning_effort": "high"})
        self.assertEqual(out, "Model: (unset) -> b | Effort: (unset) -> high")

    def test_literal_string_and_quoted_key_are_replaced_not_duplicated(self):
        self.write("model = 'a'\n\"model_reasoning_effort\" = \"low\"\n")
        out = self.run_script("b", "high")
        self.assertEqual(self.parsed(), {"model": "b", "model_reasoning_effort": "high"})
        self.assertEqual(out, "Model: a -> b | Effort: low -> high")

    def test_inline_comment_is_kept(self):
        self.write('model = "a"  # default\n')
        self.run_script("b", "")
        with open(self.config) as f:
            self.assertEqual(f.read(), 'model = "b"  # default\n')

    def test_codex_home_is_honored(self):
        codex_home = os.path.join(self.home, "elsewhere")
        os.makedirs(codex_home)
        env = dict(os.environ, HOME=self.home, CODEX_HOME=codex_home)
        r = subprocess.run([sys.executable, SCRIPT, "b", ""], capture_output=True, text=True, env=env)
        self.assertEqual(r.returncode, 0, r.stderr)
        with open(os.path.join(codex_home, "config.toml"), "rb") as f:
            self.assertEqual(tomllib.load(f), {"model": "b"})
        self.assertFalse(os.path.exists(self.config))

    def test_misread_layout_is_refused_and_file_untouched(self):
        # "  [3]" inside a multi-line array looks like a table header to the
        # line scanner; the parse check has to catch the broken insert.
        text = 'x = [\n  [1, 2],\n  [3]\n]\n\n[features]\na = true\n'
        self.write(text)
        env = dict(os.environ, HOME=self.home)
        r = subprocess.run([sys.executable, SCRIPT, "b", ""], capture_output=True, text=True, env=env)
        self.assertEqual(r.returncode, 1)
        self.assertIn("config.toml", r.stderr)
        with open(self.config) as f:
            self.assertEqual(f.read(), text)

    def test_toml_1_1_config_that_codex_accepts_is_still_written(self):
        # Codex reads multi-line inline tables (TOML 1.1); tomllib doesn't.
        self.write('model = "a"\ntui = {\n  theme = "dark",\n}\n')
        out = self.run_script("", "high")
        with open(self.config) as f:
            self.assertEqual(f.read(), 'model = "a"\ntui = {\n  theme = "dark",\n}\nmodel_reasoning_effort = "high"\n')
        self.assertIn("Effort: (unset) -> high", out)

    def test_project_override_prints_the_flag_the_caller_can_pass(self):
        repo = self.project("repo", git=True, config='model_reasoning_effort = "low"\n')
        out = self.run_script("b", "high", "--run-flags", "model,effort", cwd=repo)
        self.assertEqual(out.splitlines()[1:], ["Run flags: --effort high"])

    def test_project_override_without_a_flag_prints_a_note(self):
        repo = self.project("repo", git=True, config='model = "p"\nmodel_reasoning_effort = "low"\n')
        out = self.run_script("b", "high", "--run-flags", "model", cwd=repo)
        lines = out.splitlines()
        self.assertEqual(lines[1], "Run flags: --model b")
        self.assertEqual(len(lines), 3)
        self.assertIn(os.path.join(repo, ".codex", "config.toml"), lines[2])
        self.assertIn('model_reasoning_effort = "low"', lines[2])

    def test_closest_project_config_wins_and_unrequested_keys_are_ignored(self):
        self.project("repo", git=True, config='model_reasoning_effort = "low"\nmodel = "root"\n')
        sub = self.project("repo", "pkg", config='model_reasoning_effort = "minimal"\n')
        out = self.run_script("", "high", cwd=sub)
        lines = out.splitlines()
        self.assertEqual(len(lines), 2)
        self.assertIn(os.path.join(sub, ".codex", "config.toml"), lines[1])
        self.assertIn('"minimal"', lines[1])

    def test_config_above_the_project_root_is_ignored(self):
        self.project("outer", config='model = "p"\n')
        repo = self.project("outer", "repo", git=True)
        self.assertEqual(len(self.run_script("b", "", "--run-flags", "model", cwd=repo).splitlines()), 1)

    def test_no_project_config_prints_one_line(self):
        self.write('model = "a"\n')
        out = self.run_script("b", "high", "--run-flags", "model,effort")
        self.assertEqual(out, "Model: a -> b | Effort: (unset) -> high")


if __name__ == "__main__":
    unittest.main()
