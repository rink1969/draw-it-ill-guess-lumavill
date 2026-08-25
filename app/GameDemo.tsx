"use client";

import { createContext, FormEvent, PointerEvent, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DrawingStroke, StructuredDrawing, strokesToStructuredDrawing } from "./drawingCodec";
import { requestHybridGuess } from "./hybridGuessEngine";
import { GameWordEntry, GuessAttempt, pickWord, wordBank } from "./mockAgentService";
import { categoryName, dialoguePools, difficultyName, Locale, localizeGuess, wordName } from "./i18n";

type GameState = "INVITE" | "WORD_REVEAL" | "DRAWING" | "GUESSING" | "RESULT" | "MEMORY" | "SUMMARY";
type Mood = "idle" | "thinking" | "happy" | "oops" | "dramatic" | "playful" | "confident";
type BrushSize = "Small" | "Medium" | "Large";
type DrawingSubmission = {
  image: string;
  structured: StructuredDrawing;
};
type SaveStatus = "idle" | "saving" | "saved" | "error";
type MemoryCopy = { title: string; story: string };
type GameReward = { type: "silver_ore" | "stone" | "none"; name: string; quantity: number; message: string };
type SessionStats = { games: number; totalAttempts: number; silverOre: number; stone: number };

const LocaleContext = createContext<Locale>("zh");
const useLocale = () => useContext(LocaleContext);

const brushSizes: Record<BrushSize, number> = { Small: 4, Medium: 9, Large: 16 };
const colors = ["#25231d", "#e75f54", "#4c8bd8", "#f2c94c", "#6c9f49"];

const drawingLines = [
  "Hmm... what are you drawing?",
  "I'm watching 👀",
  "This better be something I can recognize...",
  "Tiny brush moves. Big mystery.",
  "I am pretending to be calm about this.",
  "That line has main-character energy.",
];

const thinkingLines = [
  "Hmm... let me look.",
  "I think I see something...",
  "Wait...",
  "Hold still, drawing. I am inspecting you.",
  "My detective hat is imaginary, but powerful.",
  "I am squinting with maximum seriousness.",
  "There are clues in these lines. I can feel it.",
];

const clueThinkingLines = [
  "Okay, I am comparing your hint with the drawing.",
  "The clue is changing my theory...",
  "I am matching the hint to the outline now.",
  "Tiny detective mode: clue plus drawing, clue plus drawing.",
  "Wait, that hint makes one part of the drawing make sense.",
];

const wrongLines = [
  "No? Wow. Betrayed by my own confidence.",
  "Okay okay, let me look again.",
  "That was a practice guess. Very professional.",
  "I meant to be wrong. For suspense.",
  "Hmm. The drawing is being mysterious.",
];

const correctLines = [
  "YES!! I knew it!",
  "My tiny brain sparkles are unstoppable.",
  "Aha! I saw it!",
  "Victory hop incoming!",
  "I am absolutely adding this to my legend.",
];

const finalMissLines = [
  "I did not get it, but I have grown emotionally.",
  "Your drawing defeated me with style.",
  "I am putting this in the mystery corner.",
];

const hintRequestLines = [
  "Okay, I need a tiny clue. Just one hint, please.",
  "My detective brain needs a snack-sized hint.",
  "Give me one clue and I will try again with dignity.",
  "I am stuck, but not defeated. Whisper a hint?",
];

const guessOpeners: Record<Exclude<Mood, "idle" | "thinking" | "happy" | "oops">, string[]> = {
  playful: [
    "Wait... is that a {guess}? 👀",
    "Tiny guess time: {guess}?",
    "I see shapes. I see destiny. {guess}?",
    "This line over here is whispering {guess} to me.",
    "Okay, bold guess: {guess}.",
  ],
  dramatic: [
    "My reputation is on the line. {guess}?!",
    "The room goes silent... {guess}?",
    "If I am wrong, remember me kindly: {guess}.",
    "I have examined the evidence and accuse: {guess}.",
    "A hush falls over LumaVill. Is it {guess}?",
  ],
  confident: [
    "Easy. That's definitely {guess}.",
    "I am feeling shiny about this one: {guess}.",
    "Final-ish answer energy: {guess}.",
    "My official little answer is {guess}.",
    "I have a suspicious amount of confidence: {guess}.",
  ],
};

const uncertainGuessOpeners = [
  "I might be wildly wrong, but... {guess}?",
  "This is a soft guess. Very soft. {guess}?",
  "I am only {confidence}% sure, so be gentle: {guess}?",
  "The drawing is giving me {guess} energy.",
];

const retryGuessOpeners = [
  "Second look! Now I think it might be {guess}.",
  "I changed my tiny mind. {guess}?",
  "Okay, new theory: {guess}.",
  "The clues have rearranged themselves into {guess}.",
];

const clueRoundGuessOpeners = [
  "With the new clue, I am thinking {guess}.",
  "The hint points my tiny compass toward {guess}.",
  "Fresh clue, fresh courage: {guess}?",
  "Okay, clue-powered guess: {guess}.",
  "I have upgraded my theory to {guess}.",
];

const memoryTitles = [
  "Our First Drawing Game",
  "The Great Cozy Guess",
  "Kaka's Suspicious Sketch Case",
  "A Very Important Art Memory",
  "The Day the Canvas Spoke",
];

const memoryLines = [
  "Today we played Draw & Guess together.",
  "Kaka stared at the canvas with heroic seriousness.",
  "A tiny masterpiece appeared, and Kaka had opinions.",
  "The drawing had charm. The guesses had confidence. Mostly.",
];

const wordRevealLines = [
  "I picked something good. No peeking at my tiny brain.",
  "This one has excellent doodle potential.",
  "I believe in your drawing hand. Mostly.",
  "Make it mysterious, but not too mysterious.",
  "I will be watching with extremely serious eyes.",
];

function getGameReward(solved: boolean, attemptCount: number, locale: Locale = "en"): GameReward {
  if (!solved) return { type: "none", name: locale === "zh" ? "无物资" : "No material", quantity: 0, message: locale === "zh" ? "这次没有奖励，再画一题试试吧！" : "No reward this time. Try another drawing!" };
  if (attemptCount <= 3) return { type: "silver_ore", name: locale === "zh" ? "银矿石" : "Silver Ore", quantity: 1, message: locale === "zh" ? "配合迅速！这是落星镇送来的闪亮奖励。" : "Quick teamwork! A shiny reward from LumaVill." };
  if (attemptCount <= 5) return { type: "stone", name: locale === "zh" ? "石头" : "Stone", quantity: 1, message: locale === "zh" ? "你们一起解开了谜题，带回了一块实用的石头。" : "You solved it together and brought home a useful stone." };
  return { type: "none", name: locale === "zh" ? "无物资" : "No material", quantity: 0, message: locale === "zh" ? "谜题解开了，但已经错过物资奖励时限。" : "Case solved, but the material reward window has passed." };
}

export default function GameDemo() {
  const [locale, setLocale] = useState<Locale>("zh");
  const [gameState, setGameState] = useState<GameState>("INVITE");
  const [firstRound, setFirstRound] = useState(true);
  const [word, setWord] = useState<GameWordEntry>(wordBank[0]);
  const [drawing, setDrawing] = useState("");
  const [structuredDrawing, setStructuredDrawing] = useState<StructuredDrawing | null>(null);
  const [attempts, setAttempts] = useState<GuessAttempt[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<GuessAttempt | null>(null);
  const [thinking, setThinking] = useState(false);
  const [hintThinking, setHintThinking] = useState(false);
  const [thinkingLineIndex, setThinkingLineIndex] = useState(0);
  const [mood, setMood] = useState<Mood>("idle");
  const [dialogue, setDialogue] = useState("Hey! Wanna play a drawing game with me?");
  const [userHints, setUserHints] = useState<string[]>([]);
  const [hintInput, setHintInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");
  const [memorySaveKey, setMemorySaveKey] = useState("");
  const [solved, setSolved] = useState(false);
  const [modelCenterOpen, setModelCenterOpen] = useState(false);
  const [modelConnected, setModelConnected] = useState(false);
  const [guessError, setGuessError] = useState("");
  const [sessionStats, setSessionStats] = useState<SessionStats>({ games: 0, totalAttempts: 0, silverOre: 0, stone: 0 });
  const pools = dialoguePools[locale];

  useEffect(() => {
    const saved = window.localStorage.getItem("lumavill-language");
    const next = saved === "zh" || saved === "en" ? saved : navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
    setLocale(next);
  }, []);

  useEffect(() => {
    fetch("/api/model-connection")
      .then((response) => response.ok ? response.json() : { connected: false })
      .then((data: unknown) => {
        const connected = typeof data === "object" && data !== null && "connected" in data
          ? Boolean(data.connected)
          : false;
        setModelConnected(connected);
      })
      .catch(() => setModelConnected(false));
  }, []);

  function changeLocale(next: Locale) {
    setLocale(next);
    window.localStorage.setItem("lumavill-language", next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  }

  const requestNextGuess = useCallback((
    async (
      canvasImage: string,
      existingAttempts: GuessAttempt[],
      hintsForGuess = userHints,
      structuredForGuess = structuredDrawing,
    ) => {
    const round = existingAttempts.length + 1;
    const hasHint = hintsForGuess.length > 0;
    setThinking(true);
    setHintThinking(hasHint);
    setThinkingLineIndex(Math.floor(Math.random() * (hasHint ? pools.clueThinking.length : pools.thinking.length)));
    setMood("thinking");
    setCurrentAttempt(null);

    const minimumThinkTime = delay(hasHint ? 2450 : 1550);
    setGuessError("");
    try {
      const attempt = await requestHybridGuess({
        canvasImage,
        structuredDrawing: structuredForGuess,
        previousGuesses: existingAttempts.map((item) => item.guess),
        userHints: hintsForGuess,
        round,
        targetWord: word,
        locale,
      });
      await minimumThinkTime;

      const directedAttempt = gameDirector(attempt, word, round, locale);
      const nextMood = directedAttempt.isCorrect ? "confident" : randomItem(["playful", "dramatic", "confident"] as const);
      setCurrentAttempt(directedAttempt);
      setMood(nextMood);
      setDialogue(buildGuessLine(directedAttempt, nextMood, round, locale));
    } catch {
      await minimumThinkTime;
      setModelConnected(false);
      setMood("oops");
      setGuessError(locale === "zh" ? "模型连接已中断，请重新连接后继续。" : "The model connection was interrupted. Reconnect to continue.");
      setDialogue(locale === "zh" ? "我现在看不到画面了，重新连接模型后我再认真猜。" : "I can't see the drawing right now. Reconnect the model and I'll look again.");
    } finally {
      setThinking(false);
      setHintThinking(false);
    }
  }), [locale, pools, structuredDrawing, userHints, word]);

  useEffect(() => {
    if (!thinking) return;
    const lines = hintThinking ? pools.clueThinking : pools.thinking;
    setDialogue(lines[thinkingLineIndex]);
    const timer = window.setInterval(() => {
      setThinkingLineIndex((index) => {
        const next = (index + 1) % lines.length;
        setDialogue(lines[next]);
        return next;
      });
    }, 620);
    return () => window.clearInterval(timer);
  }, [hintThinking, pools, thinking, thinkingLineIndex]);

  function beginGame() {
    if (!modelConnected) {
      setModelCenterOpen(true);
      return;
    }
    const nextWord = pickWord(firstRound);
    setFirstRound(false);
    setWord(nextWord);
    setDrawing("");
    setStructuredDrawing(null);
    setAttempts([]);
    setUserHints([]);
    setHintInput("");
    setCurrentAttempt(null);
    setGuessError("");
    setSaveStatus("idle");
    setSaveError("");
    setMemorySaveKey(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    setSolved(false);
    setMood("happy");
    setDialogue(randomItem(pools.reveal));
    setGameState("WORD_REVEAL");
  }

  function startGuessing(submission: DrawingSubmission) {
    setDrawing(submission.image);
    setStructuredDrawing(submission.structured);
    setAttempts([]);
    setCurrentAttempt(null);
    setUserHints([]);
    setHintInput("");
    setSolved(false);
    setGameState("GUESSING");
    void requestNextGuess(submission.image, [], [], submission.structured);
  }

  function handleGuessAnswer(playerSaysCorrect: boolean) {
    if (!currentAttempt) return;
    const confirmedAttempt = { ...currentAttempt, isCorrect: playerSaysCorrect };
    const nextAttempts = [...attempts, confirmedAttempt];
    setAttempts(nextAttempts);

    if (playerSaysCorrect) {
      const reward = getGameReward(true, nextAttempts.length, locale);
      setSessionStats((stats) => ({
        games: stats.games + 1,
        totalAttempts: stats.totalAttempts + nextAttempts.length,
        silverOre: stats.silverOre + (reward.type === "silver_ore" ? 1 : 0),
        stone: stats.stone + (reward.type === "stone" ? 1 : 0),
      }));
      setSolved(true);
      setMood("happy");
      setDialogue(randomItem(pools.correct));
      setGameState("RESULT");
      return;
    }

    if (nextAttempts.length >= 8) {
      setSessionStats((stats) => ({
        ...stats,
        games: stats.games + 1,
        totalAttempts: stats.totalAttempts + nextAttempts.length,
      }));
      setSolved(false);
      setMood("oops");
      setDialogue(randomItem(pools.finalMiss));
      setGameState("RESULT");
      return;
    }

    if (nextAttempts.length >= 3) {
      setMood("oops");
      setCurrentAttempt(null);
      setDialogue(randomItem(pools.hintRequest));
      return;
    }

    setMood("oops");
    setDialogue(randomItem(pools.wrong));
    window.setTimeout(() => void requestNextGuess(drawing, nextAttempts), 900);
  }

  function playAgain() {
    setGameState("INVITE");
    setMood("idle");
    setSaveStatus("idle");
    setSaveError("");
    setSolved(false);
    setDrawing("");
    setStructuredDrawing(null);
    setAttempts([]);
    setUserHints([]);
    setHintInput("");
    setCurrentAttempt(null);
    setDialogue(locale === "zh" ? "嗨！想和我玩你画我猜吗？" : "Hey! Wanna play a drawing game with me?");
  }

  const displayedAttempts = currentAttempt && gameState === "GUESSING" ? [...attempts, currentAttempt] : attempts;
  const needsHint = gameState === "GUESSING" && !thinking && !currentAttempt && attempts.length >= 3;

  function submitHint() {
    const hint = hintInput.trim();
    if (!hint || thinking) return;
    const nextHints = [...userHints, hint].slice(-6);
    setUserHints(nextHints);
    setHintInput("");
    setDialogue(locale === "zh" ? "哦！这条线索改变了整个推理方向。" : "Ooh. That clue changed the whole investigation.");
    window.setTimeout(() => void requestNextGuess(drawing, attempts, nextHints), 250);
  }

  async function saveMemory(copy: MemoryCopy) {
    if (saveStatus === "saving" || saveStatus === "saved") return;
    setSaveStatus("saving");
    setSaveError("");
    try {
      const response = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saveKey: memorySaveKey || `${Date.now()}-${Math.random()}`,
          title: copy.title,
          story: copy.story,
          targetWord: word.word,
          emoji: word.emoji,
          category: word.category,
          difficulty: word.difficulty,
          drawingDataUrl: drawing,
          attempts,
          solved,
          locale,
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || (locale === "zh" ? "保存失败。" : "Save failed."));
      setSaveStatus("saved");
      setMood("happy");
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : locale === "zh" ? "Kaka 无法保存这段记忆。" : "Kaka could not save this memory.");
    }
  }

  return (
    <LocaleContext.Provider value={locale}>
    <main className={`game-shell lang-${locale}`}>
      <div className="room-backdrop" aria-hidden="true" />
      <GameChrome
        state={gameState}
        onBack={() => setGameState(sessionStats.games > 0 ? "SUMMARY" : "INVITE")}
        onOpenModels={() => setModelCenterOpen(true)}
        locale={locale}
        onLocaleChange={changeLocale}
      />
      <section className={`stage state-${gameState.toLowerCase()}`}>
        {gameState === "INVITE" && <InviteScreen connected={modelConnected} onConnect={() => setModelCenterOpen(true)} onPlay={beginGame} mood={mood} />}
        {gameState === "WORD_REVEAL" && <WordReveal word={word} dialogue={dialogue} onStart={() => setGameState("DRAWING")} />}
        {gameState === "DRAWING" && <DrawingScreen word={word} mood={mood} onSubmit={startGuessing} />}
        {gameState === "GUESSING" && (
          <GuessScreen
            attempt={currentAttempt}
            attempts={displayedAttempts}
            dialogue={dialogue}
            drawing={drawing}
            hintInput={hintInput}
            isThinking={thinking}
            isUsingHint={hintThinking}
            mood={mood}
            needsHint={needsHint}
            guessError={guessError}
            onAnswer={handleGuessAnswer}
            onHintInput={setHintInput}
            onSubmitHint={submitHint}
            onReconnect={() => setModelCenterOpen(true)}
            userHints={userHints}
          />
        )}
        {gameState === "RESULT" && (
          <ResultScreen
            word={word}
            drawing={drawing}
            attempts={attempts}
            solved={solved}
            dialogue={dialogue}
            onMemory={() => setGameState("MEMORY")}
          />
        )}
        {gameState === "MEMORY" && (
          <MemoryScreen
            word={word}
            drawing={drawing}
            attempts={attempts}
            saveStatus={saveStatus}
            saveError={saveError}
            solved={solved}
            onSave={saveMemory}
            onPlayAgain={playAgain}
            onBack={() => setGameState("SUMMARY")}
          />
        )}
        {gameState === "SUMMARY" && (
          <SessionSummary
            stats={sessionStats}
            onContinue={playAgain}
            onFinish={() => {
              setSessionStats({ games: 0, totalAttempts: 0, silverOre: 0, stone: 0 });
              playAgain();
            }}
          />
        )}
      </section>
      {modelCenterOpen && (
        <ModelCenter onClose={() => setModelCenterOpen(false)} onConnectionChange={setModelConnected} />
      )}
    </main>
    </LocaleContext.Provider>
  );
}

function gameDirector(attempt: GuessAttempt, word: GameWordEntry, round: number, locale: Locale): GuessAttempt {
  if (!attempt.isCorrect && round === 6 && Math.random() < 0.28) {
    const guess = wordName(word.word, locale);
    return { guess, confidence: 0.78, source: "director", isCorrect: true };
  }
  return attempt;
}

function GameChrome({ state, onBack, onOpenModels, locale, onLocaleChange }: { state: GameState; onBack: () => void; onOpenModels: () => void; locale: Locale; onLocaleChange: (locale: Locale) => void }) {
  const active = state === "INVITE" || state === "WORD_REVEAL" || state === "DRAWING" ? "Draw" : state === "GUESSING" || state === "RESULT" ? "Guess" : "Memory";
  const steps = locale === "zh" ? [["Draw", "绘画"], ["Guess", "猜题"], ["Memory", "记忆"]] : [["Draw", "Draw"], ["Guess", "Guess"], ["Memory", "Memory"]];
  return (
    <header className="game-chrome">
      <button className="plain-button" type="button" onClick={onBack}>← LumaVill</button>
      <nav className="progress-pills" aria-label={locale === "zh" ? "游戏进度" : "Game progress"}>
        {steps.map(([key, label]) => (
          <span className={key === active ? "active" : ""} key={key}>{label}</span>
        ))}
      </nav>
      <div className="chrome-actions">
        <button className="model-button" type="button" onClick={onOpenModels} aria-label="Open AI model center">
          <span className="model-pulse" />
          <span>{locale === "zh" ? "连接模型" : "Connect Model"}</span>
          <small>{locale === "zh" ? "使用自己的 API" : "Use your own API"}</small>
        </button>
        <div className="language-toggle" role="group" aria-label={locale === "zh" ? "切换语言" : "Switch language"}>
          <button className={locale === "zh" ? "active" : ""} type="button" onClick={() => onLocaleChange("zh")}>中</button>
          <button className={locale === "en" ? "active" : ""} type="button" onClick={() => onLocaleChange("en")}>EN</button>
        </div>
        <button className="sound-button" aria-label="Sound on" type="button">🔊</button>
      </div>
    </header>
  );
}

function ModelCenter({ onClose, onConnectionChange }: { onClose: () => void; onConnectionChange: (connected: boolean) => void }) {
  const locale = useLocale();
  const [testMessage, setTestMessage] = useState("");
  const [serviceUrl, setServiceUrl] = useState("https://api.openai.com/v1");
  const [customModel, setCustomModel] = useState("gpt-4.1-mini");
  const [apiKey, setApiKey] = useState("");
  const [customConnected, setCustomConnected] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/model-connection")
      .then((response) => response.json())
      .then((value: unknown) => {
        if (!active) return;
        const data = typeof value === "object" && value !== null
          ? value as { connected?: boolean; baseUrl?: string; model?: string }
          : {};
        setCustomConnected(Boolean(data.connected));
        onConnectionChange(Boolean(data.connected));
        if (data.baseUrl) setServiceUrl(data.baseUrl);
        if (data.model) setCustomModel(data.model);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [onConnectionChange]);

  async function saveCustomConnection(event: FormEvent) {
    event.preventDefault();
    setSavingConnection(true);
    setTestMessage("");
    try {
      const response = await fetch("/api/model-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: serviceUrl, model: customModel, apiKey, locale }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || (locale === "zh" ? "连接失败。" : "Connection failed."));
      setCustomConnected(true);
      onConnectionChange(true);
      setApiKey("");
      setTestMessage(locale === "zh" ? "已连接并安全保存。Kaka 会优先使用这个模型。" : "Connected and saved securely. Kaka will use this model first.");
    } catch (error) {
      setCustomConnected(false);
      onConnectionChange(false);
      setTestMessage(error instanceof Error ? error.message : locale === "zh" ? "连接失败。" : "Connection failed.");
    } finally {
      setSavingConnection(false);
    }
  }

  return (
    <div className="model-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="model-center" role="dialog" aria-modal="true" aria-labelledby="model-center-title">
        <div className="model-center-heading">
          <div>
            <p className="kicker">{locale === "zh" ? "Kaka 的观察镜" : "Kaka's Looking Glass"}</p>
            <h2 id="model-center-title">{locale === "zh" ? "AI 模型中心" : "AI Model Center"}</h2>
            <p>{locale === "zh" ? "选择负责观察你画作的视觉模型。" : "Choose which vision model watches your drawing."}</p>
          </div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close model center">×</button>
        </div>

        <form className="custom-connection" onSubmit={saveCustomConnection}>
          <div className="custom-connection-title">
            <div><strong>{locale === "zh" ? "连接模型" : "Connect Model"}</strong><small>{locale === "zh" ? "填写兼容 OpenAI 格式的视觉模型服务" : "Enter an OpenAI-compatible vision service"}</small></div>
            <span className={customConnected ? "connection-badge ready" : "connection-badge"}>{customConnected ? (locale === "zh" ? "已连接" : "Connected") : (locale === "zh" ? "未连接" : "Not connected")}</span>
          </div>
          <label>{locale === "zh" ? "服务地址" : "Service URL"}<input type="url" required value={serviceUrl} onChange={(event) => setServiceUrl(event.target.value)} placeholder="https://api.example.com/v1" /></label>
          <label>{locale === "zh" ? "模型名称" : "Model Name"}<input required value={customModel} onChange={(event) => setCustomModel(event.target.value)} placeholder="vision-model-name" /></label>
          <label>API Key<input type="password" required={!customConnected} value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" placeholder={customConnected ? (locale === "zh" ? "已安全保存；留空保持原密钥" : "Saved securely; leave blank to keep it") : "sk-..."} /></label>
          <button className="primary-button" disabled={savingConnection || !serviceUrl.trim() || !customModel.trim() || (!apiKey.trim() && !customConnected)} type="submit">{savingConnection ? (locale === "zh" ? "正在连接..." : "Connecting...") : (locale === "zh" ? "保存" : "Save")}</button>
        </form>

        {testMessage && <p className="test-message" aria-live="polite">{testMessage}</p>}
        <p className="privacy-note">{locale === "zh" ? "API Key 会加密保存到 HttpOnly 会话，页面脚本无法读取。连接成功后才能开始游戏。" : "Your API Key is encrypted in an HttpOnly session and cannot be read by page scripts. Connect successfully before starting the game."}</p>
      </section>
    </div>
  );
}

function InviteScreen({ connected, onConnect, onPlay, mood }: { connected: boolean; onConnect: () => void; onPlay: () => void; mood: Mood }) {
  const locale = useLocale();
  return (
    <div className="invite-layout">
      <div className="invite-copy">
        <p className="kicker">{locale === "zh" ? "落星镇伙伴游戏" : "LumaVill Partner Game"}</p>
        <h1>{locale === "zh" ? "你画，我来猜！" : "Draw It, I'll Guess!"}</h1>
        <CompanionDialogue lines={locale === "zh" ? ["嗨！想和我玩你画我猜吗？"] : ["Hey! Wanna play a drawing game with me?"]} />
        <button className="primary-button" type="button" onClick={connected ? onPlay : onConnect}>{connected ? (locale === "zh" ? "和 Kaka 一起玩" : "Play with Kaka") : (locale === "zh" ? "连接模型后开始" : "Connect a Model to Start")}</button>
      </div>
      <CompanionAvatar mood={mood} />
    </div>
  );
}

function WordReveal({ word, dialogue, onStart }: { word: GameWordEntry; dialogue: string; onStart: () => void }) {
  const locale = useLocale();
  return (
    <div className="center-stack">
      <CompanionAvatar mood="happy" compact />
      <h2>{locale === "zh" ? "你的题目" : "Your Word"}</h2>
      <CompanionDialogue lines={[dialogue]} />
      <div className="word-card">
        <span>🎨 {locale === "zh" ? "你的题目" : "YOUR WORD"}</span>
        <strong>{wordName(word.word, locale)} {word.emoji}</strong>
        <p>{categoryName(word.category, locale)} · {difficultyName(word.difficulty, locale)} · {locale === "zh" ? "画出来，但不要写出题目文字！" : "Draw it without writing the word!"}</p>
      </div>
      <button className="primary-button" type="button" onClick={onStart}>{locale === "zh" ? "开始画画" : "Start Drawing"}</button>
    </div>
  );
}

function DrawingScreen({ word, mood, onSubmit }: { word: GameWordEntry; mood: Mood; onSubmit: (submission: DrawingSubmission) => void }) {
  const locale = useLocale();
  const lines = dialoguePools[locale].drawing;
  const [line, setLine] = useState<string>(lines[0]);
  useEffect(() => {
    setLine(lines[0]);
    const timer = window.setInterval(() => setLine(randomItem(lines)), 2800);
    return () => window.clearInterval(timer);
  }, [lines]);
  return (
    <div className="draw-layout">
      <DrawingCanvas word={word} onSubmit={onSubmit} />
      <aside className="companion-panel">
        <CompanionAvatar mood={mood} compact />
        <CompanionDialogue lines={[line]} />
      </aside>
    </div>
  );
}

function DrawingCanvas({ word, onSubmit }: { word: GameWordEntry; onSubmit: (submission: DrawingSubmission) => void }) {
  const locale = useLocale();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshots = useRef<string[]>([]);
  const strokeSnapshots = useRef<DrawingStroke[][]>([]);
  const strokes = useRef<DrawingStroke[]>([]);
  const currentStroke = useRef<DrawingStroke | null>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number; normalizedX: number; normalizedY: number } | null>(null);
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState<BrushSize>("Medium");
  const [eraser, setEraser] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * scale);
    canvas.height = Math.floor(rect.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#fffdf7";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    snapshots.current = [canvas.toDataURL()];
    strokeSnapshots.current = [[]];
  }, []);

  function canvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return {
      x,
      y,
      normalizedX: (x / rect.width) * 1000,
      normalizedY: (y / rect.height) * 700,
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawing.current = true;
    lastPoint.current = canvasPoint(event);
    currentStroke.current = {
      points: [[lastPoint.current.normalizedX, lastPoint.current.normalizedY]],
      color,
      width: brushSizes[size],
      tool: eraser ? "eraser" : "brush",
    };
    const ctx = canvas.getContext("2d");
    if (!ctx || !lastPoint.current) return;
    ctx.beginPath();
    ctx.arc(lastPoint.current.x, lastPoint.current.y, brushSizes[size] / 2, 0, Math.PI * 2);
    ctx.fillStyle = eraser ? "#fffdf7" : color;
    ctx.fill();
    setHasDrawing(true);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !lastPoint.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const point = canvasPoint(event);
    currentStroke.current?.points.push([point.normalizedX, point.normalizedY]);
    ctx.strokeStyle = eraser ? "#fffdf7" : color;
    ctx.lineWidth = brushSizes[size];
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
  }

  function stopDrawing() {
    const canvas = canvasRef.current;
    if (!isDrawing.current || !canvas) return;
    isDrawing.current = false;
    if (currentStroke.current) {
      strokes.current = [...strokes.current, currentStroke.current];
      currentStroke.current = null;
    }
    snapshots.current.push(canvas.toDataURL());
    strokeSnapshots.current.push(strokes.current.map((stroke) => ({ ...stroke, points: [...stroke.points] })));
  }

  function restore(dataUrl: string) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
    };
    image.src = dataUrl;
  }

  function undo() {
    if (snapshots.current.length <= 1) return;
    snapshots.current.pop();
    strokeSnapshots.current.pop();
    strokes.current = (strokeSnapshots.current[strokeSnapshots.current.length - 1] ?? []).map((stroke) => ({ ...stroke, points: [...stroke.points] }));
    restore(snapshots.current[snapshots.current.length - 1]);
    setHasDrawing(snapshots.current.length > 1);
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fffdf7";
    ctx.fillRect(0, 0, width, height);
    snapshots.current = [canvas.toDataURL()];
    strokes.current = [];
    currentStroke.current = null;
    strokeSnapshots.current = [[]];
    setHasDrawing(false);
  }

  return (
    <section className="canvas-card">
      <div className="canvas-topline">
        <h2>{locale === "zh" ? "绘画" : "Draw"}: {wordName(word.word, locale)} {word.emoji}</h2>
        <div className="tool-row compact-tools">
          <button type="button" onClick={undo} title={locale === "zh" ? "撤销" : "Undo"}>↶</button>
          <button type="button" onClick={clear} title={locale === "zh" ? "清空" : "Clear"}>⌫</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        aria-label={`Drawing canvas for ${word.word}`}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        onPointerLeave={stopDrawing}
      />
      <div className="toolbar">
        <div className="tool-row" aria-label="Brush colors">
          {colors.map((swatch) => (
            <button
              aria-label={`Choose ${swatch}`}
              className={color === swatch && !eraser ? "selected swatch" : "swatch"}
              key={swatch}
              onClick={() => {
                setColor(swatch);
                setEraser(false);
              }}
              style={{ background: swatch }}
              type="button"
            />
          ))}
        </div>
        <div className="segmented">
          {(Object.keys(brushSizes) as BrushSize[]).map((brushSize) => (
            <button className={size === brushSize ? "selected" : ""} key={brushSize} onClick={() => setSize(brushSize)} type="button">{locale === "zh" ? ({ Small: "小", Medium: "中", Large: "大" } as const)[brushSize] : brushSize}</button>
          ))}
        </div>
        <button className={eraser ? "tool-button selected" : "tool-button"} type="button" onClick={() => setEraser((value) => !value)}>{locale === "zh" ? "橡皮擦" : "Eraser"}</button>
      </div>
      <button
        className="primary-button submit-drawing"
        disabled={!hasDrawing}
        type="button"
        onClick={() => {
          const canvas = canvasRef.current;
          if (canvas) {
            onSubmit({
              image: canvas.toDataURL("image/png"),
              structured: strokesToStructuredDrawing(strokes.current),
            });
          }
        }}
      >
        {locale === "zh" ? "让 Kaka 来猜！" : "Let Kaka Guess!"}
      </button>
    </section>
  );
}

function GuessScreen({
  attempt,
  attempts,
  dialogue,
  drawing,
  guessError,
  hintInput,
  isThinking,
  isUsingHint,
  mood,
  needsHint,
  onAnswer,
  onHintInput,
  onReconnect,
  onSubmitHint,
  userHints,
}: {
  attempt: GuessAttempt | null;
  attempts: GuessAttempt[];
  dialogue: string;
  drawing: string;
  guessError: string;
  hintInput: string;
  isThinking: boolean;
  isUsingHint: boolean;
  mood: Mood;
  needsHint: boolean;
  onAnswer: (playerSaysCorrect: boolean) => void;
  onHintInput: (value: string) => void;
  onReconnect: () => void;
  onSubmitHint: () => void;
  userHints: string[];
}) {
  const locale = useLocale();
  const round = Math.max(1, attempts.length);
  return (
    <div className="guess-layout">
      <CompanionAvatar mood={mood} />
      <div className="guess-card">
        <CompanionDialogue lines={[dialogue]} />
        <div className={isThinking ? "guess-preview thinking-preview" : "guess-preview"}>
          <img src={drawing} alt="Kaka looking at your drawing" />
          {isThinking && <span className="scan-line" aria-hidden="true" />}
        </div>
        {guessError ? (
          <div className="hint-panel connection-error">
            <p>{guessError}</p>
            <button className="primary-button" type="button" onClick={onReconnect}>{locale === "zh" ? "重新连接模型" : "Reconnect Model"}</button>
          </div>
        ) : needsHint ? (
          <div className="hint-panel">
            <p>{locale === "zh" ? "Kaka 已经猜错三次了。给她一条简短的文字提示，她会继续认真猜。" : "Kaka has missed three times. Give her a small text hint, then she will keep guessing."}</p>
            {userHints.length > 0 && (
              <div className="hint-history" aria-label="Hints already given">
                {userHints.map((hint, index) => <span key={`${hint}-${index}`}>{hint}</span>)}
              </div>
            )}
            <form
              className="hint-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmitHint();
              }}
            >
              <input
                aria-label="Give Kaka a hint"
                maxLength={80}
                onChange={(event) => onHintInput(event.target.value)}
                placeholder={locale === "zh" ? "例如：它是甜的 / 它生活在水里" : "e.g. It is sweet / It lives in water"}
                value={hintInput}
              />
              <button className="primary-button" disabled={!hintInput.trim()} type="submit">{locale === "zh" ? "提交提示" : "Give Hint"}</button>
            </form>
          </div>
        ) : isThinking || !attempt ? (
          <div className="thinking-block">
            <div className="thinking-dots" aria-label="Kaka is thinking"><i /><i /><i /></div>
            <p>{isUsingHint ? (locale === "zh" ? "Kaka 正结合你的提示重新检查画面。" : "Kaka is using your hint and checking the drawing again.") : (locale === "zh" ? "Kaka 正在仔细观察，马上就会给出答案。" : "Kaka is looking closely. She'll guess in a moment.")}</p>
            {isUsingHint && userHints.length > 0 && <span className="active-hint">{locale === "zh" ? "当前提示" : "Current clue"}: {userHints[userHints.length - 1]}</span>}
          </div>
        ) : (
          <>
            <p className="round-label">{locale === "zh" ? `第 ${round} 轮 · 信心 ${Math.round(attempt.confidence * 100)}%` : `Round ${round} · confidence ${Math.round(attempt.confidence * 100)}%`}</p>
            <h2>{attempt.guess}?</h2>
            <p className="guess-note">{guessNote(attempt, userHints.length > 0, locale)}</p>
            <div className="guess-actions">
              <button className="primary-button" type="button" onClick={() => onAnswer(true)}>{locale === "zh" ? "猜对了！🎉" : "Yes! 🎉"}</button>
              <button className="secondary-button" type="button" onClick={() => onAnswer(false)}>{locale === "zh" ? (attempts.length >= 3 ? "还是不对 😂" : "猜错了 😂") : (attempts.length >= 3 ? "Still nope 😂" : "Nope 😂")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultScreen({ word, drawing, attempts, solved, dialogue, onMemory }: { word: GameWordEntry; drawing: string; attempts: GuessAttempt[]; solved: boolean; dialogue: string; onMemory: () => void }) {
  const locale = useLocale();
  const reward = getGameReward(solved, attempts.length, locale);
  useEffect(() => {
    const timer = window.setTimeout(onMemory, 4200);
    return () => window.clearTimeout(timer);
  }, [onMemory]);
  return (
    <div className="result-layout">
      <div className="result-art">
        <span className="burst">{solved ? "🎉" : "✨"}</span>
        <h2>{solved ? (locale === "zh" ? "Kaka 猜对了！" : "Kaka guessed it!") : (locale === "zh" ? "Kaka 已经尽力啦！" : "Kaka gave it her best shot!")}</h2>
        <img src={drawing} alt="Your drawing" />
      </div>
      <div className="result-details">
        <strong>{wordName(word.word, locale)} {word.emoji}</strong>
        <GuessList attempts={attempts} />
        <RewardPanel reward={reward} attemptCount={attempts.length} />
        <CompanionDialogue lines={[dialogue]} />
      </div>
    </div>
  );
}

function MemoryScreen({ word, drawing, attempts, saveStatus, saveError, solved, onSave, onPlayAgain, onBack }: { word: GameWordEntry; drawing: string; attempts: GuessAttempt[]; saveStatus: SaveStatus; saveError: string; solved: boolean; onSave: (copy: MemoryCopy) => void; onPlayAgain: () => void; onBack: () => void }) {
  const locale = useLocale();
  const title = useMemo(() => randomItem(dialoguePools[locale].memoryTitles), [locale]);
  const story = useMemo(() => randomItem(dialoguePools[locale].memoryLines), [locale]);
  const saved = saveStatus === "saved";
  return (
    <div className="memory-layout">
      <div className="memory-heading">
        <span>✨ {locale === "zh" ? "新记忆已生成" : "New Memory Created"}</span>
        <h2>{locale === "zh" ? "游戏完成！" : "Game Complete!"}</h2>
        <p>{locale === "zh" ? "你和 Kaka 创造了一段新记忆。" : "You made a new memory with Kaka."}</p>
      </div>
      <MemoryCard word={word} drawing={drawing} attempts={attempts} solved={solved} title={title} story={story} />
      <CompanionDialogue lines={[saved ? (locale === "zh" ? "我一定会记住这一次。" : "I'm definitely remembering this one.") : (locale === "zh" ? "我要把它好好保存起来。" : "I'm keeping this."), solved ? randomItem(dialoguePools[locale].memoryLines) : (locale === "zh" ? "没解开的谜题也是很珍贵的记忆。" : "Unsolved mysteries are memories too. Very fancy.")]} />
      <div className="ending-actions">
        <button className="primary-button" disabled={saveStatus === "saving" || saved} type="button" onClick={() => onSave({ title, story })}>
          {saveStatus === "saving" ? (locale === "zh" ? "保存中..." : "Saving...") : saved ? (locale === "zh" ? "已保存 ✓" : "Saved ✓") : saveStatus === "error" ? (locale === "zh" ? "重新保存" : "Try Saving Again") : (locale === "zh" ? "保存记忆" : "Save Memory")}
        </button>
        <button className="secondary-button" type="button" onClick={onPlayAgain}>{locale === "zh" ? "再玩一题" : "Play Again"}</button>
        <button className="plain-button warm" type="button" onClick={onBack}>{locale === "zh" ? "返回落星镇" : "Back to LumaVill"}</button>
      </div>
      {saveError && <p className="save-error" role="alert">{saveError}</p>}
    </div>
  );
}

function SessionSummary({ stats, onContinue, onFinish }: { stats: SessionStats; onContinue: () => void; onFinish: () => void }) {
  const locale = useLocale();
  const rapport = getRapport(stats);
  const progress = getPartnerProgress(stats, rapport, locale);
  return (
    <div className="summary-layout">
      <CompanionAvatar mood="happy" compact />
      <article className="summary-card">
        <p className="kicker">{locale === "zh" ? "今日伙伴报告" : "Today's Partner Report"}</p>
        <h2>{locale === "zh" ? "今天我们更懂彼此了" : "We Understand Each Other Better Today"}</h2>
        <p className="summary-lead">{locale === "zh" ? "Kaka 把今天的合作认真记进了落星镇伙伴手册。" : "Kaka carefully recorded today's teamwork in the LumaVill partner journal."}</p>
        <div className="summary-stats">
          <div><span>{locale === "zh" ? "参与答题" : "Rounds Played"}</span><strong>{stats.games}</strong><small>{locale === "zh" ? "题" : "games"}</small></div>
          <div><span>{locale === "zh" ? "默契度" : "Rapport"}</span><strong>{rapport}</strong><small>%</small></div>
          <div><span>{locale === "zh" ? "平均猜测" : "Average Guesses"}</span><strong>{stats.games ? (stats.totalAttempts / stats.games).toFixed(1) : "0"}</strong><small>{locale === "zh" ? "次" : "tries"}</small></div>
        </div>
        <div className="summary-materials">
          <div><div className="reward-icon silver_ore" aria-hidden="true"><i /><i /><i /></div><span>{locale === "zh" ? "银矿石" : "Silver Ore"}</span><strong>×{stats.silverOre}</strong></div>
          <div><div className="reward-icon stone" aria-hidden="true"><i /><i /><i /></div><span>{locale === "zh" ? "石头" : "Stone"}</span><strong>×{stats.stone}</strong></div>
        </div>
        <section className="partner-progress">
          <span>{locale === "zh" ? "伙伴进步" : "PARTNER PROGRESS"}</span>
          <h3>{progress.title}</h3>
          <p>{progress.message}</p>
          <div className="rapport-track"><i style={{ width: `${rapport}%` }} /></div>
        </section>
        <CompanionDialogue lines={[progress.mimi]} />
        <div className="summary-actions">
          <button className="secondary-button" type="button" onClick={onContinue}>{locale === "zh" ? "再玩一题" : "Play Another"}</button>
          <button className="primary-button" type="button" onClick={onFinish}>{locale === "zh" ? "结束今日游戏" : "Finish for Today"}</button>
        </div>
      </article>
    </div>
  );
}

function getRapport(stats: SessionStats) {
  if (!stats.games) return 0;
  const average = stats.totalAttempts / stats.games;
  const practiceBonus = Math.min(8, (stats.games - 1) * 2);
  return Math.max(45, Math.min(98, Math.round(100 - (average - 1) * 13 + practiceBonus)));
}

function getPartnerProgress(stats: SessionStats, rapport: number, locale: Locale) {
  if (locale === "en") {
    if (rapport >= 90) return { title: "Unlocked: Perfect Sync", message: "You can now catch each other's meaning from just a few lines. Your observation and expression are both sharper.", mimi: "Your lines make sense to me faster now. We're becoming a real team!" };
    if (rapport >= 75) return { title: "Unlocked: Clue Partners", message: "Kaka is better at combining outlines and hints, and you are better at drawing the key features.", mimi: "I learned which clues matter most in your drawings today." };
    if (stats.games >= 2) return { title: "Unlocked: Patient Practice", message: "Repeated guesses helped you build a shared language. Next time, you will find the right direction faster.", mimi: "We kept trying, and now I understand your drawing style a little better." };
    return { title: "Unlocked: First Shared Look", message: "You and Kaka completed a full round of teamwork. Your partnership has begun to grow.", mimi: "Today I started learning how you turn ideas into lines." };
  }
  if (rapport >= 90) return { title: "达成：心有灵犀", message: "你们已经能从很少的线条里抓住彼此的重点，观察与表达都更精准了。", mimi: "我现在能更快看懂你的线条了，我们越来越像真正的搭档！" };
  if (rapport >= 75) return { title: "达成：线索搭档", message: "Kaka 更会结合轮廓与提示，你也更懂得如何画出关键特征。", mimi: "今天我学会了哪些线索在你的画里最重要。" };
  if (stats.games >= 2) return { title: "达成：耐心练习", message: "你们在反复猜测中建立了共同语言，下一次会更快找到正确方向。", mimi: "我们一直没有放弃，现在我更了解你的绘画方式了。" };
  return { title: "达成：第一次共同观察", message: "你和 Kaka 完成了一次完整协作，伙伴默契已经开始生长。", mimi: "今天我开始明白，你是怎样把想法变成线条的。" };
}

function MemoryCard({ word, drawing, attempts, solved, title, story }: { word: GameWordEntry; drawing: string; attempts: GuessAttempt[]; solved: boolean; title: string; story: string }) {
  const locale = useLocale();
  const reward = getGameReward(solved, attempts.length, locale);
  return (
    <article className="memory-card">
      <img src={drawing} alt="Saved drawing thumbnail" />
      <div>
        <h3>{title}</h3>
        <p>{story}</p>
        <p>{locale === "zh" ? "你画的是" : "You drew"}: <b>{word.emoji} {wordName(word.word, locale)}</b></p>
        <p>{locale === "zh" ? "Kaka 的猜测" : "Kaka guessed"}:</p>
        <ul>{attempts.map((attempt, index) => <li key={`${attempt.guess}-${index}`}>{attempt.guess} {attempt.isCorrect ? "✅" : "❌"}</li>)}</ul>
        <strong>{solved ? (locale === "zh" ? `Kaka 在第 ${attempts.length} 次猜对了。` : `Kaka got it on try ${attempts.length}.`) : (locale === "zh" ? "Kaka 这次没能解开谜题。" : "Kaka did not crack the case this time.")}</strong>
        <p className={`memory-reward reward-${reward.type}`}>{reward.quantity > 0 ? `${locale === "zh" ? "奖励" : "Reward"}: ${reward.name} ×${reward.quantity}` : (locale === "zh" ? "奖励：无物资" : "Reward: No material")}</p>
      </div>
    </article>
  );
}

function RewardPanel({ reward, attemptCount }: { reward: GameReward; attemptCount: number }) {
  const locale = useLocale();
  return (
    <section className={`reward-panel reward-${reward.type}`} aria-label="Round reward">
      <div className={`reward-icon ${reward.type}`} aria-hidden="true"><i /><i /><i /></div>
      <div>
        <span>{locale === "zh" ? `本轮奖励 · ${attemptCount} 次猜测` : `ROUND REWARD · ${attemptCount} ${attemptCount === 1 ? "GUESS" : "GUESSES"}`}</span>
        <h3>{reward.quantity > 0 ? `${reward.name} ×${reward.quantity}` : reward.name}</h3>
        <p>{reward.message}</p>
      </div>
    </section>
  );
}

function GuessList({ attempts }: { attempts: GuessAttempt[] }) {
  if (attempts.length === 0) return null;
  return (
    <ol>
      {attempts.map((attempt, index) => (
        <li key={`${attempt.guess}-${index}`}>{attempt.guess} {attempt.isCorrect ? "✅" : "❌"}</li>
      ))}
    </ol>
  );
}

function CompanionAvatar({ mood, compact = false }: { mood: Mood; compact?: boolean }) {
  const locale = useLocale();
  return (
    <div className={`avatar-wrap ${compact ? "compact" : ""} mood-${mood}`} aria-label="Kaka">
      <img src="/mimi-gator.png" alt={locale === "zh" ? "你的绘画伙伴 Kaka" : "Kaka, your playful drawing partner"} />
      <span className="shadow" />
    </div>
  );
}

function CompanionDialogue({ lines }: { lines: string[] }) {
  return <div className="dialogue">{lines.map((line) => <p key={line}>{line}</p>)}</div>;
}

function buildGuessLine(attempt: GuessAttempt, mood: Mood, round: number, locale: Locale) {
  const guess = attempt.guess;
  if (locale === "zh") {
    if (round >= 3) return fillGuessLine(randomItem(["结合新线索，我觉得是{guess}。", "提示把我的小指南针指向了{guess}。", "好，线索加持的答案：{guess}。"]), attempt);
    if (round === 2) return fillGuessLine(randomItem(["再看一次！我觉得可能是{guess}。", "我改变主意了，是{guess}吗？", "好，新推理：{guess}。"]), attempt);
    if (attempt.confidence < 0.48) return fillGuessLine(randomItem(["我可能错得很离谱，不过……是{guess}吗？", "我只有{confidence}%的把握：{guess}？"]), attempt);
    return fillGuessLine(randomItem(["等等……这是{guess}吗？", "大胆猜一下：{guess}。", "我认真检查了证据，答案是{guess}！"]), attempt);
  }
  if (round >= 3) return fillGuessLine(randomItem(clueRoundGuessOpeners), attempt);
  if (round === 2) return fillGuessLine(randomItem(retryGuessOpeners), attempt);
  if (attempt.confidence < 0.48) return fillGuessLine(randomItem(uncertainGuessOpeners), attempt);
  if (mood !== "playful" && mood !== "dramatic" && mood !== "confident") return `Is it... ${guess}?`;
  return fillGuessLine(randomItem(guessOpeners[mood]), attempt);
}

function guessNote(attempt: GuessAttempt, hasHint: boolean, locale: Locale) {
  if (hasHint) return locale === "zh" ? "Kaka 把你的提示和画面仔细比较后才给出答案。" : "Kaka weighed your hint against the drawing before guessing.";
  if (attempt.source === "vision") return locale === "zh" ? "Kaka 是认真观察你的画后得出这个答案的。" : "Kaka spotted this from your drawing.";
  return locale === "zh" ? "Kaka正在猜测" : "Kaka is guessing";
}

function fillGuessLine(template: string, attempt: GuessAttempt) {
  return template
    .replace("{guess}", attempt.guess)
    .replace("{confidence}", String(Math.round(attempt.confidence * 100)));
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
