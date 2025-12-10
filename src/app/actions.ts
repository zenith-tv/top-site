
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addSong, addVote, getThisWeeksTuesdayKey, recordProfanityAttempt, getProfanityAttempts } from '@/lib/data';
import { cookies, headers } from 'next/headers';
import { FirebaseError } from 'firebase/app';
import { moderateSong } from '@/ai/flows/song-moderation-flow';


const songSchema = z.object({
  title: z.string().min(1, 'Title is required / Le titre est requis'),
  artist: z.string().min(1, 'Artist is required / L\'artiste est requis'),
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

// Extended homoglyph map
const homoglyphMap: { [key: string]: string } = {
    'a': 'a', 'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'а': 'a', 'α': 'a', '𝘢': 'a', '𝙖': 'a', '𝗮': 'a', '𝚊': 'a', '𝐚': 'a', '𝑎': 'a', '𝒂': 'a', '𝓪': 'a', '𝒶': 'a', '𝕒': 'a', '𝖆': 'a', '𝔞': 'a', 'ⓐ': 'a', '🅐': 'a', '🄰': 'a', '🅰': 'a',
    'b': 'b', 'b': 'b', 'в': 'b', 'β': 'b', '𝗯': 'b', '𝚋': 'b', '𝐛': 'b', '𝑏': 'b', '𝒃': 'b', '𝓫': 'b', '𝒷': 'b', '𝕓': 'b', '𝖇': 'b', 'ⓑ': 'b', '🅑': 'b', '🄱': 'b', '🅱': 'b',
    'c': 'c', 'ç': 'c', 'с': 'c', 'ϲ': 'c', '𝘤': 'c', '𝙘': 'c', '𝗰': 'c', '𝚌': 'c', '𝐜': 'c', '𝑐': 'c', '𝒄': 'c', '𝓬': 'c', '𝒸': 'c', '𝕔': 'c', '𝖈': 'c', 'ⓒ': 'c', '🅒': 'c', '🄲': 'c', '🅲': 'c',
    'd': 'd', 'ԁ': 'd', 'Ꮷ': 'd', 'ԁ': 'd', '𝗱': 'd', '𝚍': 'd', '𝐝': 'd', '𝑑': 'd', '𝒅': 'd', '𝓭': 'd', '𝒹': 'd', '𝕕': 'd', '𝖉': 'd', 'ⓓ': 'd', '🅓': 'd', '🄳': 'd', '🅳': 'd',
    'e': 'e', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'е': 'e', 'ҽ': 'e', 'є': 'e', 'ε': 'e', '𝙚': 'e', '𝗲': 'e', '𝚎': 'e', '𝐞': 'e', '𝑒': 'e', '𝒆': 'e', '𝓮': 'e', 'ℯ': 'e', '𝕖': 'e', '𝖊': 'e', 'ⓔ': 'e', '🅔': 'e', '🄴': 'e', '🅴': 'e',
    'f': 'f', 'f': 'f', 'ғ': 'f', '𝘧': 'f', '𝙛': 'f', '𝗳': 'f', '𝚏': 'f', '𝐟': 'f', '𝑓': 'f', '𝒇': 'f', '𝓯': 'f', '𝒻': 'f', '𝕗': 'f', '𝖋': 'f', 'ⓕ': 'f', '🅕': 'f', '🄵': 'f', '🅵': 'f',
    'g': 'g', 'ġ': 'g', 'ģ': 'g', 'ɢ': 'g', '𝗴': 'g', '𝚐': 'g', '𝐠': 'g', '𝑔': 'g', '𝒈': 'g', '𝓰': 'g', '𝔤': 'g', 'ⓖ': 'g', '🅖': 'g', '🄶': 'g', '🅶': 'g',
    'h': 'h', 'н': 'h', 'һ': 'h', '𝙝': 'h', '𝗵': 'h', '𝚑': 'h', '𝐡': 'h', 'ℎ': 'h', '𝒉': 'h', '𝓱': 'h', '𝒽': 'h', '𝕙': 'h', '𝖍': 'h', '𝔥': 'h', 'ⓗ': 'h', '🅗': 'h', '🄷': 'h', '🅷': 'h',
    'i': 'i', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'і': 'i', 'ı': 'i', 'ɩ': 'i', 'ι': 'i', 'ⅰ': 'i', 'Ⅰ': 'i', '𝗶': 'i', '𝚒': 'i', '𝐢': 'i', '𝑖': 'i', '𝒊': 'i', '𝓲': 'i', '𝖎': 'i', 'ⓘ': 'i', '🅘': 'i', '🄸': 'i', '🅸': 'i',
    'j': 'j', 'ј': 'j', 'ϳ': 'j', '𝘫': 'j', '𝗷': 'j', '𝚓': 'j', '𝐣': 'j', '𝑗': 'j', '𝒋': 'j', '𝓳': 'j', '𝒿': 'j', '𝕛': 'j', '𝖏': 'j', 'ⓙ': 'j', '🅙': 'j', '🄹': 'j', '🅹': 'j',
    'k': 'k', 'κ': 'k', 'к': 'k', 'ķ': 'k', '𝗸': 'k', '𝚔': 'k', '𝐤': 'k', '𝑘': 'k', '𝒌': 'k', '𝓴': 'k', '𝓀': 'k', '𝕜': 'k', '𝖇': 'k', 'ⓚ': 'k', '🅚': 'k', '🄺': 'k', '🅺': 'k',
    'l': 'l', 'ⅼ': 'l', '۱': 'l', 'ا': 'l', 'ˡ': 'l', '𝗹': 'l', '𝚕': 'l', '𝐥': 'l', '𝑙': 'l', '𝒍': 'l', '𝓵': 'l', '𝓁': 'l', '𝕝': 'l', '𝖑': 'l', 'ⓛ': 'l', '🅛': 'l', '🄻': 'l', '🅻': 'l',
    'm': 'm', 'м': 'm', 'ᴍ': 'm', '𝗺': 'm', '𝚖': 'm', '𝐦': 'm', '𝑚': 'm', '𝒎': 'm', '𝓶': 'm', '𝓂': 'm', '𝕞': 'm', '𝖒': 'm', 'ⓜ': 'm', '🅜': 'm', '🄼': 'm', '🅼': 'm',
    'n': 'n', 'ñ': 'n', 'п': 'n', 'ո': 'n', '𝗻': 'n', '𝚗': 'n', '𝐧': 'n', '𝑛': 'n', '𝒏': 'n', '𝓷': 'n', '𝓃': 'n', '𝕟': 'n', '𝖓': 'n', 'ⓝ': 'n', '🅝': 'n', '🄽': 'n', '🅽': 'n',
    'o': 'o', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o', 'о': 'o', 'ο': 'o', 'ᴏ': 'o', '𝗼': 'o', '𝚘': 'o', '𝐨': 'o', '𝑜': 'o', '𝒐': 'o', '𝓸': 'o', '𝑜': 'o', '𝕠': 'o', '𝖔': 'o', 'ⓞ': 'o', '🅞': 'o', '🄾': 'o', '🅾': 'o',
    'p': 'p', 'р': 'p', 'ρ': 'p', '𝗽': 'p', '𝚙': 'p', '𝐩': 'p', '𝑝': 'p', '𝒑': 'p', '𝓹': 'p', '𝓅': 'p', '𝕡': 'p', '𝖕': 'p', 'ⓟ': 'p', '🅟': 'p', '🄿': 'p', '🅿': 'p',
    'q': 'q', 'ԛ': 'q', '𝗾': 'q', '𝚚': 'q', '𝐪': 'q', '𝑞': 'q', '𝒒': 'q', '𝓺': 'q', '𝓆': 'q', '𝕢': 'q', '𝖖': 'q', 'ⓠ': 'q', '🅠': 'q', '🅀': 'q', '🆀': 'q',
    'r': 'r', 'г': 'r', 'ᴦ': 'r', 'я': 'r', 'ʀ': 'r', '𝗿': 'r', '𝚛': 'r', '𝐫': 'r', '𝑟': 'r', '𝒓': 'r', '𝓻': 'r', '𝓇': 'r', '𝕣': 'r', '𝖗': 'r', 'ⓡ': 'r', '🅡': 'r', '🅁': 'r', '🆁': 'r',
    's': 's', 'ѕ': 's', 'ꜱ': 's', '𝘀': 's', '𝚜': 's', '𝐬': 's', '𝑠': 's', '𝒔': 's', '𝓼': 's', '𝓈': 's', '𝕤': 's', '𝖘': 's', 'ⓢ': 's', '🅢': 's', '🅂': 's', '🆂': 's',
    't': 't', 'т': 't', 'ᴛ': 't', '𝘁': 't', '𝚝': 't', '𝐭': 't', '𝑡': 't', '𝒕': 't', '𝓽': 't', '𝓉': 't', '𝕥': 't', '𝖙': 't', 'ⓣ': 't', '🅣': 't', '🅃': 't', '🆃': 't',
    'u': 'u', 'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'υ': 'u', 'µ': 'u', 'υ': 'u', 'ս': 'u', 'ᴜ': 'u', '𝘂': 'u', '𝚞': 'u', '𝐮': 'u', '𝑢': 'u', '𝒖': 'u', '𝓾': 'u', '𝓊': 'u', '𝕦': 'u', '𝖚': 'u', 'ⓤ': 'u', '🅤': 'u', '🅄': 'u', '🆄': 'u',
    'v': 'v', 'ν': 'v', 'ѵ': 'v', 'ᴠ': 'v', '𝘃': 'v', '𝚟': 'v', '𝐯': 'v', '𝑣': 'v', '𝒗': 'v', '𝓿': 'v', '𝓋': 'v', '𝕧': 'v', '𝖛': 'v', 'ⓥ': 'v', '🅥': 'v', '🅅': 'v', '🆅': 'v',
    'w': 'w', 'ѡ': 'w', 'ᴡ': 'w', '𝘄': 'w', '𝚠': 'w', '𝐰': 'w', '𝑤': 'w', '𝒘': 'w', '𝔀': 'w', '𝓌': 'w', '𝕨': 'w', '𝖜': 'w', 'ⓦ': 'w', '🅦': 'w', '🅆': 'w', '🆆': 'w',
    'x': 'x', 'х': 'x', '×': 'x', 'x': 'x', '𝘅': 'x', '𝙭': 'x', '𝘅': 'x', '𝚡': 'x', '𝐱': 'x', '𝑥': 'x', '𝒙': 'x', '𝔁': 'x', '𝓍': 'x', '𝓧': 'x', '𝕩': 'x', '𝖝': 'x', 'ⓧ': 'x', '🅧': 'x', '🅇': 'x', '🆇': 'x',
    'y': 'y', 'у': 'y', 'ɣ': 'y', 'ʏ': 'y', '𝘆': 'y', '𝚢': 'y', '𝐲': 'y', '𝑦': 'y', '𝒚': 'y', '𝔂': 'y', '𝓎': 'y', '𝕪': 'y', '𝖞': 'y', 'ⓨ': 'y', '🅨': 'y', '🅈': 'y', '🆈': 'y',
    'z': 'z', 'z': 'z', 'ᴢ': 'z', '𝘇': 'z', '𝚣': 'z', '𝐳': 'z', '𝑧': 'z', '𝒛': 'z', '𝓏': 'z', '𝓩': 'z', '𝕫': 'z', '𝖟': 'z', 'ⓩ': 'z', '🅩': 'z', '🅉': 'z', '🆉': 'z'
};

function containsForbiddenWords(text: string): boolean {
    // 1. Convert to lowercase
    const lowercasedText = text.toLowerCase();
    
    // 2. Normalize characters to their base form (e.g., é -> e) using NFKD
    // and replace known homoglyphs from the map.
    const normalizedText = lowercasedText
        .normalize('NFKD')
        .split('')
        .map(char => homoglyphMap[char] || char)
        .join('');

    // 3. Remove all non-alphanumeric characters (including accents after normalization)
    // and anything else that's not a-z.
    const sanitizedText = normalizedText.replace(/[^a-z]/g, '');

    // 4. Check if the sanitized text includes any forbidden word.
    return forbiddenWords.some(word => sanitizedText.includes(word));
}

export async function submitSongAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  const profanityAttempts = await getProfanityAttempts(ip);
  if (profanityAttempts >= 3) {
    return {
      message: 'You have been blocked for repeated inappropriate submissions. / Tu as été bloqué pour soumissions inappropriées répétées.',
      errors: { general: ['You have been blocked for repeated inappropriate submissions. / Tu as été bloqué pour soumissions inappropriées répétées.'] },
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
      message: 'Validation error / Erreur de validation',
    };
  }
  
  const { title, artist, honeypot } = validatedFields.data;

  // Honeypot check
  if (honeypot) {
    // Silently fail for bots
    return { message: 'Song added successfully! / Chanson ajoutée avec succès!' };
  }

  // Profanity check (Instant Ban words)
  if (containsForbiddenWords(title) || containsForbiddenWords(artist)) {
      await recordProfanityAttempt(ip);
      const newProfanityAttempts = await getProfanityAttempts(ip);
        if (newProfanityAttempts >= 3) {
            return {
                message: 'You have been blocked for repeated inappropriate submissions. / Tu as été bloqué pour soumissions inappropriées répétées.',
                errors: { general: ['You have been blocked for repeated inappropriate submissions. / Tu as été bloqué pour soumissions inappropriées répétées.'] },
            };
        }
      return {
          message: 'Artist or title name contains inappropriate terms. / Le nom de l\'artiste ou le titre contient des termes inappropriés.',
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
                message: 'You have been blocked for repeated inappropriate submissions. / Tu as été bloqué pour soumissions inappropriées répétées.',
                errors: { general: ['You have been blocked for repeated inappropriate submissions. / Tu as été bloqué pour soumissions inappropriées répétées.'] },
            };
        }
        return {
            message: `Submission rejected: ${moderationResult.reason} / Soumission rejetée : ${moderationResult.reason}`
        };
    }
  } catch (error) {
    console.error("AI moderation error:", error);
    // In case of AI error, proceed without blocking to avoid penalizing legitimate users.
  }
  
  try {
    await addSong({ title, artist });
    revalidatePath('/');
    return { message: 'Song added successfully! / Chanson ajoutée avec succès!' };
  } catch (error) {
    console.error('Error in submitSongAction:', error);
    if (error instanceof Error) {
        if (error.message.includes('This song is already in the chart') || error.message.includes('cette chanson est déjà dans le classement')) {
            return { message: error.message };
        }
        return { message: error.message };
    }
    return { message: 'Server error when adding the song / Erreur serveur lors de l\'ajout de la chanson' };
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
    return { error: 'Invalid song ID / ID de chanson invalide' };
  }
  
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  // Anti-VPN Check using ip-api.com
  try {
    const ipCheckResponse = await fetch(`http://ip-api.com/json/${ip}?fields=proxy`);
    if (ipCheckResponse.ok) {
      const ipData = await ipCheckResponse.json();
      if (ipData.proxy) {
        return { error: 'Votes via VPN or proxy are not allowed. / Les votes par VPN ou proxy ne sont pas autorisés.', songId };
      }
    } else {
      console.error("ip-api.com API error:", ipCheckResponse.statusText);
    }
  } catch (error) {
    console.error("Could not verify IP address:", error);
  }


  const weekKey = getThisWeeksTuesdayKey();
  const cookieStore = cookies();
  const voteCookieName = `vote_cast_${weekKey}`;
  const hasVotedCookie = cookieStore.get(voteCookieName)?.value === 'true';

  if (hasVotedCookie) {
    return { error: 'You have already voted this week! / Tu as déjà voté cette semaine!', songId };
  }

  try {
    await addVote(songId, ip);
    
    cookieStore.set({
      name: voteCookieName,
      value: 'true',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    revalidatePath('/');
    return { success: true, songId };
  } catch (error) {
    console.error('Error in voteAction:', error);
    if (error instanceof Error) {
        if (error.message.includes("already voted") || error.message.includes("déjà voté")) {
            // If the IP has already voted (detected by Firestore), set the cookie too.
            cookieStore.set({
                name: voteCookieName,
                value: 'true',
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            });
            revalidatePath('/');
        }
        return { error: error.message, songId };
    }
    return { error: 'An unknown error occurred / Une erreur inconnue est survenue', songId };
  }
}
