import { NextResponse } from 'next/server';
import { getSongs } from '@/lib/data';
import { unstable_noStore as noStore } from 'next/cache';

export async function GET() {
  noStore();
  try {
    const songs = await getSongs();
    const songsWithRank = songs.map((song, index) => ({
      ...song,
      rank: index + 1,
    }));
    return NextResponse.json(songsWithRank);
  } catch (error) {
    console.error('API Error getting songs:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
