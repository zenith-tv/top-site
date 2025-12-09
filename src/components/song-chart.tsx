
import type { Song } from '@/lib/data';
import { SongCard } from './song-card';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { unstable_noStore as noStore } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { getThisWeeksTuesdayKey } from '@/lib/data';

interface SongChartProps {
  songs: Omit<Song, 'week'>[];
}

export async function SongChart({ songs }: SongChartProps) {
  noStore();
  const headersList = headers();
  const cookieStore = cookies();
  const weekKey = getThisWeeksTuesdayKey();
  const voteCookieName = `votes_${weekKey}`;
  const voteCookie = cookieStore.get(voteCookieName)?.value ?? '';
  const votedSongs = new Set(voteCookie.split(',').filter(Boolean));
  const initialState = {
    error: (await headersList).get('x-vote-error') || undefined,
    songId: (await headersList).get('x-vote-songid') || undefined,
  };

  return (
    <Card className="bg-transparent border-0 shadow-none">
        <CardHeader>
            <CardTitle className="text-4xl font-bold font-headline text-foreground">Le classement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {songs.length > 0 ? (
                songs.map((song, index) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      rank={index + 1}
                      initialState={initialState}
                      hasVoted={votedSongs?.has(song.id)}
                    />
                ))
            ) : (
                <div className="text-center py-12 text-lg text-muted-foreground bg-card/50 backdrop-blur-sm">
                    <p>Aucune chanson dans le classement pour le moment</p>
                    <p>Sois le premier à en proposer une!</p>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
