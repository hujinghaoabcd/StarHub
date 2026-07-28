#!/usr/bin/env python3
from __future__ import annotations

import collections
import datetime as dt
import json
import math
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

TOKEN = os.environ["GITHUB_TOKEN"].strip()
USER = os.getenv("STAR_USER", "hujinghaoabcd")
OUT = Path(os.getenv("AUDIT_OUTPUT", "exports/github-stars-gap-audit.md"))
RAW_OUT = Path(os.getenv("AUDIT_JSON", "exports/github-stars-gap-audit.json"))
API = "https://api.github.com"
NOW = dt.datetime.now(dt.timezone.utc)

# Search queries are intentionally conservative: established topics, meaningful star
# floors, non-forks and non-archived repositories. Results are sorted by stars.
QUERIES: dict[str, list[str]] = {
    "地理信息、遥感与空间计算": [
        "topic:geospatial stars:>1000", "topic:gis stars:>1000",
        "topic:remote-sensing stars:>500", "topic:webgis stars:>300",
        "topic:spatial-analysis stars:>300", "topic:geostatistics stars:>100",
        "topic:postgis stars:>300", "topic:lidar stars:>300",
        "topic:photogrammetry stars:>300", "topic:geocoding stars:>500",
    ],
    "数据科学、统计与科学计算": [
        "topic:data-science stars:>5000", "topic:statistics stars:>1000",
        "topic:scientific-computing stars:>1000", "topic:time-series stars:>2000",
        "topic:causal-inference stars:>500", "topic:bayesian-statistics stars:>300",
    ],
    "前端、UI 与 Web 设计": [
        "topic:frontend stars:>20000", "topic:react stars:>30000",
        "topic:vue stars:>20000", "topic:svelte stars:>10000",
        "topic:ui-components stars:>10000", "topic:css-framework stars:>10000",
    ],
    "编程语言生态与通用库": [
        "topic:python stars:>30000", "topic:rust stars:>20000",
        "topic:typescript stars:>30000", "topic:go stars:>30000",
        "topic:cpp stars:>20000", "topic:java stars:>20000",
    ],
    "后端、API 与 Web 框架": [
        "topic:django stars:>5000", "topic:fastapi stars:>5000",
        "topic:flask stars:>5000", "topic:spring-boot stars:>10000",
        "topic:laravel stars:>10000", "topic:graphql stars:>10000",
    ],
    "机器学习、深度学习与计算机视觉": [
        "topic:machine-learning stars:>10000", "topic:deep-learning stars:>10000",
        "topic:graph-neural-networks stars:>1000", "topic:computer-vision stars:>5000",
        "topic:time-series-forecasting stars:>1000", "topic:object-detection stars:>3000",
        "topic:semantic-segmentation stars:>2000", "topic:explainable-ai stars:>500",
    ],
    "教程、课程与面试学习": [
        "topic:computer-science stars:>30000", "topic:machine-learning-course stars:>5000",
        "topic:interview stars:>30000", "topic:tutorial stars:>30000",
    ],
    "气象、气候、大气与环境模拟": [
        "wrf weather research forecasting stars:>100", "topic:atmospheric-science stars:>100",
        "topic:climate-model stars:>100", "topic:weather-forecasting stars:>300",
        "cmaq air quality model stars:>20", "geos-chem atmospheric chemistry stars:>20",
        "aermod dispersion model stars:>5",
    ],
    "数据可视化、图表与 BI": [
        "topic:data-visualization stars:>10000", "topic:dashboard stars:>10000",
        "topic:plotting stars:>5000", "topic:business-intelligence stars:>5000",
    ],
    "多媒体、图像、音视频与图形": [
        "topic:image-processing stars:>10000", "topic:video-processing stars:>5000",
        "topic:audio-processing stars:>5000", "topic:computer-graphics stars:>5000",
    ],
    "全栈、CMS 与网站应用": [
        "topic:cms stars:>10000", "topic:headless-cms stars:>5000",
        "topic:full-stack stars:>10000", "topic:saas-boilerplate stars:>3000",
    ],
    "文档、知识管理与写作": [
        "topic:documentation stars:>10000", "topic:knowledge-base stars:>5000",
        "topic:markdown-editor stars:>5000", "topic:note-taking stars:>10000",
    ],
    "博客、主题、字体与开发者个性化": [
        "topic:static-site-generator stars:>10000", "topic:blog-theme stars:>2000",
        "topic:fonts stars:>10000", "topic:dotfiles stars:>20000",
    ],
    "Awesome 资源与项目清单": [
        "awesome stars:>50000 in:name", "topic:awesome-list stars:>20000",
    ],
    "科研论文、数据集与复现": [
        "topic:reproducible-research stars:>500", "topic:open-data stars:>5000",
        "topic:datasets stars:>10000", "topic:paper-implementation stars:>3000",
    ],
    "大语言模型、智能体与生成式 AI": [
        "topic:large-language-models stars:>10000", "topic:rag stars:>3000",
        "topic:ai-agents stars:>5000", "topic:mcp stars:>1000",
        "topic:local-llm stars:>5000", "topic:llm-inference stars:>5000",
    ],
    "开发工具、CLI 与编辑器": [
        "topic:cli stars:>20000", "topic:terminal stars:>20000",
        "topic:code-editor stars:>20000", "topic:developer-tools stars:>20000",
    ],
    "数据工程、数据库与搜索": [
        "topic:data-engineering stars:>10000", "topic:database stars:>20000",
        "topic:search-engine stars:>10000", "topic:vector-database stars:>5000",
        "topic:etl stars:>5000",
    ],
    "DevOps、云原生与基础设施": [
        "topic:kubernetes stars:>20000", "topic:devops stars:>20000",
        "topic:infrastructure-as-code stars:>10000", "topic:observability stars:>10000",
        "topic:ci-cd stars:>10000",
    ],
    "移动端与桌面应用": [
        "topic:flutter stars:>20000", "topic:react-native stars:>20000",
        "topic:electron stars:>20000", "topic:desktop-app stars:>20000",
    ],
    "游戏、模拟器与娱乐": [
        "topic:game-engine stars:>10000", "topic:game-development stars:>10000",
        "topic:emulator stars:>10000",
    ],
    "网络、爬虫与自动化": [
        "topic:web-scraping stars:>10000", "topic:crawler stars:>5000",
        "topic:browser-automation stars:>5000", "topic:automation stars:>20000",
    ],
    "测试、质量与软件工程": [
        "topic:testing stars:>10000", "topic:end-to-end-testing stars:>5000",
        "topic:property-based-testing stars:>1000", "topic:code-quality stars:>5000",
    ],
    "硬件、物联网与机器人": [
        "topic:robotics stars:>10000", "topic:ros stars:>5000",
        "topic:iot stars:>10000", "topic:embedded-systems stars:>10000",
    ],
    "系统、操作系统与底层开发": [
        "topic:operating-system stars:>20000", "topic:systems-programming stars:>10000",
        "topic:kernel stars:>10000", "topic:compiler stars:>10000",
    ],
    "区块链、Web3 与金融科技": [
        "topic:blockchain stars:>20000", "topic:web3 stars:>10000",
        "topic:quantitative-finance stars:>5000", "topic:fintech stars:>3000",
    ],
    "安全、隐私与逆向工程": [
        "topic:cybersecurity stars:>20000", "topic:privacy stars:>10000",
        "topic:reverse-engineering stars:>10000", "topic:penetration-testing stars:>10000",
    ],
    "海洋、水文与地球系统科学": [
        "topic:hydrology stars:>100", "topic:oceanography stars:>100",
        "topic:earth-system-model stars:>50", "ocean model stars:>100",
        "hydrological model stars:>100",
    ],
    "交通、城市计算与移动性": [
        "topic:traffic-prediction stars:>50", "topic:urban-computing stars:>50",
        "topic:mobility stars:>500", "topic:transportation stars:>500",
        "traffic forecasting graph neural network stars:>50",
    ],
}

# Canonical repositories that search-by-topic can miss. Reasons are shown in the report.
WATCHLIST: dict[str, dict[str, str]] = {
    "地理信息、遥感与空间计算": {
        "OSGeo/gdal": "GDAL/OGR 是栅格与矢量地理数据处理的事实标准底层库",
        "OSGeo/PROJ": "坐标参考系与投影转换的核心基础设施",
        "shapely/shapely": "Python 计算几何与矢量空间操作核心库",
        "pyproj4/pyproj": "Python 对 PROJ 的主流接口",
        "rasterio/rasterio": "Python 栅格数据读写与处理核心库",
        "pysal/libpysal": "PySAL 空间分析基础库",
        "pysal/esda": "探索性空间数据分析核心实现",
        "pysal/spreg": "空间计量经济学核心实现",
        "pysal/mgwr": "GWR/MGWR 的主流 Python 实现",
        "geopandas/geopandas": "Python 矢量空间数据分析核心库",
        "geemap/geemap": "Google Earth Engine 的重要 Python 交互工具",
        "opengeos/leafmap": "面向地学数据科学的交互式地图工具",
        "qgis/QGIS": "主流开源桌面 GIS",
        "geoserver/geoserver": "主流开源 OGC 地图服务平台",
        "maplibre/maplibre-gl-js": "开放矢量地图 WebGL 渲染核心项目",
        "Turfjs/turf": "JavaScript 地理空间分析核心库",
        "uber/h3": "六边形离散全球网格系统",
        "tidwall/tile38": "高性能地理空间数据库与实时围栏服务",
    },
    "数据科学、统计与科学计算": {
        "pandas-dev/pandas": "Python 表格数据分析事实标准",
        "numpy/numpy": "Python 科学计算数组基础",
        "scipy/scipy": "科学计算算法基础库",
        "xarray-contrib/xarray": "多维标记数组与地球科学数据分析核心",
        "dask/dask": "并行与分布式数组/表格计算",
        "statsmodels/statsmodels": "Python 统计建模核心库",
        "pymc-devs/pymc": "贝叶斯统计建模核心框架",
        "pydata/xarray": "多维标记数组与 NetCDF 分析核心",
        "polarsource/polars": "高性能 DataFrame 引擎",
        "duckdb/duckdb": "嵌入式分析数据库",
    },
    "机器学习、深度学习与计算机视觉": {
        "scikit-learn/scikit-learn": "经典机器学习事实标准",
        "pytorch/pytorch": "主流深度学习框架",
        "tensorflow/tensorflow": "主流深度学习框架",
        "pyg-team/pytorch_geometric": "PyTorch 图神经网络核心生态",
        "dmlc/dgl": "主流图神经网络框架",
        "Lightning-AI/pytorch-lightning": "PyTorch 训练工程化框架",
        "shap/shap": "SHAP 可解释机器学习官方实现",
        "ultralytics/ultralytics": "YOLO 检测/分割主流实现",
        "open-mmlab/mmdetection": "模块化目标检测工具箱",
        "open-mmlab/mmsegmentation": "语义分割工具箱",
        "unit8co/darts": "统一时间序列预测框架",
        "Nixtla/neuralforecast": "神经网络时间序列预测库",
        "sktime/sktime": "统一时间序列机器学习框架",
    },
    "气象、气候、大气与环境模拟": {
        "wrf-model/WRF": "WRF 官方核心模式",
        "wrf-model/WPS": "WRF 官方前处理系统",
        "NCAR/wrf-python": "WRF 输出诊断和可视化主流 Python 包",
        "USEPA/CMAQ": "美国 EPA 多尺度空气质量模式",
        "geoschem/GCClassic": "GEOS-Chem Classic 官方核心仓库",
        "geoschem/GCHP": "高性能 GEOS-Chem 官方实现",
        "spcl/icon-dace": "ICON 大气模式相关开放实现",
        "ecmwf/ecmwf-opendata": "ECMWF 开放数据访问工具",
        "Unidata/netcdf4-python": "NetCDF Python 核心接口",
        "pydata/xarray": "气象气候多维数据分析核心",
        "NCAR/MMM-PBLH": "边界层相关研究工具（若仍存在）",
    },
    "交通、城市计算与移动性": {
        "liyaguang/DCRNN": "扩散卷积交通预测经典模型官方实现",
        "VeritasYin/STGCN_IJCAI-18": "STGCN 交通预测经典实现",
        "nnzhan/Graph-WaveNet": "Graph WaveNet 交通预测经典实现",
        "guoshnBJTU/ASTGCN-r-pytorch": "ASTGCN 常用 PyTorch 实现",
        "LeiBAI/AGCRN": "AGCRN 交通预测官方实现",
        "LibCity/Bigscity-LibCity": "统一城市时空预测与基准平台",
        "TorchSpatiotemporal/tsl": "时空深度学习统一工具库",
        "Transmodeler/Trafformer": "交通预测 Transformer 代表实现",
        "eclipse-sumo/sumo": "城市交通仿真事实标准开源平台",
        "valhalla/valhalla": "开放道路路径规划引擎",
        "Project-OSRM/osrm-backend": "高性能开放道路路由引擎",
        "graphhopper/graphhopper": "Java 开源路径规划引擎",
    },
    "大语言模型、智能体与生成式 AI": {
        "langchain-ai/langchain": "LLM 应用与智能体主流框架",
        "run-llama/llama_index": "RAG 与数据连接主流框架",
        "modelcontextprotocol/servers": "MCP 官方服务器集合",
        "modelcontextprotocol/python-sdk": "MCP 官方 Python SDK",
        "ollama/ollama": "本地大模型运行主流工具",
        "ggerganov/llama.cpp": "CPU/边缘端 LLM 推理核心项目",
        "vllm-project/vllm": "高吞吐 LLM 推理引擎",
        "huggingface/transformers": "Transformer 模型核心生态",
        "huggingface/peft": "LoRA/PEFT 微调核心库",
        "microsoft/autogen": "多智能体应用框架",
        "crewAIInc/crewAI": "多智能体编排框架",
    },
    "数据工程、数据库与搜索": {
        "apache/airflow": "工作流编排事实标准",
        "apache/spark": "分布式数据处理核心平台",
        "apache/kafka": "事件流平台事实标准",
        "ClickHouse/ClickHouse": "高性能列式分析数据库",
        "elastic/elasticsearch": "全文搜索与分析平台",
        "milvus-io/milvus": "主流向量数据库",
        "qdrant/qdrant": "高性能向量数据库",
        "chroma-core/chroma": "LLM 应用常用向量数据库",
        "dbt-labs/dbt-core": "分析工程核心工具",
    },
    "DevOps、云原生与基础设施": {
        "kubernetes/kubernetes": "云原生编排事实标准",
        "hashicorp/terraform": "基础设施即代码事实标准",
        "prometheus/prometheus": "监控与指标事实标准",
        "grafana/grafana": "可观测性可视化平台",
        "argoproj/argo-cd": "GitOps 持续交付主流工具",
        "helm/helm": "Kubernetes 包管理器",
        "ansible/ansible": "配置管理与自动化核心工具",
    },
    "前端、UI 与 Web 设计": {
        "facebook/react": "React 官方核心仓库",
        "vuejs/core": "Vue 3 官方核心仓库",
        "sveltejs/svelte": "Svelte 官方核心仓库",
        "vercel/next.js": "React 全栈框架",
        "nuxt/nuxt": "Vue 全栈框架",
        "tailwindlabs/tailwindcss": "Utility-first CSS 主流框架",
        "ant-design/ant-design": "企业级 React UI 组件库",
    },
    "后端、API 与 Web 框架": {
        "django/django": "Django 官方核心仓库",
        "fastapi/fastapi": "现代 Python API 框架",
        "pallets/flask": "轻量 Python Web 框架",
        "encode/django-rest-framework": "Django REST API 主流框架",
        "spring-projects/spring-boot": "Java 后端主流框架",
        "laravel/laravel": "Laravel 应用框架",
    },
    "文档、知识管理与写作": {
        "mkdocs/mkdocs": "Python Markdown 文档生成器",
        "squidfunk/mkdocs-material": "主流 MkDocs 主题与文档平台",
        "facebook/docusaurus": "React 文档站生成器",
        "obsidianmd/obsidian-releases": "Obsidian 官方发布仓库",
        "logseq/logseq": "开源知识管理与双链笔记",
    },
    "开发工具、CLI 与编辑器": {
        "microsoft/vscode": "主流开源代码编辑器",
        "neovim/neovim": "现代 Vim 编辑器",
        "junegunn/fzf": "通用模糊查找 CLI",
        "BurntSushi/ripgrep": "高性能文本搜索工具",
        "sharkdp/bat": "现代 cat 替代工具",
    },
    "海洋、水文与地球系统科学": {
        "NOAA-EMC/WW3": "WaveWatch III 海浪模式",
        "FVCOM-GitHub/FVCOM": "FVCOM 海洋模式",
        "hydroshare/hydroshare": "水文数据共享平台",
        "Deltares/dfm_tools": "Delft3D-FM 数据处理工具",
        "ESCOMP/CTSM": "社区陆面模式",
        "ESCOMP/CESM": "社区地球系统模式",
    },
}

MAX_PER_CATEGORY = {
    "地理信息、遥感与空间计算": 25,
    "机器学习、深度学习与计算机视觉": 20,
    "气象、气候、大气与环境模拟": 20,
    "交通、城市计算与移动性": 20,
    "大语言模型、智能体与生成式 AI": 20,
    "数据科学、统计与科学计算": 15,
}
DEFAULT_MAX = 10

def request_json(url: str, *, data: dict[str, Any] | None = None, retries: int = 4) -> Any:
    body = None if data is None else json.dumps(data).encode("utf-8")
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {TOKEN}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "chatgpt-stars-gap-audit",
    }
    for attempt in range(retries):
        req = urllib.request.Request(url, data=body, headers=headers, method="POST" if body else "GET")
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as exc:
            payload = exc.read().decode("utf-8", "replace")
            if exc.code in {403, 429, 502, 503, 504} and attempt + 1 < retries:
                retry_after = exc.headers.get("Retry-After")
                delay = float(retry_after) if retry_after else 8 * (attempt + 1)
                print(f"retry {exc.code} after {delay}s: {url}", flush=True)
                time.sleep(delay)
                continue
            raise RuntimeError(f"GitHub API {exc.code}: {payload[:1000]}") from exc
        except (TimeoutError, urllib.error.URLError) as exc:
            if attempt + 1 < retries:
                time.sleep(5 * (attempt + 1))
                continue
            raise RuntimeError(f"Network failure: {url}: {exc}") from exc

def fetch_starred() -> tuple[set[str], int]:
    query = """
    query($login:String!, $cursor:String) {
      user(login:$login) {
        starredRepositories(first:100, after:$cursor) {
          totalCount
          nodes { nameWithOwner }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
    """
    cursor = None
    result: set[str] = set()
    total = 0
    pages = 0
    while True:
        payload = request_json(f"{API}/graphql", data={"query": query, "variables": {"login": USER, "cursor": cursor}})
        if payload.get("errors"):
            raise RuntimeError(payload["errors"])
        conn = payload["data"]["user"]["starredRepositories"]
        total = int(conn["totalCount"])
        result.update(node["nameWithOwner"].lower() for node in conn["nodes"])
        pages += 1
        if pages % 25 == 0:
            print(f"stars pages={pages}, fetched={len(result)}/{total}", flush=True)
        if not conn["pageInfo"]["hasNextPage"]:
            break
        cursor = conn["pageInfo"]["endCursor"]
    return result, total

def repo_slim(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "repo": item["full_name"],
        "url": item["html_url"],
        "description": item.get("description") or "无描述",
        "stars": int(item.get("stargazers_count") or 0),
        "language": item.get("language") or "未标注",
        "topics": item.get("topics") or [],
        "updated_at": item.get("updated_at") or "",
        "pushed_at": item.get("pushed_at") or "",
        "archived": bool(item.get("archived")),
        "fork": bool(item.get("fork")),
        "license": (item.get("license") or {}).get("spdx_id") or "未标注",
    }

def fetch_repo(full_name: str) -> dict[str, Any] | None:
    try:
        return repo_slim(request_json(f"{API}/repos/{full_name}"))
    except RuntimeError as exc:
        if "GitHub API 404" in str(exc):
            return None
        raise

def search(query: str) -> list[dict[str, Any]]:
    full_q = f"{query} fork:false archived:false"
    params = urllib.parse.urlencode({
        "q": full_q, "sort": "stars", "order": "desc", "per_page": 20, "page": 1
    })
    payload = request_json(f"{API}/search/repositories?{params}")
    return [repo_slim(x) for x in payload.get("items", [])]

def age_days(iso: str) -> int:
    if not iso:
        return 99999
    try:
        d = dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return (NOW - d).days
    except ValueError:
        return 99999

def score_candidate(c: dict[str, Any]) -> float:
    score = math.log10(max(c["stars"], 1) + 1) * 24
    age = age_days(c.get("pushed_at") or c.get("updated_at"))
    if age <= 180:
        score += 18
    elif age <= 365:
        score += 14
    elif age <= 730:
        score += 8
    elif age <= 1460:
        score += 2
    else:
        score -= 10
    score += min(18, 4 * len(c.get("matched_queries", [])))
    if c.get("canonical_reason"):
        score += 35
    return round(score, 1)

def tier(c: dict[str, Any]) -> str:
    if c.get("canonical_reason"):
        return "A｜优先核查"
    if c["stars"] >= 10000 and age_days(c.get("pushed_at") or c.get("updated_at")) <= 1095:
        return "A｜优先核查"
    if c["stars"] >= 3000 or age_days(c.get("pushed_at") or c.get("updated_at")) <= 365:
        return "B｜强烈推荐"
    return "C｜补充候选"

def esc(s: str) -> str:
    return str(s).replace("|", "\\|").replace("\n", " ").strip()

def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    starred, total = fetch_starred()
    print(f"exact starred total={total}, unique={len(starred)}", flush=True)

    per_category: dict[str, dict[str, dict[str, Any]]] = {
        cat: {} for cat in QUERIES
    }

    # Canonical checks first. Only fetch metadata for repositories not already starred.
    canonical_missing = 0
    for cat, repos in WATCHLIST.items():
        per_category.setdefault(cat, {})
        for full_name, reason in repos.items():
            if full_name.lower() in starred:
                continue
            item = fetch_repo(full_name)
            if not item or item["archived"]:
                continue
            item["canonical_reason"] = reason
            item["matched_queries"] = ["规范性/经典项目核查表"]
            per_category[cat][item["repo"].lower()] = item
            canonical_missing += 1

    # Search all categories; the authenticated search limit is 30 req/minute.
    query_total = sum(len(v) for v in QUERIES.values())
    qn = 0
    for cat, queries in QUERIES.items():
        for q in queries:
            qn += 1
            print(f"search {qn}/{query_total}: {cat}: {q}", flush=True)
            for item in search(q):
                key = item["repo"].lower()
                if key in starred or item["archived"] or item["fork"]:
                    continue
                existing = per_category[cat].get(key)
                if existing:
                    existing.setdefault("matched_queries", []).append(q)
                else:
                    item["matched_queries"] = [q]
                    per_category[cat][key] = item
            time.sleep(2.15)

    final: dict[str, list[dict[str, Any]]] = {}
    for cat in QUERIES:
        items = list(per_category.get(cat, {}).values())
        for x in items:
            x["score"] = score_candidate(x)
            x["tier"] = tier(x)
        items.sort(key=lambda x: (
            0 if x.get("canonical_reason") else 1,
            -x["score"], -x["stars"], x["repo"].lower()
        ))
        final[cat] = items[:MAX_PER_CATEGORY.get(cat, DEFAULT_MAX)]

    all_selected = [x for values in final.values() for x in values]
    unique_selected = {x["repo"].lower() for x in all_selected}
    tier_counts = collections.Counter(x["tier"].split("｜")[0] for x in all_selected)

    raw = {
        "generated_at": NOW.isoformat(),
        "user": USER,
        "starred_total": total,
        "starred_unique": len(starred),
        "queries": QUERIES,
        "canonical_missing": canonical_missing,
        "selected_total": len(all_selected),
        "selected_unique": len(unique_selected),
        "categories": final,
    }
    RAW_OUT.parent.mkdir(parents=True, exist_ok=True)
    RAW_OUT.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")

    lines: list[str] = []
    lines += [
        f"# {USER} GitHub Stars 关键项目查漏报告",
        "",
        f"> 生成时间：{NOW.astimezone(dt.timezone(dt.timedelta(hours=8))).strftime('%Y-%m-%d %H:%M')}（UTC+8）",
        f"> 已核对现有 Star：**{total:,}** 个；本报告推荐未收藏候选：**{len(unique_selected):,}** 个。",
        f"> 其中规范性/经典项目清单发现未收藏：**{canonical_missing:,}** 个；A 级 {tier_counts['A']} 个，B 级 {tier_counts['B']} 个，C 级 {tier_counts['C']} 个。",
        "",
        "## 方法与边界",
        "",
        "- 现有 Star 通过 GitHub GraphQL 完整分页读取，并以 `owner/repo` 精确去重。",
        "- 候选来自按 29 个一级分类设计的 GitHub Repository Search 查询，按 Star 数降序检索，排除 fork 与 archived 项目。",
        "- 另设“规范性/经典项目核查表”，用于补足 topic 标签不完善但属于事实标准、官方实现或经典论文代码的仓库。",
        "- “遗漏”仅表示当前 Star 清单中没有该 `owner/repo`；并不意味着必须收藏。建议结合使用需求、许可证、维护状态和重复功能判断。",
        "- 重要性分级综合考虑：官方/经典地位、社区规模、最近维护、多个查询命中情况。Star 数只是一个因素。",
        "",
        "## 优先检查清单",
        "",
        "| 优先级 | 仓库 | 建议归入一级分类 | ⭐ | 最近推送 | 推荐理由 |",
        "|---|---|---|---:|---|---|",
    ]
    top = sorted(all_selected, key=lambda x: (-x["score"], -x["stars"]))[:50]
    cat_by_repo = {}
    for cat, vals in final.items():
        for x in vals:
            cat_by_repo[x["repo"].lower()] = cat
    for x in top:
        reason = x.get("canonical_reason") or ("命中：" + "；".join(x["matched_queries"][:2]))
        lines.append(
            f"| {x['tier']} | [{esc(x['repo'])}]({x['url']}) | {esc(cat_by_repo[x['repo'].lower()])} | "
            f"{x['stars']:,} | {esc((x.get('pushed_at') or x.get('updated_at'))[:10])} | {esc(reason)} |"
        )

    lines += ["", "## 按当前一级分类列出的未收藏候选", ""]
    for idx, (cat, items) in enumerate(final.items(), 1):
        lines += [f"### {idx}. {cat}（{len(items)}）", ""]
        if not items:
            lines += ["本轮在保守阈值内没有发现值得单列的未收藏候选。", ""]
            continue
        lines += [
            "| 优先级 | 仓库 | ⭐ | 语言 | 最近推送 | 许可证 | 说明 | 推荐依据 |",
            "|---|---|---:|---|---|---|---|---|",
        ]
        for x in items:
            basis = x.get("canonical_reason") or ("检索命中：" + "；".join(x["matched_queries"][:3]))
            lines.append(
                f"| {x['tier']} | [{esc(x['repo'])}]({x['url']}) | {x['stars']:,} | "
                f"{esc(x['language'])} | {esc((x.get('pushed_at') or x.get('updated_at'))[:10])} | "
                f"{esc(x['license'])} | {esc(x['description'])} | {esc(basis)} |"
            )
        lines.append("")

    lines += [
        "## 使用建议",
        "",
        "1. 先处理 A 级项目：它们通常是官方仓库、事实标准、经典模型实现，或大型且仍活跃的基础设施。",
        "2. B 级项目适合按实际技术栈选择，不必为了“清单完整”全部收藏。",
        "3. C 级项目更偏细分或新兴方向，建议阅读 README、Release 和 Issues 后再决定。",
        "4. 对功能重复的项目，优先保留官方仓库、维护更活跃、许可证更清楚、文档更完整的一项。",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes), selected={len(unique_selected)}", flush=True)

if __name__ == "__main__":
    main()
