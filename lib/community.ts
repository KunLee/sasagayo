export type Story = {
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  category: string;
  mood: string;
  track: string;
  artist: string;
  author: string;
  handle: string;
  location: string;
  initials: string;
  color: string;
  reactions: number;
  comments: number;
  time: string;
};

export const stories: Story[] = [
  {
    slug: "song-my-father-left-in-the-glovebox",
    title: "The song my father left in the glovebox",
    excerpt: "I found the cassette two summers after he passed. Side B began with the track he always hummed while cooking—and suddenly, the whole kitchen was there again.",
    body: [
      "The handwriting was unmistakably his: hurried capitals, a blue pen running dry, and no track list—only the words ‘for the road’. I waited three days before finding a player.",
      "When Orange Moon began, memory stopped behaving like memory. The kitchen light was on. A wooden spoon tapped the edge of a pot. He was humming half a beat behind the song, as he always did.",
      "I used to think recommendations were about taste. Now I think they are small acts of preservation: a way of saying this helped me remain myself, and perhaps it can do the same for you.",
    ],
    category: "Memory", mood: "Tender", track: "Orange Moon", artist: "Erykah Badu", author: "Amara K.", handle: "amarak", location: "Nairobi", initials: "AK", color: "#866072", reactions: 284, comments: 38, time: "18 minutes ago",
  },
  {
    slug: "for-taking-the-long-way-home",
    title: "For taking the long way home",
    excerpt: "A rainy train north turned every passing window into a tiny film. This was the piece that made me miss my stop on purpose.",
    body: ["Rain makes a city briefly anonymous. I boarded with nowhere urgent to be and let the train carry me beyond the familiar stations.", "Avril 14th arrived quietly in my headphones. Each piano note seemed to place a little more distance between the week I had and the evening I needed.", "Sometimes the best recommendation is permission: take the long route, leave one task unfinished, and listen all the way to the end."],
    category: "Ritual", mood: "Rainy", track: "Avril 14th", artist: "Aphex Twin", author: "Jonah Lee", handle: "jonahlistens", location: "Seoul", initials: "JL", color: "#57757b", reactions: 176, comments: 21, time: "1 hour ago",
  },
  {
    slug: "when-a-city-becomes-a-chorus",
    title: "When a city becomes a chorus",
    excerpt: "This was playing from three different balconies on the first warm night. Nobody planned it, which made it feel like a promise.",
    body: ["The first warm evening arrived all at once. Windows opened, chairs moved onto balconies, and the street remembered how to linger.", "Habibi floated down from somewhere above me. Then another speaker joined from across the road, a few seconds behind. By the third balcony, the whole block had become an accidental round.", "Music can belong to a person, but sometimes a city borrows it for an evening."],
    category: "Discovery", mood: "Golden", track: "Habibi", artist: "Tamino", author: "Noor S.", handle: "noorafterdark", location: "Beirut", initials: "NS", color: "#a35442", reactions: 342, comments: 46, time: "3 hours ago",
  },
  {
    slug: "a-record-for-quiet-courage",
    title: "A record for quiet courage",
    excerpt: "Not every fresh start arrives loudly. Some begin with making tea, opening a window, and playing side A again.",
    body: ["I had been waiting to feel ready, as though readiness would knock and introduce itself.", "Instead, I played Nina Simone and did one small difficult thing. The next morning, I played her again and did another.", "This is for anyone whose courage looks ordinary from the outside."],
    category: "Reflection", mood: "Resolute", track: "Feeling Good", artist: "Nina Simone", author: "Mara V.", handle: "marav", location: "Lisbon", initials: "MV", color: "#6d7966", reactions: 219, comments: 31, time: "Yesterday",
  },
];

export const circles = [
  { slug: "sunday-morning-club", name: "Sunday Morning Club", description: "Warm, gentle records for slow starts and unhurried conversation.", accent: "#d6aa69", members: 842, cadence: "Every Sunday" },
  { slug: "songs-for-starting-over", name: "Songs for Starting Over", description: "Tender resets, brave beginnings, and music for becoming again.", accent: "#769295", members: 615, cadence: "Open all week" },
  { slug: "after-midnight", name: "After Midnight", description: "For the quiet hours that ask better questions and reward close listening.", accent: "#8b6877", members: 1204, cadence: "Live nightly" },
  { slug: "deep-listening-room", name: "Deep Listening Room", description: "Albums in full, phones face down, and thoughtful notes after the final track.", accent: "#617a68", members: 438, cadence: "Friday sessions" },
  { slug: "soft-electronics", name: "Soft Electronics", description: "Machines with a pulse: ambient, downtempo, and tender experiments.", accent: "#718798", members: 729, cadence: "New theme monthly" },
  { slug: "songs-without-borders", name: "Songs Without Borders", description: "Translations, liner notes, and beloved sounds from everywhere.", accent: "#a96d52", members: 951, cadence: "Always listening" },
];

export const recommendations = [
  { title: "Blue Hour", artist: "Leif Vollebekk", genre: "Indie folk", mood: "Slow mornings", color: "from-[#a99b8b] to-[#61564d]" },
  { title: "Show Me How", artist: "Men I Trust", genre: "Dream pop", mood: "Night drives", color: "from-[#708e8b] to-[#304a4e]" },
  { title: "Sweet Disposition", artist: "The Temper Trap", genre: "Indie rock", mood: "Open roads", color: "from-[#bf765d] to-[#683c3d]" },
  { title: "Doomed", artist: "Moses Sumney", genre: "Art soul", mood: "Solitude", color: "from-[#7b738a] to-[#3b3447]" },
  { title: "Near Light", artist: "Ólafur Arnalds", genre: "Modern classical", mood: "Deep focus", color: "from-[#879b9b] to-[#435252]" },
  { title: "Les Fleurs", artist: "Minnie Riperton", genre: "Soul", mood: "Bright beginnings", color: "from-[#d29b68] to-[#7f4a41]" },
];

