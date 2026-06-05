# retrospec

> Didn't do TDD? No problem.

**retrospec** generates Playwright E2E tests by reading your repository — no recording, no manual scripting. It analyzes your routes, components, and API structure, then uses Claude to infer meaningful user journeys and write test files you can run immediately.

## How it works

```
Your repo
  ├── Route analysis      (Next.js App Router / Pages Router)
  ├── Component analysis  (forms, buttons, links, auth guards)
  └── API detection
        │
        ▼
  Journey synthesis (Claude Opus)
  "What should be tested in this app?"
        │
        ▼
  Test generation (Claude Sonnet)
  Playwright .spec.ts files + fixtures + config
```

## Quickstart

```bash
# Install
npm install -g retrospec

# Set your Anthropic API key
export ANTHROPIC_API_KEY=your_key_here

# Run against your Next.js repo
retrospec --repo ./my-app --output ./tests/e2e
```

## Options

```
Options:
  -r, --repo <path>         Path to the repository root (default: ".")
  -o, --output <path>       Output directory for generated tests (default: "./retrospec-tests")
  -j, --journey <string>    Natural language description of a specific journey
  -u, --base-url <url>      Base URL of the running app (default: "http://localhost:3000")
  -v, --verbose             Verbose output
```

## Examples

```bash
# Auto-discover and generate all journeys
retrospec --repo .

# Generate a test for a specific journey
retrospec --repo . --journey "user signs up with email and verifies their account"

# Point at a specific dev server
retrospec --repo . --base-url http://localhost:4000
```

## Output

```
retrospec-tests/
├── user-login.spec.ts
├── user-signup.spec.ts
├── checkout-flow.spec.ts
├── fixtures/
│   └── auth.ts
└── RETROSPEC.md
```

Plus a `playwright.config.ts` in your repo root if one doesn't exist.

## Supported frameworks

- Next.js (App Router + Pages Router)
- More coming: Vue/Nuxt, Angular, React Router

## Requirements

- Node.js 18+
- An Anthropic API key (`ANTHROPIC_API_KEY`)

## License

MIT
