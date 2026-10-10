#!/usr/bin/env python3
"""
Before/after comparison of two audit.py runs.

  python compare.py reports/before reports/after > reports/COMPARISON.md
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

CATEGORIES = ["Crawlability", "Indexability", "On-page", "Content", "Structured data", "Sharing", "Security"]
SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def load(path: str) -> dict:
    return json.loads((Path(path) / "audit.json").read_text())


def mark(passed: bool | None) -> str:
    return "—" if passed is None else ("✅" if passed else "❌")


def main(before_dir: str, after_dir: str) -> str:
    b, a = load(before_dir), load(after_dir)
    out = [
        "# SEO audit: before and after step 9",
        "",
        f"Same checks, same pages, run with claude-seo {a['claude_seo']}'s analysers against a production build "
        f"(`pnpm build && pnpm start`). Before: {b['run_at']}. After: {a['run_at']}.",
        "",
        "## Scores",
        "",
        "| | Before | After | Change |",
        "|---|---:|---:|---:|",
        f"| **Overall** | **{b['overall']}** | **{a['overall']}** | **{a['overall'] - b['overall']:+d}** |",
    ]
    for cat in CATEGORIES:
        out.append(f"| {cat} | {b['scores'][cat]} | {a['scores'][cat]} | {a['scores'][cat] - b['scores'][cat]:+d} |")

    before_checks = {c["id"]: c for c in b["checks"]}
    after_checks = {c["id"]: c for c in a["checks"]}
    ids = sorted(
        set(before_checks) | set(after_checks),
        key=lambda i: (SEVERITY_ORDER[(after_checks.get(i) or before_checks[i])["severity"]], i),
    )
    fixed = [i for i in ids if i in before_checks and i in after_checks
             and not before_checks[i]["passed"] and after_checks[i]["passed"]]
    still = [i for i in ids if i in after_checks and not after_checks[i]["passed"]]
    out += ["", f"**{len(fixed)} checks fixed, {len(still)} still failing** (of {len(after_checks)}).", "",
            "## Every check", "",
            "| Check | Severity | Before | After | After, detail |", "|---|---|:-:|:-:|---|"]
    for i in ids:
        c = after_checks.get(i) or before_checks[i]
        before = before_checks.get(i)
        after = after_checks.get(i)
        detail = (after or {}).get("detail", "")
        out.append(
            f"| {c['title']} | {c['severity']} | {mark(before['passed'] if before else None)} "
            f"| {mark(after['passed'] if after else None)} | {detail} |"
        )

    if still:
        out += ["", "## Still failing", ""]
        for i in still:
            c = after_checks[i]
            eg = ", ".join(f"`{f}`" for f in c["failing"][:6])
            out.append(f"- **{c['title']}** ({c['severity']}; {c['detail'] or 'fail'}). {('E.g. ' + eg) if eg else ''}")

    out += ["", "## Sample pages", ""]
    for path in a["sample_pages"]:
        sb, sa = b["sample_pages"].get(path, {}), a["sample_pages"][path]
        out += [f"### `{path}`", "", "| | Before | After |", "|---|---|---|"]
        for key in ("status", "title", "description", "h1", "words", "unique_pct", "schema", "og_image"):
            def fmt(v):
                if v in (None, "", []):
                    return "—"
                if isinstance(v, list):
                    return ", ".join(v)
                return str(v).replace("|", "\\|")
            out.append(f"| {key} | {fmt(sb.get(key))} | {fmt(sa.get(key))} |")
        out.append("")
    return "\n".join(out)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: compare.py BEFORE_DIR AFTER_DIR")
    print(main(sys.argv[1], sys.argv[2]))
