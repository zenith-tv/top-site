'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';
import { Clock, Star, Trophy } from 'lucide-react';

type Phase = 'NORMAL' | 'TOP_10' | 'TOP_3';

function getCurrentPhase(): { phase: Phase; message: string; subMessage: string, icon: React.ReactNode } {
    const now = new Date();
    const day = now.getDay(); // 0=Sunday, 1=Monday, ..., 5=Friday
    const hour = now.getHours();

    // Friday (day 5): Top 10 only
    if (day === 5) {
        return { 
            phase: 'TOP_10',
            message: 'Phase : Top 10',
            subMessage: 'Seules les 10 premières chansons peuvent être votées !',
            icon: <Star className="h-6 w-6 text-yellow-400" />
        };
    }
    // Monday (day 1) from 8h onwards: Top 3 only
    else if (day === 1 && hour >= 8) {
        return { 
            phase: 'TOP_3',
            message: 'Sprint final',
            subMessage: 'Seul le podium peut être voté ! Qui sera le numéro 1 ?',
            icon: <Trophy className="h-6 w-6 text-amber-500" />
        };
    }
    // Tuesday (day 2) before 18h: Still in "Sprint Final" from Monday
    else if (day === 2 && hour < 18) {
        return { 
            phase: 'TOP_3',
            message: 'Sprint final',
            subMessage: 'Le classement final est imminent ! Derniers votes pour le podium.',
            icon: <Trophy className="h-6 w-6 text-amber-500" />
        };
    }
    
    // Default: Normal voting
    return { 
        phase: 'NORMAL',
        message: 'Vote normal',
        subMessage: 'Toutes les chansons sont ouvertes aux votes. Faites votre choix !',
        icon: <Clock className="h-6 w-6 text-muted-foreground" />
    };
}


export function VotingPhaseIndicator() {
  const [phaseInfo, setPhaseInfo] = useState(getCurrentPhase());

  useEffect(() => {
    // This component will be rendered on the client, so we can safely
    // set the state. We don't need to update it on an interval as the phase
    // only changes over a long period. A user refresh will be sufficient.
    setPhaseInfo(getCurrentPhase());
  }, []);

  const phaseColors = {
    NORMAL: 'border-transparent',
    TOP_10: 'border-yellow-400/50 bg-yellow-400/5',
    TOP_3: 'border-amber-500/50 bg-amber-500/5'
  };
  
  return (
    <Card className={cn(
        "w-full sticky top-8 bg-card/50 backdrop-blur-sm transition-all",
        phaseColors[phaseInfo.phase]
        )}>
      <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
        {phaseInfo.icon}
        <CardTitle className="text-2xl font-bold font-headline">{phaseInfo.message}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-muted-foreground">{phaseInfo.subMessage}</p>
      </CardContent>
    </Card>
  );
}
