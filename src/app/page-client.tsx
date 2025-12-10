'use client';
import { SongChart } from '@/components/song-chart';
import { SongSubmissionForm } from '@/components/song-submission-form';
import { Logo } from '@/components/ui/logo';
import { VotingPhaseIndicator } from '@/components/voting-phase-indicator';
import type { Song } from '@/lib/data';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { VoteState } from './actions';

interface PageClientProps {
    songs: Omit<Song, 'week'>[];
    hasVoted: boolean;
    initialState: VoteState | undefined;
}

export function PageClient({ songs, hasVoted, initialState }: PageClientProps) {
    const { language, setLanguage, t } = useLanguage();

    const toggleLanguage = () => {
        setLanguage(language === 'fr' ? 'en' : 'fr');
    };

    return (
        <div className="h-screen w-screen overflow-y-auto">
            <header className="py-10">
                <div className="container mx-auto text-center px-4 relative">
                    <Button
                        onClick={toggleLanguage}
                        variant="outline"
                        className="absolute top-4 right-4"
                    >
                        {language === 'fr' ? 'EN' : 'FR'}
                    </Button>
                    <div className="flex items-center justify-center">
                        <Logo className="w-auto h-64 text-primary" />
                    </div>
                    <p className="mt-4 max-w-2xl mx-auto text-2xl text-muted-foreground">
                        {t('app_description')}
                    </p>
                </div>
            </header>
            <main className="container mx-auto px-4 pb-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    <div className="md:col-span-1 space-y-8">
                        <VotingPhaseIndicator />
                        <SongSubmissionForm />
                    </div>
                    <div className="md:col-span-2">
                        <SongChart songs={songs} hasVoted={hasVoted} initialState={initialState} />
                    </div>
                </div>
            </main>
        </div>
    );
}
