# Spain Legal MCP

Public MCP server for Spain immigration and tax guidance by Legal Fournier.

- Website: https://legalfournier.com
- MCP endpoint: `https://legalfournier.com/mcp/spain-legal`
- Registry id: `com.legalfournier/spain-legal`
- MCP documentation: https://legalfournier.com/en/mcp/spain-legal/

## Tools

- `get_visa_options`
- `check_beckham_eligibility`
- `get_residency_path`
- `explain_nie_process`
- `compare_tax_regimes`
- `route_to_legal_fournier_help`

## Prompts

- `screen_move_to_spain_case`
- `draft_spain_immigration_answer`
- `audit_spain_case_risks`
- `prepare_legal_fournier_handoff`

## Resources

- `legalfournier://spain-legal/catalog`
- `legalfournier://spain-legal/routes/{route_id}`
- `legalfournier://spain-legal/processes/{process_id}`
- `legalfournier://spain-legal/tracks/{track_id}`
- `legalfournier://spain-legal/topics/{topic_id}`

## Notes

- Transport: `streamable-http`
- Mode: read-only tools for screening and handoff

## Run Locally

```bash
npm install
npm run build
npm run test
npm run dev
```

Local stdio mode:

```bash
npm run dev:stdio
```


