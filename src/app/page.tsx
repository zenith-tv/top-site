import { getSongs } from '@/lib/data';
import { SongChart } from '@/components/song-chart';
import { SongSubmissionForm } from '@/components/song-submission-form';
import { Logo } from '@/components/ui/logo';

export default async function Home() {
  const songs = await getSongs();

  return (
    <div className="h-screen w-screen overflow-y-auto">
      <header className="py-10">
        <div className="container mx-auto text-center px-4">
          <div className="inline-flex items-center justify-center">
            <Logo className="w-auto h-24 sm:h-28 md:h-32 text-primary" />
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
