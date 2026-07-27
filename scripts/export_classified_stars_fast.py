#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

USER = os.getenv('STAR_USER', 'hujinghaoabcd')
OUTPUT = Path(os.getenv('STAR_OUTPUT', 'exports/github-stars-classified-hujinghaoabcd.md'))

RULES: list[tuple[str, tuple[str, ...]]] = [
    ('地理信息、遥感与空间计算', ('gis','geospatial','geography','spatial','geojson','geopandas','gdal','raster','shapefile','cartography','mapbox','leaflet','openlayers','cesium','qgis','arcgis','openstreetmap','osm','osmnx','remote sensing','satellite','lidar','point cloud','geocoding','routing','mobility','transportation','traffic','urban computing','地理信息','空间分析','遥感','地图','路网','交通','城市计算')),
    ('大语言模型、智能体与生成式 AI', ('llm','large language model','chatgpt','gpt','rag','retrieval augmented','ai agent','agentic','multi-agent','langchain','llamaindex','llama','mistral','qwen','deepseek','ollama','transformer','diffusion','stable diffusion','generative ai','genai','prompt','model context protocol','mcp','embedding','text generation','大语言模型','语言模型','智能体','生成式','知识库问答','提示词')),
    ('机器学习、深度学习与计算机视觉', ('machine learning','deep learning','neural network','pytorch','tensorflow','keras','scikit-learn','computer vision','object detection','segmentation','yolo','nlp','reinforcement learning','forecasting','graph neural network','gnn','recommender','classification','clustering','mlops','机器学习','深度学习','神经网络','计算机视觉','目标检测','图神经网络','时间序列','预测模型','自然语言处理','强化学习','推荐系统')),
    ('数据科学、统计与科学计算', ('data science','statistics','statistical','econometrics','pandas','numpy','scipy','jupyter','notebook','scientific computing','numerical','optimization','simulation','causal inference','bayesian','probability','linear algebra','signal processing','operations research','mathematical modeling','data analysis','analytics','数据科学','统计','计量经济','科学计算','数值计算','优化','仿真','因果推断','数据分析','数学建模')),
    ('数据工程、数据库与搜索', ('database','sql','postgres','mysql','sqlite','redis','mongodb','elasticsearch','opensearch','search engine','vector database','data pipeline','etl','data warehouse','kafka','flink','spark','dbt','graph database','data lake','stream processing','orm','query engine','data engineering','数据库','数据工程','搜索引擎','数据仓库','数据湖','数据管道','向量数据库')),
    ('数据可视化、图表与 BI', ('data visualization','visualization','plotting','chart','dashboard','matplotlib','seaborn','plotly','bokeh','altair','d3','echarts','grafana','observable','infographic','business intelligence','geovisualization','可视化','数据大屏','图表','仪表盘','科学绘图','商业智能')),
    ('前端、UI 与 Web 设计', ('frontend','front-end','react','vue','svelte','angular','next.js','nuxt','css','html','tailwind','component library','ui component','design system','user interface','web design','webgl','three.js','storybook','vite','webpack','前端','组件库','用户界面','网页设计','设计系统')),
    ('后端、API 与 Web 框架', ('backend','back-end','rest api','web api','api server','web framework','django','flask','fastapi','spring boot','rails','laravel','nestjs','express','graphql','microservice','server-side','后端','接口服务','微服务','web框架','服务端','接口开发')),
    ('全栈、CMS 与网站应用', ('fullstack','full-stack','cms','content management','blog platform','ecommerce','e-commerce','saas','admin dashboard','website template','static site generator','hugo','jekyll','wordpress','web application','web app','landing page','全栈','内容管理','博客系统','电商','管理后台','网站模板','建站')),
    ('移动端与桌面应用', ('android','ios','flutter','react native','mobile app','desktop app','electron','tauri','macos','windows app','qt','swiftui','kotlin','cross-platform','wearos','小程序','移动端','桌面应用','安卓','跨平台应用')),
    ('DevOps、云原生与基础设施', ('devops','docker','kubernetes','k8s','cloud native','cloud computing','terraform','ansible','ci/cd','github actions','deployment','serverless','aws','azure','gcp','helm','prometheus','nginx','infrastructure','observability','monitoring','service mesh','container','容器','云原生','运维','持续集成','部署','基础设施','监控')),
    ('网络、爬虫与自动化', ('web crawler','crawler','scraper','scraping','proxy','vpn','networking','network tool','http client','websocket','telegram bot','discord bot','automation','browser automation','selenium','playwright','puppeteer','rss','downloader','download manager','webhook','爬虫','代理','网络工具','自动化','机器人','下载器','浏览器自动化')),
    ('安全、隐私与逆向工程', ('cybersecurity','security','pentest','penetration testing','vulnerability','exploit','malware','reverse engineering','cryptography','encryption','privacy','forensics','ctf','hacking','authentication','oauth','password manager','threat intelligence','安全','网络安全','渗透测试','漏洞','逆向','密码学','隐私','取证')),
    ('系统、操作系统与底层开发', ('operating system','kernel','compiler','interpreter','runtime','systems programming','memory allocator','filesystem','file system','linux kernel','unix','assembly','embedded system','webassembly','wasm','virtual machine','hypervisor','bootloader','操作系统','内核','编译器','解释器','底层','嵌入式系统','文件系统')),
    ('开发工具、CLI 与编辑器', ('developer tool','development tool','cli','command line','terminal','editor','vscode','visual studio code','ide','debugger','formatter','linter','productivity','workflow','git client','shell','dotfiles','package manager','build tool','code generator','devtool','开发工具','命令行','终端','编辑器','调试器','效率工具')),
    ('测试、质量与软件工程', ('testing','test framework','unit test','integration test','benchmark','code quality','static analysis','fuzzing','coverage','software engineering','software architecture','design pattern','refactoring','performance testing','测试框架','单元测试','代码质量','静态分析','软件工程','设计模式','性能测试')),
    ('文档、知识管理与写作', ('documentation','docs','knowledge base','note taking','note-taking','markdown','wiki','writing','obsidian','notion','ebook','pdf','latex','bibliography','reference manager','digital garden','knowledge management','文档','知识库','笔记','写作','电子书','知识管理','论文写作','参考文献')),
    ('教程、课程与面试学习', ('tutorial','course','learning','education','textbook','interview','coding challenge','exercise','examples','handbook','study guide','roadmap','bootcamp','workshop','curriculum','learn','教程','课程','学习','面试','练习','入门','实战','学习路线')),
    ('Awesome 资源与项目清单', ('awesome','curated list','resource list','resources','collection of','cheatsheet','cheat sheet','best projects','useful links','精选','资源清单','项目合集','速查表')),
    ('多媒体、图像、音视频与图形', ('image processing','audio','video','multimedia','media player','ffmpeg','graphics','rendering','3d graphics','animation','photo','music','streaming','codec','camera','computer graphics','svg','canvas','音频','视频','多媒体','图像处理','图形学','播放器','流媒体','动画')),
    ('游戏、模拟器与娱乐', ('game','gaming','game engine','emulator','emulation','unity','unreal engine','godot','minecraft','retro','chess','game development','rom','arcade','游戏','模拟器','游戏引擎','娱乐')),
    ('区块链、Web3 与金融科技', ('blockchain','web3','cryptocurrency','bitcoin','ethereum','solidity','defi','nft','trading','algorithmic trading','quantitative finance','fintech','stock market','backtest','portfolio','quant','区块链','数字货币','量化交易','金融科技','股票','回测')),
    ('硬件、物联网与机器人', ('hardware','iot','internet of things','arduino','raspberry pi','robotics','robot','drone','firmware','fpga','electronics','microcontroller','sensor','esp32','stm32','硬件','物联网','机器人','无人机','固件','单片机','传感器','电子')),
    ('科研论文、数据集与复现', ('research paper','paper implementation','papers with code','research','dataset','datasets','benchmark dataset','reproducibility','replication','academic','arxiv','survey paper','thesis','experiment code','论文','科研','数据集','复现','学术','实验代码','综述')),
    ('编程语言生态与通用库', ('library','framework','sdk','toolkit','utility','utilities','package','plugin','extension','template','boilerplate','starter kit','scaffold','api wrapper','binding','通用库','工具库','框架','插件','扩展','模板','脚手架','开发包')),
]

LANG_HINT = {
    'Jupyter Notebook': '数据科学、统计与科学计算', 'R': '数据科学、统计与科学计算',
    'Julia': '数据科学、统计与科学计算', 'MATLAB': '数据科学、统计与科学计算',
    'TeX': '文档、知识管理与写作', 'HTML': '前端、UI 与 Web 设计', 'CSS': '前端、UI 与 Web 设计',
    'Vue': '前端、UI 与 Web 设计', 'Svelte': '前端、UI 与 Web 设计', 'Dart': '移动端与桌面应用',
    'Swift': '移动端与桌面应用', 'Objective-C': '移动端与桌面应用',
    'Dockerfile': 'DevOps、云原生与基础设施', 'HCL': 'DevOps、云原生与基础设施',
    'Solidity': '区块链、Web3 与金融科技', 'GDScript': '游戏、模拟器与娱乐',
    'Assembly': '系统、操作系统与底层开发',
}

TOKEN_RE = re.compile(r'[a-z0-9+#.]+|[\u4e00-\u9fff]+')


def get_json(url: str) -> tuple[Any, dict[str, str]]:
    req = urllib.request.Request(url, headers={
        'Accept': 'application/vnd.github.star+json',
        'User-Agent': 'github-stars-export/2.0',
        'X-GitHub-Api-Version': '2022-11-28',
    })
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.loads(r.read().decode('utf-8')), {k.lower(): v for k, v in r.headers.items()}
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', 'replace')
            if e.code in (500, 502, 503, 504) and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f'GitHub API {e.code}: {body[:500]}') from e
        except urllib.error.URLError as e:
            if attempt == 3:
                raise RuntimeError(f'Network error: {e}') from e
            time.sleep(2 ** attempt)
    raise RuntimeError('unreachable')


def fetch() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    page = 1
    while True:
        url = f'https://api.github.com/users/{USER}/starred?per_page=100&page={page}&sort=created&direction=desc'
        data, headers = get_json(url)
        if not isinstance(data, list):
            raise RuntimeError(f'Unexpected response type: {type(data)}')
        if not data:
            break
        for item in data:
            repo = item.get('repo', item) if isinstance(item, dict) else {}
            if isinstance(repo, dict) and repo.get('full_name'):
                repo = dict(repo)
                repo['_starred_at'] = item.get('starred_at') if isinstance(item, dict) else None
                out.append(repo)
        print(f'page={page} items={len(data)} remaining={headers.get("x-ratelimit-remaining", "?")}', flush=True)
        if len(data) < 100:
            break
        page += 1
    unique: dict[str, dict[str, Any]] = {}
    for r in out:
        unique[str(r.get('id') or r['full_name'])] = r
    return list(unique.values())


def normalized(value: Any) -> str:
    return re.sub(r'\s+', ' ', str(value or '').lower().replace('-', ' ').replace('_', ' ')).strip()


def has(text: str, tokens: set[str], kw: str) -> bool:
    kw = kw.lower()
    if any('\u4e00' <= c <= '\u9fff' for c in kw) or ' ' in kw or any(c in kw for c in '.+#/'):
        return kw in text
    return kw in tokens if len(kw) <= 4 else kw in text


def classify(repo: dict[str, Any]) -> tuple[str, str]:
    name = normalized(repo.get('name'))
    desc = normalized(repo.get('description'))
    topics = ' '.join(normalized(x) for x in (repo.get('topics') or []))
    name_tokens = set(TOKEN_RE.findall(name))
    desc_tokens = set(TOKEN_RE.findall(desc))
    topic_tokens = set(TOKEN_RE.findall(topics))
    scores: Counter[str] = Counter()
    for category, words in RULES:
        score = 0
        for kw in words:
            if has(topics, topic_tokens, kw): score += 7
            if has(name, name_tokens, kw): score += 5
            if has(desc, desc_tokens, kw): score += 2
        if score:
            scores[category] = score
    raw_name = str(repo.get('name') or '').lower()
    if raw_name == 'awesome' or raw_name.startswith('awesome-') or 'awesome-list' in (repo.get('topics') or []):
        scores['Awesome 资源与项目清单'] += 15
    lang = str(repo.get('language') or '')
    if lang in LANG_HINT:
        scores[LANG_HINT[lang]] += 3
    if not scores:
        return LANG_HINT.get(lang, '其他/待人工复核'), '低'
    ranked = scores.most_common(2)
    top, top_score = ranked[0]
    second = ranked[1][1] if len(ranked) > 1 else 0
    confidence = '高' if top_score >= 14 and top_score - second >= 5 else ('中' if top_score >= 6 else '低')
    return top, confidence


def clean(value: Any, limit: int = 220) -> str:
    s = re.sub(r'\s+', ' ', str(value or '')).strip().replace('|', '\\|')
    if not s: return '无描述'
    return s if len(s) <= limit else s[:limit-1].rstrip() + '…'


def date(value: Any) -> str:
    s = str(value or '')
    return s[:10] if len(s) >= 10 else ('未知' if not s else s)


def anchor(s: str) -> str:
    s = re.sub(r'[\s/]+', '-', s.lower())
    return re.sub(r'[^\w\-\u4e00-\u9fff]', '', s)


def render(repos: list[dict[str, Any]]) -> None:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    conf = Counter(); archived = forks = 0
    for repo in repos:
        cat, level = classify(repo)
        repo['_category'], repo['_confidence'] = cat, level
        grouped[cat].append(repo); conf[level] += 1
        archived += bool(repo.get('archived')); forks += bool(repo.get('fork'))
    cats = sorted(grouped, key=lambda c: (-len(grouped[c]), c))
    for c in cats:
        grouped[c].sort(key=lambda r: (str(r.get('_starred_at') or ''), int(r.get('stargazers_count') or 0)), reverse=True)
    now = datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')
    lines = [f'# {USER} 的 GitHub Star 项目分类清单','',f'> 生成时间：{now}',f'> 项目总数：**{len(repos):,}**（公开可访问的已 Star 仓库；每个仓库仅归入一个主分类）','',
             '## 说明','', '本清单逐页读取 GitHub Star API 返回的每一个公开仓库，并依据仓库名称、简介、Topics 和主要语言进行规则评分，分配一个主分类。分类并非逐仓库阅读全文后的人工判定，因此“中/低”置信度条目适合后续人工复核。','',
             f'- 分类数量：**{len(cats)}**',f'- 高置信度：**{conf["高"]:,}**；中置信度：**{conf["中"]:,}**；低置信度：**{conf["低"]:,}**',f'- Fork 项目：**{forks:,}**；归档项目：**{archived:,}**','',
             '## 分类统计','', '| 排名 | 分类 | 数量 | 占比 |','|---:|---|---:|---:|']
    for i, c in enumerate(cats, 1):
        n = len(grouped[c]); pct = n / len(repos) * 100
        lines.append(f'| {i} | [{c}](#{anchor(c)}) | {n:,} | {pct:.2f}% |')
    lines += ['', '## 完整分类清单', '']
    idx = 0
    for c in cats:
        lines += [f'### {c}（{len(grouped[c]):,}）', '']
        for r in grouped[c]:
            idx += 1
            full = str(r.get('full_name') or '未知仓库'); url = str(r.get('html_url') or f'https://github.com/{full}')
            lang = str(r.get('language') or '未标注'); stars = int(r.get('stargazers_count') or 0)
            flags = (['Fork'] if r.get('fork') else []) + (['已归档'] if r.get('archived') else []) + (['已禁用'] if r.get('disabled') else [])
            status = '、'.join(flags) if flags else '正常'
            lines.append(f'{idx}. [{full}]({url}) — {clean(r.get("description"))}  `语言: {lang}` `⭐ {stars:,}` `Star: {date(r.get("_starred_at"))}` `更新: {date(r.get("updated_at"))}` `状态: {status}` `分类置信度: {r.get("_confidence", "低")}`')
        lines.append('')
    lines += ['---','',f'校验：正文共列出 **{idx:,}** 个仓库，与 API 去重后的项目总数 **{len(repos):,}** 一致。']
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'wrote={OUTPUT} bytes={OUTPUT.stat().st_size} repos={len(repos)}', flush=True)


def main() -> None:
    repos = fetch()
    if not repos: raise RuntimeError(f'No public starred repositories found for {USER}')
    render(repos)

if __name__ == '__main__':
    main()
