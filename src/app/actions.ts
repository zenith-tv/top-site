'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addSong, addVote } from '@/lib/data';
import { headers } from 'next/headers';


const songSchema = z.object({
  title: z.string().min(1, 'Le titre est requis.'),
  artist: z.string().min(1, 'L\'artiste est requis.'),
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
      message: 'Erreur de validation.',
    };
  }
  
  try {
    await addSong(validatedFields.data);
    revalidatePath('/');
    return { message: 'Chanson ajoutée avec succès !' };
  } catch (error) {
    if (error instanceof Error) {
        return { message: error.message };
    }
    return { message: 'Erreur serveur lors de l\'ajout de la chanson.' };
  }
}

export async function voteAction(formData: FormData) {
  const songId = Number(formData.get('songId'));
  if (isNaN(songId)) {
    throw new Error("ID de chanson invalide.");
  }
  
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for') || '127.0.0.1';


  try {
    await addVote(songId, ip);
    revalidatePath('/');
  } catch (error) {
    console.error('Vote Error:', error);
    // In a real app, you might want to return an error message to the user
    // For now, we just log it. The UI won't update if there's an error.
    if (error instanceof Error) {
        // We can't easily send this to the client without more complex state management
        // For now, revalidating will show the current state, which is that the vote didn't go through.
        revalidatePath('/');
    }
  }
}
