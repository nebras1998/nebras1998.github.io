// scripts/setup-reports-collections.cjs
//
// Creates the missing Appwrite collections for the reporting system:
//   - reporttemplates  (lab report template / header settings, singleton-style)
//   - reports          (draft -> approved report lifecycle)
//
// Run from the project root (so it can resolve node-appwrite):
//   node scripts/setup-reports-collections.cjs
//
// REQUIRED: APPWRITE_API_KEY in .env must have collections.* scopes, e.g.:
//   databases.read, databases.write, databases.collections.read, databases.collections.write
// plus the document scopes already in use (databases.documents.*, storage.*).
// The current key only has document scopes and will be rejected with a clear message.

const fs = require('fs');
const path = require('path');
const { Client, Databases, DatabasesIndexType } = require('node-appwrite');

const DATABASE_ID = '6a1e9791001785f6dc65';

// Collection-level security identical to the app's existing collections
// (e.g. tests): any signed-in user may create/read/update/delete document rows.
const COLLECTION_PERMISSIONS = ['create("any")', 'read("any")', 'update("any")', 'delete("any")'];

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function collectionExists(db, id) {
  try {
    await db.getCollection(DATABASE_ID, id);
    return true;
  } catch (e) {
    if (e.code === 404 || (e.type && e.type.includes('not_found'))) return false;
    throw e;
  }
}

// Add a string attribute if it does not already exist. Appwrite rejects
// duplicate attributes, so we ignore "attribute_already_exists" (409).
async function ensureStringAttribute(db, col, key, size, required, xdefault) {
  try {
    await db.createStringAttribute(DATABASE_ID, col, key, size, required, xdefault);
    console.log(`  attr ${key} (string): created`);
  } catch (e) {
    if (e.code === 409 || (e.type && e.type.includes('already_exists'))) {
      console.log(`  attr ${key} (string): already exists`);
    } else {
      throw e;
    }
  }
  await sleep(300);
}

async function ensureBooleanAttribute(db, col, key, required, xdefault) {
  try {
    await db.createBooleanAttribute(DATABASE_ID, col, key, required, xdefault);
    console.log(`  attr ${key} (boolean): created`);
  } catch (e) {
    if (e.code === 409 || (e.type && e.type.includes('already_exists'))) {
      console.log(`  attr ${key} (boolean): already exists`);
    } else {
      throw e;
    }
  }
  await sleep(300);
}

async function ensureIndex(db, col, key, type, attributes, orders) {
  try {
    await db.createIndex(DATABASE_ID, col, key, type, attributes, orders);
    console.log(`  index ${key} (${type}): created`);
  } catch (e) {
    if (e.code === 409 || (e.type && e.type.includes('already_exists'))) {
      console.log(`  index ${key} (${type}): already exists`);
    } else {
      throw e;
    }
  }
  await sleep(300);
}

async function createTemplateCollection(db) {
  const COL = 'reporttemplates';
  console.log(`\n[reporttemplates]`);
  if (await collectionExists(db, COL)) {
    console.log('  collection already exists - skipping');
    return;
  }
  await db.createCollection(DATABASE_ID, COL, COL, COLLECTION_PERMISSIONS, false);
  console.log('  collection created (collection-level security, matching existing collections)');
  await sleep(500);

  const attrs = [
    ['labName', 200],
    ['labNameEn', 200],
    ['logoFileId', 200],
    ['addressLine', 300],
    ['phone', 100],
    ['email', 200],
    ['accreditationText', 500],
    ['footerText', 500],
    ['signatureLabel', 200],
    ['primaryColor', 50],
  ];
  for (const [field, size] of attrs) {
    await ensureStringAttribute(db, COL, field, size, false);
  }
  await ensureBooleanAttribute(db, COL, 'showQrCode', false, false);
}

async function createReportsCollection(db) {
  const COL = 'reports';
  console.log(`\n[reports]`);
  if (await collectionExists(db, COL)) {
    console.log('  collection already exists - skipping');
    return;
  }
  await db.createCollection(DATABASE_ID, COL, COL, COLLECTION_PERMISSIONS, false);
  console.log('  collection created (collection-level security, matching existing collections)');
  await sleep(500);

  const attrs = [
    ['testId', 200],
    ['reportNumber', 200],
    ['status', 100],
    ['snapshotData', 20000], // JSON snapshot of the report data
    ['additionalNotes', 5000],
    ['reviewedBy', 200],
    ['reviewedAt', 100],
    ['reportHash', 200],
    ['pdfFileId', 200],
  ];
  for (const [field, size] of attrs) {
    await ensureStringAttribute(db, COL, field, size, false);
  }

  // Indexes for the queries used by the app:
  await ensureIndex(db, COL, 'testId', DatabasesIndexType.Key, ['testId']);
  await ensureIndex(db, COL, 'reportNumber', DatabasesIndexType.Key, ['reportNumber']);
  await ensureIndex(db, COL, 'reportNumber_fulltext', DatabasesIndexType.Fulltext, ['reportNumber']);
  await ensureIndex(db, COL, 'status', DatabasesIndexType.Key, ['status']);
  // Default sort by creation time (matches the other list pages, e.g. samples).
  await ensureIndex(db, COL, 'createdAt_sort', DatabasesIndexType.Key, ['$createdAt']);
}

(async () => {
  const { endpoint, project, key } = loadEnv();
  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
  const db = new Databases(client);

  console.log('Creating reporting-system collections in database', DATABASE_ID);

  // Capability probe: we only need to CREATE collections. The key does not
  // need collection-delete permission. A key without collections.write returns
  // a misleading "Database not found" from Appwrite for createCollection, so we
  // treat a successful create as sufficient and never fail on the cleanup.
  const TEMP_PROBE = 'zz_probe_collections_write';
  try {
    await db.createCollection(DATABASE_ID, TEMP_PROBE, TEMP_PROBE, [], false);
    console.log('  key has collections.write - ok');
  } catch (e) {
    // A 409 (already exists) also proves create permission from a prior probe run.
    if (e.code !== 409 && !(e.type && e.type.includes('already_exists'))) {
      console.error(
        '\nThe APPWRITE_API_KEY cannot create collections. Update .env APPWRITE_API_KEY to a key\n' +
          'that includes the "collections.write" (and "collections.read") scopes, e.g.:\n' +
          '  databases.read, databases.write, databases.collections.read, databases.collections.write\n' +
          'Error:',
        e.message
      );
      process.exitCode = 1;
      return;
    }
    console.log('  key has collections.write - ok (probe collection already present)');
  }

  await createTemplateCollection(db);
  await createReportsCollection(db);

  console.log('\nDone. The reporting system collections are ready.');
  process.exitCode = 0;
})().catch((e) => {
  console.error('\nSetup failed:', e.message);
  process.exitCode = 1;
});
