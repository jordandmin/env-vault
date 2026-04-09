# env-vault

> Encrypted environment variable manager with team sharing and audit logs

[![npm version](https://img.shields.io/npm/v/env-vault)](https://www.npmjs.com/package/env-vault)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

`env-vault` is a TypeScript-first CLI and library for securely storing, sharing, and auditing environment variables across your team. Secrets are encrypted at rest, access is role-controlled, and every read/write is logged.

## Installation

```bash
npm install env-vault
# or
npx env-vault init
```

## Usage

```typescript
import { VaultClient } from "env-vault";

const vault = new VaultClient({ project: "my-app" });

// Store a secret
await vault.set("DATABASE_URL", "postgres://user:pass@host/db");

// Retrieve a secret
const dbUrl = await vault.get("DATABASE_URL");

// Load all secrets into process.env
await vault.load();
```

**CLI example:**

```bash
# Initialize a new vault
env-vault init --project my-app

# Add a secret
env-vault set API_KEY=sk-abc123

# Share with a teammate
env-vault share --user alice@example.com --role read-only

# View audit log
env-vault audit --last 50
```

## Features

- 🔐 AES-256 encryption at rest
- 👥 Team sharing with role-based access
- 📋 Full audit logs for every operation
- 🔄 CI/CD friendly — load secrets at runtime
- 🧩 Works alongside `.env` files

## License

MIT © [env-vault contributors](https://github.com/env-vault/env-vault)