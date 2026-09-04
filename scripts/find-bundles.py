#!/usr/bin/env python3
"""从关联图里跑社区发现，给「经典 bundle」出候选。

背景：关联图的连通分量切不出 bundle —— 实测是一个 190 点的巨块横跨 6 个域
外加 15 个 2~4 点的碎渣。所以这里用模块度聚类（Louvain）在巨块内部切。

输出是候选，不是答案：簇的成员由数据决定，簇的**名字**得人来起。
"""
import json, sys, collections, pathlib
import networkx as nx

ROOT = pathlib.Path(__file__).resolve().parent.parent
N = json.loads((ROOT / "data" / "concepts.json").read_text("utf-8"))["nodes"]

# 「同一个东西」先缝成一个点，跟 src/graph.js 里的口径保持一致
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

# 关系按「这条边有多说明两个东西在一起用」给权重
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

def domain(i):
    x = N[i]
    while x["p"] is not None and x["d"] > 1: x = N[x["p"]]
    return x["n"]

res = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
comms = nx.community.louvain_communities(G, weight="weight", resolution=res, seed=7)
comms = sorted((sorted(c) for c in comms), key=len, reverse=True)

out = []
print(f"# 分辨率 {res} · {G.number_of_nodes()} 点 {G.number_of_edges()} 边 → {len(comms)} 簇\n")
for c in comms:
    if len(c) < 4: continue
    doms = collections.Counter(domain(i) for i in c)
    # 度数最高的排前面，那几个多半就是这一簇的主角
    mem = sorted(c, key=lambda i: -G.degree(i, weight="weight"))
    out.append({"members": mem, "domains": doms.most_common()})
    print(f"## 【待命名】{len(c)} 个 · 跨域 " +
          "、".join(f"{d}×{k}" for d, k in doms.most_common(4)))
    print("   " + " · ".join(N[i]["n"] for i in mem[:14]) +
          (f" …（还有 {len(mem)-14} 个）" if len(mem) > 14 else ""))
    print()

(ROOT / "scripts" / "bundle-candidates.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=1), "utf-8")
print(f"→ scripts/bundle-candidates.json （{len(out)} 个候选簇）")
