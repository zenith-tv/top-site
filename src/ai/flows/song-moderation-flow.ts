'use server';
/**
 * @fileOverview A song moderation flow using AI.
 *
 * - moderateSong - A function that handles the song moderation process.
 * - SongModerationInput - The input type for the moderateSong function.
 * - SongModerationOutput - The return type for the moderateSong function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SongModerationInputSchema = z.object({
  title: z.string().describe('The title of the song.'),
  artist: z.string().describe('The artist of the song.'),
});
export type SongModerationInput = z.infer<typeof SongModerationInputSchema>;

const SongModerationOutputSchema = z.object({
  isTroll: z
    .boolean()
    .describe(
      'Is the song considered a troll, joke, or non-serious entry.'
    ),
  reason: z.string().describe('A brief explanation for the decision.'),
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
  prompt: `You are a nuanced music chart moderator. Your task is to distinguish between genuine musical entries (even if they are humorous, satirical, or TV show themes) and obvious "troll" submissions designed solely to disrupt the chart.

Tasks:
1. Evaluate the following submission:
   - Artist: {{{artist}}}
   - Title: {{{title}}}

2. Be tolerant of songs that might be jokes or cultural references (e.g., songs about government agencies, TV show themes, well-known memes that are actual songs). Use your knowledge to check if the song or artist, even if it seems strange, has a real presence on the internet.

3. Set 'isTroll' to 'true' ONLY for obvious trolls, spam, insults, nonsensical strings, or submissions that clearly have no musical intent.

4. For everything else, especially when in doubt, set 'isTroll' to 'false'. It's better to let a strange song pass than to block a legitimate and creative submission.

5. Provide a brief reason for your decision in the original language of the submission.`,
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
      // In case of generation failure, consider the song as non-troll to avoid blocking legitimate submissions.
      return {
        isTroll: false,
        reason: "AI analysis failed / L'analyse par l'IA a échoué.",
      };
    }
    return output;
  }
);
