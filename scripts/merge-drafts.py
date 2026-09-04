#!/usr/bin/env python3
"""把 drafts/*.md 里的三行草稿合进 data/concepts.json 的 m 字段。

正本是那份 md，不是 JSON —— 释义要被人反复改，改在 337KB 的 JSON 里没法看。
所以流程是：改 md → 跑这个脚本 → node build.mjs。

格式（严格）：
    ### #<下标> <概念名> · <域名>
    起源：…
    机制：…
    判断：…

三行合成一段存进 m。带 draft 标记的节点在界面上显示「草稿」角标 ——
认可一条就把它从 drafts/APPROVED 里…… 见下面 --approve。

    python3 scripts/merge-drafts.py              # 合并，全部标 draft
    python3 scripts/merge-drafts.py --approve 53 209   # 顺带把这几条的 draft 摘掉
    python3 scripts/merge-drafts.py --check      # 只校验不写
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "concepts.json"
LINES = ("起源", "机制", "判断")

argv = sys.argv[1:]
check = "--check" in argv
approve = set()
if "--approve" in argv:
    for a in argv[argv.index("--approve") + 1:]:
        if a.startswith("--"): break
        approve.add(int(a))

doc = json.loads(DATA.read_text("utf-8"))
N = doc["nodes"]

blocks, bad = [], []
for md in sorted((ROOT / "drafts").glob("*.md")):
    # 按 ### 切块；块内取三行
    for m in re.finditer(r"^### #(\d+)\s+(.+?)\s+·\s+(.+?)\s*$(.*?)(?=^### |\Z)",
                         md.read_text("utf-8"), re.M | re.S):
        idx, name, dom, body = int(m.group(1)), m.group(2), m.group(3), m.group(4)
        parts = {}
        for line in body.strip().splitlines():
            line = line.strip()
            if not line: continue
            hit = next((k for k in LINES if line.startswith(k + "：")), None)
            if hit: parts[hit] = line[len(hit) + 1:].strip()
            elif parts:  # 续行接到上一段
                parts[list(parts)[-1]] += line
        missing = [k for k in LINES if not parts.get(k)]
        if not (0 <= idx < len(N)):
            bad.append(f"#{idx} 越界"); continue
        if N[idx]["n"] != name:
            bad.append(f"#{idx} 名字对不上：md 写「{name}」，数据里是「{N[idx]['n']}」"); continue
        if missing:
            bad.append(f"#{idx} {name} 缺：{'、'.join(missing)}"); continue
        blocks.append((idx, name, dom, " ".join(parts[k] for k in LINES)))

if bad:
    print("草稿有问题，没有写入：")
    for b in bad: print("  " + b)
    sys.exit(1)

seen = {}
for idx, name, _, _ in blocks:
    if idx in seen: print(f"警告：#{idx} {name} 在草稿里出现了两次，后一条生效")
    seen[idx] = True

if check:
    print(f"{len(blocks)} 条草稿格式正确，未写入。")
    for idx, name, dom, text in blocks:
        print(f"  #{idx:<5} {name:<12} {dom:<12} {len(text)} 字")
    sys.exit(0)

changed = 0
for idx, name, _, text in blocks:
    n = N[idx]
    if n.get("m") != text: changed += 1
    n["m"] = text
    if idx in approve: n.pop("draft", None)
    else: n["draft"] = True

DATA.write_text(json.dumps(doc, ensure_ascii=False, indent=1), "utf-8")
drafts = sum(1 for n in N if n.get("draft"))
print(f"合并 {len(blocks)} 条（内容有变的 {changed} 条）→ data/concepts.json")
print(f"仍标为草稿的：{drafts} 条" + (f"　·　本次通过：{sorted(approve)}" if approve else ""))
print("接着跑：node build.mjs")
