import { NextResponse } from 'next/server';
import { generateSite } from '@/lib/generator';
import { consumeCredit, getProject, getSession, refundCredit, saveProject } from '@/lib/session';
import type { ProjectKind } from '@/lib/types';
import type { Storyboard } from '@/lib/video';
import { generateVideo } from '@/lib/video';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return fail('Connectez-vous pour générer un projet.', 401);

  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    projectId?: string | null;
    kind?: string;
  };
  const prompt = (body.prompt ?? '').trim();
  const kind: ProjectKind = body.kind === 'video' ? 'video' : 'site';
  if (prompt.length < 5) return fail('Décrivez votre idée en quelques mots (5 caractères minimum).', 400);
  if (prompt.length > 4000) return fail('Votre description est trop longue (4000 caractères maximum).', 400);

  const projectId = body.projectId || null;
  const previous = projectId ? await getProject(session, projectId) : null;
  if (projectId && !previous) return fail('Projet introuvable.', 404);
  if (previous && previous.kind !== kind) {
    return fail(
      kind === 'video'
        ? 'Ce projet est un site. Basculez sur l’atelier Site pour le modifier.'
        : 'Ce projet est une vidéo. Basculez sur l’atelier Vidéo pour la modifier.',
      400,
    );
  }

  // Débit atomique AVANT l'appel à l'IA : deux requêtes concurrentes ne peuvent
  // pas dépenser le même crédit (RPC SQL / section critique du store démo).
  const debited = await consumeCredit(session);
  if (!debited) {
    return fail('Vous n’avez plus de crédits. Rechargez votre solde pour continuer.', 402);
  }

  try {
    let result: { html: string; title: string; summary: string; engine: string };
    let storyboard: Storyboard | null = null;

    if (kind === 'video') {
      const video = await generateVideo({
        prompt,
        previousStoryboard: previous?.storyboard ?? null,
      });
      storyboard = video.storyboard;
      result = video;
    } else {
      result = await generateSite({
        prompt,
        previousHtml: previous?.html ?? null,
        mode: previous?.html ? 'edit' : 'create',
      });
    }

    const project = await saveProject(session, {
      projectId,
      title: result.title,
      prompt,
      html: result.html,
      engine: result.engine,
      kind,
      storyboard,
    });
    if (!project) throw new Error("Impossible d'enregistrer le projet.");

    const fresh = await getSession();
    return NextResponse.json({
      project,
      storyboard,
      summary: result.summary,
      engine: result.engine,
      credits: fresh?.credits ?? Math.max(0, session.credits - 1),
    });
  } catch (error) {
    // Échec de l'IA ou de l'enregistrement : le crédit est remboursé.
    await refundCredit(session);
    const message = error instanceof Error ? error.message : 'Erreur inconnue pendant la génération.';
    console.error('[generate] échec, crédit remboursé :', message);
    return fail(`La génération a échoué, votre crédit a été remboursé. Détail : ${message}`, 502);
  }
}
