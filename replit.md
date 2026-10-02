# FixMate

FixMate turns a description of a broken household item into a cautious AI-assisted diagnosis, UK cost estimate, and clear next steps.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Marketplace moderation uses `FIXMATE_ADMIN_USER_IDS` as a comma-separated Clerk user ID allow-list; admins can review and resolve reports from the Marketplace page.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/fixmate` — mobile-first React app and FixMate visual system
- `artifacts/api-server/src/routes/diagnoses.ts` — AI diagnosis endpoint and safety prompt
- `lib/api-spec/openapi.yaml` — diagnosis request and response contract
- `lib/integrations-openai-ai-server` — managed OpenAI client

## Architecture decisions

- The first release validates diagnosis demand before adding repairer accounts, booking, or payments.
- AI output is constrained to structured data and validated before it reaches the UI.
- High-risk gas, electrical, fire, flood, and pressurised-system cases must direct users to a professional.
- Clerk provides user authentication; the landing page stays public while diagnosis requests require a signed-in session.

## Product

Visitors can explore the public FixMate landing page and create or sign into a branded account. Signed-in users select a household item, describe the symptoms, optionally attach media, and receive a likely fault, confidence, UK repair and parts estimates, difficulty, safety guidance, and next steps.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
