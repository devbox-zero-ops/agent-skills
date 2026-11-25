# Worldwide Agentic Web MVP Profile 0.3 Quick Reference

Required public artifacts for a conforming static Open Agentic Website:
- `agent-manifest.json`: declares `brand`, `networks[]`, `llm_router`, `allowed_peers`, `peer_policy`, `linking`.
- `<network>.network.json`: resolved data-only Neuro SAN agent graph (`metadata`, `tools[]` with `name`, `function.description`, `instructions`, `tools[]`).
- `.well-known/nsdeploy.json`: `nsdeploy-link/v1` exports/imports discovery file (include `.nojekyll` on GitHub Pages).
- Live reference site: https://devbox-zero-ops.github.io/verimesh-agentic-web/
