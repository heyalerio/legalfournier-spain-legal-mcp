# MCP App

Compatible hosts can show Legal Fournier articles, verified YouTube videos and a digital nomad income screen inside the conversation. `search`, `fetch` and `run_legal_fournier_tool` retain their complete text and structured responses for hosts without Apps support.

The public resource is exactly `ui://legalfournier/content-explorer.html`, with MIME type `text/html;profile=mcp-app`. The modern server advertises `io.modelcontextprotocol/ui`; tool metadata links to this resource. The implementation uses the official [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps), including `App`, `AppBridge` and `registerAppResource`.

The UI permits only `search`, guarded public `fetch`, and `run_legal_fournier_tool` with `tool_id=digital-nomad-visa-eligibility`. It does not call contact, booking or payment tools. Tool visibility metadata allows the first three tools in Apps and leaves other tools model-only. Hosts must enforce that metadata; it is not authentication of an ordinary public MCP request. The QA host also enforces the narrower calculator argument allowlist before invoking operations.

The income screen sends one explicitly denominated EUR income source, monthly or annual period, employment category, accompanying-family count and assessment date to the existing calculator. The server supplies every threshold and calculation. No legal arithmetic is duplicated in the browser. A pre-submit notice identifies Legal Fournier as the destination; names and contact details are not requested. The result is an income screen, not visa eligibility or validation of financial evidence. Unsupported dates and complex cases retain the existing server's incomplete-result behavior.

Articles are rendered as text, never source HTML. IDs and public citation URLs are checked before navigation; fetch never accepts an arbitrary URL. Video IDs come from the complete validated content snapshot, including valid entries beyond a search page. The player requires an exact matching ID and canonical YouTube URL. No player or thumbnail loads before **Load video**; the embed uses `youtube-nocookie.com`, `autoplay=0`, a restricted iframe and an original-link fallback. No transcript, spoken language, publication date or Shorts classification is inferred.

The bundled HTML has no remote script, font or image dependencies. Its CSP allows only the hashed executable bundle, inline styles and the privacy-enhanced YouTube frame origin; direct network connections are disabled. Bootstrap data is inert JSON with HTML-significant characters escaped. The executable hash is checked against the final resource. The App handles cancellation, theme changes, request failure, empty results, connection loss and teardown, removing a loaded player when leaving its view. Explicit buttons and Enter handlers work in sandboxes without `allow-forms`.

Build and test:

```sh
npm run build
npx vitest run src/apps.test.ts src/content-index.test.ts
node scripts/preview-apps.mjs
```

Open `http://127.0.0.1:4177`. This local-only fixture uses the official AppBridge handshake with the App on a separate origin at port 4178, and invokes the real local read-only operations. Its controls exercise empty/error results, cancellation, theme change and teardown. The fixture is not part of the public server or packaged `dist`.

Automated tests cover exact resource/URL guards, hostile text, legacy results, pagination, calculator input/result contracts, 25-video allowlists, withdrawal, CSP integrity, and App/AppBridge handshake, calls, cancellation, theme and teardown. Browser QA additionally checks rendered cards and source reading, video click-to-load, the real paused YouTube player, the calculator, empty/error states, mobile layout and disabled controls after teardown.

Host limitations: unsupported clients use the existing text response. Hosts can block frames or external navigation; the original source link remains available. An opaque-origin sandbox blocks YouTube storage and can prevent its player from loading. Playback works in the tested separate-origin sandbox with normal origin access; this does not guarantee every host permits YouTube. The App never broadens a host's permissions.
