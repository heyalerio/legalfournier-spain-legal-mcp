// Local QA host only; never bundled into the public App or served in production.
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";
import { allowedAppCall, safePublicUrl } from "../src/apps-model.js";

const frame = document.querySelector<HTMLIFrameElement>("#view")!;
const status = document.querySelector<HTMLElement>("#host-status")!;
const bridge = new AppBridge(null, { name: "Legal Fournier QA host", version: "1.0.0" }, { serverTools: {}, openLinks: {} }, { hostContext: { theme: "light", displayMode: "inline" } });
const initialArguments = { query: "", type: "video", max_results: 8 };
let calls = 0;
let dark = false;
let failNext = false;
const deny = () => ({ isError: true, content: [{ type: "text" as const, text: "This action is unavailable in the App." }] });
async function call(name: string, args: Record<string, unknown>) {
  if (!allowedAppCall(name, args)) return deny();
  calls++;
  document.querySelector("#calls")!.textContent = `${calls} tool calls · last: ${name}`;
  if (failNext) { failNext = false; return deny(); }
  const response = await fetch("/tool", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, arguments: args }) });
  return response.json();
}
bridge.oncalltool = params => call(params.name, params.arguments ?? {});
bridge.onopenlink = async params => {
  const known = new Set<string>((await (await fetch("/videos")).json()) as string[]);
  const safe = safePublicUrl(params.url, known);
  if (!safe) return { isError: true };
  status.textContent = `Link verified: ${safe}`;
  // QA deliberately reports navigation without opening another browser tab.
  return {};
};
bridge.onsizechange = params => { if (typeof params.height === "number") frame.style.height = `${Math.max(400, Math.min(params.height + 2, 1800))}px`; };
bridge.onerror = error => { status.textContent = `Host error: ${error.message}`; };
bridge.oninitialized = () => {
  status.textContent = "App connected · official AppBridge handshake complete";
  void (async () => { await bridge.sendToolInput({ arguments: initialArguments }); await bridge.sendToolResult(await call("search", initialArguments)); })();
};
document.querySelector("#theme")!.addEventListener("click", () => { dark = !dark; bridge.setHostContext({ theme: dark ? "dark" : "light" }); });
document.querySelector("#empty")!.addEventListener("click", () => { void bridge.sendToolResult({ content: [{ type: "text", text: "No matches" }], structuredContent: { query: "No matching topic", resources: [], next_action: "fetch" } }); });
document.querySelector("#fail")!.addEventListener("click", () => { failNext = true; status.textContent = "The next permitted tool call will return a simulated error."; });
document.querySelector("#cancel")!.addEventListener("click", () => { void bridge.sendToolCancelled({ reason: "QA cancellation" }); });
document.querySelector("#teardown")!.addEventListener("click", () => { void bridge.teardownResource({}).then(() => { status.textContent = "App teardown acknowledged"; }); });
await bridge.connect(new PostMessageTransport(frame.contentWindow!, frame.contentWindow!));
// Separate origin preserves isolation while allowing the embedded YouTube player
// its normal origin. An opaque sandbox also works for the App, but blocks playback.
frame.src = "http://127.0.0.1:4178/app";
