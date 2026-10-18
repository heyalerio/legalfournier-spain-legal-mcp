# Public Skills extension

The modern MCP surface declares `io.modelcontextprotocol/skills: {}` alongside `resources`. It implements `skills/list`, `skills/get`, and skill-file `resources/read`. Directory reading is not advertised. The existing `legalfournier://spain-legal/skills/...` resources remain available to legacy clients.

Only these bundled public workflows are published: `beckham-precheck`, `human-handoff-prep`, `nationality-continuity-audit`, `nie-tie-procedure-coach`, and `visa-intake-triage`. The publisher never scans local skills, private agent configuration, Sara or Hermes data.

Each workflow is one UTF-8 `SKILL.md` file with YAML frontmatter. Its URI is `skill://legalfournier/spain-legal/sha256-<file-hash>/<skill-name>/SKILL.md`. The bytes are snapshotted from bundled data when the module loads; changed bytes produce a different URI. Retired revisions can become unavailable, but an old URI is never reused for new content. Canonical legal resources referenced by the workflow are separate MCP resources, not additional files in its directory.

`skills/list` returns deterministic pages of at most two complete entries. Opaque cursors are bound to the current catalog; invalid or obsolete cursors return `-32602`. `skills/get` resolves a known URI without any prior listing. Every manifest includes all files with the SHA-256 digest and raw byte length. List, get and read results use `resultType: "complete"`, `ttlMs: 300000`, and `cacheScope: "public"`.

`src/skills-extension.ts` exports operation helpers and request schemas. The server registers the extension handlers and exact resource URIs, forwarding the original URI string without URL normalization. SDK v2 validates required envelope metadata before passing operation params to the helpers. `SkillsExtensionError.code` maps to the corresponding JSON-RPC error. Unsupported URIs, aliases, traversal attempts and missing required wire metadata are invalid params. No caller-provided value becomes a filesystem path or network fetch.

Hosts verify the manifest, bytes and frontmatter, retain server identity, and control activation and approval. Reading a file grants no permissions. Workflows require consent and minimal facts for remote case screening, separate authorization for a contact submission, and fresh consent before activating another or nested skill. No local scripts or `allowed-tools` grants are published.

Validation: `npx vitest run src/skills-extension.test.ts` covers integrity, full manifests, pagination, direct lookup, immutable responses, malformed requests, URI aliases, traversal and legacy compatibility. Protocol integration tests cover discovery and request routing.

References: [official overview](https://modelcontextprotocol.io/extensions/skills/overview), [stable extension specification](https://github.com/modelcontextprotocol/ext-skills/blob/main/specification/stable/skills.mdx), and [Agent Skills format](https://agentskills.io/specification).
