# Autonomy Profiles

Livariant Autonomy Profiles control how often an agent or workflow should stop and ask before discretionary next steps.

They are **interaction policy, not Authority**.

No profile can bypass Project Truth mutation authorization, proposal-bound authorization, Semantic Apply validation, Runtime Authority, Release Authority, or other fail-closed safety boundaries.

## Profiles

### Always ask

```text
ask-always
```

Use this when you want maximum control and visibility.

The agent should stop before routine and important discretionary next steps.

Hard Authority confirmation remains required as usual.

### Ask on important decisions

```text
ask-important
```

This is the balanced default.

The agent may continue through routine read-only work without another confirmation, but should stop before important or consequential discretionary decisions.

Hard Authority confirmation remains required as usual.

### Continue without confirmation

```text
continue-without-confirmation
```

This is the highest-autonomy profile.

The agent may continue through routine and important discretionary workflow decisions without another confirmation when no hard Livariant Authority is required.

**Warning:** this can let an agent make consequential workflow choices without asking you first. Persisting this mode requires an explicit risk acknowledgement.

Even in this profile, the agent cannot bypass Livariant's structural Authority boundaries.

## Inspect the current profile

```bash
livariant autonomy show
livariant autonomy show --json
```

Before a project has a valid initialized Project Brain with a stable project identity, Livariant uses the balanced `ask-important` default and does not persist project-specific autonomy state.

## Persist a profile

After the project has a stable project identity:

```bash
livariant autonomy set --profile ask-always
livariant autonomy set --profile ask-important
```

The high-autonomy profile additionally requires explicit acknowledgement:

```bash
livariant autonomy set \
  --profile continue-without-confirmation \
  --acknowledge-risk
```

The setting is stored machine-locally and is bound to the stable project identity. It is not stored as repository truth.

Project files, external knowledge, provider output, or copied profile state cannot legitimately raise autonomy for another project. Invalid or mismatched persisted state fails closed to `ask-always`.

## First-Run

First-Run can surface or select an autonomy profile:

```bash
livariant first-run --language English --autonomy-profile ask-important
```

For deterministic high-autonomy First-Run use, explicit acknowledgement is required:

```bash
livariant first-run \
  --language English \
  --autonomy-profile continue-without-confirmation \
  --acknowledge-autonomy-risk \
  --json
```

First-Run remains read-only. It does **not** persist the profile itself. Instead, it surfaces the explicit `livariant autonomy set ...` next step.

## Authority boundary

Autonomy Profile != Authority.

In every profile:

- Project Truth mutation still requires the existing authorization path;
- non-interactive providers/scripts/CI cannot create hard mutation Authority where the runtime requires a local interactive challenge;
- Semantic Apply still validates exact proposal/authorization state;
- Runtime trust remains separate;
- Release Authority and explicit release approval remain separate.

`continue-without-confirmation` therefore means "fewer discretionary workflow prompts", not "authorize everything".
