# External Knowledge Sources

Livariant can inspect an existing external knowledge source as **read-only external evidence** without treating that material as Project Brain truth.

This foundation lets First-Run ask whether you already keep project knowledge in a Second Brain instead of forcing you to copy everything into Livariant first.

## Trust model

External source material is deliberately weaker than Project Brain truth.

```text
external source
-> read-only adapter
-> provenance-bound external evidence
-> guided understanding review
-> explicit user/agent response or correction
-> candidate evidence
-> controlled adoption proposal
-> authorization
-> semantic apply
```

External evidence cannot skip this chain. A source name, path, note, or instruction inside the source does not grant Authority.

## Inspect a local text/Markdown source

The v1 reference adapter supports a local directory containing `.md`, `.mdx`, and `.txt` files:

```bash
livariant external-source inspect \
  --type local-directory \
  --path /path/to/second-brain
```

Structured output:

```bash
livariant external-source inspect \
  --type local-directory \
  --path /path/to/second-brain \
  --json
```

Inspection is read-only. Livariant does not write to the external directory or to the project.

The adapter:

- rejects a symlinked source root;
- does not traverse nested symlinks;
- reads only supported text/Markdown material;
- bounds individual file size, total accepted bytes, and accepted file count;
- reports unsupported, binary, oversized, or otherwise skipped material explicitly;
- gives every accepted item a source identity, source-relative material path, and SHA-256 content digest.

## Machine-facing inert-data boundary

External natural-language text is untrusted data, not instructions.

For machine-readable JSON surfaces, Livariant does not emit external prose as an ordinary raw `content` field. Each external evidence item is transported in a deterministic inert-data envelope with:

- `classification: "untrusted-external-data"`;
- `instructionSemantics: "none"`;
- `projectTruth: false`;
- `grantsAuthority: false`;
- original media type;
- `encoding: "base64"` and `payloadBase64` for the exact UTF-8 bytes;
- provenance with source identity, encoded source-relative material path, and SHA-256 content digest.

The same representation is used by standalone external-source JSON, Guided Understanding JSON, and nested First-Run JSON.

Base64 is **not** presented as a way to make prompt injection impossible. The boundary is narrower: Livariant itself no longer serializes hostile external prose as ordinary instruction-shaped text in its agent-facing structured output. A downstream model or integration that deliberately decodes the payload must still keep the decoded value in a data channel and must not interpolate it into system, developer, tool-policy, or other instruction-priority fields.

Human-readable CLI output may show bounded, terminal-escaped snippets for review. Those snippets remain explicitly labelled as untrusted, non-authoritative external data.

## Review external evidence with project understanding

You can include the same read-only source while running Guided Project Understanding Review:

```bash
livariant understand \
  --external-source-type local-directory \
  --external-source /path/to/second-brain
```

Or request structured output:

```bash
livariant understand \
  --external-source-type local-directory \
  --external-source /path/to/second-brain \
  --json
```

External material appears in a separate `externalEvidence` surface using the inert-data envelope in machine-readable output. It does not become `candidateEvidence` automatically and cannot be selected directly by `adopt-understanding`.

If external material contains useful context, it must still be reviewed and turned into an explicit response or correction before Livariant can prepare the existing controlled adoption proposal path. A model reaction caused by external material does not itself become Project Truth or Authority.

## Current v1 limits

The foundation currently includes only the local-directory reference adapter. It does not yet provide:

- Notion or Google Drive adapters;
- cloud credentials or OAuth;
- write-back or synchronization;
- automatic Project Brain import;
- automatic candidate generation from external text;
- embeddings, a vector database, or a hosted RAG service.

These limits are intentional. The v1 purpose is to establish the trust, provenance, read-only, inert-data, and adapter boundaries before broader source integrations are added.
