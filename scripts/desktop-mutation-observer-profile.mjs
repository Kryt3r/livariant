import { writeFile } from "node:fs/promises";

const sourceSha = process.argv[2];
const outputPath = process.argv[3];
if (!/^[0-9a-f]{40}$/i.test(sourceSha)) throw new Error("Exact source SHA is required.");
if (!outputPath) throw new Error("Output path is required.");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let target;
for (let attempt = 0; attempt < 200; attempt += 1) {
  try {
    const response = await fetch("http://127.0.0.1:9222/json");
    const targets = await response.json();
    target = targets.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
  } catch {}
  if (target) break;
  await sleep(100);
}
if (!target) throw new Error("Chromium DevTools target did not appear on port 9222.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (!message.id) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
  else waiter.resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

await send("Page.enable");
await send("Runtime.enable");
const instrumentation = `(() => {
  const NativeMutationObserver = window.MutationObserver;
  const aggregate = { created: 0, callbacks: 0, records: 0, totalMs: 0, maxMs: 0, observers: [] };
  window.__livariantMutationObserverStats = aggregate;
  window.MutationObserver = class LivariantProfiledMutationObserver extends NativeMutationObserver {
    constructor(callback) {
      const stack = String(new Error().stack || "").split("\\n").find((line) => line.includes("/assets/")) || "unknown";
      const originMatch = stack.match(/assets\\/[^\\s)]+/);
      const entry = { id: aggregate.created + 1, origin: originMatch ? originMatch[0] : "unknown", callbacks: 0, records: 0, totalMs: 0, maxMs: 0 };
      aggregate.created += 1;
      aggregate.observers.push(entry);
      super((records, observer) => {
        const started = performance.now();
        try { return callback(records, observer); }
        finally {
          const elapsed = performance.now() - started;
          entry.callbacks += 1;
          entry.records += records.length;
          entry.totalMs += elapsed;
          entry.maxMs = Math.max(entry.maxMs, elapsed);
          aggregate.callbacks += 1;
          aggregate.records += records.length;
          aggregate.totalMs += elapsed;
          aggregate.maxMs = Math.max(aggregate.maxMs, elapsed);
        }
      });
    }
  };
})();`;

await send("Page.addScriptToEvaluateOnNewDocument", { source: instrumentation });
await send("Page.navigate", { url: "http://127.0.0.1:4173" });
await sleep(1500);

const expression = `(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const views = Array.from(document.querySelectorAll('.nav-item[data-view]'))
    .map((node) => node.getAttribute('data-view'))
    .filter(Boolean);
  for (const view of views) {
    const node = document.querySelector('.nav-item[data-view="' + CSS.escape(view) + '"]');
    if (!node) continue;
    node.click();
    await wait(120);
  }
  await wait(600);
  return { views, stats: window.__livariantMutationObserverStats || null };
})()`;

const evaluated = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
if (evaluated.exceptionDetails) throw new Error(`Renderer profiling expression failed: ${JSON.stringify(evaluated.exceptionDetails)}`);
const value = evaluated.result?.value;
if (!value?.stats) throw new Error("MutationObserver profiling stats were not available.");
if (value.views.length < 1) throw new Error("No primary Desktop navigation items were rendered in the benchmark page.");

const normalize = (entry) => ({
  ...entry,
  totalMs: Number(entry.totalMs.toFixed(3)),
  maxMs: Number(entry.maxMs.toFixed(3)),
});
const evidence = {
  schemaVersion: 2,
  benchmark: "desktop-renderer-mutation-observer-navigation-profile",
  sourceSha: sourceSha.toLowerCase(),
  navigationCount: value.views.length,
  views: value.views,
  aggregate: normalize(value.stats),
  observers: value.stats.observers.map(normalize),
  interpretation: "Measurement-only Chromium profile of the exact production-built Desktop renderer. MutationObserver is wrapped before page load and each current primary navigation item is clicked once. Times are JavaScript callback execution time only. This is not a full Tauri/WebView2 navigation-latency, TTI, GPU or native-host measurement."
};
delete evidence.aggregate.observers;
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
socket.close();
