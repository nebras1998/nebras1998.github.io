import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'appwrite';
import { DATABASE_ID, SAMPLES_COLLECTION_ID, PROJECTS_COLLECTION_ID, CLIENTS_COLLECTION_ID } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const results: string[] = [];
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;

  const client = new Client().setEndpoint(endpoint).setProject(projectId);

  const sessionCookie = request.cookies.get(`a_session_${projectId}`);
  if (sessionCookie?.value) {
    client.setCookie(`a_session_${projectId}=${sessionCookie.value}`);
  }

  const databases = new Databases(client);

  try {
    const allSamples = await databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [Query.limit(5000)]);
    const total = allSamples.total;
    results.push(`Found ${total} sample(s).`);

    for (const sample of allSamples.documents) {
      if (sample.projectName && sample.clientName) {
        results.push(`Skipping ${sample.sampleNumber}: projectName/clientName already set.`);
        continue;
      }

      if (!sample.projectId) {
        results.push(`Skipping ${sample.sampleNumber}: no projectId.`);
        continue;
      }

      let projectName = sample.projectName || '';
      let clientName = sample.clientName || '';

      if (!projectName) {
        try {
          const project = await databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, sample.projectId);
          projectName = project.name || '';
        } catch {
          results.push(`Warning: could not fetch project ${sample.projectId} for sample ${sample.sampleNumber}.`);
        }
      }

      if (sample.clientId && !clientName) {
        try {
          const clientDoc = await databases.getDocument(DATABASE_ID, CLIENTS_COLLECTION_ID, sample.clientId);
          clientName = clientDoc.name || '';
        } catch {
          results.push(`Warning: could not fetch client ${sample.clientId} for sample ${sample.sampleNumber}.`);
        }
      }

      try {
        await databases.updateDocument(DATABASE_ID, SAMPLES_COLLECTION_ID, sample.$id, {
          projectName,
          clientName,
        });
        results.push(`Updated ${sample.sampleNumber}: projectName="${projectName}", clientName="${clientName}".`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push(`Error updating ${sample.sampleNumber}: ${msg}`);
      }
    }

    results.push('Migration complete.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg, log: results }, { status: 500 });
  }

  return NextResponse.json({ success: true, log: results });
}
