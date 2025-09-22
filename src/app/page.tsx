import { getSongs } from '@/lib/data';
import { SongChart } from '@/components/song-chart';
import { SongSubmissionForm } from '@/components/song-submission-form';
import { ArrowIcon } from '@/components/ui/arrow-icon';

export default async function Home() {
  const songs = await getSongs();

  return (
    <div className="h-screen w-screen overflow-y-auto">
      <header className="py-10">
        <div className="container mx-auto text-center px-4">
          <div className="inline-flex items-center gap-4">
            <h1 className="text-5xl font-extrabold tracking-tight font-headline text-primary">le top zén!th</h1>
            <ArrowIcon className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            votez pour vos chansons préférées et faites-les monter dans le classement!
          </p>
        </div>
      </header>
      <main className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-1">
                <SongSubmissionForm />
            </div>
            <div className="md:col-span-2">
                <SongChart songs={songs} />
            </div>
        </div>
      </main>
    </div>
  );
}
