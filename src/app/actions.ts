
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addSong, addVote, deleteSong } from '@/lib/data';
import { headers } from 'next/headers';
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
  };
};

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

  // Honeypot check
  if (validatedFields.data.honeypot) {
    // Silently fail for bots
    return { message: 'chanson ajoutée avec succès!' };
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

export type VoteState = {
    error?: string;
    songId?: string;
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
  
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for') || '127.0.0.1';

  // Anti-VPN Check
  const apiKey = process.env.IPQUALITYSCORE_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(`https://ipqualityscore.com/api/json/ip/${apiKey}/${ip}`);
      if (!response.ok) {
        console.warn('Avertissement: La vérification anti-VPN a échoué. Le vote est autorisé.', response.statusText);
      } else {
        const data = await response.json();
        if (data.vpn || data.proxy || data.tor) {
          return { error: 'Les votes via VPN ou proxy ne sont pas autorisés.', songId };
        }
      }
    } catch (e) {
      console.error('Erreur lors de la vérification anti-VPN:', e);
      // En cas d'échec de l'API, on autorise le vote pour ne pas bloquer les utilisateurs légitimes.
    }
  } else {
    console.warn('Avertissement: Clé API IPQualityScore non configurée. La vérification anti-VPN est désactivée.');
  }

  try {
    await addVote(songId, ip);
    revalidatePath('/');
    return {};
  } catch (error) {
    console.error('Erreur dans voteAction:', error);
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
    }
}
