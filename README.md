# Agenetic by Groundplanes

A local research workspace with connected notes, scoped agents, model management and first-run onboarding.

## Download

Windows setup EXEs are produced by the **Windows installer** workflow and attached to this repository's Releases. Download the EXE, not the source ZIP. Test releases are explicitly marked **Pre-release** and unsigned. They bundle the app, Python companion and a pinned llama.cpp CPU runtime. No Node, Python or PowerShell installation is needed by users. GGUF model weights are downloaded or selected separately.

## Automatic builds and updates

Every push to main builds a Windows test installer, checks the companion startup and publishes a prerelease download. Actions can also be run with the GitHub Run workflow button.

Stable releases use a tag matching desktop/package.json, such as v0.2.2. The tag workflow requires repository Actions secrets CSC_LINK, CSC_KEY_PASSWORD, AGENETIC_SIGNER_THUMBPRINT and AGENETIC_UPDATE_SIGNING_KEY, and rejects missing signing credentials. Never put private keys in this repository. Signed builds check GitHub Releases for stable updates at launch and every six hours, download them, and install on normal app exit. Preview builds do not auto-update. Signing certificate rotation requires a planned transition. A freshly generated self-signed certificate on each ephemeral runner is not a persistent signing identity.

## Data and scope

Notes, imports, layouts and run history stay in local app storage. A local profile is not an encrypted login. Encrypted backup archives are separate from the unencrypted live vault. Uninstall preserves app data. Community opens separately in the browser and remains subject to the hosted site's access policy; this repository does not turn the private community into a public service.

The CPU runtime is checksum-pinned to the official llama.cpp release. Models may need many gigabytes of RAM and disk. GPU performance, installed-app onboarding, persistence, actual GGUF inference and signed update transitions still require Windows acceptance testing. Production payment licensing, vault synchronization and unrestricted autonomous agent tools are not advertised as delivered.

Personal use is free. Commercial licensing details will be maintained by Groundplanes.
