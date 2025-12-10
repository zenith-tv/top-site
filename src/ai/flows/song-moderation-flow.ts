'use server';
/**
 * @fileOverview Un flux de modération de chansons utilisant l'IA.
 *
 * - moderateSong - Une fonction qui gère le processus de modération des chansons.
 * - SongModerationInput - Le type d'entrée pour la fonction moderateSong.
 * - SongModerationOutput - Le type de retour pour la fonction moderateSong.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SongModerationInputSchema = z.object({
  title: z.string().describe('Le titre de la chanson.'),
  artist: z.string().describe("L'artiste de la chanson."),
});
export type SongModerationInput = z.infer<typeof SongModerationInputSchema>;

const SongModerationOutputSchema = z.object({
  isTroll: z
    .boolean()
    .describe(
      'La chanson est-elle considérée comme un troll, une blague ou non sérieuse.'
    ),
  reason: z.string().describe('Une brève explication de la décision.'),
});
export type SongModerationOutput = z.infer<typeof SongModerationOutputSchema>;

export async function moderateSong(
  input: SongModerationInput
): Promise<SongModerationOutput> {
  return songModerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'songModerationPrompt',
  input: { schema: SongModerationInputSchema },
  output: { schema: SongModerationOutputSchema },
  prompt: `Vous êtes un modérateur de classement musical strict. Votre tâche est de déterminer si une soumission de chanson est une chanson "troll", une blague, un mème ou une entrée musicale non sérieuse. Soyez très critique.

Artiste : {{{artist}}}
Titre : {{{title}}}

Évaluez la soumission. Si elle est jugée comme une chanson troll, non sérieuse, une blague ou un mème, définissez isTroll sur true. Sinon, définissez-le sur false. Fournissez une brève raison pour votre décision.`,
});

const songModerationFlow = ai.defineFlow(
  {
    name: 'songModerationFlow',
    inputSchema: SongModerationInputSchema,
    outputSchema: SongModerationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      // En cas d'échec de la génération, considérez la chanson comme non-troll pour ne pas bloquer les soumissions légitimes.
      return {
        isTroll: false,
        reason: "L'analyse par l'IA a échoué.",
      };
    }
    return output;
  }
);
