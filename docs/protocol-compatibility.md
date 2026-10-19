# Protocol compatibility

The HTTP endpoint is `https://legalfournier.com/mcp/spain-legal`. Version 0.4.0
uses the official TypeScript SDK v2 and explicitly enables the `2026-07-28`
protocol through `createMcpHandler` and `serveStdio`. Both keep support for
earlier clients using `initialize`; replacing a package alone is insufficient.

## Modern requests

Modern clients send the protocol version and client capabilities on every
request in `_meta`. HTTP clients also send `MCP-Protocol-Version`, `Mcp-Method`,
and `Mcp-Name` for tool, prompt and resource reads. The SDK rejects mismatches.
`server/discover` advertises supported versions, identity and capabilities.
Use the official SDK's modern version negotiation instead of constructing a
legacy client and assuming it exercises the current protocol.

The SDK adds `resultType` and protocol metadata. Public tool, prompt and
resource listings and public reference reads have a five-minute `ttlMs` and
`cacheScope: public`. These are protocol freshness hints; they do not enable
shared HTTP caching of personal screening or contact-request results.
Tool ordering is deterministic. Change notifications are not advertised when
the deployment cannot deliver them. The hourly content publisher remains a
separate, isolated process.

## Browser requests

Requests without `Origin`, including normal desktop and server clients, work
as before. Browser requests must match a configured origin. The defaults are:

- `https://legalfournier.com`
- `https://www.legalfournier.com`
- `https://chatgpt.com`
- `https://chat.openai.com`
- `https://claude.ai`

Use `LF_MCP_ALLOWED_ORIGINS` with comma-separated complete origins to configure
other browser hosts. Verify a host before allowing it. `null`, malformed and
unapproved origins are rejected with 403. Host checks are separate from Origin
checks. CORS permits the modern protocol headers after origin validation.
Nginx continues to overwrite the trusted client-IP header; SDK migration does
not grant the public process any WordPress permissions.

## Apps and Skills

The `io.modelcontextprotocol/ui` extension adds an interactive public content
viewer and digital-nomad income calculator to compatible hosts. The calculator
checks income only; it does not establish visa eligibility.
Clients without it retain the same text/structured
tool outputs. The `io.modelcontextprotocol/skills` extension adds discovery and
reading of the five public workflows, including byte sizes and SHA-256 manifests.
Only explicitly published workflow files are served. A matching digest proves
consistency, not permission to execute instructions or transmit personal data.

Tasks and multi-round-trip intake are not advertised: no current public operation
requires a durable background job or client elicitation. Existing consent and
idempotency protections continue to govern contact requests.

## Release checks

Automated tests exercise current and legacy clients over HTTP and stdio, shared
input/output validation, Origin/CORS, header agreement, cache metadata, skill
integrity, and Apps fallbacks. Browser checks exercise the Apps host connection.
The public smoke check uses only read-only tools and invalid-input checks.

After deploying and publishing the registry entry, run:

```sh
python3 scripts/smoke-readonly.py --base https://legalfournier.com --public-metadata --registry
```

The scheduled GitHub workflow also checks for stale content, unavailable UI or
skill resources, and mismatched application/registry versions. Live-service and
external Registry checks run as separate jobs, so an upstream outage is clearly
identified. Registry reads use the direct latest-version endpoint with bounded
retries; a mismatch remains a failure. Its failures appear in GitHub Actions;
it sends no client messages or contact requests.

Official references: [2026-07-28 specification](https://modelcontextprotocol.io/specification/2026-07-28/changelog),
[SDK modern serving](https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28.html),
[legacy compatibility](https://ts.sdk.modelcontextprotocol.io/v2/serving/legacy-clients.html).
