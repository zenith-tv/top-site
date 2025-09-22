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

export async function getSongs() {
  noStore(); // Opt out of caching for this data
  // Sort by votes descending
  return [...songs].sort((a, b) => b.votes - a.votes);
}

export async function addSong(data: { title: string; artist: string }) {
  noStore();
  const newSong: Song = {
    id: nextId++,
    title: data.title,
    artist: data.artist,
    votes: 1, // Start with 1 vote from the submitter
  };
  songs.push(newSong);
  return newSong;
}

export async function addVote(songId: number) {
  noStore();
  const song = songs.find((s) => s.id === songId);
  if (song) {
    song.votes++;
    return song;
  }
  throw new Error("Song not found");
}
