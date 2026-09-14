// scripts/lock-down-reports-permissions.cjs
//
// Companion to lock-down-employees-permissions.cjs focused on the `reports`
// collection. Read ("users") stays open so dashboards can list approved reports,
// but create/update/delete are stripped from the browser "users" role. All
// writes (draft creation, draft editing, final approval) must now go through
// Next.js server routes backed by node-appwrite + APPWRITE_API_KEY.
//
// Run from the project root:
//   node scripts/lock-down-reports-permissions.cjs

const fs = require('fs');
const path = require('path');
const { Client, Databases } = require('node-appwrite');

const DATABASE_ID = '6a1e9791001785f6dc65';
const COLLECTION_ID = 'reports';
const COLLECTION_NAME = 'reports';
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

  console.log('Locking down reports collection in database', DATABASE_ID);

  try {
    const before = await db.getCollection(DATABASE_ID, COLLECTION_ID);
    console.log('  before:', JSON.stringify(before.permissions), `documentSecurity=${before.documentSecurity}`);

    await db.updateCollection(
      DATABASE_ID,
      COLLECTION_ID,
      COLLECTION_NAME,
      READ_ONLY_PERMISSIONS,
      false,
      true
    );
    console.log('  lock-down OK: read("users") only — no create/update/delete for browser users');

    const after = await db.getCollection(DATABASE_ID, COLLECTION_ID);
    console.log('  after :', JSON.stringify(after.permissions), `documentSecurity=${after.documentSecurity}`);
  } catch (e) {
    console.error('  FAILED:', e.message);
    console.error(
      '  The APPWRITE_API_KEY needs databases.collections.write scope, e.g.:\n' +
        '  databases.read, databases.write, databases.collections.read, databases.collections.write'
    );
    process.exitCode = 1;
  }

  console.log('Done.');
})().catch((e) => {
  console.error('\nLock-down failed:', e.message);
  process.exitCode = 1;
});