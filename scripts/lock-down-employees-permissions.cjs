// scripts/lock-down-employees-permissions.cjs
//
// Locks down sensitive Appwrite collections so that the browser Web SDK can no
// longer write (create/update/delete) to them using the "users" role:
//   - employees : documentSecurity=true, read("users") only
//   - reports   : read("users") only
//   - invoices  : read("users") only
//   - payments  : read("users") only
//   - expenses  : read("users") only
//
// All writes for those collections now happen exclusively through Next.js server
// routes that use node-appwrite with APPWRITE_API_KEY (API keys are not subject
// to the "users" role permissions, so server writes keep working).
//
// Run from the project root:
//   node scripts/lock-down-employees-permissions.cjs
//
// REQUIRED scopes on APPWRITE_API_KEY:
//   databases.read, databases.write
//   (databases.collections.write is needed to call updateCollection)

const fs = require('fs');
const path = require('path');
const { Client, Databases } = require('node-appwrite');

const DATABASE_ID = '6a1e9791001785f6dc65';

// Collection id -> { name, documentSecurity }
const LOCKDOWN_TARGETS = [
  { id: 'employees', name: 'employees', documentSecurity: true },
  { id: 'reports', name: 'reports', documentSecurity: false },
  { id: 'invoices', name: 'invoices', documentSecurity: false },
  { id: 'payments', name: 'payments', documentSecurity: false },
  { id: 'expenses', name: 'expenses', documentSecurity: false },
];

// After lockdown these collections are read("users") only — no create/update/delete
// for the browser "users" role. Server routes (node-appwrite + APPWRITE_API_KEY)
// bypass role permissions, so they remain the sole writers.
const READ_ONLY_PERMISSIONS = ['read("users")'];

function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/);
  const get = (key) => {
    const line = raw.find((x) => x.trim().startsWith(key));
    if (!line) return null;
    return line.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
  };
  const endpoint = get('NEXT_PUBLIC_APPWRITE_ENDPOINT');
  const project = get('NEXT_PUBLIC_APPWRITE_PROJECT_ID');
  const key = get('APPWRITE_API_KEY');
  if (!endpoint || !project || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_APPWRITE_ENDPOINT / NEXT_PUBLIC_APPWRITE_PROJECT_ID / APPWRITE_API_KEY in .env'
    );
  }
  return { endpoint, project, key };
}

(async () => {
  const { endpoint, project, key } = loadEnv();
  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
  const db = new Databases(client);

  console.log('Locking down collections in database', DATABASE_ID);
  console.log('New permissions:', JSON.stringify(READ_ONLY_PERMISSIONS));

  for (const target of LOCKDOWN_TARGETS) {
    try {
      const before = await db.getCollection(DATABASE_ID, target.id);
      console.log(`\n[${target.id}]`);
      console.log('  before:', JSON.stringify(before.permissions), `documentSecurity=${before.documentSecurity}`);

      await db.updateCollection(
        DATABASE_ID,
        target.id,
        target.name,
        READ_ONLY_PERMISSIONS,
        target.documentSecurity,
        true
      );
      console.log('  lock-down OK (read("users") only, documentSecurity=' + target.documentSecurity + ')');

      const after = await db.getCollection(DATABASE_ID, target.id);
      console.log('  after :', JSON.stringify(after.permissions), `documentSecurity=${after.documentSecurity}`);
    } catch (e) {
      console.error(`\n[${target.id}] FAILED:`, e.message);
      if (e.message && e.message.includes('collection') && e.message.toLowerCase().includes('permission')) {
        console.error(
          '  The APPWRITE_API_KEY needs databases.collections.write scope, e.g.:\n' +
            '  databases.read, databases.write, databases.collections.read, databases.collections.write'
        );
      }
      process.exitCode = 1;
    }
  }

  console.log('\nDone.');
})().catch((e) => {
  console.error('\nLock-down failed:', e.message);
  process.exitCode = 1;
});