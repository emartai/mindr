# Self-Hosting

Mindr itself is a lightweight CLI and MCP server process — it has no server component to deploy. What you self-host is the **Remembr** backend, which provides cloud storage and semantic search for memories.

If you use the default **SQLite** backend, there is nothing to host: memories live in `.mindr/mindr.sqlite` on your local machine.

## SQLite (default)

No infrastructure required. Memories are stored locally. This is the right choice for solo developers or small teams where cross-machine persistence is not needed.

```toml
# .mindr/config.toml
[storage]
backend = "sqlite"
sqlite_path = ".mindr/mindr.sqlite"
```

The SQLite file is excluded from git by default (`.gitignore` already contains `/data/*.sqlite`). If you want to share memories across machines, use Remembr.

## Remembr cloud

Sign up at [remembr.io](https://remembr.io) and create an organization. Then configure Mindr:

```toml
# .mindr/config.toml
[storage]
backend = "remembr"
sqlite_path = ".mindr/mindr.sqlite"  # kept as local fallback cache

[remembr]
base_url = "https://api.remembr.io"
org_id   = "your-org-id"
# api_key = "..."  — prefer the env var below
```

Set the API key as an environment variable (do not commit it):

```bash
export REMEMBR_API_KEY=your-api-key
```

Or store it in `.env` (already in `.gitignore`):

```
REMEMBR_API_KEY=your-api-key
```

## Migrate from SQLite to Remembr

If you started with SQLite and want to move to Remembr:

1. Update your config to `backend = "remembr"` and fill in `remembr.*`
2. Run the migration:

```bash
mindragent migrate sqlite-to-remembr --dry-run  # preview
mindragent migrate sqlite-to-remembr            # execute
```

Migration is one-way and additive — it copies memories to Remembr without deleting them from SQLite.

## Self-hosting Remembr

Remembr can be run on-premises. Refer to the [Remembr self-hosting docs](https://remembr.io/docs/self-hosting) for setup instructions. Once deployed, point Mindr at your instance:

```toml
[remembr]
base_url = "https://remembr.internal.example.com"
org_id   = "your-org-id"
```

## CI/CD usage

In CI pipelines where you want agents to read project context, set the Remembr credentials as secrets and run `mindragent generate agents-md` as a pre-step:

```yaml
- name: Refresh AGENTS.md
  env:
    REMEMBR_API_KEY: ${{ secrets.REMEMBR_API_KEY }}
  run: mindragent generate agents-md
```

Or commit a pre-generated `AGENTS.md` to the repository and let agents read it directly without running Mindr in CI.

## Security considerations

- The local UI (`mindragent ui`) binds to `127.0.0.1` only. Remote connections are rejected with 403.
- The MCP server communicates over stdio — it never opens a network port.
- `REMEMBR_API_KEY` should always be set via environment variable, not committed in config files.
- The SQLite file contains all stored memories. Treat it with the same sensitivity as a `.env` file.
