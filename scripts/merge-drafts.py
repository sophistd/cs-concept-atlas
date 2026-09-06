#!/usr/bin/env python3
# [INPUT]: 读取 drafts/*.md 三段草稿与 data/concepts.json 的正文及审核状态。
# [OUTPUT]: 校验后合并正文；首次或变更正文标草稿，未变正文保留审核结果，--approve 明确认可。
# [POS]: scripts 的历史释义维护入口，不覆盖 data/entries 的当前页面正文；--check 只读。
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""把 drafts/*.md 里的三行草稿合进 data/concepts.json 的 m 字段。

本工具只维护旧库的 m 与 draft。当前首页正文维护在 data/entries，
旧稿修订需由维护者核查后整理进对应条目，不能靠本脚本覆盖新正文。

格式（严格）：
    ### #<下标> <概念名> · <域名>
    起源：…
    机制：…
    判断：…

三行合成一段存进旧库 m，draft 仅保存这份历史正文的审核状态。
未变正文保留先前审核结果；首次或变更的正文重新标草稿，--approve 可确认本次正文。

    python3 scripts/merge-drafts.py              # 合并，保留未变正文的审核结果
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
    text_changed = n.get("m") != text
    if text_changed: changed += 1
    n["m"] = text
    if idx in approve: n.pop("draft", None)
    elif text_changed: n["draft"] = True

DATA.write_text(json.dumps(doc, ensure_ascii=False, indent=1), "utf-8")
drafts = sum(1 for n in N if n.get("draft"))
print(f"合并 {len(blocks)} 条（内容有变的 {changed} 条）→ data/concepts.json")
print(f"仍标为草稿的：{drafts} 条" + (f"　·　本次通过：{sorted(approve)}" if approve else ""))
print("当前首页正文来自 data/entries；旧稿修订需核查后整理到对应条目。")
