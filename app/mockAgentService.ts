import { canonicalGuess } from "./i18n";

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
  if (isFirstRound && shouldUseFirstRoundDemoWord()) {
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

export function getFallbackGuess(
  word: GameWordEntry,
  previousGuesses: string[],
  round: number,
  userHints: string[] = [],
  excludeAnswer = false,
): string {
  // Canonicalize to English so the repeat-guard matches the English candidate pool
  // regardless of the display locale (a stored "汉堡" must filter out "Hamburger").
  const previous = previousGuesses.map((g) => normalizeGuess(canonicalGuess(String(g ?? "").trim())));
  const normalizedHints = userHints.map(normalizeGuess).join(" ");
  const hintNamesAnswer = [word.word, ...word.aliases].some((alias) => normalizedHints.includes(normalizeGuess(alias)));
  if (hintNamesAnswer && !previous.includes(normalizeGuess(word.word))) return word.word;

  const sameCategoryWords = wordBank
    .filter((entry) => entry.category === word.category && entry.word !== word.word)
    .map((entry) => entry.word);
  // Same-difficulty words in the same category feel closer (similar subject weight),
  // so a miss reads as "getting warmer" instead of jumping to a random topic.
  const warmWords = [...new Set(
    sameCategoryWords
      .filter((w) => difficultyOf(word, w) === word.difficulty)
      .concat(sameCategoryWords),
  )];
  // The legacy fallback lists mix in off-topic words; keep only as an absolute
  // last resort so wrong guesses stay on-category instead of landing on something wild.
  const lastResort = word.fallbackGuesses;

  // A strong, on-topic clue late in the round earns the fallback the right to name
  // the target, so a model hiccup + good teamwork can still be solved.
  const onTopicHint = hintMatchesTarget(word, normalizedHints);
  const canNameAnswer = !excludeAnswer || (onTopicHint && round >= 3);

  const pool = canNameAnswer
    ? [word.word, ...word.aliases, ...warmWords, ...lastResort]
    : [...warmWords, ...lastResort];

  const fresh = unique(pool)
    .filter((guess) => !previous.includes(normalizeGuess(guess)))
    .filter((guess) => canNameAnswer || !isCorrectGuess(guess, word))
    .filter((guess) => round >= 3 || normalizeGuess(guess) !== normalizeGuess(word.word));

  return (
    fresh[0] ??
    lastResort.find(
      (guess) => !previous.includes(normalizeGuess(guess)) && (canNameAnswer || !isCorrectGuess(guess, word)),
    ) ??
    warmWords.find((guess) => !previous.includes(normalizeGuess(guess))) ??
    sameCategoryWords.find((guess) => !previous.includes(normalizeGuess(guess))) ??
    (canNameAnswer
      ? word.word
      : (lastResort.find((guess) => !previous.includes(normalizeGuess(guess))) ?? lastResort[0]))
  );
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

function shouldUseFirstRoundDemoWord() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demoWord") === "birthday";
}

function hintMatchesTarget(word: GameWordEntry, normalizedHints: string) {
  if (!normalizedHints) return false;
  const categoryHints: Record<Category, string[]> = {
    Food: ["sweet", "eat", "food", "drink", "snack", "dessert", "tasty", "hot", "cold", "sugar", "吃", "喝", "甜", "食物", "饮料", "好吃"],
    Animals: ["animal", "pet", "tail", "fur", "wing", "water", "legs", "cute", "动物", "宠物", "尾巴", "翅膀", "水里", "可爱"],
    Nature: ["nature", "outside", "plant", "sky", "weather", "green", "自然", "户外", "植物", "天空", "绿色"],
    Objects: ["object", "tool", "use", "hold", "thing", "machine", "物品", "工具", "拿", "用", "机器"],
    Places: ["place", "building", "go", "live", "home", "地方", "建筑", "去", "住", "家"],
    Sports: ["sport", "ball", "play", "game", "运动", "球", "比赛", "玩"],
    Magic: ["magic", "fantasy", "sparkle", "fire", "story", "魔法", "幻想", "发光", "火", "故事"],
  };
  return categoryHints[word.category].some((hint) => normalizedHints.includes(normalizeGuess(hint)));
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

function difficultyOf(word: GameWordEntry, otherWord: string): Difficulty | undefined {
  return wordBank.find((entry) => entry.word === otherWord)?.difficulty;
}
