import { NextResponse } from 'next/server';
import { getProject, getSession, listProjects } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Connectez-vous pour voir vos projets.' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (id) {
    const project = await getProject(session, id);
    if (!project) return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 });
    return NextResponse.json({ project }, { headers: { 'cache-control': 'no-store' } });
  }

  const projects = await listProjects(session);
  return NextResponse.json({ projects }, { headers: { 'cache-control': 'no-store' } });
}
