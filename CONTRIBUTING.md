# Testing and releases

## Report a beta issue

Use the [beta bug form](https://github.com/T6ck/Agenetic-By-groundplanes/issues/new/choose). Include the version from **Navigate → Releases → Check for updates**, Windows version, steps, and what happened. A minimal sample workspace helps with Graph and research bugs. Remove research materials, local file paths, and credentials before sharing screenshots or logs. Send private details to [hello@groundplanes.com](mailto:hello@groundplanes.com).

When opening a patch, add a changelog bullet describing the behavior users will see and link the public issue if there is one. GitHub Releases is the public record for each installer.

## Run checks

Use Node 24. Run `node --test tests/*.test.mjs` from the repository root and `npm test --prefix desktop` for desktop tests. The Windows installer workflow also checks GGUF registration and inference with the packaged runner.

## Publish Windows builds

Pushes to `main` build a beta installer. Configure `CSC_LINK`, `CSC_KEY_PASSWORD`, and `AGENETIC_SIGNER_THUMBPRINT` in [GitHub Actions secrets](https://github.com/T6ck/Agenetic-By-groundplanes/settings/secrets/actions) to enable signed beta releases. Use an Authenticode identity trusted by Windows and keep the private key in the secret store. Agenetic verifies the Windows signature and its pinned signer before applying updates.

With signing configured, CI publishes a prerelease tagged `v<base-version>-beta.<run-number>` with the installer, checksums, and beta update metadata. Without signing configured, CI publishes a manual-install preview. The first move from an unsigned preview to the signed channel requires downloading the signed installer once.

For stable releases, bump both desktop package versions, record changes in the changelog, and push a matching `vX.Y.Z` tag. Stable releases require signing. Signed stable installs check the stable feed. Before distributing the signed beta, test an actual update between two signed versions on Windows with a populated vault.
