# Livariant Five-Minute Quickstart

This Quickstart describes the **current `main` development experience**. The published `v0.1.0-rc.3` release remains the immutable historical Foundation Preview and does not contain every capability described here.

The shortest way to understand Livariant is:

> You work with your coding agent. Livariant provides a local reliability and governance layer that the agent can use through MCP, while consequential project truth and Authority remain explicit.

## 1. Install Livariant

Livariant is installed once as local CLI tooling. It is not added to your application's `package.json` just to use the normal local workflow.

For the currently published Foundation Preview, install the verified `v0.1.0-rc.3` tarball from the canonical GitHub Release:

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.3.tgz
livariant version
```

For SHA-256 verification, Windows details, PATH help, and the distinction between published RC3 and current development, see [Installation & First Project](installation.md).

## 2. Open your project and run First Run

From the project root, start with:

```bash
livariant first-run
```

`first-run` is the guided current-main entry point. It composes existing read-only capabilities and starts by asking for your preferred interaction language.

It can help surface:

- current project state and discovery evidence;
- whether a Project Brain already exists;
- an Autonomy Profile choice;
- optional external knowledge evidence;
- Guided Project Understanding Review;
- the next explicit setup commands for Claude Code or Codex.

First Run ends with `Changes made: 0`. It does **not** silently initialize the project, adopt evidence, configure your coding agent, or grant Authority.

For deterministic use you can provide the language explicitly, for example:

```bash
livariant first-run --language English
```

See [First-Run Composition](first-run.md) for the complete behavior.

## 3. Initialize deliberately when needed

If First Run reports that Project Brain initialization is appropriate, inspect the plan first:

```bash
livariant init
```

Only proceed through the supported explicit authorization path after reviewing the plan. First Run itself never turns that plan into a write.

The Project Brain is the project-owned durable state used by Livariant:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Livariant keeps evidence, inference, Project Truth, authorization, and mutation as separate concepts. A coding agent cannot make something canonical merely by claiming it.

## 4. Connect your coding agent through MCP

Current `main` includes a local MCP agent bridge. Provider setup remains explicit; Livariant does not silently rewrite provider configuration.

Ask Livariant for the native setup path:

```bash
livariant mcp setup --provider claude-code
```

or:

```bash
livariant mcp setup --provider codex
```

The command renders provider-specific setup guidance. It performs **zero provider-configuration writes** by itself.

Once you apply the provider's normal MCP registration step, the coding agent can discover Livariant's MCP tools and server instructions directly.

Current bounded MCP tools include:

- `livariant_provider_context`: obtain bounded project context for an explicit task;
- `livariant_provider_return`: return provider output as untrusted evidence/candidate material;
- `livariant_verification_trace`: assess explicit requirements or acceptance criteria against supplied verification evidence.

## 5. Work normally with the agent

After setup, normal use does **not** require you to write Livariant commands into every prompt.

A typical interaction can simply be:

```text
You:
"Implement email login and rate limiting. At the end, check whether the requested outcomes are actually verified."

Coding agent
    -> uses available Livariant MCP tools when relevant
    -> works on the project
    -> can call livariant_verification_trace
    -> receives supported / contradicted / unproven
    -> reports the result back in the normal conversation
```

The CLI remains available for direct inspection, diagnostics, setup, explicit control, and provider-independent workflows. It is not intended to force the user into a command-heavy day-to-day interaction when an MCP-capable agent is connected.

## 6. See the core reliability moment

`livariant_verification_trace` evaluates an explicit version-1 trace containing requirements or acceptance criteria, implementation claims, and verification evidence.

Conceptually:

```text
requested outcome
      +
implementation claim
      +
verification evidence
      ↓
Livariant
      ↓
SUPPORTED / CONTRADICTED / UNPROVEN
```

Example outcome:

```text
Email login ........ SUPPORTED
Password reset ..... UNPROVEN
Rate limiting ...... CONTRADICTED
```

This is deliberately stricter than an agent saying "done".

The important boundaries are:

```text
supported != DONE
verification evidence != accepted completion
evidence != Project Truth
MCP transport != independent trust
capability != Authority
```

Livariant does **not** currently discover every requirement automatically, manufacture trustworthy evidence automatically, prove that every coding agent claim is false or true, or universally verify arbitrary code without explicit trace/evidence material.

See [Verification Trace](verification-trace.md) for the exact semantics and CLI fallback.

## 7. Repeated use

A normal repeated-use flow can look like this:

```text
open project
-> coding agent connects to Livariant over MCP
-> agent obtains bounded current context when needed
-> you work normally in natural language
-> explicit evidence can be assessed through Verification Trace
-> consequential durable changes still respect Livariant's review / Authority boundaries
-> later sessions reconstruct current project-owned state instead of trusting old chat memory
```

Useful direct CLI surfaces remain available when you want them:

```bash
livariant status
livariant doctor
livariant context
livariant resume
livariant autonomy show --json
```

## Published RC3 vs. current `main`

`v0.1.0-rc.3` is the published Foundation Preview. It is useful historical release evidence and remains installable through its verified GitHub Release artifact.

Current `main` goes significantly beyond RC3, including First Run composition, the MCP bridge, Verification Trace, protected Guardian-origin Authority for consequential consumers, external-knowledge foundations, and additional Active Project Intelligence capabilities.

Repository presence is **not** release publication. The next release will receive its own exact-candidate qualification and explicit release authorization.

## Next reads

- [Installation & First Project](installation.md)
- [First-Run Composition](first-run.md)
- [Verification Trace](verification-trace.md)
- [Existing Projects](existing-projects.md)
- [Provider Handoff](provider-handoff.md)
- [Architecture & Safety](architecture-and-safety.md)
- [Updates, Migrations & Recovery](lifecycle-guide.md)
