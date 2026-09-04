#!/usr/bin/env python3
"""把社区发现的候选簇固化成 data/bundles.json。

跑一次就够了 —— 产物是**数据**，已提交。名字是给的起点，改名直接改 JSON，
不用再跑这个脚本。要重新切簇（换分辨率、数据变了）才跑。

    python3 scripts/make-bundles.py [分辨率]
"""
import json, sys, collections, pathlib
import networkx as nx

ROOT = pathlib.Path(__file__).resolve().parent.parent
N = json.loads((ROOT / "data" / "concepts.json").read_text("utf-8"))["nodes"]

par = list(range(len(N)))
def find(x):
    while par[x] != x:
        par[x] = par[par[x]]; x = par[x]
    return x
for n in N:
    for j, lab in (n.get("r") or []):
        if lab == "同一个东西":
            a, b = find(n["i"]), find(j)
            if a != b: par[a] = b

W = {"固定搭配": 3.0, "底下用的是": 2.0, "被谁当底座": 2.0,
     "跑在……之上": 2.0, "跑在它之上的": 2.0,
     "同一类的东西": 0.5, "可以互相替代": 0.3}

G = nx.Graph()
for n in N:
    for j, lab in (n.get("r") or []):
        w = W.get(lab)
        if w is None: continue
        a, b = find(n["i"]), find(j)
        if a == b: continue
        if G.has_edge(a, b): G[a][b]["weight"] = max(G[a][b]["weight"], w)
        else: G.add_edge(a, b, weight=w)

res = float(sys.argv[1]) if len(sys.argv) > 1 else 1.4
comms = nx.community.louvain_communities(G, weight="weight", resolution=res, seed=7)
comms = sorted((sorted(c) for c in comms), key=len, reverse=True)
comms = [c for c in comms if len(c) >= 4]

# 起点名字。按簇的大小顺序对上去 —— 改名直接改 data/bundles.json。
NAMES = [
    "JavaScript 生态", "云原生那一套", "Python 与模型训练", "存储引擎底下的数据结构",
    "静态类型这一派", "关系型数据库", "网络协议栈与加密", "网页三件套与 DOM",
    "版本控制与流水线", "缓存与局部性", "向量检索与 RAG", "Transformer 与算力",
    "认证与摘要", "函数式与所有权", "消息与事件流", "C 与 Linux 底座",
    "并发原语", "反向代理与负载均衡", "UDP 那一支", "虚拟内存", "模型压缩与本地推理",
]

def domain(i):
    x = N[i]
    while x["p"] is not None and x["d"] > 1: x = N[x["p"]]
    return x["n"]

out = []
for k, c in enumerate(comms):
    mem = sorted(c, key=lambda i: -G.degree(i, weight="weight"))
    doms = collections.Counter(domain(i) for i in c)
    out.append({
        "name": NAMES[k] if k < len(NAMES) else f"未命名 {k+1}",
        "note": "跨 " + "、".join(f"{d}" for d, _ in doms.most_common(3)),
        # 同时存下标和名字：下标快，名字用来在数据变动后自检（build.mjs 会核对）
        "members": [{"i": i, "n": N[i]["n"]} for i in mem],
    })

(ROOT / "data" / "bundles.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=1), "utf-8")
print(f"data/bundles.json  {len(out)} 组  ·  共 {sum(len(b['members']) for b in out)} 个成员")
for b in out:
    print(f"  {len(b['members']):>3}  {b['name']}")
