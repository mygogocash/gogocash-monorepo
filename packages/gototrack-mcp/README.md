# @gogocash/gototrack-mcp

MCP server exposing GoGoTrack agent tools for Cursor, Claude Desktop, and ChatGPT-style integrations.

## Tools

| Tool | Auth | Maps to |
| --- | --- | --- |
| `search_merchants` | Public | `GET /agent/v1/gototrack/merchants/search` |
| `match_merchant` | Customer JWT | `POST /agent/v1/gototrack/match-merchant` |
| `activate_cashback` | Customer JWT | `POST /agent/v1/gototrack/activate-cashback` |
| `get_timeline` | Customer JWT | `GET /agent/v1/gototrack/timeline` |

## Environment

| Variable | Required | Default |
| --- | --- | --- |
| `GOGOCASH_API_URL` | No | `https://api.dev.gogocash.co` |
| `GOGOTRACK_AUTH_TOKEN` | For auth tools | — |

Fallbacks: `EXPO_PUBLIC_API_URL`, `GOTOTRACK_AUTH_TOKEN`, `GOGOSENSE_AUTH_TOKEN`.

## Cursor / Claude Desktop config

```json
{
  "mcpServers": {
    "gogocash-gototrack": {
      "command": "node",
      "args": ["/absolute/path/to/gogocash-monorepo/packages/gototrack-mcp/dist/index.js"],
      "env": {
        "GOGOCASH_API_URL": "https://api.dev.gogocash.co",
        "GOGOTRACK_AUTH_TOKEN": "<customer-jwt>"
      }
    }
  }
}
```

## Development

```bash
npm run build -w @gogocash/gototrack-mcp
npm run test -w @gogocash/gototrack-mcp
```

## Demo flow

1. `search_merchants` `{ "query": "shopee" }`
2. `match_merchant` `{ "merchantHint": "Shopee", "platform": "web" }`
3. `activate_cashback` with ids from step 2
4. User opens returned `deeplink` before checkout
