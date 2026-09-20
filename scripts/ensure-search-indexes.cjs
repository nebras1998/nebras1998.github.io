// scripts/ensure-search-indexes.cjs
//
// يتحقق من فهارس البحث النصي (Fulltext) المطلوبة لعمليات Query.search في
// التطبيق ويضيف أي فهرس مفقود. بدونه يُخطئ البحث برسائل مثل:
//   Searching by attribute "testName" requires a fulltext index.
//
// التشغيل من جذر المشروع:
//   node scripts/ensure-search-indexes.cjs
//
// REQUIRED scopes على APPWRITE_API_KEY (من .env):
//   databases.read, databases.collections.read, databases.collections.write
//
// الفهارس المفقودة تُضاف فقط ولا يُمسّ أي فهرس موجود.

const fs = require('fs');
const path = require('path');
const { Client, Databases, DatabasesIndexType } = require('node-appwrite');

const DATABASE_ID = '6a1e9791001785f6dc65';

// كل (مجموعة, سمة) يستخدمها التطبيق في Query.search — يجب أن تملك فهرس
// Fulltext على السمة، وإلا يفشل البحث.
const REQUIRED_FULLTEXT = [
  { collectionId: 'tests', attribute: 'testName' },
  { collectionId: 'sampletypes', attribute: 'name' },
  { collectionId: 'standardtests', attribute: 'name' },
  { collectionId: 'bookings', attribute: 'clientName' },
  { collectionId: 'clients', attribute: 'name' },
  { collectionId: 'samples', attribute: 'sampleNumber' },
  { collectionId: 'invoices', attribute: 'invoiceNumber' },
  { collectionId: 'projects', attribute: 'name' },
  { collectionId: 'reports', attribute: 'reportNumber' },
];

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

(async () => {
  const { endpoint, project, key } = loadEnv();
  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
  const db = new Databases(client);

  let created = 0;
  let already = 0;
  let failed = 0;

  for (const { collectionId, attribute } of REQUIRED_FULLTEXT) {
    const indexId = `${attribute}_fulltext`;
    try {
      const collection = await db.getCollection(DATABASE_ID, collectionId);
      const exists = (collection.indexes || []).some(
        (idx) =>
          idx.type === 'fulltext' &&
          (idx.attributes || []).includes(attribute)
      );
      if (exists) {
        console.log(`  ${collectionId}.${attribute}: فهرس موجود - تخطي`);
        already += 1;
        continue;
      }

      await db.createIndex(
        DATABASE_ID,
        collectionId,
        indexId,
        DatabasesIndexType.Fulltext,
        [attribute],
        ['ASC']
      );
      console.log(`  ${collectionId}.${attribute}: فهرس Fulltext أُنشئ (${indexId})`);
      created += 1;
      await sleep(400);
    } catch (e) {
      // "already exists" (409) قد يحدث إذا أُنشئ الفهرس كذاك:
      if (e.code === 409 || (e.type && e.type.includes('already_exists'))) {
        console.log(`  ${collectionId}.${attribute}: موجود بالفعل (409) - تخطي`);
        already += 1;
        continue;
      }
      console.error(`  ${collectionId}.${attribute}: فشل — ${e.message}`);
      failed += 1;
    }
  }

  console.log(
    `\nالنتيجة: أنشئت ${created}، موجودة سلفاً ${already}، فشل ${failed}.`
  );
  if (failed > 0) {
    console.error(
      'تأكد أن مفتاح API يحمل صلاحيات databases.collections.write، ثم أعد التشغيل.'
    );
    process.exitCode = 1;
  }
})().catch((e) => {
  console.error('\nفشل التشغيل:', e.message);
  process.exitCode = 1;
});