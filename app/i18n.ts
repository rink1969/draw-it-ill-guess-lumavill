import { Category, Difficulty, GameWordEntry } from "./mockAgentService";

export type Locale = "en" | "zh";

const zhWords: Record<string, string> = {
  "Birthday Cake": "生日蛋糕", Cat: "猫", Coffee: "咖啡", Flower: "花", Star: "星星", Pizza: "披萨", Fish: "鱼", House: "房子",
  Football: "足球", "Ice Cream": "冰淇淋", Apple: "苹果", Banana: "香蕉", Cookie: "饼干", Donut: "甜甜圈", Carrot: "胡萝卜",
  Strawberry: "草莓", Taco: "塔可", Sandwich: "三明治", Pancake: "煎饼", Watermelon: "西瓜", Dog: "狗", Rabbit: "兔子", Bird: "鸟",
  Butterfly: "蝴蝶", Frog: "青蛙", Turtle: "乌龟", Whale: "鲸鱼", Octopus: "章鱼", Snail: "蜗牛", Penguin: "企鹅", Tree: "树",
  Leaf: "叶子", Sun: "太阳", Moon: "月亮", Cloud: "云", Rainbow: "彩虹", Mountain: "山", Mushroom: "蘑菇", Cactus: "仙人掌",
  Volcano: "火山", Book: "书", Umbrella: "雨伞", Key: "钥匙", Clock: "时钟", Camera: "相机", Guitar: "吉他", Robot: "机器人",
  Crown: "皇冠", Balloon: "气球", Bicycle: "自行车", Castle: "城堡", Bridge: "桥", Tent: "帐篷", Lighthouse: "灯塔", Boat: "船",
  Train: "火车", Airplane: "飞机", Rocket: "火箭", Basketball: "篮球", Baseball: "棒球", "Tennis Racket": "网球拍",
  "Magic Wand": "魔法棒", Dragon: "龙", "Treasure Chest": "宝箱",
  Hamburger: "汉堡", Cupcake: "纸杯蛋糕", Fox: "狐狸", Soup: "汤", "Hot Chocolate": "热巧克力", Lollipop: "棒棒糖",
  Pie: "派", Cheese: "奶酪", Shark: "鲨鱼", Egg: "鸡蛋", Tomato: "番茄", Cherry: "樱桃", Boomerang: "回旋镖",
  Coin: "硬币", Wheel: "车轮", Bagel: "贝果", Pencil: "铅笔", Heart: "爱心", Shell: "贝壳", Toast: "吐司", Plate: "盘子",
  "Cookie Stack": "饼干塔", "Beach Ball": "沙滩球", Bear: "熊", Mouse: "老鼠", Bow: "蝴蝶结", Fairy: "仙女", Lizard: "蜥蜴",
  Rock: "石头", Submarine: "潜艇", Spider: "蜘蛛", Jellyfish: "水母", "Cinnamon Roll": "肉桂卷", Owl: "猫头鹰", Snowman: "雪人",
  Broccoli: "西兰花", Feather: "羽毛", Smile: "笑脸", Sheep: "绵羊", Bubble: "泡泡", Slide: "滑梯", Fork: "叉子", Fire: "火",
  Door: "门", Notebook: "笔记本", Parachute: "降落伞", Spoon: "勺子", Violin: "小提琴", Box: "盒子", Computer: "电脑",
  Glasses: "眼镜", Scooter: "滑板车", Road: "道路", Tower: "塔", Candle: "蜡烛", Hat: "帽子", Bus: "公交车", Orange: "橙子",
  "Tennis Ball": "网球", "Butterfly Net": "捕蝶网", Stick: "木棍", Sparkler: "仙女棒", Dinosaur: "恐龙", Suitcase: "行李箱",
};

const zhCategories: Record<Category, string> = { Food: "食物", Animals: "动物", Nature: "自然", Objects: "物品", Places: "地点", Sports: "运动", Magic: "魔法" };
const zhDifficulties: Record<Difficulty, string> = { easy: "简单", medium: "中等", tricky: "挑战" };

export function wordName(word: string, locale: Locale) { return locale === "zh" ? zhWords[word] ?? word : word; }
export function categoryName(category: Category, locale: Locale) { return locale === "zh" ? zhCategories[category] : category; }
export function difficultyName(difficulty: Difficulty, locale: Locale) { return locale === "zh" ? zhDifficulties[difficulty] : difficulty; }
export function localizeGuess(guess: string, locale: Locale) { return locale === "zh" ? zhWords[guess] ?? guess : guess; }
export function canonicalGuess(guess: string) {
  const match = Object.entries(zhWords).find(([, chinese]) => chinese === guess.trim());
  return match?.[0] ?? guess;
}

export const dialoguePools = {
  en: {
    drawing: ["Hmm... what are you drawing?", "I'm watching closely.", "This better be something I can recognize...", "Tiny brush moves. Big mystery.", "That line has main-character energy."],
    thinking: ["Hmm... let me look.", "I think I see something...", "Wait...", "Hold still, drawing. I am inspecting you.", "There are clues in these lines. I can feel it."],
    clueThinking: ["Okay, I am comparing your hint with the drawing.", "The clue is changing my theory...", "I am matching the hint to the outline now.", "Wait, that hint makes one part of the drawing make sense."],
    wrong: ["No? Betrayed by my own confidence.", "Okay, let me look again.", "That was a practice guess. Very professional.", "Hmm. The drawing is being mysterious."],
    correct: ["YES!! I knew it!", "My tiny brain sparkles are unstoppable.", "Aha! I saw it!", "Victory hop incoming!"],
    finalMiss: ["I did not get it, but I have grown emotionally.", "Your drawing defeated me with style.", "I am putting this in the mystery corner."],
    hintRequest: ["Okay, I need a tiny clue. Just one hint, please.", "My detective brain needs a snack-sized hint.", "Give me one clue and I will try again."],
    reveal: ["I picked something good. No peeking at my tiny brain.", "This one has excellent doodle potential.", "Make it mysterious, but not too mysterious."],
    memoryTitles: ["Our First Drawing Game", "The Great Cozy Guess", "Mimi's Suspicious Sketch Case", "A Very Important Art Memory"],
    memoryLines: ["Today we played Draw & Guess together.", "Mimi stared at the canvas with heroic seriousness.", "A tiny masterpiece appeared, and Mimi had opinions."],
  },
  zh: {
    drawing: ["嗯……你在画什么？", "我正认真看着呢。", "最好画得让我认得出来……", "小小的笔触，大大的谜团。", "这根线很有主角气质。"],
    thinking: ["嗯……让我仔细看看。", "我好像看出点什么了……", "等等……", "别动，我正在认真检查这幅画。", "这些线条里一定藏着线索。"],
    clueThinking: ["好，我正在把提示和画面放在一起比较。", "这条线索正在改变我的推理……", "我在把提示和轮廓一一对应。", "等等，这个提示让画里的一部分说得通了。"],
    wrong: ["不对吗？我的自信背叛了我。", "好吧，让我再看一次。", "刚才只是练习性猜测，非常专业。", "嗯，这幅画还挺神秘。"],
    correct: ["对啦！我就知道！", "我的小脑袋正在闪闪发光。", "啊哈，我看出来了！", "胜利跳跃准备！"],
    finalMiss: ["我没猜出来，但我已经成长了。", "你的画很有风格地打败了我。", "我要把它放进未解之谜角落。"],
    hintRequest: ["好吧，我需要一点小提示。", "我的侦探脑袋需要一小口线索。", "给我一条提示，我会再认真猜一次。"],
    reveal: ["我选了个好题目，不许偷看我的小脑袋。", "这个题目很适合涂鸦。", "画得神秘一点，但别太神秘。"],
    memoryTitles: ["我们的第一次你画我猜", "温暖猜谜大作战", "Mimi 的神秘画案", "一段重要的绘画记忆"],
    memoryLines: ["今天我们一起玩了你画我猜。", "Mimi 非常认真地盯着画布。", "一幅小小的杰作出现了，Mimi 也有了自己的判断。"],
  },
} as const;

export function localizedWord(word: GameWordEntry, locale: Locale) {
  return { ...word, displayName: wordName(word.word, locale) };
}
