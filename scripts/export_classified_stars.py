#!/usr/bin/env python3
"""Export every public repository starred by a GitHub user and classify it."""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

USERNAME = os.environ.get("STAR_USER", "hujinghaoabcd")
TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
OUT_PATH = Path(os.environ.get("STAR_OUTPUT", "exports/github-stars-classified-hujinghaoabcd.md"))
API_VERSION = "2022-11-28"

CATEGORY_RULES: list[tuple[str, list[str]]] = [
    ("地理信息、遥感与空间计算", ["gis", "geospatial", "geographic", "geography", "spatial analysis", "spatial data", "geojson", "geopandas", "gdal", "rasterio", "shapefile", "cartography", "mapping", "mapbox", "leaflet", "openlayers", "cesium", "qgis", "arcgis", "openstreetmap", "osm", "osmnx", "remote sensing", "earth observation", "satellite", "lidar", "point cloud", "geocoding", "routing", "mobility", "transportation", "traffic", "urban computing", "地理信息", "空间分析", "空间数据", "遥感", "地图", "路网", "交通", "城市计算"]),
    ("大语言模型、智能体与生成式 AI", ["llm", "large language model", "language model", "chatgpt", "gpt", "rag", "retrieval augmented generation", "ai agent", "agentic", "multi-agent", "langchain", "llamaindex", "llama", "mistral", "qwen", "deepseek", "ollama", "transformer", "diffusion", "stable diffusion", "generative ai", "genai", "prompt engineering", "prompt", "model context protocol", "mcp", "embedding", "vector search", "text generation", "大语言模型", "语言模型", "智能体", "生成式", "知识库问答", "提示词"]),
    ("机器学习、深度学习与计算机视觉", ["machine learning", "deep learning", "neural network", "pytorch", "tensorflow", "keras", "scikit-learn", "computer vision", "object detection", "image segmentation", "yolo", "natural language processing", "nlp", "reinforcement learning", "time series forecasting", "forecasting", "graph neural network", "gnn", "recommendation system", "recommender", "classification", "clustering", "feature engineering", "model training", "mlops", "机器学习", "深度学习", "神经网络", "计算机视觉", "目标检测", "图神经网络", "时间序列", "预测模型", "自然语言处理", "强化学习", "推荐系统"]),
    ("数据科学、统计与科学计算", ["data science", "statistics", "statistical", "econometrics", "pandas", "numpy", "scipy", "jupyter", "notebook", "scientific computing", "numerical", "optimization", "simulation", "causal inference", "bayesian", "probability", "linear algebra", "signal processing", "operations research", "mathematical modeling", "data analysis", "analytics", "数据科学", "统计", "计量经济", "科学计算", "数值计算", "优化", "仿真", "因果推断", "数据分析", "数学建模"]),
    ("数据工程、数据库与搜索", ["database", "sql", "postgres", "postgresql", "mysql", "sqlite", "redis", "mongodb", "elasticsearch", "opensearch", "search engine", "vector database", "data pipeline", "etl", "data warehouse", "kafka", "flink", "spark", "dbt", "graph database", "data lake", "stream processing", "orm", "query engine", "data engineering", "indexing", "数据库", "数据工程", "搜索引擎", "数据仓库", "数据湖", "数据管道", "向量数据库"]),
    ("数据可视化、图表与 BI", ["data visualization", "visualization", "plotting", "chart", "dashboard", "matplotlib", "seaborn", "plotly", "bokeh", "altair", "d3.js", "d3", "echarts", "grafana", "observable", "infographic", "business intelligence", "bi dashboard", "geovisualization", "可视化", "数据大屏", "图表", "仪表盘", "科学绘图", "商业智能"]),
    ("前端、UI 与 Web 设计", ["frontend", "front-end", "react", "vue", "svelte", "angular", "next.js", "nuxt", "css", "html", "tailwind", "component library", "ui component", "design system", "user interface", "web design", "webgl", "three.js", "storybook", "vite", "webpack", "前端", "组件库", "用户界面", "网页设计", "设计系统", "低代码前端"]),
    ("后端、API 与 Web 框架", ["backend", "back-end", "rest api", "web api", "api server", "web framework", "django", "flask", "fastapi", "spring boot", "spring", "rails", "laravel", "nestjs", "express.js", "express", "graphql", "microservice", "websocket server", "authentication server", "后端", "接口服务", "微服务", "web框架", "服务端", "接口开发"]),
    ("全栈、CMS 与网站应用", ["fullstack", "full-stack", "cms", "content management", "blog platform", "ecommerce", "e-commerce", "saas", "admin dashboard", "website template", "static site generator", "hugo", "jekyll", "wordpress", "web application", "web app", "landing page", "全栈", "内容管理", "博客系统", "电商", "管理后台", "网站模板", "建站"]),
    ("移动端与桌面应用", ["android", "ios", "flutter", "react native", "mobile app", "mobile development", "desktop app", "electron", "tauri", "macos", "windows app", "qt", "swiftui", "kotlin", "cross-platform", "wearos", "小程序", "移动端", "桌面应用", "安卓", "跨平台应用"]),
    ("DevOps、云原生与基础设施", ["devops", "docker", "kubernetes", "k8s", "cloud native", "cloud computing", "terraform", "ansible", "ci/cd", "continuous integration", "github actions", "deployment", "serverless", "aws", "azure", "google cloud", "gcp", "helm", "prometheus", "nginx", "infrastructure", "observability", "monitoring", "service mesh", "container", "容器", "云原生", "运维", "持续集成", "部署", "基础设施", "监控"]),
    ("网络、爬虫与自动化", ["web crawler", "crawler", "scraper", "scraping", "proxy", "vpn", "networking", "network tool", "http client", "websocket", "telegram bot", "discord bot", "automation", "browser automation", "selenium", "playwright", "puppeteer", "rss", "downloader", "download manager", "webhook", "爬虫", "代理", "网络工具", "自动化", "机器人", "下载器", "浏览器自动化"]),
    ("安全、隐私与逆向工程", ["cybersecurity", "security", "pentest", "penetration testing", "vulnerability", "exploit", "malware", "reverse engineering", "cryptography", "encryption", "privacy", "forensics", "ctf", "hacking", "authentication", "oauth", "password manager", "threat intelligence", "安全", "网络安全", "渗透测试", "漏洞", "逆向", "密码学", "隐私", "取证"]),
    ("系统、操作系统与底层开发", ["operating system", "kernel", "compiler", "interpreter", "runtime", "systems programming", "memory allocator", "filesystem", "file system", "linux kernel", "unix", "assembly", "embedded system", "webassembly", "wasm", "virtual machine", "hypervisor", "bootloader", "操作系统", "内核", "编译器", "解释器", "底层", "嵌入式系统", "文件系统"]),
    ("开发工具、CLI 与编辑器", ["developer tool", "development tool", "cli", "command line", "terminal", "editor", "vscode", "visual studio code", "ide", "debugger", "formatter", "linter", "productivity", "workflow", "git client", "shell", "dotfiles", "package manager", "build tool", "code generator", "devtool", "代码生成", "开发工具", "命令行", "终端", "编辑器", "调试器", "效率工具"]),
    ("测试、质量与软件工程", ["testing", "test framework", "unit test", "integration test", "benchmark", "code quality", "static analysis", "fuzzing", "coverage", "software engineering", "software architecture", "design pattern", "refactoring", "dependency analysis", "performance testing", "测试框架", "单元测试", "代码质量", "静态分析", "软件工程", "设计模式", "性能测试"]),
    ("文档、知识管理与写作", ["documentation", "docs", "knowledge base", "note taking", "note-taking", "markdown", "wiki", "writing", "obsidian", "notion", "ebook", "pdf", "latex", "bibliography", "reference manager", "digital garden", "knowledge management", "文档", "知识库", "笔记", "写作", "电子书", "知识管理", "论文写作", "参考文献"]),
    ("教程、课程与面试学习", ["tutorial", "course", "learning", "education", "textbook", "interview", "coding challenge", "exercise", "examples", "handbook", "study guide", "roadmap", "bootcamp", "workshop", "curriculum", "learn", "教程", "课程", "学习", "面试", "练习", "入门", "实战", "学习路线"]),
    ("Awesome 资源与项目清单", ["awesome", "curated list", "resource list", "resources", "collection of", "cheatsheet", "cheat sheet", "best projects", "useful links", "精选", "资源清单", "项目合集", "速查表"]),
    ("多媒体、图像、音视频与图形", ["image processing", "audio", "video", "multimedia", "media player", "ffmpeg", "graphics", "rendering", "3d graphics", "animation", "photo", "music", "streaming", "codec", "camera", "computer graphics", "svg", "canvas", "音频", "视频", "多媒体", "图像处理", "图形学", "播放器", "流媒体", "动画"]),
    ("游戏、模拟器与娱乐", ["game", "gaming", "game engine", "emulator", "emulation", "unity", "unreal engine", "godot", "minecraft", "retro", "chess", "game development", "rom", "arcade", "游戏", "模拟器", "游戏引擎", "娱乐"]),
    ("区块链、Web3 与金融科技", ["blockchain", "web3", "cryptocurrency", "bitcoin", "ethereum", "solidity", "defi", "nft", "trading", "algorithmic trading", "quantitative finance", "fintech", "stock market", "backtest", "portfolio", "quant", "区块链", "数字货币", "量化交易", "金融科技", "股票", "回测"]),
    ("硬件、物联网与机器人", ["hardware", "iot", "internet of things", "arduino", "raspberry pi", "robotics", "robot", "drone", "firmware", "fpga", "electronics", "microcontroller", "sensor", "esp32", "stm32", "硬件", "物联网", "机器人", "无人机", "固件", "单片机", "传感器", "电子"]),
    ("科研论文、数据集与复现", ["research paper", "paper implementation", "papers with code", "research", "dataset", "datasets", "benchmark dataset", "reproducibility", "replication", "academic", "arxiv", "survey paper", "thesis", "experiment code", "论文", "科研", "数据集", "复现", "学术", "实验代码", "综述"]),
    ("编程语言生态与通用库", ["library", "framework", "sdk", "toolkit", "utility", "utilities", "package", "plugin", "extension", "template", "boilerplate", "starter kit", "scaffold", "api wrapper", "binding", "通用库", "工具库", "框架", "插件", "扩展", "模板", "脚手架", "开发包"]),
]

LANGUAGE_HINTS: dict[str, list[tuple[str, int]]] = {
    "Jupyter Notebook": [("数据科学、统计与科学计算", 3), ("机器学习、深度学习与计算机视觉", 1)], "R": [("数据科学、统计与科学计算", 4)], "Julia": [("数据科学、统计与科学计算", 3)], "MATLAB": [("数据科学、统计与科学计算", 3)], "TeX": [("文档、知识管理与写作", 3), ("科研论文、数据集与复现", 1)], "HTML": [("前端、UI 与 Web 设计", 3)], "CSS": [("前端、UI 与 Web 设计", 4)], "Vue": [("前端、UI 与 Web 设计", 4)], "Svelte": [("前端、UI 与 Web 设计", 4)], "TypeScript": [("前端、UI 与 Web 设计", 1)], "JavaScript": [("前端、UI 与 Web 设计", 1)], "Dart": [("移动端与桌面应用", 4)], "Swift": [("移动端与桌面应用", 4)], "Kotlin": [("移动端与桌面应用", 3)], "Objective-C": [("移动端与桌面应用", 4)], "Dockerfile": [("DevOps、云原生与基础设施", 5)], "HCL": [("DevOps、云原生与基础设施", 5)], "Solidity": [("区块链、Web3 与金融科技", 6)], "GDScript": [("游戏、模拟器与娱乐", 5)], "ShaderLab": [("游戏、模拟器与娱乐", 4), ("多媒体、图像、音视频与图形", 2)], "Assembly": [("系统、操作系统与底层开发", 5)], "C": [("系统、操作系统与底层开发", 1)], "C++": [("系统、操作系统与底层开发", 1)], "Rust": [("系统、操作系统与底层开发", 1)], "Shell": [("开发工具、CLI 与编辑器", 2), ("DevOps、云原生与基础设施", 1)], "PowerShell": [("开发工具、CLI 与编辑器", 2), ("DevOps、云原生与基础设施", 1)],
}

FALLBACK_BY_LANGUAGE: dict[str, str] = {"HTML": "前端、UI 与 Web 设计", "CSS": "前端、UI 与 Web 设计", "Vue": "前端、UI 与 Web 设计", "Svelte": "前端、UI 与 Web 设计", "Dart": "移动端与桌面应用", "Swift": "移动端与桌面应用", "Objective-C": "移动端与桌面应用", "Dockerfile": "DevOps、云原生与基础设施", "HCL": "DevOps、云原生与基础设施", "Solidity": "区块链、Web3 与金融科技", "GDScript": "游戏、模拟器与娱乐", "TeX": "文档、知识管理与写作", "Jupyter Notebook": "数据科学、统计与科学计算", "R": "数据科学、统计与科学计算", "Julia": "数据科学、统计与科学计算", "MATLAB": "数据科学、统计与科学计算", "Assembly": "系统、操作系统与底层开发"}


def api_get(url: str, max_retries: int = 6) -> tuple[Any, dict[str, str]]:
    headers = {"Accept": "application/vnd.github.star+json", "User-Agent": "github-stars-classifier/1.0", "X-GitHub-Api-Version": API_VERSION}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    for attempt in range(max_retries):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                data = json.loads(response.read().decode("utf-8"))
                return data, {k.lower(): v for k, v in response.headers.items()}
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            if exc.code in {403, 429, 500, 502, 503, 504} and attempt + 1 < max_retries:
                reset = exc.headers.get("X-RateLimit-Reset")
                sleep_for = max(5, int(reset) - int(time.time()) + 2) if reset and exc.code == 403 else min(60, 2 ** attempt * 3)
                print(f"API {exc.code}; retrying in {sleep_for}s", file=sys.stderr)
                time.sleep(sleep_for)
                continue
            raise RuntimeError(f"GitHub API error {exc.code}: {body[:500]}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            if attempt + 1 >= max_retries:
                raise RuntimeError(f"Network error after {max_retries} attempts: {exc}") from exc
            sleep_for = min(60, 2 ** attempt * 3)
            print(f"Network error; retrying in {sleep_for}s: {exc}", file=sys.stderr)
            time.sleep(sleep_for)
    raise RuntimeError("Unreachable retry state")


def fetch_all_starred() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    page = 1
    while True:
        url = f"https://api.github.com/users/{USERNAME}/starred?per_page=100&page={page}&sort=created&direction=desc"
        payload, headers = api_get(url)
        if not isinstance(payload, list):
            raise RuntimeError(f"Unexpected API response on page {page}: {type(payload)!r}")
        if not payload:
            break
        for item in payload:
            if isinstance(item, dict) and "repo" in item:
                repo, starred_at = item.get("repo") or {}, item.get("starred_at")
            else:
                repo, starred_at = item, None
            if isinstance(repo, dict) and repo.get("full_name"):
                repo = dict(repo)
                repo["_starred_at"] = starred_at
                records.append(repo)
        print(f"Fetched page {page}: {len(payload)} repositories (rate remaining: {headers.get('x-ratelimit-remaining', '?')})")
        if len(payload) < 100:
            break
        page += 1
    unique: dict[str, dict[str, Any]] = {}
    for repo in records:
        key = str(repo.get("id") or repo.get("full_name"))
        if key not in unique:
            unique[key] = repo
    return list(unique.values())


def text_has(text: str, keyword: str) -> bool:
    text, keyword = text.lower(), keyword.lower().strip()
    if not keyword:
        return False
    if any("\u4e00" <= ch <= "\u9fff" for ch in keyword) or " " in keyword or any(ch in keyword for ch in ".+#/-"):
        return keyword in text
    if len(keyword) <= 4:
        return re.search(rf"(?<![a-z0-9]){re.escape(keyword)}(?![a-z0-9])", text) is not None
    return keyword in text


def classify(repo: dict[str, Any]) -> tuple[str, str, int, int]:
    name = str(repo.get("name") or "").replace("-", " ").replace("_", " ").lower()
    full_name = str(repo.get("full_name") or "").replace("-", " ").replace("_", " ").lower()
    description = str(repo.get("description") or "").lower()
    homepage = str(repo.get("homepage") or "").lower()
    topics = [str(t).lower() for t in (repo.get("topics") or [])]
    language = str(repo.get("language") or "")
    scores: Counter[str] = Counter()
    for category, keywords in CATEGORY_RULES:
        for keyword in keywords:
            kw = keyword.lower()
            if any(text_has(topic, kw) for topic in topics): scores[category] += 7
            if text_has(name, kw): scores[category] += 5
            elif text_has(full_name, kw): scores[category] += 3
            if text_has(description, kw): scores[category] += 2
            if homepage and text_has(homepage, kw): scores[category] += 1
    for category, bonus in LANGUAGE_HINTS.get(language, []): scores[category] += bonus
    raw_name = str(repo.get("name") or "").lower()
    if raw_name.startswith("awesome-") or raw_name == "awesome" or "awesome-list" in topics: scores["Awesome 资源与项目清单"] += 15
    ranked = scores.most_common()
    if not ranked or ranked[0][1] <= 0:
        return FALLBACK_BY_LANGUAGE.get(language, "其他/待人工复核"), "低", 0, 0
    top_category, top_score = ranked[0]
    second_score = ranked[1][1] if len(ranked) > 1 else 0
    gap = top_score - second_score
    confidence = "高" if top_score >= 14 and gap >= 5 else ("中" if top_score >= 6 else "低")
    return top_category, confidence, top_score, second_score


def clean_description(value: Any, limit: int = 220) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip().replace("|", "\\|")
    if not text: return "无描述"
    return text[: limit - 1].rstrip() + "…" if len(text) > limit else text


def format_date(value: Any) -> str:
    if not value: return "未知"
    text = str(value)
    return text[:10] if len(text) >= 10 else text


def make_anchor(text: str) -> str:
    anchor = re.sub(r"[\s/]+", "-", text.strip().lower())
    return re.sub(r"[^\w\-\u4e00-\u9fff]", "", anchor)


def write_markdown(repos: list[dict[str, Any]]) -> None:
    generated_at = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    confidence_counts: Counter[str] = Counter()
    archived_count = fork_count = 0
    for repo in repos:
        category, confidence, score, second_score = classify(repo)
        repo.update({"_category": category, "_confidence": confidence, "_classification_score": score, "_classification_second_score": second_score})
        grouped[category].append(repo)
        confidence_counts[confidence] += 1
        archived_count += int(bool(repo.get("archived")))
        fork_count += int(bool(repo.get("fork")))
    category_order = [name for name, _ in CATEGORY_RULES] + ["其他/待人工复核"]
    category_order = [c for c in category_order if grouped.get(c)]
    category_order.sort(key=lambda c: (-len(grouped[c]), c))
    for category in category_order:
        grouped[category].sort(key=lambda r: (str(r.get("_starred_at") or ""), int(r.get("stargazers_count") or 0), str(r.get("full_name") or "").lower()), reverse=True)
    lines = [f"# {USERNAME} 的 GitHub Star 项目分类清单", "", f"> 生成时间：{generated_at}", f"> 项目总数：**{len(repos):,}**（公开可访问的已 Star 仓库；每个仓库仅归入一个主分类）", "", "## 说明", "", "本清单逐页读取 GitHub Star API 返回的每一个公开仓库，并依据仓库名称、简介、Topics、主要语言和主页信息进行规则评分，分配一个主分类。分类并非逐仓库阅读全文后的人工判定，因此“中/低”置信度条目适合后续人工复核。", "", f"- 分类数量：**{len(category_order)}**", f"- 高置信度：**{confidence_counts['高']:,}**；中置信度：**{confidence_counts['中']:,}**；低置信度：**{confidence_counts['低']:,}**", f"- Fork 项目：**{fork_count:,}**；归档项目：**{archived_count:,}**", "", "## 分类统计", "", "| 排名 | 分类 | 数量 | 占比 |", "|---:|---|---:|---:|"]
    for idx, category in enumerate(category_order, 1):
        count = len(grouped[category]); ratio = count / len(repos) * 100 if repos else 0
        lines.append(f"| {idx} | [{category}](#{make_anchor(category)}) | {count:,} | {ratio:.2f}% |")
    lines.extend(["", "## 完整分类清单", ""])
    running_index = 0
    for category in category_order:
        items = grouped[category]
        lines.extend([f"### {category}（{len(items):,}）", ""])
        for repo in items:
            running_index += 1
            full_name = str(repo.get("full_name") or "未知仓库")
            url = str(repo.get("html_url") or f"https://github.com/{full_name}")
            language = str(repo.get("language") or "未标注")
            stars = int(repo.get("stargazers_count") or 0)
            flags = (["Fork"] if repo.get("fork") else []) + (["已归档"] if repo.get("archived") else []) + (["已禁用"] if repo.get("disabled") else [])
            status = "、".join(flags) if flags else "正常"
            lines.append(f"{running_index}. [{full_name}]({url}) — {clean_description(repo.get('description'))}  `语言: {language}` `⭐ {stars:,}` `Star: {format_date(repo.get('_starred_at'))}` `更新: {format_date(repo.get('updated_at'))}` `状态: {status}` `分类置信度: {repo.get('_confidence', '低')}`")
        lines.append("")
    lines.extend(["---", "", f"校验：正文共列出 **{running_index:,}** 个仓库，与 API 去重后的项目总数 **{len(repos):,}** 一致。"])
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size:,} bytes)")


def main() -> None:
    repos = fetch_all_starred()
    if not repos: raise RuntimeError(f"No public starred repositories found for {USERNAME}")
    write_markdown(repos)


if __name__ == "__main__":
    main()
