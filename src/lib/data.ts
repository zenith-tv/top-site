
import { unstable_noStore as noStore } from 'next/cache';
import { db } from './firebase';
import { collection, getDocs, addDoc, query, where, orderBy, doc, updateDoc, increment, getDoc, runTransaction, setDoc } from 'firebase/firestore';
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
