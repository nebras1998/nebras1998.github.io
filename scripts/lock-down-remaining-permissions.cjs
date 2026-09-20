// scripts/lock-down-remaining-permissions.cjs
//
// Locks down the remaining LabSystem collections so the browser Web SDK can no
// longer write (create/update/delete) to them using the "users" role. Read
// stays open to all authenticated users (`read("users")` only), exactly like the
// employees/reports/invoices/payments/expenses lockdown script.
//
// Collections locked here (all => read("users") only, writes through Next.js
// server routes that use node-appwrite + APPWRITE_API_KEY):
//   - clients, projects, samples, tests, equipment, services
//   - attendance, leaverequests, overtime
//   - vehicles, vehicletrips, notifications
//   - sampletypes, standardtests, bookings, reporttemplates
//
// The REPORTS_BUCKET_ID storage bucket is locked the same way: reads stay open
// to "users", writes (logo upload, report PDFs, test-result file uploads) go
// exclusively through the server routes (/api/files,
// /api/settings/report-template/logo, /api/reports/[id]/pdf).
//
// Run from the project root:
//   node scripts/lock-down-remaining-permissions.cjs
//
// REQUIRED scopes on APPWRITE_API_KEY:
//   databases.read, databases.write, databases.collections.write
//   storage.read, storage.write
//
// WARNING: Only run this AFTER every server route above is deployed and every
// page has been confirmed to work against it. Direct browser writes to these
// collections will start being rejected the moment this script runs.

const fs = require('fs');
const path = require('path');
const { Client, Databases, Storage } = require('node-appwrite');

const DATABASE_ID = '6a1e9791001785f6dc65';
const REPORTS_BUCKET_ID = '6a1fe409000799f85da1';

// Collection id -> { name, documentSecurity }
const LOCKDOWN_TARGETS = [
  { id: 'clients', name: 'clients', documentSecurity: false },
  { id: 'projects', name: 'projects', documentSecurity: false },
  { id: 'samples', name: 'samples', documentSecurity: false },
  { id: 'tests', name: 'tests', documentSecurity: false },
  { id: 'equipment', name: 'equipment', documentSecurity: false },
  { id: 'services', name: 'services', documentSecurity: false },
  { id: 'attendance', name: 'attendance', documentSecurity: false },
  { id: 'leaverequests', name: 'leaverequests', documentSecurity: false },
  { id: 'overtime', name: 'overtime', documentSecurity: false },
  { id: 'vehicles', name: 'vehicles', documentSecurity: false },
  { id: 'vehicletrips', name: 'vehicletrips', documentSecurity: false },
  { id: 'notifications', name: 'notifications', documentSecurity: false },
  { id: 'sampletypes', name: 'sampletypes', documentSecurity: false },
  { id: 'standardtests', name: 'standardtests', documentSecurity: false },
  { id: 'bookings', name: 'bookings', documentSecurity: false },
  { id: 'reporttemplates', name: 'reporttemplates', documentSecurity: false },
];

// Storage bucket id -> { name }
const STORAGE_TARGETS = [{ id: REPORTS_BUCKET_ID, name: 'reports' }];

// After lockdown these collections/bucket are read("users") only — no
// create/update/delete for the browser "users" role. Server routes
// (node-appwrite + APPWRITE_API_KEY) bypass role permissions, so they remain
// the sole writers.
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
  const storage = new Storage(client);

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

  for (const target of STORAGE_TARGETS) {
    try {
      const before = await storage.getBucket(target.id);
      console.log(`\n[bucket:${target.id}]`);
      console.log('  before:', JSON.stringify(before.permissions));

      await storage.updateBucket(target.id, target.name, READ_ONLY_PERMISSIONS, false, true);
      console.log('  lock-down OK (read("users") only)');

      const after = await storage.getBucket(target.id);
      console.log('  after :', JSON.stringify(after.permissions));
    } catch (e) {
      console.error(`\n[bucket:${target.id}] FAILED:`, e.message);
      if (e.message && e.message.toLowerCase().includes('permission')) {
        console.error(
          '  The APPWRITE_API_KEY needs storage.write scope, e.g.:\n' +
            '  storage.read, storage.write, buckets.read, buckets.write'
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