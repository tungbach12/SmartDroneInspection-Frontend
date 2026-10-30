# SmartDroneInspection Frontend

The React SPA runs independently from the backend. During development, use Vite's local server and `/api` proxy:

```bash
npm ci --legacy-peer-deps
npm run dev
```

For a containerized deployment, start the backend Compose project first so it creates the shared external Docker network, then start this repository's frontend Compose project:

```bash
cp .env.example .env
# Optional: set DOCKER_NETWORK_NAME and WEB_PORT in .env to match the deployment.
docker compose up -d --build
```

Frontend deploys replace only the Nginx container; they do not rebuild or restart the backend. The backend and frontend Compose projects share `backend_smartdroneinspection-network` so Nginx can proxy `/api/` to the backend service. The frontend Compose project must not be started before the backend creates that network. For a migration from the former shared Compose deployment, the frontend workflow removes only the existing fixed-name web container after its replacement image builds, then starts the independent project.

For local checks, run `npm test`, `npm run lint`, and `npm run build`.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
