#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Any

from scripts.export_classified_stars_fast import render

USER = os.getenv("STAR_USER", "hujinghaoabcd")
TOKEN = os.getenv("GITHUB_TOKEN", "").strip()

QUERY = r'''
query StarredRepositories($login: String!, $cursor: String) {
  user(login: $login) {
    starredRepositories(
      first: 100
      after: $cursor
      orderBy: {field: STARRED_AT, direction: DESC}
    ) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges {
        starredAt
        node {
          databaseId
          nameWithOwner
          url
          description
          stargazerCount
          updatedAt
          isFork
          isArchived
          primaryLanguage { name }
          repositoryTopics(first: 30) {
            nodes { topic { name } }
          }
        }
      }
    }
  }
  rateLimit { cost remaining resetAt }
}
'''


def graphql(variables: dict[str, Any]) -> dict[str, Any]:
    if not TOKEN:
        raise RuntimeError("GITHUB_TOKEN is required for GraphQL export")
    body = json.dumps({"query": QUERY, "variables": variables}).encode("utf-8")
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "github-stars-export/3.0",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if payload.get("errors"):
                raise RuntimeError("GraphQL errors: " + json.dumps(payload["errors"], ensure_ascii=False)[:1500])
            return payload["data"]
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")
            if exc.code in {500, 502, 503, 504} and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"GraphQL HTTP {exc.code}: {detail[:1000]}") from exc
        except urllib.error.URLError as exc:
            if attempt == 3:
                raise RuntimeError(f"GraphQL network error: {exc}") from exc
            time.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


def fetch_all() -> list[dict[str, Any]]:
    cursor: str | None = None
    repos: list[dict[str, Any]] = []
    page = 0
    expected_total: int | None = None
    while True:
        page += 1
        data = graphql({"login": USER, "cursor": cursor})
        user = data.get("user")
        if not user:
            raise RuntimeError(f"GitHub user not found: {USER}")
        connection = user["starredRepositories"]
        if expected_total is None:
            expected_total = int(connection["totalCount"])
        edges = connection.get("edges") or []
        for edge in edges:
            node = edge.get("node") or {}
            topics = []
            for item in ((node.get("repositoryTopics") or {}).get("nodes") or []):
                topic = (item.get("topic") or {}).get("name")
                if topic:
                    topics.append(topic)
            language = (node.get("primaryLanguage") or {}).get("name")
            repos.append({
                "id": node.get("databaseId") or node.get("nameWithOwner"),
                "full_name": node.get("nameWithOwner"),
                "name": str(node.get("nameWithOwner") or "").split("/")[-1],
                "html_url": node.get("url"),
                "description": node.get("description"),
                "stargazers_count": node.get("stargazerCount") or 0,
                "updated_at": node.get("updatedAt"),
                "fork": bool(node.get("isFork")),
                "archived": bool(node.get("isArchived")),
                "disabled": False,
                "language": language,
                "topics": topics,
                "_starred_at": edge.get("starredAt"),
            })
        rate = data.get("rateLimit") or {}
        print(
            f"page={page} fetched={len(edges)} accumulated={len(repos)} "
            f"total={expected_total} graphql_remaining={rate.get('remaining')}",
            flush=True,
        )
        page_info = connection["pageInfo"]
        if not page_info.get("hasNextPage"):
            break
        cursor = page_info.get("endCursor")
        if not cursor:
            raise RuntimeError("Missing GraphQL cursor while hasNextPage=true")
    unique: dict[str, dict[str, Any]] = {}
    for repo in repos:
        unique[str(repo.get("id") or repo.get("full_name"))] = repo
    result = list(unique.values())
    if expected_total is not None and len(result) != expected_total:
        raise RuntimeError(f"Count mismatch: GraphQL totalCount={expected_total}, unique repositories={len(result)}")
    return result


def main() -> None:
    repos = fetch_all()
    if not repos:
        raise RuntimeError(f"No starred repositories returned for {USER}")
    render(repos)


if __name__ == "__main__":
    main()
