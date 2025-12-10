'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { cn } from '@/lib/utils';
import { Clock, Star, Trophy, Lock } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

type Phase = 'NORMAL' | 'CONSOLIDATION' | 'TOP_10' | 'TOP_3';

function getCurrentPhase(t: (key: string) => string): { phase: Phase; message: string; subMessage: string, icon: React.ReactNode } {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon, 2=Tues, 3=Wed, 4=Thurs, 5=Fri, 6=Sat
    const hour = now.getHours();

    // Thursday (day 4)
    if (day === 4) {
        return { 
            phase: 'CONSOLIDATION',
            message: t('phase_consolidation_title'),
            subMessage: t('phase_consolidation_desc'),
            icon: <Lock className="h-8 w-8 text-muted-foreground" />
        };
    }
    // Friday (day 5)
    if (day === 5) {
        return { 
            phase: 'TOP_10',
            message: t('phase_top_10_title'),
            subMessage: t('phase_top_10_desc'),
            icon: <Star className="h-8 w-8 text-yellow-400" />
        };
    }
    // Monday (day 1) from 8h onwards
    else if (day === 1 && hour >= 8) {
        return { 
            phase: 'TOP_3',
            message: t('phase_top_3_title'),
            subMessage: t('phase_top_3_desc'),
            icon: <Trophy className="h-8 w-8 text-amber-500" />
        };
    }
    // Tuesday (day 2) before 18h
    else if (day === 2 && hour < 18) {
        return { 
            phase: 'TOP_3',
            message: t('phase_top_3_title'),
            subMessage: t('phase_top_3_final_desc'),
            icon: <Trophy className="h-8 w-8 text-amber-500" />
        };
    }
    // All other times (end of Tues, Wed, Sat, Sun, beginning of Mon)
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
    setPhaseInfo(getCurrentPhase(t));
  }, [t]);

  const phaseColors = {
    NORMAL: 'border-border/40',
    CONSOLIDATION: 'border-border/40',
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
