<!-- >>> AI_CONTEXT_MAP_RULE >>> -->
# kyntus-workflow-main — Navigation & Context Rule

A lightweight, auto-updated map of this repository is maintained at `.context/PROJECT_MAP.md` (stack overview, API endpoints, frontend routes, data models, directory tree, and function signatures).

## Mandatory Workflow
1. **Read the map first:** Before running broad searches (`grep`, `find_by_name`, or listing directories) to locate files, endpoints, or symbols, read `.context/PROJECT_MAP.md`.
2. **Surgical file reads:** Use the map to identify the exact target files, then open ONLY those files. Do not read unrelated files.
3. **Trust disk over map:** `.context/PROJECT_MAP.md` refreshes automatically before commits (and in CI if enabled). If a file was modified during the current session, always trust the actual file on disk.
4. **Stay lean:** Do not regenerate full codebase dumps or commit secrets/credentials. Only update `.context/PROJECT_MAP.md` manually if major files/endpoints were added and no hook/CI ran.
<!-- <<< AI_CONTEXT_MAP_RULE <<< -->
