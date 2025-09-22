import type { Song } from '@/lib/data';
import { SongCard } from './song-card';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface SongChartProps {
  songs: Song[];
}

export function SongChart({ songs }: SongChartProps) {
  return (
    <Card>
        <CardHeader>
            <CardTitle className="text-3xl font-bold font-headline">Le Classement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {songs.length > 0 ? (
                songs.map((song, index) => (
                    <SongCard key={song.id} song={song} rank={index + 1} />
                ))
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <p>Aucune chanson dans le classement pour le moment.</p>
                    <p>Soyez le premier à en proposer une !</p>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
