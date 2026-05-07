# Branch-Aware Memory

Mindr scopes memory queries to the current git branch. This prevents stale memories from merged or abandoned branches from polluting context on unrelated branches.

## How it works

Every memory written by the post-commit hook is tagged with:

- `git_commit` — the SHA of the commit that triggered it
- `branch_lineage` — the name of the branch the commit was made on

When you query memories on a branch, Mindr returns memories via two complementary mechanisms:

1. **Commit reachability** — memories whose `git_commit` SHA is reachable from the current `HEAD` (up to 1,000 commits in the last 90 days). This naturally includes all memories from merged branches.

2. **Lineage fallback** — memories tagged `branch_lineage = <current-branch>`. Used when commit SHAs are not stored (e.g. manually-entered memories or memories from the Remembr backend where commit matching is expensive).

## Feature branch workflow

```text
main     ──●──●──●──────────────●── (merge)
                  \            /
feature           ●──●──●──●──
```

Memories created on the feature branch are tagged `branch_lineage: feature`. They are visible when you are on the feature branch. After the merge, they become reachable from `main` and appear there too.

Memories from `main` that predate the branch point are also visible on the feature branch, because their commits are reachable from the feature branch HEAD.

## No ghost memories

When a branch is deleted or rebased, its memories remain in the store but become unreachable from the new history. They do not appear in context on unrelated branches. This is the "no ghost memories" guarantee — you will not see decisions from an old experiment branch when working on an unrelated feature.

## Viewing branch activity

```bash
mindragent branch status
```

Output shows:

- Current branch name
- Number of memories written on this branch (lineage tag)
- Number of memories reachable from the current HEAD (last 90 days)
- Number of shared memories from the default branch

```bash
mindragent branch status --json
```

Returns structured JSON for programmatic use.

## Implications for team use

With the SQLite backend, each developer has their own memory store. Branch-aware queries only work within one machine's history.

With the Remembr backend, memories from all team members are shared. A decision made by one developer on a feature branch becomes visible to all developers once they have the commits reachable in their local history.

## Configuration

No configuration is required. Branch-aware querying is always active. The lookback window (1,000 commits, 90 days) is not currently configurable.
