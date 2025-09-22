'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addSong, addVote } from '@/lib/data';
import { headers } from 'next/headers';


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
    if (error instanceof Error) {
        return { message: error.message };
    }
    return { message: 'erreur serveur lors de l\'ajout de la chanson' };
  }
}

export type VoteState = {
    error?: string;
    songId?: number;
};

export async function voteAction(prevState: VoteState | undefined, formData: FormData): Promise<VoteState> {
  const songId = Number(formData.get('songId'));
  if (isNaN(songId)) {
    return { error: 'ID de chanson invalide', songId };
  }
  
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for') || '127.0.0.1';


  try {
    await addVote(songId, ip);
    revalidatePath('/');
    return {};
  } catch (error) {
    if (error instanceof Error) {
        return { error: error.message, songId };
    }
    return { error: 'une erreur inconnue est survenue', songId };
  }
}
