import { unstable_noStore as noStore } from 'next/cache';

export type Song = {
  id: number;
  title: string;
  artist: string;
  votes: number;
};

// In-memory store
let songs: Song[] = [];

let nextId = 1;
let lastReset = getThisWeeksTuesday();
const ipVotes = new Map<string, Set<number>>(); // IP -> Set of song IDs voted for

function getThisWeeksTuesday(): Date {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay(); // Sunday - 0, ... Tuesday - 2, ... Saturday - 6
    const daysSinceTuesday = (dayOfWeek - 2 + 7) % 7;
    const tuesday = new Date(today);
    tuesday.setDate(today.getDate() - daysSinceTuesday);
    tuesday.setHours(0, 0, 0, 0);
    return tuesday;
}

function resetDataIfNeeded() {
  const now = new Date();
  
  const newTuesday = getThisWeeksTuesday();
  if (newTuesday.getTime() > lastReset.getTime()) {
      console.log("Resetting weekly data...");
      songs = [];
      nextId = 1;
      ipVotes.clear();
      lastReset = newTuesday;
  }
}

function toTitleCase(str: string): string {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
}

export async function getSongs() {
  noStore();
  resetDataIfNeeded();
  return [...songs].sort((a, b) => b.votes - a.votes);
}

export async function addSong(data: { title: string; artist: string }) {
  noStore();
  resetDataIfNeeded();
  
  const title = toTitleCase(data.title);
  const artist = toTitleCase(data.artist);

  if (songs.some(s => s.title.toLowerCase() === title.toLowerCase() && s.artist.toLowerCase() === artist.toLowerCase())) {
      throw new Error("cette chanson est déjà dans le classement.");
  }

  const newSong: Song = {
    id: nextId++,
    title: title,
    artist: artist,
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
    throw new Error("tu as déjà voté pour cette chanson!");
  }

  const song = songs.find((s) => s.id === songId);
  if (song) {
    song.votes++;
    userVotes.add(songId);
    return song;
  }
  throw new Error("chanson non trouvée.");
}
