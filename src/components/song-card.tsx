'use client';

import { ThumbsUp } from 'lucide-react';
import { voteAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Song } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useFormStatus } from 'react-dom';

interface SongCardProps {
  song: Song;
  rank: number;
}

function VoteButton() {
    const { pending } = useFormStatus();
    return (
        <Button size="sm" variant={pending ? "secondary" : "outline"} className="gap-2" aria-disabled={pending}>
            <ThumbsUp className="h-4 w-4" />
            <span>{pending ? 'Vote en cours...' : 'Voter'}</span>
        </Button>
    )
}

export function SongCard({ song, rank }: SongCardProps) {
  const isTop10 = rank <= 10;

  return (
    <Card
      className={cn(
        'p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all duration-300',
        isTop10 && 'bg-primary/5 border-primary/20 shadow-md'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl font-bold transition-colors',
          isTop10 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
        )}
      >
        {rank}
      </div>
      <div className="flex-grow overflow-hidden">
        <h3 className="font-bold text-base sm:text-lg truncate font-headline">{song.title}</h3>
        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-2 sm:gap-4">
        <div className="text-center">
            <p className="font-bold text-base sm:text-lg">{song.votes}</p>
            <p className="text-xs text-muted-foreground hidden sm:block">VOTES</p>
        </div>
        <form action={voteAction}>
          <input type="hidden" name="songId" value={song.id} />
          <VoteButton />
        </form>
      </div>
    </Card>
  );
}
