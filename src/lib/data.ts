
import { unstable_noStore as noStore } from 'next/cache';
import { db } from './firebase';
import { collection, getDocs, addDoc, query, where, orderBy, doc, updateDoc, increment, getDoc, runTransaction, setDoc, limit } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

export type Song = {
  id: string; // Firestore uses string IDs
  title: string;
  artist: string;
  votes: number;
  week: string;
};

// This function determines the current "voting week".
// A new week starts on Tuesday at 18:00 (6 PM).
export function getThisWeeksTuesdayKey(): string {
    const now = new Date();
    const dayOfWeek = now.getDay(); // Sunday - 0, ..., Tuesday - 2, ...
    const hour = now.getHours();

    let daysSinceTuesday;

    // If it's Tuesday (2) but before 18:00, we are still in the previous week.
    // The "new" Tuesday hasn't started yet. So, it's considered 7 days since the *last* active Tuesday.
    if (dayOfWeek === 2 && hour < 18) {
        daysSinceTuesday = 7;
    } else {
        // Standard calculation for other days.
        daysSinceTuesday = (dayOfWeek - 2 + 7) % 7;
    }

    const lastTuesdayDate = new Date(now);
    lastTuesdayDate.setDate(now.getDate() - daysSinceTuesday);
    lastTuesdayDate.setHours(0, 0, 0, 0); // Normalize to the beginning of the day.
    
    // Return key in YYYY-MM-DD format
    return lastTuesdayDate.toISOString().split('T')[0];
}

function formatTitle(str: string): string {
    if (!str) return "";
    return str.split(' ').map(word => {
        // Handle acronyms like D.A.N.C.E.
        if (word.includes('.')) {
            return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
}

function formatArtist(str: string): string {
    if (!str) return "";
    return str.split(' ').map(word => {
        if (word.includes('.')) {
            return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
}

export async function getSongs(): Promise<Omit<Song, 'week'>[]> {
  noStore();
  const weekKey = getThisWeeksTuesdayKey();
  const songsCollection = collection(db, 'songs');
  
  // Query for songs of the current week and order by votes
  const q = query(songsCollection, where('week', '==', weekKey), orderBy('votes', 'desc'));
  
  try {
    const querySnapshot = await getDocs(q);
    const songs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Song));
    return songs;
  } catch (error) {
    console.error("Error fetching songs: ", error);
    return []; // Return empty array on error
  }
}

export async function addSong(data: { title: string; artist: string }): Promise<Song> {
  noStore();
  const weekKey = getThisWeeksTuesdayKey();
  const songsCollection = collection(db, 'songs');

  const title = formatTitle(data.title);
  const artist = formatArtist(data.artist);

  // Check for duplicates in the current week
  const q = query(songsCollection, 
    where('week', '==', weekKey),
    where('title_lowercase', '==', title.toLowerCase()),
    where('artist_lowercase', '==', artist.toLowerCase())
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
      throw new Error("This song is already in the chart / Cette chanson est déjà dans le classement");
  }
  
  const newSongData = {
    title: title,
    artist: artist,
    votes: 0,
    week: weekKey,
    title_lowercase: title.toLowerCase(),
    artist_lowercase: artist.toLowerCase(),
  };
  
  try {
    const docRef = await addDoc(songsCollection, newSongData);
    return {
      id: docRef.id,
      ...newSongData
    };
  } catch (error) {
      console.error("Error in addSong:", error);
      if (error instanceof FirebaseError) {
          throw new Error(`Firebase Error: ${error.message} / Erreur Firebase: ${error.message}`);
      }
      throw new Error("Could not add song. Database error. / Impossible d'ajouter la chanson. Erreur de base de données.");
  }
}


export async function addVote(songId: string, ip: string): Promise<void> {
    noStore();
    const weekKey = getThisWeeksTuesdayKey();
    const voteId = `${weekKey}_${ip.replace(/\./g, '-')}`;
    const voteRef = doc(db, 'ip_votes', voteId);
    const songRef = doc(db, 'songs', songId);

    try {
        await runTransaction(db, async (transaction) => {
            const voteDoc = await transaction.get(voteRef);
            if (voteDoc.exists()) {
                throw new Error("You have already voted this week! / Tu as déjà voté cette semaine!");
            }

            const songDoc = await transaction.get(songRef);
            if (!songDoc.exists() || songDoc.data().week !== weekKey) {
                throw new Error("Song not found / Chanson non trouvée");
            }

            transaction.set(voteRef, {
                ip: ip,
                songId: songId,
                votedAt: new Date(),
            });
            
            transaction.update(songRef, {
                votes: increment(1)
            });
        });
    } catch (error) {
        if (error instanceof FirebaseError) {
            throw error; // Re-throw Firebase-specific errors to be caught in the action
        }
        if (error instanceof Error) {
            // Re-throw specific user-facing errors
            if (error.message.includes("already voted") || error.message.includes("déjà voté") || error.message.includes("not found") || error.message.includes("non trouvée")) {
                throw error;
            }
        }
        // Log the original error for debugging but throw a generic one to the user
        console.error("Vote transaction error:", error);
        throw new Error("Error processing vote / Erreur lors du traitement du vote");
    }
}

export async function recordProfanityAttempt(ip: string): Promise<void> {
  noStore();
  const weekKey = getThisWeeksTuesdayKey();
  const profanityDocId = `${weekKey}_${ip.replace(/\./g, '-')}`;
  const profanityRef = doc(db, 'profanity_attempts', profanityDocId);
  
  try {
    const docSnap = await getDoc(profanityRef);
    if (docSnap.exists()) {
        await updateDoc(profanityRef, {
            count: increment(1),
            lastAttemptAt: new Date(),
        });
    } else {
        await setDoc(profanityRef, {
            count: 1,
            lastAttemptAt: new Date(),
        });
    }
  } catch (error) {
      console.error("Error recording profanity attempt:", error);
  }
}

export async function getProfanityAttempts(ip: string): Promise<number> {
    noStore();
    const weekKey = getThisWeeksTuesdayKey();
    const profanityDocId = `${weekKey}_${ip.replace(/\./g, '-')}`;
    const profanityRef = doc(db, 'profanity_attempts', profanityDocId);

    try {
        const docSnap = await getDoc(profanityRef);
        if (docSnap.exists()) {
            return docSnap.data().count || 0;
        }
        return 0;
    } catch (error) {
        console.error("Error getting profanity attempts:", error);
        return 0; // Failsafe
    }
}

export async function banIp(ip: string): Promise<void> {
    noStore();
    const ipRef = doc(db, 'banned_ips', ip);
    try {
        await setDoc(ipRef, {
            bannedAt: new Date(),
        });
    } catch (error) {
        console.error("Error banning IP:", error);
    }
}

export async function isIpBanned(ip: string): Promise<boolean> {
    noStore();
    const ipRef = doc(db, 'banned_ips', ip);
    try {
        const docSnap = await getDoc(ipRef);
        return docSnap.exists();
    } catch (error) {
        console.error("Error checking if IP is banned:", error);
        return false; // Failsafe to not block users due to DB errors
    }
}

function getPreviousWeekKey(currentWeekKey: string): string {
    const date = new Date(currentWeekKey);
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
}

export async function archivePreviousWeeksChart() {
    noStore();
    const now = new Date();
    // This logic should only run on Tuesdays.
    if (now.getDay() !== 2) {
        return;
    }

    const currentWeekKey = getThisWeeksTuesdayKey();
    const previousWeekKey = getPreviousWeekKey(currentWeekKey);

    const archiveRef = doc(db, 'weekly_charts', previousWeekKey);
    const archiveDoc = await getDoc(archiveRef);

    // If the archive for the previous week already exists, do nothing.
    if (archiveDoc.exists()) {
        return;
    }

    // Get the top 10 songs from the previous week.
    const songsCollection = collection(db, 'songs');
    const q = query(
        songsCollection,
        where('week', '==', previousWeekKey),
        orderBy('votes', 'desc'),
        limit(10)
    );

    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            // If there were no songs, still create an archive entry to prevent re-running.
            await setDoc(archiveRef, {
                week: previousWeekKey,
                chart: [],
                archivedAt: new Date(),
            });
            return;
        }

        const topSongs = querySnapshot.docs.map((doc, index) => ({
            rank: index + 1,
            title: doc.data().title,
            artist: doc.data().artist,
            votes: doc.data().votes,
        }));

        // Save the top 10 songs to the archive.
        await setDoc(archiveRef, {
            week: previousWeekKey,
            chart: topSongs,
            archivedAt: new Date(),
        });
        console.log(`Archived top 10 for week: ${previousWeekKey}`);

    } catch (error) {
        console.error("Error archiving weekly chart: ", error);
    }
}
