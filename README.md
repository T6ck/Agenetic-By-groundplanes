# Agenetic by Groundplanes

<p>
<a href="https://github.com/T6ck/AgeneticByGroundplanes/releases"><img alt="Latest beta" src="https://img.shields.io/github/v/release/T6ck/AgeneticByGroundplanes?include_prereleases&label=beta&color=4a6fa5"></a>
<a href="https://github.com/T6ck/AgeneticByGroundplanes/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/T6ck/AgeneticByGroundplanes/total?color=4a6fa5"></a>
<img alt="Windows x64" src="https://img.shields.io/badge/Windows-x64-2b2f36?logo=windows&logoColor=white">
<img alt="Runs locally" src="https://img.shields.io/badge/inference-local-2b2f36">
<img alt="Free for personal use" src="https://img.shields.io/badge/personal_use-free-3c7a5a">
<a href="https://github.com/T6ck/AgeneticByGroundplanes/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/T6ck/AgeneticByGroundplanes?style=flat&color=b08d3c"></a>
<a href="https://github.com/T6ck/AgeneticByGroundplanes/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/T6ck/AgeneticByGroundplanes?color=2b2f36"></a>
<a href="https://groundplanes.com"><img alt="Website" src="https://img.shields.io/badge/groundplanes.com-site-2b2f36"></a>
</p>

Agenetic is a Windows app for working through a research question with your own sources. Put your notes and PDFs in a workspace, connect them in the graph, and open the passage behind a claim. If you use a language model to draft a brief, you can run it on your own machine.

[Download the Windows x64 beta](https://github.com/T6ck/AgeneticByGroundplanes/releases) · [Release notes](CHANGELOG.md) · [Groundplanes](https://groundplanes.com)

![The Fieldwork workspace in Agenetic’s Atlas graph](docs/screenshots/gallery/atlas.webp)

## Getting started

1. Download the Windows x64 setup EXE from the release assets and run it.
2. Open the Fieldwork example to try the graph, or create a workspace and import a source.
3. Open **Models** if you want to run a local model. The installer includes the llama.cpp CPU runner. Choose a GGUF file you already have or download one from Hugging Face.

Open **Navigate → Releases → Check for updates** to see your installed version. Signed betas download updates in the background and apply them when you close Agenetic. If you have an older unsigned preview, install a signed beta once to switch channels.

## Turning and pulling the graph

In **Atlas** and **Spatial**, drag the background to rotate the graph. Drag a record to pull its neighbors, then release it to let them settle. Shift-drag pans, the wheel zooms, and **View angle** lets you tilt, roll, or reset.

**Clusters** groups related records. **Orbit** shows how many links separate each record from a starting point. **Flow** lays out sources, agents, models, and tasks in columns. **Freeform** keeps records where you put them.

[See all six layouts and the research screens](docs/screenshots/README.md) · [Work through a research project](docs/research-desk.md)

## Community

Browse posts from the Community tab. To publish, sign in with the code sent to your email and return to Agenetic when your browser asks. [Community API](docs/community-api.md).

## Data and licensing

Workspaces and local model runs stay on your device. Updates, model downloads, community posts, team services, and remote tools use the network. Use a vault backup to keep a copy of your files and research history.

Agenetic is free for personal use. Commercial use requires a Groundplanes license. [Contact Groundplanes](mailto:hello@groundplanes.com).

[Build and test](CONTRIBUTING.md) · [Report a bug](https://github.com/T6ck/AgeneticByGroundplanes/issues/new/choose) · [Report a security issue privately](SECURITY.md)
