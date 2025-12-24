# asap-cli

A CLI to deploy static sites to `asap-static.site`.

## Installation

```bash
brew tap aydinschwa/asap-cli
brew install asap-cli
```

## Usage

If your project requires a build step (e.g. React, Vue, Svelte), make sure to build it first and deploy the output directory (often `dist` or `build`).

Deploy the current directory:
```bash
asap
```

Deploy a specific directory with a custom subdomain:
```bash
asap ./dist --tag my-site
```

### Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--tag` | `-t` | Specify a custom subdomain (e.g., `my-site` → `my-site.asap-static.site`). |
| `--help` | `-h` | Show help. |

## Development

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Build the binary**:
   ```bash
   bun run build
   ```

3. **Run locally**:
   ```bash
   bun run index.ts
   ```
