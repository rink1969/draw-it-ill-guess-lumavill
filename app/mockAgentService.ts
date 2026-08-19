export type Difficulty = "easy" | "medium" | "tricky";
export type Category = "Food" | "Animals" | "Nature" | "Objects" | "Places" | "Sports" | "Magic";

export type GameWordEntry = {
  word: string;
  emoji: string;
  category: Category;
  difficulty: Difficulty;
  aliases: string[];
  fallbackGuesses: string[];
};

export type GuessAttempt = {
  guess: string;
  confidence: number;
  reaction?: string;
  source: "vision" | "fallback" | "director";
  isCorrect: boolean;
};

export const wordBank: GameWordEntry[] = [
  { word: "Birthday Cake", emoji: "🎂", category: "Food", difficulty: "easy", aliases: ["cake", "birthday cake"], fallbackGuesses: ["Hamburger", "Cupcake", "Birthday Cake"] },
  { word: "Cat", emoji: "🐱", category: "Animals", difficulty: "easy", aliases: ["cat", "kitten"], fallbackGuesses: ["Dog", "Fox", "Cat"] },
  { word: "Coffee", emoji: "☕", category: "Food", difficulty: "easy", aliases: ["coffee", "cup of coffee", "latte"], fallbackGuesses: ["Soup", "Hot Chocolate", "Coffee"] },
  { word: "Flower", emoji: "🌸", category: "Nature", difficulty: "easy", aliases: ["flower", "blossom"], fallbackGuesses: ["Lollipop", "Tree", "Flower"] },
  { word: "Star", emoji: "⭐", category: "Magic", difficulty: "easy", aliases: ["star"], fallbackGuesses: ["Cookie", "Sun", "Star"] },
  { word: "Pizza", emoji: "🍕", category: "Food", difficulty: "easy", aliases: ["pizza", "slice"], fallbackGuesses: ["Pie", "Cheese", "Pizza"] },
  { word: "Fish", emoji: "🐟", category: "Animals", difficulty: "easy", aliases: ["fish"], fallbackGuesses: ["Leaf", "Shark", "Fish"] },
  { word: "House", emoji: "🏡", category: "Places", difficulty: "easy", aliases: ["house", "home"], fallbackGuesses: ["Tent", "Castle", "House"] },
  { word: "Football", emoji: "⚽", category: "Sports", difficulty: "medium", aliases: ["football", "soccer ball", "soccer"], fallbackGuesses: ["Egg", "Basketball", "Football"] },
  { word: "Ice Cream", emoji: "🍦", category: "Food", difficulty: "easy", aliases: ["ice cream", "icecream", "cone"], fallbackGuesses: ["Mountain", "Cupcake", "Ice Cream"] },
  { word: "Apple", emoji: "🍎", category: "Food", difficulty: "easy", aliases: ["apple"], fallbackGuesses: ["Tomato", "Cherry", "Apple"] },
  { word: "Banana", emoji: "🍌", category: "Food", difficulty: "easy", aliases: ["banana"], fallbackGuesses: ["Moon", "Boomerang", "Banana"] },
  { word: "Cookie", emoji: "🍪", category: "Food", difficulty: "easy", aliases: ["cookie", "biscuit"], fallbackGuesses: ["Coin", "Donut", "Cookie"] },
  { word: "Donut", emoji: "🍩", category: "Food", difficulty: "easy", aliases: ["donut", "doughnut"], fallbackGuesses: ["Wheel", "Bagel", "Donut"] },
  { word: "Carrot", emoji: "🥕", category: "Food", difficulty: "easy", aliases: ["carrot"], fallbackGuesses: ["Pencil", "Rocket", "Carrot"] },
  { word: "Strawberry", emoji: "🍓", category: "Food", difficulty: "medium", aliases: ["strawberry"], fallbackGuesses: ["Heart", "Apple", "Strawberry"] },
  { word: "Taco", emoji: "🌮", category: "Food", difficulty: "medium", aliases: ["taco"], fallbackGuesses: ["Shell", "Sandwich", "Taco"] },
  { word: "Sandwich", emoji: "🥪", category: "Food", difficulty: "medium", aliases: ["sandwich"], fallbackGuesses: ["Book", "Toast", "Sandwich"] },
  { word: "Pancake", emoji: "🥞", category: "Food", difficulty: "medium", aliases: ["pancake", "pancakes"], fallbackGuesses: ["Plate", "Cookie Stack", "Pancake"] },
  { word: "Watermelon", emoji: "🍉", category: "Food", difficulty: "medium", aliases: ["watermelon", "melon"], fallbackGuesses: ["Pizza", "Beach Ball", "Watermelon"] },
  { word: "Dog", emoji: "🐶", category: "Animals", difficulty: "easy", aliases: ["dog", "puppy"], fallbackGuesses: ["Cat", "Bear", "Dog"] },
  { word: "Rabbit", emoji: "🐰", category: "Animals", difficulty: "easy", aliases: ["rabbit", "bunny"], fallbackGuesses: ["Mouse", "Cat", "Rabbit"] },
  { word: "Bird", emoji: "🐦", category: "Animals", difficulty: "easy", aliases: ["bird"], fallbackGuesses: ["Airplane", "Butterfly", "Bird"] },
  { word: "Butterfly", emoji: "🦋", category: "Animals", difficulty: "medium", aliases: ["butterfly"], fallbackGuesses: ["Bow", "Fairy", "Butterfly"] },
  { word: "Frog", emoji: "🐸", category: "Animals", difficulty: "easy", aliases: ["frog"], fallbackGuesses: ["Turtle", "Lizard", "Frog"] },
  { word: "Turtle", emoji: "🐢", category: "Animals", difficulty: "medium", aliases: ["turtle"], fallbackGuesses: ["Rock", "Frog", "Turtle"] },
  { word: "Whale", emoji: "🐋", category: "Animals", difficulty: "medium", aliases: ["whale"], fallbackGuesses: ["Submarine", "Fish", "Whale"] },
  { word: "Octopus", emoji: "🐙", category: "Animals", difficulty: "tricky", aliases: ["octopus"], fallbackGuesses: ["Spider", "Jellyfish", "Octopus"] },
  { word: "Snail", emoji: "🐌", category: "Animals", difficulty: "medium", aliases: ["snail"], fallbackGuesses: ["Shell", "Cinnamon Roll", "Snail"] },
  { word: "Penguin", emoji: "🐧", category: "Animals", difficulty: "medium", aliases: ["penguin"], fallbackGuesses: ["Owl", "Snowman", "Penguin"] },
  { word: "Tree", emoji: "🌳", category: "Nature", difficulty: "easy", aliases: ["tree"], fallbackGuesses: ["Broccoli", "Flower", "Tree"] },
  { word: "Leaf", emoji: "🍃", category: "Nature", difficulty: "easy", aliases: ["leaf", "leaves"], fallbackGuesses: ["Feather", "Fish", "Leaf"] },
  { word: "Sun", emoji: "☀️", category: "Nature", difficulty: "easy", aliases: ["sun", "sunshine"], fallbackGuesses: ["Flower", "Clock", "Sun"] },
  { word: "Moon", emoji: "🌙", category: "Nature", difficulty: "easy", aliases: ["moon", "crescent"], fallbackGuesses: ["Banana", "Smile", "Moon"] },
  { word: "Cloud", emoji: "☁️", category: "Nature", difficulty: "easy", aliases: ["cloud"], fallbackGuesses: ["Sheep", "Bubble", "Cloud"] },
  { word: "Rainbow", emoji: "🌈", category: "Nature", difficulty: "medium", aliases: ["rainbow"], fallbackGuesses: ["Bridge", "Slide", "Rainbow"] },
  { word: "Mountain", emoji: "⛰️", category: "Nature", difficulty: "medium", aliases: ["mountain", "mountains"], fallbackGuesses: ["Tent", "Volcano", "Mountain"] },
  { word: "Mushroom", emoji: "🍄", category: "Nature", difficulty: "medium", aliases: ["mushroom"], fallbackGuesses: ["Umbrella", "Tree", "Mushroom"] },
  { word: "Cactus", emoji: "🌵", category: "Nature", difficulty: "medium", aliases: ["cactus"], fallbackGuesses: ["Fork", "Tree", "Cactus"] },
  { word: "Volcano", emoji: "🌋", category: "Nature", difficulty: "tricky", aliases: ["volcano"], fallbackGuesses: ["Mountain", "Fire", "Volcano"] },
  { word: "Book", emoji: "📖", category: "Objects", difficulty: "easy", aliases: ["book"], fallbackGuesses: ["Door", "Notebook", "Book"] },
  { word: "Umbrella", emoji: "☂️", category: "Objects", difficulty: "easy", aliases: ["umbrella"], fallbackGuesses: ["Mushroom", "Parachute", "Umbrella"] },
  { word: "Key", emoji: "🔑", category: "Objects", difficulty: "medium", aliases: ["key"], fallbackGuesses: ["Spoon", "Lollipop", "Key"] },
  { word: "Clock", emoji: "🕰️", category: "Objects", difficulty: "medium", aliases: ["clock", "watch"], fallbackGuesses: ["Sun", "Plate", "Clock"] },
  { word: "Camera", emoji: "📷", category: "Objects", difficulty: "medium", aliases: ["camera"], fallbackGuesses: ["Robot", "Box", "Camera"] },
  { word: "Guitar", emoji: "🎸", category: "Objects", difficulty: "tricky", aliases: ["guitar"], fallbackGuesses: ["Fish", "Violin", "Guitar"] },
  { word: "Robot", emoji: "🤖", category: "Objects", difficulty: "medium", aliases: ["robot"], fallbackGuesses: ["Box", "Computer", "Robot"] },
  { word: "Crown", emoji: "👑", category: "Objects", difficulty: "medium", aliases: ["crown"], fallbackGuesses: ["Mountain", "Castle", "Crown"] },
  { word: "Balloon", emoji: "🎈", category: "Objects", difficulty: "easy", aliases: ["balloon"], fallbackGuesses: ["Lollipop", "Apple", "Balloon"] },
  { word: "Bicycle", emoji: "🚲", category: "Objects", difficulty: "tricky", aliases: ["bicycle", "bike"], fallbackGuesses: ["Glasses", "Scooter", "Bicycle"] },
  { word: "Castle", emoji: "🏰", category: "Places", difficulty: "medium", aliases: ["castle"], fallbackGuesses: ["House", "Crown", "Castle"] },
  { word: "Bridge", emoji: "🌉", category: "Places", difficulty: "tricky", aliases: ["bridge"], fallbackGuesses: ["Rainbow", "Road", "Bridge"] },
  { word: "Tent", emoji: "⛺", category: "Places", difficulty: "medium", aliases: ["tent"], fallbackGuesses: ["Mountain", "House", "Tent"] },
  { word: "Lighthouse", emoji: "🗼", category: "Places", difficulty: "tricky", aliases: ["lighthouse"], fallbackGuesses: ["Tower", "Candle", "Lighthouse"] },
  { word: "Boat", emoji: "⛵", category: "Objects", difficulty: "medium", aliases: ["boat", "sailboat", "ship"], fallbackGuesses: ["Hat", "Fish", "Boat"] },
  { word: "Train", emoji: "🚂", category: "Objects", difficulty: "medium", aliases: ["train"], fallbackGuesses: ["Bus", "Robot", "Train"] },
  { word: "Airplane", emoji: "✈️", category: "Objects", difficulty: "medium", aliases: ["airplane", "plane"], fallbackGuesses: ["Bird", "Rocket", "Airplane"] },
  { word: "Rocket", emoji: "🚀", category: "Magic", difficulty: "medium", aliases: ["rocket"], fallbackGuesses: ["Carrot", "Airplane", "Rocket"] },
  { word: "Basketball", emoji: "🏀", category: "Sports", difficulty: "easy", aliases: ["basketball"], fallbackGuesses: ["Orange", "Football", "Basketball"] },
  { word: "Baseball", emoji: "⚾", category: "Sports", difficulty: "medium", aliases: ["baseball"], fallbackGuesses: ["Egg", "Tennis Ball", "Baseball"] },
  { word: "Tennis Racket", emoji: "🎾", category: "Sports", difficulty: "tricky", aliases: ["tennis racket", "racket", "tennis racquet"], fallbackGuesses: ["Lollipop", "Butterfly Net", "Tennis Racket"] },
  { word: "Magic Wand", emoji: "🪄", category: "Magic", difficulty: "medium", aliases: ["magic wand", "wand"], fallbackGuesses: ["Stick", "Sparkler", "Magic Wand"] },
  { word: "Dragon", emoji: "🐉", category: "Magic", difficulty: "tricky", aliases: ["dragon"], fallbackGuesses: ["Lizard", "Dinosaur", "Dragon"] },
  { word: "Treasure Chest", emoji: "🧰", category: "Magic", difficulty: "tricky", aliases: ["treasure chest", "chest", "treasure box"], fallbackGuesses: ["Suitcase", "Box", "Treasure Chest"] },
];

const recentWordsKey = "lumavill-recent-words";

export function pickWord(isFirstRound: boolean): GameWordEntry {
  if (isFirstRound) {
    rememberWord(wordBank[0].word);
    return wordBank[0];
  }
  const recent = readRecentWords();
  const choices = wordBank.filter((entry) => !recent.includes(entry.word));
  const pool = choices.length > 10 ? choices : wordBank;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  rememberWord(picked.word);
  return picked;
}

export function getFallbackGuess(word: GameWordEntry, previousGuesses: string[], round: number): string {
  const previous = previousGuesses.map(normalizeGuess);
  const choices = word.fallbackGuesses.filter((guess) => !previous.includes(normalizeGuess(guess)));
  if (choices.length > 0) return choices[Math.min(round - 1, choices.length - 1)];
  return word.fallbackGuesses[word.fallbackGuesses.length - 1];
}

export function isCorrectGuess(guess: string, target: GameWordEntry): boolean {
  const normalizedGuess = normalizeGuess(guess);
  const targets = [target.word, ...target.aliases].map(normalizeGuess);
  return targets.some((alias) => normalizedGuess === alias || normalizedGuess.includes(alias));
}

export function normalizeGuess(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(an?|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ies\b/g, "y")
    .replace(/s\b/g, "");
}

function readRecentWords() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(recentWordsKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 12) as string[] : [];
  } catch {
    return [];
  }
}

function rememberWord(word: string) {
  if (typeof window === "undefined") return;
  const next = [word, ...readRecentWords().filter((item) => item !== word)].slice(0, 12);
  window.localStorage.setItem(recentWordsKey, JSON.stringify(next));
}
