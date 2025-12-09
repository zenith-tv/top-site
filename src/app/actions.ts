
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addSong, addVote, getThisWeeksTuesdayKey } from '@/lib/data';
import { cookies, headers } from 'next/headers';
import { FirebaseError } from 'firebase/app';


const songSchema = z.object({
  title: z.string().min(1, 'le titre est requis'),
  artist: z.string().min(1, 'l\'artiste est requis'),
  honeypot: z.string().optional(),
});

export type FormState = {
  message: string;
  errors?: {
    title?: string[];
    artist?: string[];
    general?: string[];
  };
};

const forbiddenWords = ['caca', 'pipi', 'zizi', 'merde', 'con', 'putain', 'bite', 'chatte', 'djfrites'];

function containsForbiddenWords(text: string): boolean {
    // Remove all non-alphabetic characters and convert to lowercase
    const sanitizedText = text.replace(/[^a-zA-Z]/g, '').toLowerCase();
    return forbiddenWords.some(word => sanitizedText.includes(word));
}

export async function submitSongAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = songSchema.safeParse({
    title: formData.get('title'),
    artist: formData.get('artist'),
    honeypot: formData.get('honeypot'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'erreur de validation',
    };
  }
  
  const { title, artist, honeypot } = validatedFields.data;

  // Honeypot check
  if (honeypot) {
    // Silently fail for bots
    return { message: 'chanson ajoutée avec succès!' };
  }

  // Profanity check
  if (containsForbiddenWords(title) || containsForbiddenWords(artist)) {
      return {
          message: 'le nom de l\'artiste ou le titre contient des termes inappropriés.',
      };
  }
  
  try {
    await addSong({ title, artist });
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

export type VoteState = {
    error?: string;
    songId?: string;
    success?: boolean;
};

export async function voteAction(prevState: VoteState | undefined, formData: FormData): Promise<VoteState> {
  const songId = formData.get('songId') as string;
  const honeypot = formData.get('honeypot') as string;

  // Honeypot check
  if (honeypot) {
    revalidatePath('/');
    return {};
  }

  if (!songId) {
    return { error: 'ID de chanson invalide' };
  }
  
  const headersList = await headers();
  const ipHeader = headersList.get('x-forwarded-for');
  const ip = ipHeader?.split(',')[0].trim() || '127.0.0.1';

  const weekKey = getThisWeeksTuesdayKey();
  const cookieStore = cookies();
  const voteCookieName = `votes_${weekKey}`;
  const voteCookie = cookieStore.get(voteCookieName)?.value ?? '';
  const votedSongs = new Set(voteCookie.split(',').filter(Boolean));

  if (votedSongs.has(songId)) {
    return { error: 'tu as déjà voté pour cette chanson!', songId };
  }

  // Anti-VPN Check - DISABLED
  // const apiKey = process.env.IPQUALITYSCORE_API_KEY;
  // if (apiKey) {
  //   try {
  //     const response = await fetch(`https://ipqualityscore.com/api/json/ip/${apiKey}/${ip}`);
  //     if (!response.ok) {
  //       console.warn('Avertissement: La vérification anti-VPN a échoué. Le vote est autorisé.', response.statusText);
  //     } else {
  //       const data = await response.json();
  //       if (data.vpn || data.proxy || data.tor) {
  //         return { error: 'Les votes via VPN ou proxy ne sont pas autorisés.', songId };
  //       }
  //     }
  //   } catch (e) {
  //     console.error('Erreur lors de la vérification anti-VPN:', e);
  //     // En cas d'échec de l'API, on autorise le vote pour ne pas bloquer les utilisateurs légitimes.
  //   }
  // } else {
  //   console.warn('Avertissement: Clé API IPQualityScore non configurée. La vérification anti-VPN est désactivée.');
  // }

  try {
    await addVote(songId, ip);
    votedSongs.add(songId);
    cookieStore.set({
      name: voteCookieName,
      value: Array.from(votedSongs).join(','),
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
      path: '/',
    });
    revalidatePath('/');
    return { success: true, songId };
  } catch (error) {
    console.error('Erreur dans voteAction:', error);
    if (error instanceof Error) {
        return { error: error.message, songId };
    }
    return { error: 'une erreur inconnue est survenue', songId };
  }
}
