This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Running Tests

The project uses [Vitest](https://vitest.dev) for the automated test layer (unit + API-route integration tests; no e2e suite).

```bash
npm test          # run the suite once
npm run test:watch  # watch mode
```

The suite covers the pure calculation/formatting helpers (`src/lib/__tests__/*`) and the public report-verification endpoint (`src/app/api/reports/verify/route.test.ts`, which mocks `node-appwrite`). Appwrite env vars are not required — `vitest.setup.ts` provides safe test defaults.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Security notes

Manual, deploy-time operational steps that cannot be automated — do these once
per production site before/after the first deploy:

1. **Rotate `APPWRITE_API_KEY`.** Any key that was ever committed, exposed in a
   build log, or shared must be revoked in the Appwrite Console and replaced
   with a fresh one in the host's env config. The admin/API key is what grants
   the server its god-permissions, so treat a leaked key as a full breach.
2. **Lock down remaining collection permissions.** After this app's API routes
   are live in production, run:
   ```bash
   node scripts/lock-down-remaining-permissions.cjs
   ```
   It removes client-side `create/update/delete` permissions on the 16 remaining
   collections and `REPORTS_BUCKET_ID` (the first six collections and the reports
   `read` bucket scope are handled by the app's own route-level guards). Client
   code then reaches Appwrite data exclusively through the API routes, so
   `client-side Permission.literal(...)` writes no longer hold.
3. **Create a unique index for report numbers.** To guarantee `reportNumber`
   uniqueness at the database level (the API retries on 409 today; the index
   makes collisions impossible), create a unique index on the `reports`
   collection's `reportNumber` attribute in the Appwrite Console. Existing
   duplicate numbers must be fixed first or index creation will fail.

Report PDFs embed an auto-generated integrity hash (`SHA-256` of the snapshot +
report number + review timestamp, shown as a QR/footnote). The `verify` API
recomputes that hash against the stored `snapshotData` — a tampered report comes
back as `{ verified: false, tampered: true }` and the PDF "proof" fails closed
(403/429 in API calls).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
