#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.export_classified_stars_fast import render

USER = os.getenv("STAR_USER", "hujinghaoabcd")
TOKEN = os.getenv("GITHUB_TOKEN", "").strip()

QUERY = r'''
query StarredRepositories($login: String!, $cursor: String) {
  user(login: $login) {
    starredRepositories(first: 100, after: $cursor, orderBy: {field: STARRED_AT, direction: DESC}) {
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
        }
      }
    }
  }
  rateLimit { cost remaining resetAt }
}
'''


def request_page(cursor: str | None) -> dict[str, Any]:
    if not TOKEN:
        raise RuntimeError("GITHUB_TOKEN is required")
    body = json.dumps({"query": QUERY, "variables": {"login": USER, "cursor": cursor}}).encode("utf-8")
    request = urllib.request.Request(
        "https://api.github.com/graphql",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "github-stars-export-lite/1.0",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"GraphQL HTTP {exc.code}: {detail[:1200]}") from exc
    if payload.get("errors"):
        raise RuntimeError("GraphQL errors: " + json.dumps(payload["errors"], ensure_ascii=False)[:1500])
    return payload["data"]


def fetch_all() -> list[dict[str, Any]]:
    cursor: str | None = None
    repositories: list[dict[str, Any]] = []
    expected = None
    page = 0
    while True:
        page += 1
        data = request_page(cursor)
        user = data.get("user")
        if not user:
            raise RuntimeError(f"User not found: {USER}")
        connection = user["starredRepositories"]
        expected = int(connection["totalCount"]) if expected is None else expected
        edges = connection.get("edges") or []
        for edge in edges:
            node = edge.get("node") or {}
            full_name = node.get("nameWithOwner")
            if not full_name:
                continue
            repositories.append({
                "id": node.get("databaseId") or full_name,
                "full_name": full_name,
                "name": full_name.split("/")[-1],
                "html_url": node.get("url"),
                "description": node.get("description"),
                "stargazers_count": node.get("stargazerCount") or 0,
                "updated_at": node.get("updatedAt"),
                "fork": bool(node.get("isFork")),
                "archived": bool(node.get("isArchived")),
                "disabled": False,
                "language": (node.get("primaryLanguage") or {}).get("name"),
                "topics": [],
                "_starred_at": edge.get("starredAt"),
            })
        rate = data.get("rateLimit") or {}
        print(f"page={page} fetched={len(edges)} accumulated={len(repositories)} total={expected} remaining={rate.get('remaining')}", flush=True)
        info = connection["pageInfo"]
        if not info.get("hasNextPage"):
            break
        cursor = info.get("endCursor")
        if not cursor:
            raise RuntimeError("Missing endCursor")
    unique = {str(repo["id"]): repo for repo in repositories}
    result = list(unique.values())
    if expected is not None and len(result) != expected:
        raise RuntimeError(f"Count mismatch: totalCount={expected}, unique={len(result)}")
    return result


def main() -> None:
    repositories = fetch_all()
    if not repositories:
        raise RuntimeError("No starred repositories returned")
    render(repositories)


if __name__ == "__main__":
    main()
