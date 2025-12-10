
import type { Song } from '@/lib/data';
import { SongCard } from './song-card';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LanguageClient } from './language-client';
import { VoteState } from '@/app/actions';


interface SongChartProps {
  songs: Omit<Song, 'week'>[];
  hasVoted: boolean;
  initialState: VoteState | undefined;
}

export function SongChart({ songs, hasVoted, initialState }: SongChartProps) {
  return (
    <LanguageClient>
      {({ t }) => (
        <Card className="bg-transparent border-0 shadow-none">
            <CardHeader>
                <CardTitle className="text-4xl font-bold font-headline text-foreground">{t('chart_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {songs.length > 0 ? (
                    songs.map((song, index) => (
                        <SongCard
                          key={song.id}
                          song={song}
                          rank={index + 1}
                          initialState={initialState}
                          hasVoted={hasVoted}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 text-lg text-muted-foreground bg-card/50 backdrop-blur-sm">
                        <p>{t('chart_no_songs')}</p>
                        <p>{t('chart_be_the_first')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
      )}
    </LanguageClient>
  );
}
