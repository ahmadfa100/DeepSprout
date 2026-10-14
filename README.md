# DeepSprout

A wellness product focused on intentional digital habits, attention practice, and offline activities.

The current implementation is a static browser application with local demo data. The product specification describes the intended full product; a backend and authentication service have not been implemented yet.

## Start locally

From the repository root:

```sh
python3 Client/serve.py --port 8765
```

Open <http://127.0.0.1:8765/>. See the [client guide](Client/README.md) for pages, demo behavior, and tests.

## Repository guide

| Location | Purpose |
| --- | --- |
| [Client/](Client/README.md) | Website entry pages, source, runtime assets, scripts, and tests |
| [Client/docs/](Client/docs/README.md) | Architecture, experience handoffs, design notes, and validation evidence |
| [Client/references/](Client/references/README.md) | Original design references and approved storyboards |
| [docs/](docs/README.md) | Product specification and repository maintenance records |
| [Server/](Server/README.md) | Reserved backend location |
| [experiments/](experiments/README.md) | Independent Bimo Rive authoring projects |

Runtime media belongs in `Client/assets/`. Source belongs in `Client/src/`. Root HTML files under `Client/` are public entry URLs or dedicated animation labs and remain at those locations deliberately. New filenames use lowercase kebab-case, except tool-required names such as `README.md`, `AGENTS.md`, and third-party license files.

See the [organization record](docs/repository-organization.md) for cleanup details and preserved exceptions.
