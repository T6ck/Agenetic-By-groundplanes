# Contributing

## Report a bug

Use the [beta bug form](https://github.com/T6ck/AgeneticByGroundplanes/issues/new/choose). Include the version from **Navigate → Releases → Check for updates**, Windows version, steps, and what happened. A minimal sample workspace helps with Graph and research bugs. Remove research materials, local file paths, and credentials before sharing screenshots or logs. Send private details to [hello@groundplanes.com](mailto:hello@groundplanes.com).

When opening a patch, add a changelog bullet describing the behavior users will see and link the public issue if there is one. Release notes use the matching version heading in CHANGELOG.md, or the commit subject when a build has no entry.

## Run checks

Use Node.js 24 and Python 3.12. From the repository root, run the application, desktop, and companion tests.

```sh
node --test tests/*.test.mjs
npm test --prefix desktop
python -m unittest discover -s tests
```

On Windows, build a local installer with PowerShell. Supply the folder containing the Windows x64 llama.cpp binaries to include local inference.

```powershell
./desktop/scripts/build-windows.ps1 -LlamaDirectory C:/tools/llama.cpp
```

The renderer lives in `public/`, Electron and the installer in `desktop/`, and the team services in `supabase/`. The [Community API](docs/community-api.md) describes account sign-in and the endpoints used by the desktop app.

## Publish Windows builds

Changes to the app on `main` build and publish a timestamped, Azure-signed Windows beta through GitHub OIDC. The build verifies the installer and app executable before uploading the beta channel metadata. The updater checks the exact Azure certificate profile across normal certificate rotations. Keep the certificate profile when renewing the signing identity.

The first move from an unsigned preview to the signed channel requires installing the signed beta once. For stable releases, bump both desktop package versions, document the changes, and push a matching `vX.Y.Z` tag. Stable tag builds use the separate `CSC_LINK`, `CSC_KEY_PASSWORD`, and `AGENETIC_SIGNER_THUMBPRINT` Actions secrets and publish to the stable feed.

When an earlier signed beta is available, the Windows workflow installs it on a clean runner, checks for the new public beta through the app, closes the app to apply it, and verifies the version after relaunch.
