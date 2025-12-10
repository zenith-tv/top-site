'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { cn } from '@/lib/utils';
import { Clock, Star, Trophy } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

type Phase = 'NORMAL' | 'TOP_10' | 'TOP_3';

function getCurrentPhase(t: (key: string) => string): { phase: Phase; message: string; subMessage: string, icon: React.ReactNode } {
    const now = new Date();
    const day = now.getDay(); // 0=Sunday, 1=Monday, ..., 5=Friday
    const hour = now.getHours();

    // Friday (day 5): Top 10 only
    if (day === 5) {
        return { 
            phase: 'TOP_10',
            message: t('phase_top_10_title'),
            subMessage: t('phase_top_10_desc'),
            icon: <Star className="h-8 w-8 text-yellow-400" />
        };
    }
    // Monday (day 1) from 8h onwards: Top 3 only
    else if (day === 1 && hour >= 8) {
        return { 
            phase: 'TOP_3',
            message: t('phase_top_3_title'),
            subMessage: t('phase_top_3_desc'),
            icon: <Trophy className="h-8 w-8 text-amber-500" />
        };
    }
    // Tuesday (day 2) before 18h: Still in "Sprint Final" from Monday
    else if (day === 2 && hour < 18) {
        return { 
            phase: 'TOP_3',
            message: t('phase_top_3_title'),
            subMessage: t('phase_top_3_final_desc'),
            icon: <Trophy className="h-8 w-8 text-amber-500" />
        };
    }
    
    // Default: Normal voting
    return { 
        phase: 'NORMAL',
        message: t('phase_normal_title'),
        subMessage: t('phase_normal_desc'),
        icon: <Clock className="h-8 w-8 text-muted-foreground" />
    };
}


export function VotingPhaseIndicator() {
  const { t } = useLanguage();
  const [phaseInfo, setPhaseInfo] = useState(getCurrentPhase(t));

  useEffect(() => {
    // This component will be rendered on the client, so we can safely
    // set the state. We don't need to update it on an interval as the phase
    // only changes over a long period. A user refresh will be sufficient.
    setPhaseInfo(getCurrentPhase(t));
  }, [t]);

  const phaseColors = {
    NORMAL: 'border-border/40',
    TOP_10: 'border-yellow-400/50 bg-yellow-400/5',
    TOP_3: 'border-amber-500/50 bg-amber-500/5'
  };
  
  return (
    <Card className={cn(
        "w-full sticky top-8 bg-card/50 backdrop-blur-sm transition-all border",
        phaseColors[phaseInfo.phase]
        )}>
      <CardHeader>
        <div className="flex items-start gap-4">
            {phaseInfo.icon}
            <div className='flex-1'>
                <CardTitle className="font-bold">{phaseInfo.message}</CardTitle>
                <CardDescription className="text-lg leading-snug">{phaseInfo.subMessage}</CardDescription>
            </div>
        </div>
      </CardHeader>
    </Card>
  );
}
