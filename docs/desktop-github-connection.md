# Desktop GitHub connection

Livariant Desktop supports a bounded GitHub connection for repository discovery. The connection exists to reduce manual repository setup and to make explicitly authorized private repositories selectable without copying a broad personal access token into Livariant.

## Authentication model

The intended production identity is a GitHub App. Desktop uses the GitHub device authorization flow with the app client ID; the client ID is not a secret. A build can receive `LIVARIANT_GITHUB_CLIENT_ID` at build time, and local development may provide the same variable at runtime.

If no client ID is configured, the GitHub picker reports that the integration is unavailable and the existing manual repository entry remains usable.

On Windows, access and refresh token material is protected with the operating system's DPAPI boundary for the current user before ciphertext is persisted under Livariant app data. Plaintext tokens are not written to project-owned files or ordinary plaintext Livariant app state. The protected file is not project truth and grants no Livariant Authority.

The GitHub transport is host-owned and bounded. It uses a fixed Windows PowerShell helper path and fixed request scripts rather than exposing arbitrary renderer-supplied shell commands. The renderer can invoke only the declared GitHub commands.

## Repository discovery

After authorization, Livariant asks GitHub for repositories visible through the authenticated GitHub App user connection. The normal repository picker can therefore include private repositories only when GitHub itself exposes them to that user/app installation.

Selecting a repository only fills the existing source form. It does not submit or confirm the repository automatically. Remote repository identity and local checkout binding remain separate.

## Safety boundary

GitHub connection is read capability, not Livariant Authority. Repository metadata is external Evidence, not Project Truth. This integration does not enable repository writes, workflow dispatch/rerun, pull-request or issue mutation, merge, release/tag creation, Semantic Apply, or project-owned file mutation.

Later GitHub read surfaces may add Actions/workflow, pull-request, issue and release state when the GitHub App has the corresponding read permissions. Any write capability requires a separate explicit product/Authority decision.
