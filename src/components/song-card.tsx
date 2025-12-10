
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

function VoteButton({ disabled, hasVotedThisWeek, voteLockReason }: { disabled: boolean, hasVotedThisWeek: boolean, voteLockReason: string | null }) {
  const { pending } = useFormStatus();
  const isLocked = voteLockReason !== null;
  const isDisabled = pending || disabled || hasVotedThisWeek || isLocked;
  
  let buttonText = 'Voter';
  if (pending) {
    buttonText = 'Vote en cours';
  } else if (isLocked) {
    buttonText = voteLockReason;
  } else if (hasVotedThisWeek) {
    buttonText = 'Tu as voté';
  } else if (disabled) {
    buttonText = 'Déjà voté';
  }


  return (
    <Button
      size="sm"
      variant={isDisabled ? "secondary" : "outline"}
      className="gap-2 text-base"
      aria-disabled={isDisabled}
      disabled={isDisabled}
    >
      <ArrowIcon className="h-4 w-4" />
      <span>{buttonText}</span>
    </Button>
  )
}

export function SongCard({ song, rank, initialState, hasVoted: alreadyVoted }: SongCardProps) {
  const isTop10 = rank <= 10;
  const isTop3 = rank <= 3;
  const { toast } = useToast();
  const [state, formAction] = useActionState(voteAction, initialState);
  const [hasVotedForThisSong, setHasVotedForThisSong] = useState<boolean>(false);
  const [hasVotedThisWeek, setHasVotedThisWeek] = useState<boolean>(alreadyVoted ?? false);
  const [voteLockReason, setVoteLockReason] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Dimanche, 1=Lundi, ..., 5=Vendredi
    const hour = now.getHours();

    // Vendredi (jour 5): On ne peut voter que pour le top 10
    if (day === 5) {
        if (!isTop10) {
            setVoteLockReason("Top 10");
        }
    }
    // Lundi (jour 1) à partir de 8h: On ne peut voter que pour le top 3
    else if (day === 1 && hour >= 8) {
        if (!isTop3) {
            setVoteLockReason("Top 3");
        }
    }
    // Mardi (jour 2) avant 18h: on est toujours dans la phase "Sprint final" du lundi
    else if (day === 2 && hour < 18) {
        if(!isTop3) {
            setVoteLockReason("Top 3");
        }
    }
  }, [isTop10, isTop3]);


  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erreur de vote',
        description: state.error,
        variant: 'destructive',
      });
      if (state.error.includes('déjà voté')) {
        setHasVotedThisWeek(true);
      }
    }
    if (state?.success && state.songId === song.id) {
      setHasVotedForThisSong(true);
      setHasVotedThisWeek(true);
    }
  }, [state, song.id, toast]);

  // If the cookie indicates a vote has been cast this week, update the state
  useEffect(() => {
    if (alreadyVoted) {
      setHasVotedThisWeek(true);
    }
  }, [alreadyVoted]);

  return (
    <Card
      className={cn(
        'p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all duration-300',
        'bg-transparent border',
        isTop10 && 'border-primary/20',
        (voteLockReason && !hasVotedThisWeek) && 'opacity-60'
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
        <h3 className="font-bold text-3xl sm:text-3xl truncate font-headline">
          {song.title}
          {song.title === 'Вокализ 1976.' && <span className="ml-2">😏</span>}
        </h3>
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
            <VoteButton disabled={hasVotedForThisSong} hasVotedThisWeek={hasVotedThisWeek} voteLockReason={voteLockReason} />
        </form>
      </div>
    </Card>
  );
}
