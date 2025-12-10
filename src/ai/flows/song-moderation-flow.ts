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
  prompt: `Vous êtes un modérateur de classement musical nuancé. Votre tâche est de faire la distinction entre les véritables entrées musicales (même si elles sont humoristiques, satiriques ou des génériques d'émissions de télévision) et les soumissions "troll" évidentes conçues uniquement pour perturber le classement.

Tâches :
1. Évaluez la soumission suivante :
   - Artiste : {{{artist}}}
   - Titre : {{{title}}}

2. Soyez tolérant envers les chansons qui pourraient être des blagues ou des références culturelles (par exemple, des chansons sur l'URSSAF, des génériques d'émissions de télévision, des mèmes connus qui sont de vraies chansons). Utilisez vos connaissances pour vérifier si la chanson ou l'artiste, même s'il semble étrange, a une existence réelle sur Internet.

3. Définissez 'isTroll' sur 'true' UNIQUEMENT pour les trolls évidents, le spam, les insultes, les chaînes de caractères absurdes ou les soumissions qui n'ont manifestement aucune intention musicale.

4. Pour tout le reste, en particulier en cas de doute, définissez 'isTroll' sur 'false'. Il vaut mieux laisser passer une chanson étrange que de bloquer une soumission légitime et créative.

5. Fournissez une brève raison pour votre décision.`,
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
