
'use client';

import { voteAction, VoteState } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Song } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ArrowIcon } from '@/components/ui/arrow-icon';

interface SongCardProps {
  song: Omit<Song, 'week'>;
  rank: number;
  initialState: VoteState | undefined;
  hasVoted?: boolean;
}

function VoteButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;
  return (
    <Button
      size="sm"
      variant={isDisabled ? "secondary" : "outline"}
      className="gap-2 text-base"
      aria-disabled={isDisabled}
      disabled={isDisabled}
    >
      <ArrowIcon className="h-4 w-4" />
      <span>{pending ? 'Vote en cours' : disabled ? 'Déjà voté' : 'Voter'}</span>
    </Button>
  )
}

export function SongCard({ song, rank, initialState, hasVoted: alreadyVoted }: SongCardProps) {
  const isTop10 = rank <= 10;
  const { toast } = useToast();
  const [state, formAction] = useActionState(voteAction, initialState);
  const [hasVoted, setHasVoted] = useState<boolean>(alreadyVoted ?? false);

  useEffect(() => {
    if (state?.error && state.songId === song.id) {
      toast({
        title: 'Erreur de vote',
        description: state.error,
        variant: 'destructive',
      });
    }
    if (state?.success && state.songId === song.id) {
      setHasVoted(true);
    }
  }, [state, song.id, toast]);


  return (
    <Card
      className={cn(
        'p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all duration-300',
        'bg-card/50 backdrop-blur-sm',
        isTop10 && 'bg-primary/5 border-primary/20'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-4xl font-bold transition-colors',
          isTop10 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
        )}
      >
        {rank}
      </div>
      <div className="flex-grow overflow-hidden">
        <h3 className="font-bold text-3xl sm:text-3xl truncate font-headline">{song.title}</h3>
        <p className="text-2xl text-muted-foreground truncate">{song.artist}</p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-2 sm:gap-4">
        <div className="text-center">
            <p className="font-bold text-3xl sm:text-3xl">{song.votes}</p>
            <p className="text-base text-muted-foreground hidden sm:block">VOTES</p>
        </div>
        <form action={formAction}>
            <div className="hidden" aria-hidden="true">
              <label htmlFor={`honeypot-vote-${song.id}`}>Ne pas remplir ce champ</label>
              <input type="text" id={`honeypot-vote-${song.id}`} name="honeypot" tabIndex={-1} autoComplete="off" />
            </div>
            <input type="hidden" name="songId" value={song.id} />
            <VoteButton disabled={hasVoted} />
        </form>
      </div>
    </Card>
  );
}
