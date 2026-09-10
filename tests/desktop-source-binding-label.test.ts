import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path: string) => readFile(path, "utf8");

test("Desktop distinguishes unbound sources from true remote-only sources", async () => {
  const view = await text("apps/desktop/src/project-source-review-view.ts");

  assert.match(view, /source\.remoteState === "recorded"\s*\? text\("Remote only \/ no local checkout", "Nur Remote \/ kein lokaler Checkout"\)\s*:\s*text\("No local checkout linked", "Keine lokale Bindung"\)/s);
  assert.match(view, /const isRemoteOnly = source\.remoteState === "recorded" && source\.localState === "not-linked"/);
  assert.match(view, /No local checkout or remote URL is recorded/);
  assert.match(view, /Es ist weder ein lokaler Checkout noch eine Remote-URL hinterlegt/);
});
