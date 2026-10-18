# Spain Legal by Legal Fournier

Public MCP and REST screening service for Spanish immigration, residence,
nationality, tax, property and business questions. Screening is preliminary;
filing-sensitive or incomplete cases require a qualified review.

- MCP: https://legalfournier.com/mcp/spain-legal
- REST OpenAPI: https://legalfournier.com/.well-known/openapi/spain-legal-api.json
- Server card: https://legalfournier.com/.well-known/mcp/server-card.json
- Readiness: https://legalfournier.com/mcp/spain-legal/readyz

## Protocol and interactive clients

Version 0.4.0 serves MCP `2026-07-28` and retains support for the 2025-era
initialization handshake over HTTP and stdio. Modern clients can call
`server/discover` directly. Public tool/resource catalogs use explicit five-minute
cache hints; case-specific responses are not shared-cacheable.

Clients supporting MCP Apps can browse articles and videos inside the chat and
check digital-nomad income against the existing server calculator.
The same tools still return text and structured data to other clients. Videos
load only after a click, with a YouTube link available when a host blocks embeds.
The official Skills extension exposes five public legal workflows with
integrity manifests; existing resource URIs remain available.

See [protocol compatibility](docs/protocol-compatibility.md),
[Apps](docs/mcp-apps.md), and [Skills](docs/mcp-skills.md).

## Tools

`search` and `fetch` retrieve published articles, verified embedded-video metadata,
and canonical guidance. Results include citation URLs and source dates. The
hourly publisher reads public WordPress content; the MCP holds no WordPress or
Metricool credentials. Retrieved text is untrusted reference material, never
instructions to an agent. Transcripts are not invented. See
[content synchronization](docs/content-index.md).

Screening tools: `find_legal_fournier_tool`, `run_legal_fournier_tool`,
`get_visa_options`, `check_beckham_eligibility`, `get_residency_path`,
`explain_nie_process`, `compare_tax_regimes`, and `route_to_legal_fournier_help`.
Use explicit income currency/period/family counts and property location/type.
Missing eligibility evidence returns a review requirement. See
[legal maintenance and supported calculations](docs/legal-screening-maintenance.md).

`get_paid_consultation_options` and `get_paid_call_availability` are read-only.
`create_legal_fournier_contact_request` is consequential: it requires explicit
user consent and submits a signed, idempotent contact request. A timeout does
not mean failure; keep the returned operation key when retrying. Never send
passport numbers, identity documents or unrelated sensitive information.

## Development

Use Node 22.23.3 (see `.nvmrc`).

```sh
npm ci --ignore-scripts
npm run check
python3 -m unittest discover -s scripts -p 'test_content_sync.py'
php -n ops/test-wordpress-idempotency.php
npm audit --omit=dev
npm run discovery:generate
```

Start HTTP with `npm start`, or stdio with `npm run start:stdio`.
HTTP defaults to `127.0.0.1:3137/mcp/spain-legal`. Both transports use the same
input/output schemas. REST returns structured errors and appropriate status
codes; native MCP returns protocol-compatible tool errors.

Custom HTTP integrations should send a descriptive `User-Agent`. The site's
browser-integrity filter rejects generic `Python-urllib` requests; the standard
Node and Python HTTPX/MCP client signatures pass. The provided smoke checker
identifies itself explicitly.

## Operations

Production runs as `lf-spainlegal` with a root-owned release and a separate
publisher user. Preserve the service sandbox and WordPress isolation. Service
and proxy examples are in `ops/`; deploy them with backups and syntax checks.
The MCP uses `LF_CONTENT_INDEX_PATH` for its read-only content snapshot and
`LF_MCP_TELEMETRY_DIR` for bounded operational telemetry. Liveness is `/healthz`;
readiness adds index freshness and telemetry health. Missing content fails
readiness; stale content remains explicitly marked.

Only loopback Nginx may supply `X-LF-Verified-Client-IP`. The supplied proxy
configuration validates Cloudflare peers before deriving that header. Do not
trust arbitrary forwarded headers. Default application limits are 32 concurrent
requests and 120 requests per minute per verified client IP.

Other configuration: `LF_MCP_HOST`, `LF_MCP_PORT`, `LF_MCP_PATH`,
`LF_MCP_PUBLIC_URL`, `LF_MCP_ALLOWED_HOSTS`, `LF_MCP_ALLOWED_ORIGINS`,
`LF_SITE_BASE_URL`, `LF_CONTACT_URL`, `LF_HOMEPAGE_URL`,
`LF_MCP_TELEMETRY_ENABLED`, `LF_AGENT_COMMERCE_BASE_URL`,
`LF_AGENT_LEAD_ENDPOINT`, and `LF_AGENT_LEAD_SECRET`. Keep the signing secret
in the private service environment; never commit it.

## Release provenance

Version 0.3.0 starts from the internal TypeScript source that rebuilt byte for
byte to production 0.2.17, except its version constant. This recovers the source
changes missing from the old public 0.2.5 repository. Generated discovery
schemas are rebuilt from the same native tool definitions used at runtime.

Version 0.4.0 adds the current MCP protocol, backward compatibility, browser
origin validation, Apps and the official Skills extension. After deployment,
publish the matching `server.json` to the MCP Registry using the existing
domain key, then verify the public release:

```sh
python3 scripts/smoke-readonly.py --base https://legalfournier.com --public-metadata --registry
```

The daily `Public MCP release verification` workflow runs that same read-only
check. Registry publishing credentials remain outside the application and CI.
