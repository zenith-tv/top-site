
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addSong, addVote, getThisWeeksTuesdayKey, recordProfanityAttempt, getProfanityAttempts } from '@/lib/data';
import { cookies, headers } from 'next/headers';
import { FirebaseError } from 'firebase/app';
import { moderateSong } from '@/ai/flows/song-moderation-flow';


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

const forbiddenWords = ['caca', 'pipi', 'zizi', 'merde', 'con', 'putain', 'bite', 'chatte', 'djfrites', 'renelataupe'];

const homoglyphMap: { [key: string]: string } = {
    'ⅰ': 'i', 'Ⅰ': 'i', '1': 'l', 'l': 'l', // Can't map l to i, as it's a valid letter
    'ο': 'o', 'Ο': 'o', 'о': 'o', 'О': 'o', '0': 'o',
    'а': 'a', 'А': 'a', '@': 'a',
    'е': 'e', 'Е': 'e', '3': 'e',
    // Ajoutez d'autres homoglyphes si nécessaire
};

function containsForbiddenWords(text: string): boolean {
    // 1. Remplacer les homoglyphes connus
    let sanitizedText = text.split('').map(char => homoglyphMap[char] || char).join('');
    
    // 2. Normaliser pour décomposer les accents
    sanitizedText = sanitizedText.normalize('NFD')
        // 3. Supprimer les accents
        .replace(/[\u0300-\u036f]/g, '')
        // 4. Supprimer tout ce qui n'est pas une lettre latine standard
        .replace(/[^a-zA-Z]/g, '')
        // 5. Mettre en minuscule
        .toLowerCase();
        
    return forbiddenWords.some(word => sanitizedText.includes(word));
}

export async function submitSongAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  const profanityAttempts = await getProfanityAttempts(ip);
  if (profanityAttempts >= 3) {
    return {
      message: 'Tu as été bloqué pour soumissions inappropriées répétées.',
      errors: { general: ['Tu as été bloqué pour soumissions inappropriées répétées.'] },
    };
  }
  
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

  // Profanity check (Instant Ban words)
  if (containsForbiddenWords(title) || containsForbiddenWords(artist)) {
      await recordProfanityAttempt(ip);
      const newProfanityAttempts = await getProfanityAttempts(ip);
        if (newProfanityAttempts >= 3) {
            return {
                message: 'Tu as été bloqué pour soumissions inappropriées répétées.',
                errors: { general: ['Tu as été bloqué pour soumissions inappropriées répétées.'] },
            };
        }
      return {
          message: 'le nom de l\'artiste ou le titre contient des termes inappropriés.',
      };
  }

  // AI moderation check (for troll songs, etc.)
  try {
    const moderationResult = await moderateSong({ title, artist });
    if (moderationResult.isTroll) {
        await recordProfanityAttempt(ip); 
        const newProfanityAttempts = await getProfanityAttempts(ip);
        if (newProfanityAttempts >= 3) {
            return {
                message: 'Tu as été bloqué pour soumissions inappropriées répétées.',
                errors: { general: ['Tu as été bloqué pour soumissions inappropriées répétées.'] },
            };
        }
        return {
            message: `Soumission rejetée : ${moderationResult.reason}`
        };
    }
  } catch (error) {
    console.error("Erreur de modération IA:", error);
    // En cas d'erreur de l'IA, on continue sans bloquer pour ne pas pénaliser les utilisateurs légitimes.
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
  const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  // Anti-VPN Check using ip-api.com
  try {
    const ipCheckResponse = await fetch(`http://ip-api.com/json/${ip}?fields=proxy`);
    if (ipCheckResponse.ok) {
      const ipData = await ipCheckResponse.json();
      if (ipData.proxy) {
        return { error: 'Les votes par VPN ou proxy ne sont pas autorisés.', songId };
      }
    } else {
      console.error("Erreur de l'API ip-api.com:", ipCheckResponse.statusText);
    }
  } catch (error) {
    console.error("Impossible de vérifier l'adresse IP:", error);
  }


  const weekKey = getThisWeeksTuesdayKey();
  const cookieStore = cookies();
  const voteCookieName = `vote_cast_${weekKey}`;
  const hasVotedCookie = cookieStore.get(voteCookieName)?.value === 'true';

  if (hasVotedCookie) {
    return { error: 'Tu as déjà voté cette semaine!', songId };
  }

  try {
    await addVote(songId, ip);
    
    cookieStore.set({
      name: voteCookieName,
      value: 'true',
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
      path: '/',
    });
    revalidatePath('/');
    return { success: true, songId };
  } catch (error) {
    console.error('Erreur dans voteAction:', error);
    if (error instanceof Error) {
        if (error.message.includes("déjà voté")) {
            // If the IP has already voted (detected by Firestore), set the cookie too.
            cookieStore.set({
                name: voteCookieName,
                value: 'true',
                maxAge: 60 * 60 * 24 * 7, // 1 semaine
                path: '/',
            });
            revalidatePath('/');
        }
        return { error: error.message, songId };
    }
    return { error: 'une erreur inconnue est survenue', songId };
  }
}
