// Loopback-only QA fixture. Run npm run build first; not a production server.
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { getContentAppHtml } from "../dist/apps.js";
import { getVerifiedContentVideoIds } from "../dist/content-index.js";
import { allowedAppCall, record } from "../dist/apps-model.js";
import { executeTool } from "../dist/operations.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const bundle = await build({ entryPoints: [root + "apps/preview-host.ts"], bundle: true, write: false, format: "esm", platform: "browser", target: "es2022", minify: true });
const script = bundle.outputFiles[0].text;
const page = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Legal Fournier MCP Apps · QA host</title><style>body{margin:0;background:#ebece8;font:12px system-ui;color:#283c32}header{padding:12px 20px;background:#fff;border-bottom:1px solid #d6dbd3}h1{font-size:14px;margin:0 0 5px}.controls{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}button{font:inherit;border:1px solid #b9c4bb;border-radius:4px;background:white;padding:5px 9px;cursor:pointer}#calls{margin-left:10px;color:#647166}main{max-width:1000px;margin:24px auto;padding:0 16px}iframe{display:block;width:100%;height:650px;border:1px solid #d5dad2;border-radius:10px;background:#fcfaf6}#host-status{display:block}small{display:block;margin:12px 0;color:#647166}</style><header><h1>Local MCP Apps test host</h1><span id="host-status">Waiting for App handshake…</span><div class="controls"><button id="theme">Toggle theme</button><button id="empty">Show empty results</button><button id="fail">Fail next request</button><button id="cancel">Cancel</button><button id="teardown">Teardown</button><span id="calls">0 tool calls</span></div></header><main><iframe id="view" title="Legal Fournier content App" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe><small>Official AppBridge ↔ App transport. Public content and DNV income calls use the real local server operations. The host blocks other tools.</small></main><script type="module" src="/host.js"></script></html>`;
const deny = { isError: true, content: [{ type: "text", text: "The requested App action is unavailable." }] };
const server = createServer(async (request, response) => {
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  const send = (code, type, body) => { response.writeHead(code, { "content-type": type }); response.end(body); };
  if (request.method === "GET" && request.url === "/") return send(200, "text/html", page);
  if (request.method === "GET" && request.url === "/favicon.ico") return send(204, "image/x-icon", "");
  if (request.method === "GET" && request.url === "/host.js") return send(200, "text/javascript", script);
  if (request.method === "GET" && request.url === "/app") return send(200, "text/html", getContentAppHtml());
  if (request.method === "GET" && request.url === "/videos") return send(200, "application/json", JSON.stringify(getVerifiedContentVideoIds()));
  if (request.method === "POST" && request.url === "/tool" && request.headers.origin === "http://127.0.0.1:4177" && request.headers["content-type"] === "application/json") {
    try {
      let body = "";
      for await (const chunk of request) { body += chunk; if (body.length > 32000) return send(413, "application/json", JSON.stringify(deny)); }
      const parsed = JSON.parse(body), args = record(parsed.arguments);
      if (!args || !allowedAppCall(parsed.name, args)) return send(403, "application/json", JSON.stringify(deny));
      const result = await executeTool(parsed.name, args);
      return send(200, "application/json", JSON.stringify({ content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result }));
    } catch { return send(200, "application/json", JSON.stringify(deny)); }
  }
  send(404, "text/plain", "Not found");
});
const sandboxServer = createServer((request, response) => {
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  if (request.method === "GET" && request.url === "/app") { response.writeHead(200, { "content-type": "text/html" }); response.end(getContentAppHtml()); }
  else { response.writeHead(404); response.end(); }
});
sandboxServer.listen(4178, "127.0.0.1");
server.listen(4177, "127.0.0.1", () => console.log("Official AppBridge preview: http://127.0.0.1:4177 (isolated App origin on port 4178)"));
