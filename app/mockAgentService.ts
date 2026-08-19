export type GameWord =
  | "Birthday Cake"
  | "Cat"
  | "Coffee"
  | "Flower"
  | "Star"
  | "Pizza"
  | "Fish"
  | "House"
  | "Football"
  | "Ice Cream";

export const wordEmoji: Record<GameWord, string> = {
  "Birthday Cake": "🎂",
  Cat: "🐱",
  Coffee: "☕",
  Flower: "🌸",
  Star: "⭐",
  Pizza: "🍕",
  Fish: "🐟",
  House: "🏡",
  Football: "⚽",
  "Ice Cream": "🍦",
};

export const wordBank: GameWord[] = [
  "Birthday Cake",
  "Cat",
  "Coffee",
  "Flower",
  "Star",
  "Pizza",
  "Fish",
  "House",
  "Football",
  "Ice Cream",
];

const guesses: Record<GameWord, string[]> = {
  "Birthday Cake": ["Hamburger 🍔", "Cupcake 🧁", "Birthday Cake 🎂"],
  Cat: ["Dog 🐶", "Fox 🦊", "Cat 🐱"],
  Coffee: ["Soup 🍲", "Hot Chocolate 🍫", "Coffee ☕"],
  Flower: ["Lollipop 🍭", "Tree 🌳", "Flower 🌸"],
  Star: ["Cookie 🍪", "Sun ☀️", "Star ⭐"],
  Pizza: ["Pie 🥧", "Cheese 🧀", "Pizza 🍕"],
  Fish: ["Leaf 🍃", "Shark 🦈", "Fish 🐟"],
  House: ["Tent ⛺", "Castle 🏰", "House 🏡"],
  Football: ["Egg 🥚", "Basketball 🏀", "Football ⚽"],
  "Ice Cream": ["Mountain ⛰️", "Cupcake 🧁", "Ice Cream 🍦"],
};

export function getGuesses(word: GameWord) {
  return guesses[word];
}

export function pickWord(isFirstRound: boolean): GameWord {
  if (isFirstRound) return "Birthday Cake";
  return wordBank[Math.floor(Math.random() * wordBank.length)];
}
