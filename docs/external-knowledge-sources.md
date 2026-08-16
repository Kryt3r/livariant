# External Knowledge Sources

Livariant can inspect an existing external knowledge source as **read-only external evidence** without treating that material as Project Brain truth.

This foundation exists so a later First-Run flow can ask whether you already keep project knowledge in a Second Brain instead of forcing you to copy everything into Livariant first.

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

External material appears in a separate `externalEvidence` surface. It does not become `candidateEvidence` automatically and cannot be selected directly by `adopt-understanding`.

If external material contains useful context, it must still be reviewed and turned into an explicit response or correction before Livariant can prepare the existing controlled adoption proposal path.

## Current v1 limits

The foundation currently includes only the local-directory reference adapter. It does not yet provide:

- Notion or Google Drive adapters;
- cloud credentials or OAuth;
- write-back or synchronization;
- automatic Project Brain import;
- automatic candidate generation from external text;
- embeddings, a vector database, or a hosted RAG service;
- First-Run composition.

These limits are intentional. The v1 purpose is to establish the trust, provenance, read-only, and adapter boundaries before broader source integrations are added.
