import { getSongs, getThisWeeksTuesdayKey } from '@/lib/data';
import { PageClient } from './page-client';
import { cookies, headers } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';

export default async function Home() {
  noStore();
  const songs = await getSongs();
  
  const headersList = headers();
  const cookieStore = cookies();
  const weekKey = getThisWeeksTuesdayKey();
  const voteCookieName = `vote_cast_${weekKey}`;
  const hasVoted = cookieStore.get(voteCookieName)?.value === 'true';

  const initialState = {
    error: headersList.get('x-vote-error') || undefined,
    songId: headersList.get('x-vote-songid') || undefined,
  };

  return (
    <PageClient songs={songs} hasVoted={hasVoted} initialState={initialState} />
  );
}
