#!/usr/bin/env python3
# [INPUT]: 读取维护脚本源码，在临时目录建立独立节点、组合和释义草稿。
# [OUTPUT]: unittest 回归结果，覆盖审批幂等、候选命名与显式应用，不写仓库正式数据。
# [POS]: scripts 的维护流程回归入口，通过真实 CLI 验证数据写入边界。
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent


class MaintenanceChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="atlas-maintenance-")
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        for directory in ("scripts", "data", "drafts"):
            (self.root / directory).mkdir()
        for script in ("merge-drafts.py", "make-bundles.py"):
            shutil.copyfile(ROOT / "scripts" / script, self.root / "scripts" / script)
        self.nodes = self.root / "data" / "concepts.json"
        self.bundles = self.root / "data" / "bundles.json"
        self.candidate = self.root / "data" / "bundles.candidate.json"

    def write_json(self, path, value):
        path.write_text(json.dumps(value, ensure_ascii=False), "utf-8")

    def run_cli(self, script, *arguments, succeeds=True):
        result = subprocess.run([sys.executable, str(self.root / "scripts" / script), *arguments],
                                cwd=self.root, capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, succeeds, result.stdout + result.stderr)
        return result

    def draft_fixture(self):
        self.write_json(self.nodes, {"nodes": [{"i": 0, "n": "样本"}]})
        self.draft = self.root / "drafts" / "sample.md"
        self.draft.write_text("### #0 样本 · 样本域\n起源：起源\n机制：机制\n判断：判断\n", "utf-8")

    def test_approval_survives_unchanged_merge_and_reopens_on_edit(self):
        self.draft_fixture()
        self.run_cli("merge-drafts.py")
        self.assertTrue(json.loads(self.nodes.read_text())["nodes"][0]["draft"])
        self.run_cli("merge-drafts.py", "--approve", "0")
        approved = json.loads(self.nodes.read_text())
        self.assertNotIn("draft", approved["nodes"][0])
        self.run_cli("merge-drafts.py")
        self.assertEqual(json.loads(self.nodes.read_text()), approved)
        self.draft.write_text(self.draft.read_text().replace("机制：机制", "机制：修改后的机制"), "utf-8")
        self.run_cli("merge-drafts.py")
        self.assertTrue(json.loads(self.nodes.read_text())["nodes"][0]["draft"])

    def test_unchanged_draft_stays_draft_and_check_does_not_write(self):
        self.draft_fixture()
        before = self.nodes.read_bytes()
        self.run_cli("merge-drafts.py", "--check")
        self.assertEqual(self.nodes.read_bytes(), before)
        self.run_cli("merge-drafts.py")
        first = self.nodes.read_bytes()
        self.run_cli("merge-drafts.py")
        self.assertEqual(self.nodes.read_bytes(), first)

    def bundle_fixture(self, both=True):
        groups = [list(range(4)), list(range(4, 9))]
        nodes = [{"i": index, "n": f"对象{index}", "p": None, "d": 1,
                  "r": [[other, "固定搭配"] for other in group if other != index]}
                 for group in groups for index in group]
        self.write_json(self.nodes, {"nodes": nodes})
        existing = [{"name": f"人工命名{index}", "note": f"人工说明{index}",
                     "members": [{"i": member, "n": nodes[member]["n"]} for member in group]}
                    for index, group in enumerate(groups)]
        self.write_json(self.bundles, existing if both else existing[:1])

    def reviewed_candidate(self):
        candidate = json.loads(self.candidate.read_text())
        candidate["reviewed"] = True
        self.write_json(self.candidate, candidate)
        return candidate

    def test_default_only_writes_candidate_and_matches_members_not_size(self):
        self.bundle_fixture()
        before = self.bundles.read_bytes()
        self.run_cli("make-bundles.py", "1.4")
        self.assertEqual(self.bundles.read_bytes(), before)
        groups = json.loads(self.candidate.read_text())["bundles"]
        self.assertEqual([len(group["members"]) for group in groups], [5, 4])
        self.assertEqual([group["name"] for group in groups], ["人工命名1", "人工命名0"])
        self.assertEqual([group["note"] for group in groups], ["人工说明1", "人工说明0"])
        candidate_before = self.candidate.read_bytes()
        self.run_cli("make-bundles.py", succeeds=False)
        self.assertEqual(self.candidate.read_bytes(), candidate_before)

    def test_unreviewed_and_unnamed_candidates_cannot_replace_data(self):
        self.bundle_fixture(both=False)
        before = self.bundles.read_bytes()
        self.run_cli("make-bundles.py")
        self.run_cli("make-bundles.py", "--apply", str(self.candidate), succeeds=False)
        candidate = self.reviewed_candidate()
        self.assertTrue(any(group["name"] == "" for group in candidate["bundles"]))
        self.run_cli("make-bundles.py", "--apply", str(self.candidate), succeeds=False)
        self.assertEqual(self.bundles.read_bytes(), before)

    def test_confirmed_candidate_applies_exact_reviewed_content(self):
        self.bundle_fixture()
        self.run_cli("make-bundles.py")
        candidate = self.reviewed_candidate()
        candidate["bundles"][0]["name"] = "审阅后的名称"
        self.write_json(self.candidate, candidate)
        self.run_cli("make-bundles.py", "--apply", str(self.candidate))
        self.assertEqual(json.loads(self.bundles.read_text()), candidate["bundles"])

    def test_stale_candidate_cannot_overwrite_later_manual_name(self):
        self.bundle_fixture()
        self.run_cli("make-bundles.py")
        self.reviewed_candidate()
        later = json.loads(self.bundles.read_text())
        later[0]["name"] = "后来编辑的名称"
        self.write_json(self.bundles, later)
        result = self.run_cli("make-bundles.py", "--apply", str(self.candidate), succeeds=False)
        self.assertIn("候选已过期", result.stderr)
        self.assertEqual(json.loads(self.bundles.read_text()), later)

    def test_bad_member_and_canonical_output_are_rejected(self):
        self.bundle_fixture()
        before = self.bundles.read_bytes()
        self.run_cli("make-bundles.py", "--output", str(self.bundles), succeeds=False)
        self.run_cli("make-bundles.py")
        candidate = self.reviewed_candidate()
        candidate["bundles"][0]["members"][0]["n"] = "错误对象"
        self.write_json(self.candidate, candidate)
        self.run_cli("make-bundles.py", "--apply", str(self.candidate), succeeds=False)
        self.assertEqual(self.bundles.read_bytes(), before)


if __name__ == "__main__":
    unittest.main(verbosity=2)
