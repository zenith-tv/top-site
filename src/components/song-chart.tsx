import type { Song } from '@/lib/data';
import { SongCard } from './song-card';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';

interface SongChartProps {
  songs: Song[];
}

export function SongChart({ songs }: SongChartProps) {
  noStore();
  const headersList = headers();
  const initialState = {
    error: headersList.get('x-vote-error') || undefined,
    songId: Number(headersList.get('x-vote-songid')) || undefined
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle className="text-3xl font-bold font-headline">Le classement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {songs.length > 0 ? (
                songs.map((song, index) => (
                    <SongCard key={song.id} song={song} rank={index + 1} initialState={initialState}/>
                ))
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <p>Aucune chanson dans le classement pour le moment.</p>
                    <p>Sois le premier à en proposer une!</p>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
