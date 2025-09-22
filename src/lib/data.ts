import { unstable_noStore as noStore } from 'next/cache';

export type Song = {
  id: number;
  title: string;
  artist: string;
  votes: number;
};

// In-memory store
let songs: Song[] = [
  { id: 1, artist: "Daft Punk", title: "One More Time", votes: 25 },
  { id: 2, artist: "Queen", title: "Bohemian Rhapsody", votes: 42 },
  { id: 3, artist: "Nirvana", title: "Smells Like Teen Spirit", votes: 35 },
  { id: 4, artist: "Michael Jackson", title: "Billie Jean", votes: 38 },
  { id: 5, artist: "The Beatles", title: "Hey Jude", votes: 31 },
  { id: 6, artist: "Eagles", title: "Hotel California", votes: 29 },
  { id: 7, artist: "Led Zeppelin", title: "Stairway to Heaven", votes: 33 },
  { id: 8, artist: "AC/DC", title: "Back in Black", votes: 27 },
  { id: 9, artist: "Guns N' Roses", title: "Sweet Child O' Mine", votes: 22 },
  { id: 10, artist: "Bob Dylan", title: "Like a Rolling Stone", votes: 19 },
  { id: 11, artist: "The Rolling Stones", title: "(I Can't Get No) Satisfaction", votes: 15 },
  { id: 12, artist: "U2", title: "With or Without You", votes: 18 },
  { id: 13, artist: "Radiohead", title: "Creep", votes: 21 },
];

let nextId = songs.length + 1;
let lastReset = getThisWeeksTuesday();
const ipVotes = new Map<string, Set<number>>(); // IP -> Set of song IDs voted for

function getThisWeeksTuesday(): Date {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay(); // Sunday - 0, ... Tuesday - 2, ... Saturday - 6
    const daysSinceTuesday = (dayOfWeek - 2 + 7) % 7;
    const tuesday = new Date(today);
    tuesday.setDate(today.getDate() - daysSinceTuesday);
    return tuesday;
}

function resetDataIfNeeded() {
  const now = new Date();
  if (now.getTime() < lastReset.getTime() + 7 * 24 * 60 * 60 * 1000) {
      // Not yet time to reset
      return;
  }

  const newTuesday = getThisWeeksTuesday();
  if (newTuesday.getTime() > lastReset.getTime()) {
      console.log("Resetting weekly data...");
      songs = [];
      nextId = 1;
      ipVotes.clear();
      lastReset = newTuesday;
  }
}

export async function getSongs() {
  noStore();
  resetDataIfNeeded();
  return [...songs].sort((a, b) => b.votes - a.votes);
}

export async function addSong(data: { title: string; artist: string }) {
  noStore();
  resetDataIfNeeded();
  
  if (songs.some(s => s.title.toLowerCase() === data.title.toLowerCase() && s.artist.toLowerCase() === data.artist.toLowerCase())) {
      throw new Error("Cette chanson est déjà dans le classement.");
  }

  const newSong: Song = {
    id: nextId++,
    title: data.title,
    artist: data.artist,
    votes: 1, 
  };
  songs.push(newSong);
  return newSong;
}

export async function addVote(songId: number, ip: string) {
  noStore();
  resetDataIfNeeded();

  if (!ipVotes.has(ip)) {
    ipVotes.set(ip, new Set());
  }

  const userVotes = ipVotes.get(ip)!;

  if (userVotes.has(songId)) {
    console.warn(`IP ${ip} has already voted for song ${songId}.`);
    // We don't throw an error to prevent the app from crashing, but we don't add a vote.
    // The UI will just not update the vote count.
    return;
  }

  const song = songs.find((s) => s.id === songId);
  if (song) {
    song.votes++;
    userVotes.add(songId);
    return song;
  }
  throw new Error("Song not found");
}
