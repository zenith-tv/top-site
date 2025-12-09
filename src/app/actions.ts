
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addSong, addVote, deleteSong, getThisWeeksTuesdayKey } from '@/lib/data';
import { cookies, headers } from 'next/headers';
import { FirebaseError } from 'firebase/app';
import { createHash } from 'crypto';


const songSchema = z.object({
  title: z.string().min(1, 'le titre est requis'),
  artist: z.string().min(1, 'l\'artiste est requis'),
});

export type FormState = {
  message: string;
  errors?: {
    title?: string[];
    artist?: string[];
  };
};

export async function submitSongAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = songSchema.safeParse({
    title: formData.get('title'),
    artist: formData.get('artist'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'erreur de validation',
    };
  }
  
  try {
    await addSong(validatedFields.data);
    revalidatePath('/');
    return { message: 'chanson ajoutée avec succès!' };
  } catch (error) {
    console.error('Erreur dans submitSongAction:', error);
    if (error instanceof Error) {
        return { message: error.message };
    }
    return { message: 'erreur serveur lors de l\'ajout de la chanson' };
  }
}

const voteSchema = z.object({
  songId: z.string().regex(/^[A-Za-z0-9_-]{10,}$/u, 'ID de chanson invalide'),
});

const voteIdPattern = /^[A-Za-z0-9_-]{10,}$/u;

function getClientIp(headersList: Headers): string {
  const forwarded = headersList.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = headersList.get('x-real-ip')?.trim();
  const candidate = forwarded || realIp;

  if (candidate && /^[0-9a-fA-F:.,]+$/.test(candidate)) {
    return candidate;
  }

  return 'unknown';
}

function buildVoterFingerprint(headersList: Headers): string {
  const ip = getClientIp(headersList);
  const userAgent = headersList.get('user-agent') ?? 'unknown';

  return createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');
}

export type VoteState = {
    error?: string;
    songId?: string;
    success?: boolean;
};

export async function voteAction(prevState: VoteState | undefined, formData: FormData): Promise<VoteState> {
  const validated = voteSchema.safeParse({ songId: formData.get('songId') });

  if (!validated.success) {
    return { error: validated.error.errors[0]?.message ?? 'ID de chanson invalide' };
  }

  const songId = validated.data.songId;
  const headersList = headers();
  const fingerprint = buildVoterFingerprint(headersList);

  const weekKey = getThisWeeksTuesdayKey();
  const cookieStore = cookies();
  const voteCookieName = `votes_${weekKey}`;
  const voteCookie = cookieStore.get(voteCookieName)?.value ?? '';
  const votedSongs = new Set(
    voteCookie
      .split(',')
      .filter(Boolean)
      .filter((id) => voteIdPattern.test(id))
  );

  if (votedSongs.has(songId)) {
    return { error: 'tu as déjà voté pour cette chanson!', songId };
  }

  try {
    await addVote(songId, fingerprint);
    votedSongs.add(songId);
    cookieStore.set({
      name: voteCookieName,
      value: Array.from(votedSongs).join(','),
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    });
    revalidatePath('/');
    return { success: true, songId };
  } catch (error) {
    console.error('Erreur dans voteAction:', error);
    if (error instanceof FirebaseError) {
        if (error.code === 'permission-denied') {
            return { error: 'Erreur de permission. Vérifiez les règles de sécurité Firestore.', songId };
        }
    }
    if (error instanceof Error) {
        return { error: error.message, songId };
    }
    return { error: 'une erreur inconnue est survenue', songId };
  }
}

export async function deleteSongAction(formData: FormData) {
    const songId = formData.get('songId') as string;
    if (!songId) {
        console.error('deleteSongAction: ID de chanson manquant');
        return;
    }
    try {
        await deleteSong(songId);
        revalidatePath('/');
    } catch (error) {
        console.error('Erreur dans deleteSongAction:', error);
        // On ne retourne pas d'erreur à l'utilisateur pour l'instant
    }
}
