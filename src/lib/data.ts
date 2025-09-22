import { unstable_noStore as noStore } from 'next/cache';
import { db } from './firebase';
import { collection, getDocs, addDoc, query, where, orderBy, doc, updateDoc, increment, getDoc } from 'firebase/firestore';

export type Song = {
  id: string; // Firestore uses string IDs
  title: string;
  artist: string;
  votes: number;
  week: string;
};

// This function determines the current "voting week".
// We'll use this to partition songs by week in Firestore.
// A week starts on Tuesday.
function getThisWeeksTuesdayKey(): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay(); // Sunday - 0, ... Tuesday - 2, ...
    const daysSinceTuesday = (dayOfWeek - 2 + 7) % 7;
    const tuesday = new Date(today);
    tuesday.setDate(today.getDate() - daysSinceTuesday);
    // Return key in YYYY-MM-DD format
    return tuesday.toISOString().split('T')[0];
}

function toTitleCase(str: string): string {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
}

export async function getSongs(): Promise<Omit<Song, 'week'>[]> {
  noStore();
  const weekKey = getThisWeeksTuesdayKey();
  const songsCollection = collection(db, 'songs');
  
  // Query for songs of the current week and order by votes
  const q = query(songsCollection, where('week', '==', weekKey), orderBy('votes', 'desc'));
  
  const querySnapshot = await getDocs(q);
  const songs = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Song));

  return songs;
}

export async function addSong(data: { title: string; artist: string }): Promise<Song> {
  noStore();
  const weekKey = getThisWeeksTuesdayKey();
  const songsCollection = collection(db, 'songs');

  const title = toTitleCase(data.title);
  const artist = toTitleCase(data.artist);

  // Check for duplicates in the current week
  const q = query(songsCollection, 
    where('week', '==', weekKey),
    where('title_lowercase', '==', title.toLowerCase()),
    where('artist_lowercase', '==', artist.toLowerCase())
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
      throw new Error("cette chanson est déjà dans le classement");
  }

  const newSongData = {
    title: title,
    artist: artist,
    title_lowercase: title.toLowerCase(),
    artist_lowercase: artist.toLowerCase(),
    votes: 0,
    week: weekKey,
  };

  const docRef = await addDoc(songsCollection, newSongData);

  return {
    id: docRef.id,
    ...newSongData
  };
}


export async function addVote(songId: string, ip: string): Promise<void> {
  noStore();
  const weekKey = getThisWeeksTuesdayKey();
  const votesCollection = collection(db, 'ip_votes');
  
  // Check if this IP has already voted for this song this week
  const voteQuery = query(votesCollection, 
    where('ip', '==', ip),
    where('songId', '==', songId),
    where('week', '==', weekKey)
  );

  const voteSnapshot = await getDocs(voteQuery);
  if (!voteSnapshot.empty) {
    throw new Error("tu as déjà voté pour cette chanson!");
  }

  // Check if the song exists
  const songRef = doc(db, 'songs', songId);
  const songDoc = await getDoc(songRef);
  if (!songDoc.exists() || songDoc.data().week !== weekKey) {
      throw new Error("chanson non trouvée");
  }

  // Record the vote
  await addDoc(votesCollection, {
    ip,
    songId,
    week: weekKey,
    votedAt: new Date(),
  });

  // Increment the vote count on the song document
  await updateDoc(songRef, {
    votes: increment(1)
  });
}
