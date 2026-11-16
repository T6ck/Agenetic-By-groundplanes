# Testing and releases

## Report a beta issue

Use the [beta bug form](https://github.com/T6ck/Agenetic-By-groundplanes/issues/new/choose). Include the version from **Navigate → Releases → Check for updates**, Windows version, steps, and what happened. A minimal sample workspace helps with Graph and research bugs. Remove research materials, local file paths, and credentials before sharing screenshots or logs. Send private details to [hello@groundplanes.com](mailto:hello@groundplanes.com).

When opening a patch, add a changelog bullet describing the behavior users will see and link the public issue if there is one. GitHub Releases is the public record for each installer.

## Run checks

Use Node 24. Run `node --test tests/*.test.mjs` from the repository root and `npm test --prefix desktop` for desktop tests. The Windows installer workflow also checks GGUF registration and inference with the packaged runner.

## Publish Windows builds

Pushes to `main` build and publish a timestamped, Azure-signed Windows beta through GitHub OIDC. The build verifies the installer and app executable before uploading the beta channel metadata. The updater checks the exact Azure certificate profile across normal certificate rotations. Keep the certificate profile when renewing the signing identity.

The first move from an unsigned preview to the signed channel requires installing the signed beta once. For stable releases, bump both desktop package versions, document the changes, and push a matching `vX.Y.Z` tag. Stable tag builds use the separate `CSC_LINK`, `CSC_KEY_PASSWORD`, and `AGENETIC_SIGNER_THUMBPRINT` Actions secrets and publish to the stable feed.
