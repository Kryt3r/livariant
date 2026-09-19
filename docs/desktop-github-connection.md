# Desktop GitHub connection

Livariant Desktop supports a bounded GitHub connection for repository discovery. The connection exists to reduce manual repository setup and to make explicitly authorized private repositories selectable without copying a broad personal access token into Livariant.

## Authentication model

The intended production identity is a GitHub App. Desktop uses the GitHub device authorization flow with the app client ID; the client ID is not a secret. A build can receive `LIVARIANT_GITHUB_CLIENT_ID` at build time, and local development may provide the same variable at runtime.

If no client ID is configured, the GitHub picker reports that the integration is unavailable and the existing manual repository entry remains usable.

On Windows, access and refresh token material is protected with the operating system's DPAPI boundary for the current user before ciphertext is persisted under Livariant app data. Plaintext tokens are not written to project-owned files or ordinary plaintext Livariant app state. The protected file is not project truth and grants no Livariant Authority.

The GitHub transport is host-owned and bounded. It uses a fixed Windows PowerShell helper path and fixed request scripts rather than exposing arbitrary renderer-supplied shell commands. The renderer can invoke only the declared GitHub commands.

## Production build identity

Official Windows builds receive the GitHub App client ID from the GitHub Actions repository variable `LIVARIANT_GITHUB_CLIENT_ID`. The client ID is public application identity, not a secret; private app keys or client secrets are not embedded in the Desktop build for the device-flow path.

The ordinary installer build may still qualify with the variable unset and then behaves exactly as before with GitHub reported as not configured. A signed Desktop Preview build, however, requires a configured production client ID and fails closed when it is missing. This prevents a publishable Preview candidate from being built accidentally without the intended GitHub App identity.


## Post-setup management

After first-run setup, **Settings → Connections** brings together the GitHub account connection and repositories associated with the current project without collapsing their boundaries.

From there the user can:

- disconnect GitHub or reconnect through the same device flow;
- reassign the primary repository's local checkout;
- edit the purpose description of additional repositories;
- associate additional repositories with an existing local checkout or return them to **Remote only**;
- remove additional repository associations from the Livariant project.

The primary repository is protected in this surface and cannot be removed. Disconnecting GitHub does not remove project sources. Removing an additional repository association deletes neither the remote repository nor local files or checkouts.

## Repository discovery

After authorization, Livariant asks GitHub for repositories visible through the authenticated GitHub App user connection. The normal repository picker can therefore include private repositories only when GitHub itself exposes them to that user/app installation.

Selecting a repository only fills the existing source form. It does not submit or confirm the repository automatically. Remote repository identity and local checkout binding remain separate.

## Safety boundary

GitHub connection is read capability, not Livariant Authority. Repository metadata is external Evidence, not Project Truth. This integration does not enable repository writes, workflow dispatch/rerun, pull-request or issue mutation, merge, release/tag creation, Semantic Apply, or project-owned file mutation.

Later GitHub read surfaces may add Actions/workflow, pull-request, issue and release state when the GitHub App has the corresponding read permissions. Any write capability requires a separate explicit product/Authority decision.
