#!/usr/bin/env python3
# [INPUT]: 读取旧节点与现有组合，使用 NetworkX 生成聚类；应用候选时只依赖 Python 标准库。
# [OUTPUT]: 默认生成待审候选，完整成员匹配才保留人工名称；--apply 仅应用已确认且未过期的候选。
# [POS]: scripts 的组合维护入口，将算法提议与正式数据写入分开，避免重切簇时错配或覆盖人工语义。
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""生成组合候选，审阅后再显式应用。

    python3 scripts/make-bundles.py 1.4
    python3 scripts/make-bundles.py 1.4 --output /tmp/bundles-review.json
    # 检查成员、补全新组名称；确认整份候选后将 reviewed 改为 true
    python3 scripts/make-bundles.py --apply /tmp/bundles-review.json

默认写 data/bundles.candidate.json，不覆盖已有候选。只有成员集合完全相同的
旧组合沿用 name/note；新组合留空 name，等待人工判断。应用前核对原始数据摘要，
防止候选生成后别处又修改了节点或组合，覆盖后来的工作。
"""
import argparse
import collections
import hashlib
import json
import math
import pathlib
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEIGHTS = {"固定搭配": 3.0, "底下用的是": 2.0, "被谁当底座": 2.0,
           "跑在……之上": 2.0, "跑在它之上的": 2.0,
           "用什么语言实现": 2.0, "用于实现": 2.0,
           "同一类的东西": 0.5, "可以互相替代": 0.3}


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def member_key(members):
    return tuple(sorted((member["i"], member["n"]) for member in members))


def discover_groups(nodes, resolution):
    try:
        import networkx as nx
    except ImportError as error:
        raise ValueError("生成候选需要 networkx；应用已审候选不需要该依赖") from error

    parent = list(range(len(nodes)))

    def find(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    for node in nodes:
        for other, label in node.get("r", []):
            if label == "同一个东西":
                first, second = find(node["i"]), find(other)
                if first != second:
                    parent[first] = second

    graph = nx.Graph()
    for node in nodes:
        for other, label in node.get("r", []):
            weight = WEIGHTS.get(label)
            if weight is None:
                continue
            first, second = find(node["i"]), find(other)
            if first == second:
                continue
            if graph.has_edge(first, second):
                graph[first][second]["weight"] = max(graph[first][second]["weight"], weight)
            else:
                graph.add_edge(first, second, weight=weight)

    if not graph.number_of_edges():
        return []
    communities = nx.community.louvain_communities(
        graph, weight="weight", resolution=resolution, seed=7)
    communities = sorted((sorted(group) for group in communities if len(group) >= 4),
                         key=lambda group: (-len(group), group))

    def domain(index):
        node = nodes[index]
        while node["p"] is not None and node["d"] > 1:
            node = nodes[node["p"]]
        return node["n"]

    groups = []
    for group in communities:
        members = sorted(group, key=lambda index: (-graph.degree(index, weight="weight"), index))
        domains = collections.Counter(domain(index) for index in group)
        groups.append({"name": "", "note": "跨 " + "、".join(name for name, _ in domains.most_common(3)),
                       "members": [{"i": index, "n": nodes[index]["n"]} for index in members]})
    return groups


def create_candidate(nodes_raw, bundles_raw, resolution):
    nodes = json.loads(nodes_raw)["nodes"]
    old_groups = json.loads(bundles_raw)
    old_by_members = collections.defaultdict(list)
    for group in old_groups:
        old_by_members[member_key(group["members"])].append(group)
    groups = discover_groups(nodes, resolution)
    for group in groups:
        matches = old_by_members.get(member_key(group["members"]), [])
        if len(matches) == 1:
            group["name"] = matches[0]["name"]
            group["note"] = matches[0]["note"]
    return {"resolution": resolution, "nodesSha256": digest(nodes_raw),
            "bundlesSha256": digest(bundles_raw), "reviewed": False, "bundles": groups}


def reviewed_groups(candidate, nodes_raw, bundles_raw):
    if not isinstance(candidate, dict) or candidate.get("reviewed") is not True:
        raise ValueError("候选尚未确认：审阅后将 reviewed 设为 true，再显式 --apply")
    if candidate.get("nodesSha256") != digest(nodes_raw) or candidate.get("bundlesSha256") != digest(bundles_raw):
        raise ValueError("候选已过期：节点或现有组合已经变化，请重新生成并审阅")
    nodes = json.loads(nodes_raw)["nodes"]
    groups = candidate.get("bundles")
    if not isinstance(groups, list) or not groups:
        raise ValueError("bundles 必须是非空数组")
    output = []
    for position, group in enumerate(groups):
        at = f"bundles[{position}]"
        if not isinstance(group, dict):
            raise ValueError(f"{at} 必须是对象")
        for key in ("name", "note"):
            if not isinstance(group.get(key), str) or not group[key].strip():
                raise ValueError(f"{at}.{key} 必须由审阅者填写")
        members = group.get("members")
        if not isinstance(members, list) or not members:
            raise ValueError(f"{at}.members 必须是非空数组")
        seen = set()
        for offset, member in enumerate(members):
            location = f"{at}.members[{offset}]"
            if not isinstance(member, dict) or type(member.get("i")) is not int:
                raise ValueError(f"{location}.i 必须是整数下标")
            index = member["i"]
            if not 0 <= index < len(nodes) or nodes[index]["n"] != member.get("n"):
                raise ValueError(f"{location} 的下标与名称不匹配")
            if index in seen:
                raise ValueError(f"{location} 重复引用节点 {index}")
            seen.add(index)
        output.append({"name": group["name"], "note": group["note"],
                       "members": [{"i": member["i"], "n": member["n"]} for member in members]})
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("resolution", nargs="?", type=float)
    parser.add_argument("--output", type=pathlib.Path, help="候选输出路径，拒绝覆盖已有文件")
    parser.add_argument("--apply", type=pathlib.Path, help="应用已经审阅确认的候选文件")
    args = parser.parse_args()
    if args.apply and (args.resolution is not None or args.output is not None):
        parser.error("--apply 不能与分辨率或 --output 同时使用")
    nodes_path = ROOT / "data" / "concepts.json"
    bundles_path = ROOT / "data" / "bundles.json"
    try:
        nodes_raw, bundles_raw = nodes_path.read_bytes(), bundles_path.read_bytes()
        if args.apply:
            groups = reviewed_groups(json.loads(args.apply.read_text("utf-8")), nodes_raw, bundles_raw)
            temporary = None
            try:
                with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=bundles_path.parent,
                                                 prefix=".bundles-", suffix=".tmp", delete=False) as handle:
                    temporary = pathlib.Path(handle.name)
                    json.dump(groups, handle, ensure_ascii=False, indent=1)
                    handle.write("\n")
                temporary.replace(bundles_path)
            finally:
                if temporary is not None:
                    temporary.unlink(missing_ok=True)
            print(f"已应用已审候选：data/bundles.json · {len(groups)} 组；接着运行 node build.mjs")
            return

        resolution = args.resolution if args.resolution is not None else 1.4
        if not math.isfinite(resolution) or resolution <= 0:
            raise ValueError("分辨率必须是大于零的有限数")
        output = args.output or ROOT / "data" / "bundles.candidate.json"
        if output.resolve() in (nodes_path.resolve(), bundles_path.resolve()):
            raise ValueError("候选不能写入正式数据路径；审阅后使用 --apply")
        candidate = create_candidate(nodes_raw, bundles_raw, resolution)
        with output.open("x", encoding="utf-8") as handle:
            json.dump(candidate, handle, ensure_ascii=False, indent=1)
            handle.write("\n")
        unnamed = sum(not group["name"] for group in candidate["bundles"])
        print(f"候选写入 {output} · {len(candidate['bundles'])} 组 · {unnamed} 组待命名；正式组合未改动")
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"未写入正式组合：{error}\n")


if __name__ == "__main__":
    main()
