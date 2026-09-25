import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  assertDesktopProjectCheckoutIdentity,
  projectKnowledgeAreasFromDecisionRecords,
} from "../src/project/desktop-project-knowledge.js";
import { ProjectBrainStore } from "../src/project-brain/store.js";

test("Desktop Project Knowledge projection reads only tagged active Project Brain decisions", () => {
  const areas = projectKnowledgeAreasFromDecisionRecords([
    { id: "d1", status: "active", text: "Project purpose: Keep project truth explicit", legacy: false },
    { id: "d2", status: "active", text: "Unrelated accepted decision", legacy: false },
  ]);
  const purpose = areas.find((area) => area.id === "purpose");
  assert.equal(purpose?.state, "confirmed");
  assert.equal(purpose?.confirmedValue, "Keep project truth explicit");
  assert.equal(areas.find((area) => area.id === "direction")?.state, "open");
});

test("Desktop Project Knowledge proposal path remains protected and uses add-or-supersede semantics", async () => {
  const core = await readFile("src/project/desktop-project-knowledge.ts", "utf8");
  assert.match(core, /Project Knowledge proposal preparation requires protected canonical state/);
  assert.match(core, /changeKind: current\.activeDecisionId \? "supersede" : "add"/);
  assert.match(core, /targetDecisionId: current\.activeDecisionId/);
  assert.match(core, /origin: "explicit-user"/);
});


test("Desktop renderer no longer promotes session-only values into confirmed Project Knowledge", async () => {
  const main = await readFile("apps/desktop/src/main.ts", "utf8");
  assert.match(main, /loadProjectKnowledge/);
  assert.match(main, /prepareProjectKnowledgeProposal/);
  assert.match(main, /Confirmed values on this page now come from the active project's canonical Project Brain/);
  assert.doesNotMatch(main, /area\.confirmedValue = proposal/);
  assert.match(main, /applyProjectKnowledgeSnapshot\(applied\.snapshot\)/);
  assert.match(main, /Project Brain apply needs attention/);
});


test("Desktop Project Knowledge protected apply remains Guardian-backed and re-reads canonical state", async () => {
  const core = await readFile("src/project/desktop-project-knowledge.ts", "utf8");
  const authorization = await readFile("src/runtime/authorization.ts", "utf8");
  const rust = await readFile("apps/desktop/src-tauri/src/project_knowledge_bridge.rs", "utf8");
  const main = await readFile("apps/desktop/src/main.ts", "utf8");

  assert.match(core, /runProtectedDoctor/);
  assert.match(core, /authorizeActionableProposal/);
  assert.match(core, /issueSemanticGuardianAuthority/);
  assert.match(core, /applyActionableProposal/);
  assert.match(core, /readDesktopProjectKnowledge/);
  assert.match(authorization, /same-principal local audit\/recovery intent only/);
  assert.match(rust, /operation remained bound to the original project; stale renderer result rejected/);
  assert.match(main, /applyProjectKnowledgeSnapshot\(applied\.snapshot\)/);
  assert.doesNotMatch(main, /area\.confirmedValue = proposal/);
});


test("Desktop protected Project Knowledge setup is fixed-path, per-machine and non-silent", async () => {
  const builder = await readFile("scripts/build-protected-bootstrap-assets.mjs", "utf8");
  const config = await readFile("apps/desktop/src-tauri/tauri.conf.json", "utf8");
  const hook = await readFile("apps/desktop/src-tauri/windows/language-hooks.nsh", "utf8");
  const rust = await readFile("apps/desktop/src-tauri/src/project_knowledge_bridge.rs", "utf8");
  const workflow = await readFile(".github/workflows/desktop-windows-installer.yml", "utf8");

  assert.match(builder, /guardian-bootstrap-desktop\.ps1/);
  assert.match(builder, /C:\\\\Program Files\\\\Livariant\\\\livariant-node\.exe/);
  assert.match(builder, /desktop-stage-a\.ps1/);
  assert.match(config, /"installMode": "perMachine"/);
  assert.doesNotMatch(hook, /StrCpy \$INSTDIR/);
  assert.doesNotMatch(hook, /desktop-stage-a\.ps1/);
  assert.match(hook, /Stage A[\s\S]*NOT executed inside NSIS/);
  assert.match(workflow, /protected-bootstrap-assets/);
  assert.match(rust, /launch_project_knowledge_stage_a_setup/);
  assert.match(rust, /protected-source-required/);
  assert.match(rust, /runtime_manifest\.core_source_sha != assets\.source_sha/);
  assert.match(rust, /guardian-bootstrap-desktop\.ps1/);
  assert.match(rust, /guardian-bootstrap-required/);
  assert.match(rust, /rendererSuppliesExecutable": false/);
  assert.match(rust, /"uacRequired": true/);
});


test("project activation stays non-blocking while Project Knowledge owns trust and protected review", async () => {
  const core = await readFile("src/project/desktop-project-knowledge.ts", "utf8");
  const bridge = await readFile("apps/desktop/src/project-knowledge-bridge.ts", "utf8");
  const registry = await readFile("apps/desktop/src/desktop-project-registry.ts", "utf8");
  const main = await readFile("apps/desktop/src/main.ts", "utf8");

  assert.match(core, /if \(!status\.canonicalReadReady\)/);
  assert.match(core, /confirmedDigest !== before\.integrity\.digest/);
  assert.match(bridge, /ensureProjectKnowledgeTrusted/);
  assert.doesNotMatch(registry, /ensureProjectKnowledgeTrusted/);
  assert.doesNotMatch(main, /Aktuellen Project Brain schützen/);
  assert.doesNotMatch(main, /data-project-knowledge-integrity-accept/);
  assert.doesNotMatch(main, /data-project-knowledge-stage-a-setup/);
  assert.doesNotMatch(main, /data-project-knowledge-protection-setup/);
  assert.match(main, /Das Livariant-Wissen hat sich verändert/);
  assert.match(main, /Bisher bestätigt/);
  assert.match(main, /Aktueller lokaler Stand/);
});

test("Desktop Project Brain uses machine-local project state instead of repository initialization UX", async () => {
  const core = await readFile("src/project/desktop-project-knowledge.ts", "utf8");
  const storage = await readFile("src/project/desktop-project-brain-storage.ts", "utf8");
  const rust = await readFile("apps/desktop/src-tauri/src/project_knowledge_bridge.rs", "utf8");
  const registry = await readFile("apps/desktop/src-tauri/src/desktop_project_registry.rs", "utf8");
  const main = await readFile("apps/desktop/src/main.ts", "utf8");

  assert.match(core, /LIVARIANT_PROJECT_BRAIN_ROOT/);
  assert.match(core, /ensureDesktopProjectBrainStorage\(checkoutRoot, projectBrainRoot\)/);
  assert.match(rust, /LIVARIANT_PROJECT_ROOT/);
  assert.match(rust, /LIVARIANT_PROJECT_BRAIN_ROOT/);
  assert.match(registry, /ensure_project_brain_storage_for_roots\(&local_root, &state_root\)/);
  assert.match(storage, /storage must not overlap the user project checkout/i);
  assert.match(storage, /Both machine-local and repository-local Project Brains exist with different material/);
  assert.doesNotMatch(main, /data-project-knowledge-initialization-authorize/);
  assert.doesNotMatch(main, /data-project-knowledge-initialization-apply/);
  assert.doesNotMatch(main, /Authorize creation/);
  assert.doesNotMatch(main, /Create Project Brain/);
  assert.doesNotMatch(core, /authorize-initialization/);
  assert.doesNotMatch(core, /apply-initialization/);
  assert.doesNotMatch(rust, /authorize_project_knowledge_initialization/);
  assert.doesNotMatch(rust, /apply_project_knowledge_initialization/);
});


test("legacy repository-local Project Brain migration is bounded and fail-closed", async () => {
  const storage = await readFile("src/project/desktop-project-brain-storage.ts", "utf8");
  assert.match(storage, /MAX_MIGRATION_ENTRIES/);
  assert.match(storage, /MAX_MIGRATION_FILE_BYTES/);
  assert.match(storage, /unsupported symbolic link/);
  assert.match(storage, /Migrated Project Brain candidate does not match the exact legacy source material/);
  assert.match(storage, /Legacy Project Brain changed during migration/);
  assert.match(storage, /Machine-local Project Brain promotion could not be verified/);
  assert.match(storage, /await rm\(source\.path, \{ recursive: true, force: false \}\)/);
});

test("Desktop bridge types protected setup as completed after the awaited host result", async () => {
  const bridge = await readFile("apps/desktop/src/project-knowledge-bridge.ts", "utf8");
  assert.match(bridge, /launchProjectKnowledgeStageASetup[\s\S]*state: "completed"/);
  assert.match(bridge, /launchProjectKnowledgeProtectionSetup[\s\S]*state: "completed"/);
  assert.doesNotMatch(bridge, /state: "launched"/);
});


test("protected Desktop confirmation uses hidden UAC plus native dialogs instead of a technical terminal challenge", async () => {
  const rust = await readFile("apps/desktop/src-tauri/src/project_knowledge_bridge.rs", "utf8");
  const helper = await readFile("src/guardian/protected-helper.ts", "utf8");
  const main = await readFile("apps/desktop/src/main.ts", "utf8");

  assert.match(rust, /run_elevated_powershell_script/);
  assert.match(rust, /-WindowStyle Hidden/);
  assert.match(rust, /-Wait/);
  assert.doesNotMatch(rust, /-NoExit/);
  assert.match(helper, /requireWindowsNativeSimpleIssuance/);
  assert.match(helper, /Änderung am Projektwissen bestätigen/);
  assert.match(helper, /Projektwissen sicher einrichten/);
  assert.doesNotMatch(main, /Guardian-Einrichtung abgeschlossen/);
  assert.doesNotMatch(main, /Geschützte Stage A abgeschlossen/);
});

test("Desktop installer and project activation remain non-blocking while Project Knowledge owns trust setup", async () => {
  const hook = await readFile("apps/desktop/src-tauri/windows/language-hooks.nsh", "utf8");
  const builder = await readFile("scripts/build-protected-bootstrap-assets.mjs", "utf8");
  const registry = await readFile("apps/desktop/src/desktop-project-registry.ts", "utf8");
  const bridge = await readFile("apps/desktop/src/project-knowledge-bridge.ts", "utf8");
  const main = await readFile("apps/desktop/src/main.ts", "utf8");

  assert.doesNotMatch(hook, /nsExec::ExecToStack[\s\S]*desktop-stage-a\.ps1/);
  assert.ok(builder.includes("$LivariantProgramFiles = 'C:\\\\Program Files\\\\Livariant\\\\Bootstrap'"));
  assert.doesNotMatch(registry, /ensureProjectKnowledgeTrusted/);
  assert.match(bridge, /ensureProjectKnowledgeTrusted/);
  assert.doesNotMatch(main, /Prepare protected source/);
  assert.doesNotMatch(main, /Set up Guardian/);
});

test("Project Knowledge navigation paints before canonical refresh and setup UI hides raw detail", async () => {
  const main = await readFile("apps/desktop/src/main.ts", "utf8");
  const css = await readFile("apps/desktop/src/project-truth-workspace.css", "utf8");

  const route = main.slice(main.indexOf("const activateView"), main.indexOf("const bindEvents"));
  const renderAt = route.indexOf("render();");
  const refreshAt = route.indexOf("refreshProjectKnowledge(true)");
  assert.ok(renderAt >= 0 && refreshAt > renderAt, "Project Knowledge route must paint before the async canonical refresh.");
  assert.match(main, /projectKnowledgeRefreshInFlight/);
  assert.match(main, /projectKnowledgeLoadedOnce/);
  assert.match(main, /project-brain-setup-card/);
  assert.match(main, /unexpectedChangeReview/);
  assert.doesNotMatch(main, /Technical details/);
  assert.doesNotMatch(main, /Only dedicated \.project-brain files are created/);
  assert.match(css, /\.project-brain-setup-card\{/);
  assert.match(css, /\.project-brain-file-chip\{/);
});

test("reviewed semantic apply becomes the new trusted state without a second integrity authorization", async () => {
  const core = await readFile("src/project/desktop-project-knowledge.ts", "utf8");
  const apply = await readFile("src/runtime/semantic-apply.ts", "utf8");
  const protectedIntegrity = await readFile("src/project-brain/protected-integrity.ts", "utf8");
  const semanticAuthority = await readFile("src/guardian/semantic-authority.ts", "utf8");

  assert.match(apply, /buildSemanticMutationPlan/);
  assert.match(apply, /does not match the exact user-authorized post-state/);
  assert.match(semanticAuthority, /expected-post-baseline-sha256/);
  assert.match(protectedIntegrity, /semanticGuardianProof/);
  assert.match(protectedIntegrity, /findMatchingConsumedGuardianAuthority/);
  assert.doesNotMatch(core, /establishProtectedProjectBrainIntegrityState\(project\.root, "semantic-apply"/);
});


test("Desktop Project Knowledge keeps checkout identity coupled to the machine-local Project Brain", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-desktop-checkout-identity-"));
  const checkout = resolve(root, "checkout");
  const stateRoot = resolve(root, "state");
  await mkdir(checkout);
  await mkdir(stateRoot);
  try {
    await writeFile(resolve(checkout, "package.json"), JSON.stringify({ name: "alpha-project" }), "utf8");
    const store = new ProjectBrainStore(stateRoot);
    await store.bootstrap(
      {
        framework: { version: "0.0.0-development", channel: "development" },
        projectBrain: { schemaVersion: 2, projectId: "11111111-1111-4111-8111-111111111111" },
      },
      { projectName: "alpha-project", evidence: ["package.json"], unknowns: [] },
    );

    await assert.doesNotReject(assertDesktopProjectCheckoutIdentity(checkout, stateRoot));

    await writeFile(resolve(checkout, "package.json"), JSON.stringify({ name: "renamed-project" }), "utf8");
    await assert.rejects(
      assertDesktopProjectCheckoutIdentity(checkout, stateRoot),
      /checkout identity conflict.*renamed-project.*alpha-project/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Desktop host passes both checkout and AppData Brain roots through Project Knowledge operations", async () => {
  const core = await readFile("src/project/desktop-project-knowledge.ts", "utf8");
  assert.match(core, /projectKnowledgeProtectionStatus\(projectBrainRoot, checkoutRoot\)/);
  assert.match(core, /readDesktopProjectKnowledge\(projectBrainRoot, checkoutRoot\)/);
  assert.match(core, /prepareDesktopProjectKnowledgeProposal\(projectBrainRoot, request, checkoutRoot\)/);
  assert.match(core, /applyDesktopProjectKnowledgeProposal\(projectBrainRoot, request, checkoutRoot\)/);
  assert.match(core, /checkout-identity-conflict/);
});


test("Reject and Keep Existing remain renderer-local decisions with no Project Brain mutation bridge call", async () => {
  const main = await readFile("apps/desktop/src/main.ts", "utf8");
  const keepStart = main.indexOf('document.querySelector<HTMLButtonElement>(".keep-truth-review")');
  const rejectStart = main.indexOf('document.querySelector<HTMLButtonElement>(".reject-truth-review")');
  const rejectEnd = main.indexOf('document.querySelector<HTMLButtonElement>("[data-project-knowledge-integrity-activate]")', rejectStart);
  assert.ok(keepStart >= 0 && rejectStart > keepStart && rejectEnd > rejectStart);

  const keepHandler = main.slice(keepStart, rejectStart);
  const rejectHandler = main.slice(rejectStart, rejectEnd);
  for (const handler of [keepHandler, rejectHandler]) {
    assert.doesNotMatch(handler, /applyProjectKnowledgeProposal|prepareProjectKnowledgeProposal|acceptProjectKnowledgeIntegrity/);
    assert.match(handler, /area\.pendingValue = ""/);
    assert.match(handler, /selectedReviewAreaId = null/);
  }
  assert.match(keepHandler, /area\.preparedProposal = null/);
  assert.match(rejectHandler, /area\.state = area\.confirmedValue \? "confirmed" : "open"/);
});


test("Project Knowledge normal surface has no manual protected-setup retry or hanging setup state", async () => {
  const main = await readFile("apps/desktop/src/main.ts", "utf8");

  assert.doesNotMatch(main, /data-project-knowledge-auto-setup-retry/);
  assert.doesNotMatch(main, /projectKnowledgeSetupInFlight/);
  assert.doesNotMatch(main, /ensureProjectKnowledgeTrusted\(getLanguage\(\)\)/);
  assert.match(main, /data-project-knowledge-protection-refresh/);
  assert.match(main, /Das Livariant-Wissen hat sich verändert/);
});

test("Project Knowledge ready-state refresh performs one protected snapshot read before detailed recovery inspection", async () => {
  const main = await readFile("apps/desktop/src/main.ts", "utf8");
  const start = main.indexOf("const refreshProjectKnowledge");
  const end = main.indexOf("const icon =", start);
  const refresh = main.slice(start, end);

  const snapshotAt = refresh.indexOf("await loadProjectKnowledge()");
  const statusAt = refresh.indexOf("await loadProjectKnowledgeProtectionStatus()");
  assert.ok(snapshotAt >= 0 && statusAt > snapshotAt, "ready-state snapshot read must precede detailed recovery status inspection");
  assert.doesNotMatch(refresh, /acceptProjectKnowledgeIntegrity/);
  assert.doesNotMatch(refresh.slice(0, statusAt), /loadProjectKnowledgeProtectionStatus/);
  assert.match(refresh, /protection\.state !== "integrity-acceptance-required"/);
});

test("initial Project Knowledge integrity activation is explicit and does not own the global loading state", async () => {
  const main = await readFile("apps/desktop/src/main.ts", "utf8");
  assert.match(main, /data-project-knowledge-integrity-activate/);
  assert.match(main, /Projektwissen aktivieren/);
  assert.match(main, /Warte auf Windows-Bestätigung/);
  const start = main.indexOf('document.querySelector<HTMLButtonElement>("[data-project-knowledge-integrity-activate]")');
  const end = main.indexOf('document.querySelector<HTMLButtonElement>("[data-project-knowledge-protection-refresh]")', start);
  assert.ok(start >= 0 && end > start);
  const handler = main.slice(start, end);
  assert.match(handler, /acceptProjectKnowledgeIntegrity\(digest, getLanguage\(\)\)/);
  assert.match(handler, /projectKnowledgeIntegrityInFlight = true/);
  assert.doesNotMatch(handler, /projectKnowledgeLoading = true/);
});

test("Windows Project Knowledge integrity confirmation uses visible bounded native elevation", async () => {
  const privileged = await readFile("src/guardian/privileged-helper.ts", "utf8");
  const protectedHelper = await readFile("src/guardian/protected-helper.ts", "utf8");

  const runWindowsStart = privileged.indexOf("function runWindows(");
  const runWindowsEnd = privileged.indexOf("export async function runPrivilegedGuardianHelper", runWindowsStart);
  assert.ok(runWindowsStart >= 0 && runWindowsEnd > runWindowsStart);
  const runWindows = privileged.slice(runWindowsStart, runWindowsEnd);
  assert.match(runWindows, /FilePath='C:\\\\Windows\\\\System32\\\\WindowsPowerShell\\\\v1\.0\\\\powershell\.exe'/);
  assert.match(runWindows, /Verb='RunAs'/);
  assert.match(runWindows, /-EncodedCommand/);
  assert.match(runWindows, /timeout: 5 \* 60 \* 1000/);
  assert.match(runWindows, /Buffer\.from\(JSON\.stringify\(\{/);
  assert.match(runWindows, /Buffer\.from\(elevatedScript, "utf16le"\)\.toString\("base64"\)/);
  assert.match(runWindows, /diagnosticPath/);
  assert.doesNotMatch(runWindows, /LIVARIANT_GUARDIAN_ELEVATED_/);
  assert.doesNotMatch(runWindows, /FilePath=\$env:LIVARIANT_GUARDIAN_ELEVATED_NODE;ArgumentList/);

  const dialogStart = protectedHelper.indexOf("function requireWindowsNativeSimpleIssuance(");
  const dialogEnd = protectedHelper.indexOf("async function requireInteractiveIssuance", dialogStart);
  assert.ok(dialogStart >= 0 && dialogEnd > dialogStart);
  const dialog = protectedHelper.slice(dialogStart, dialogEnd);
  assert.match(dialog, /\$form\.TopMost=\$true/);
  assert.match(dialog, /\$form\.ShowInTaskbar=\$true/);
  assert.match(dialog, /\$form\.Add_Shown\(\{\$form\.Activate\(\);\$form\.BringToFront\(\)\}\)/);
  assert.match(dialog, /\$timer\.Interval=300000/);
  assert.match(dialog, /timeout: 5 \* 60 \* 1000/);
  assert.doesNotMatch(dialog, /Windows\.Forms\.MessageBox/);
});

test("bounded Project Knowledge reads cannot leave the renderer waiting forever", async () => {
  const rust = await readFile("apps/desktop/src-tauri/src/project_knowledge_bridge.rs", "utf8");
  assert.match(rust, /Some\("read"\) \| Some\("protection"\)/);
  assert.match(rust, /Some\("accept-integrity"\)/);
  assert.match(rust, /Duration::from_secs\(10\)/);
  assert.match(rust, /Duration::from_secs\(360\)/);
  assert.match(rust, /Project Knowledge local read timed out after 10 seconds/);
  assert.match(rust, /Project Knowledge integrity confirmation timed out after 6 minutes/);
  assert.match(rust, /child\.kill\(\)/);
});

test("Project Knowledge begins canonical refresh immediately on initial render and project activation", async () => {
  const main = await readFile("apps/desktop/src/main.ts", "utf8");
  assert.doesNotMatch(main, /requestAnimationFrame\(\(\) => \{ void refreshProjectKnowledge/);
  assert.match(main, /projectKnowledgeLoading = true;\s*render\(\);\s*void refreshProjectKnowledge\(true\);\s*$/);
  const activationStart = main.indexOf("onDesktopProjectActivated(() =>");
  const activationEnd = main.indexOf("onLanguageChange(() =>", activationStart);
  assert.ok(activationStart >= 0 && activationEnd > activationStart);
  const activation = main.slice(activationStart, activationEnd);
  assert.match(activation, /render\(\);\s*void refreshProjectKnowledge\(true\)/);
});
