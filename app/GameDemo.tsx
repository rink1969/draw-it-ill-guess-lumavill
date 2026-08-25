"use client";

import { FormEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrawingStroke, StructuredDrawing, strokesToStructuredDrawing } from "./drawingCodec";
import { requestHybridGuess } from "./hybridGuessEngine";
import { GameWordEntry, GuessAttempt, pickWord, wordBank } from "./mockAgentService";

type GameState = "INVITE" | "WORD_REVEAL" | "DRAWING" | "GUESSING" | "RESULT" | "MEMORY";
type Mood = "idle" | "thinking" | "happy" | "oops" | "dramatic" | "playful" | "confident";
type BrushSize = "Small" | "Medium" | "Large";
type DrawingSubmission = {
  image: string;
  structured: StructuredDrawing;
};
type SaveStatus = "idle" | "saving" | "saved" | "error";
type MemoryCopy = { title: string; story: string };
type GameReward = { type: "silver_ore" | "stone" | "none"; name: string; quantity: number; message: string };

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
  "Mimi's Suspicious Sketch Case",
  "A Very Important Art Memory",
  "The Day the Canvas Spoke",
];

const memoryLines = [
  "Today we played Draw & Guess together.",
  "Mimi stared at the canvas with heroic seriousness.",
  "A tiny masterpiece appeared, and Mimi had opinions.",
  "The drawing had charm. The guesses had confidence. Mostly.",
];

const wordRevealLines = [
  "I picked something good. No peeking at my tiny brain.",
  "This one has excellent doodle potential.",
  "I believe in your drawing hand. Mostly.",
  "Make it mysterious, but not too mysterious.",
  "I will be watching with extremely serious eyes.",
];

function getGameReward(solved: boolean, attemptCount: number): GameReward {
  if (!solved) return { type: "none", name: "No material", quantity: 0, message: "No reward this time. Try another drawing!" };
  if (attemptCount <= 3) return { type: "silver_ore", name: "Silver Ore", quantity: 1, message: "Quick teamwork! A shiny reward from LumaVill." };
  if (attemptCount <= 5) return { type: "stone", name: "Stone", quantity: 1, message: "You solved it together and brought home a useful stone." };
  return { type: "none", name: "No material", quantity: 0, message: "Case solved, but the material reward window has passed." };
}

export default function GameDemo() {
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
    setThinkingLineIndex(Math.floor(Math.random() * (hasHint ? clueThinkingLines.length : thinkingLines.length)));
    setMood("thinking");
    setCurrentAttempt(null);

    const minimumThinkTime = delay(hasHint ? 2450 : 1550);
    const attempt = await requestHybridGuess({
      canvasImage,
      structuredDrawing: structuredForGuess,
      previousGuesses: existingAttempts.map((item) => item.guess),
      userHints: hintsForGuess,
      round,
      targetWord: word,
    });
    await minimumThinkTime;

    const directedAttempt = gameDirector(attempt, word, round, existingAttempts);
    const nextMood = directedAttempt.isCorrect ? "confident" : randomItem(["playful", "dramatic", "confident"] as const);
    setCurrentAttempt(directedAttempt);
    setThinking(false);
    setHintThinking(false);
    setMood(nextMood);
    setDialogue(buildGuessLine(directedAttempt, nextMood, round));
  }), [structuredDrawing, userHints, word]);

  useEffect(() => {
    if (!thinking) return;
    const lines = hintThinking ? clueThinkingLines : thinkingLines;
    setDialogue(lines[thinkingLineIndex]);
    const timer = window.setInterval(() => {
      setThinkingLineIndex((index) => {
        const next = (index + 1) % lines.length;
        setDialogue(lines[next]);
        return next;
      });
    }, 620);
    return () => window.clearInterval(timer);
  }, [hintThinking, thinking, thinkingLineIndex]);

  function beginGame() {
    const nextWord = pickWord(firstRound);
    setFirstRound(false);
    setWord(nextWord);
    setDrawing("");
    setStructuredDrawing(null);
    setAttempts([]);
    setUserHints([]);
    setHintInput("");
    setCurrentAttempt(null);
    setSaveStatus("idle");
    setSaveError("");
    setMemorySaveKey(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    setSolved(false);
    setMood("happy");
    setDialogue(randomItem(wordRevealLines));
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
      setSolved(true);
      setMood("happy");
      setDialogue(randomItem(correctLines));
      window.setTimeout(() => setGameState("RESULT"), 900);
      return;
    }

    if (nextAttempts.length >= 3) {
      setMood("oops");
      setCurrentAttempt(null);
      setDialogue(randomItem(hintRequestLines));
      return;
    }

    setMood("oops");
    setDialogue(randomItem(wrongLines));
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
    setDialogue("Hey! Wanna play a drawing game with me?");
  }

  const displayedAttempts = currentAttempt && gameState === "GUESSING" ? [...attempts, currentAttempt] : attempts;
  const needsHint = gameState === "GUESSING" && !thinking && !currentAttempt && attempts.length >= 3;

  function submitHint() {
    const hint = hintInput.trim();
    if (!hint || thinking) return;
    const nextHints = [...userHints, hint].slice(-6);
    setUserHints(nextHints);
    setHintInput("");
    setDialogue("Ooh. That clue changed the whole investigation.");
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
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Save failed.");
      setSaveStatus("saved");
      setMood("happy");
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Mimi could not save this memory.");
    }
  }

  return (
    <main className="game-shell">
      <div className="room-backdrop" aria-hidden="true" />
      <GameChrome state={gameState} onOpenModels={() => setModelCenterOpen(true)} />
      <section className={`stage state-${gameState.toLowerCase()}`}>
        {gameState === "INVITE" && <InviteScreen onPlay={beginGame} mood={mood} />}
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
            onAnswer={handleGuessAnswer}
            onHintInput={setHintInput}
            onSubmitHint={submitHint}
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
          />
        )}
      </section>
      {modelCenterOpen && (
        <ModelCenter onClose={() => setModelCenterOpen(false)} />
      )}
    </main>
  );
}

function gameDirector(attempt: GuessAttempt, word: GameWordEntry, round: number, existingAttempts: GuessAttempt[]): GuessAttempt {
  if (attempt.isCorrect) return attempt;
  if (attempt.source === "fallback") return attempt;
  const alreadyGuessed = existingAttempts.some((item) => item.guess.toLowerCase() === attempt.guess.toLowerCase());
  if (alreadyGuessed) {
    return {
      guess: word.fallbackGuesses.find((guess) => !existingAttempts.some((item) => item.guess.toLowerCase() === guess.toLowerCase())) ?? attempt.guess,
      confidence: 0.42,
      source: "director",
      isCorrect: false,
    };
  }
  const shouldNudgeOnLastRound = round === 3 && Math.random() < 0.28;
  if (shouldNudgeOnLastRound) {
    const guess = word.aliases[0] ?? word.word;
    return { guess, confidence: 0.76, source: "director", isCorrect: true };
  }
  return attempt;
}

function GameChrome({ state, onOpenModels }: { state: GameState; onOpenModels: () => void }) {
  const active = state === "INVITE" || state === "WORD_REVEAL" || state === "DRAWING" ? "Draw" : state === "GUESSING" || state === "RESULT" ? "Guess" : "Memory";
  return (
    <header className="game-chrome">
      <button className="plain-button" type="button">← LumaVill</button>
      <nav className="progress-pills" aria-label="Game progress">
        {["Draw", "Guess", "Memory"].map((step) => (
          <span className={step === active ? "active" : ""} key={step}>{step}</span>
        ))}
      </nav>
      <div className="chrome-actions">
        <button className="model-button" type="button" onClick={onOpenModels} aria-label="Open AI model center">
          <span className="model-pulse" />
          <span>连接模型</span>
          <small>Use your own API</small>
        </button>
        <button className="sound-button" aria-label="Sound on" type="button">🔊</button>
      </div>
    </header>
  );
}

function ModelCenter({ onClose }: { onClose: () => void }) {
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
      .then((data: { connected?: boolean; baseUrl?: string; model?: string }) => {
        if (!active) return;
        setCustomConnected(Boolean(data.connected));
        if (data.baseUrl) setServiceUrl(data.baseUrl);
        if (data.model) setCustomModel(data.model);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function saveCustomConnection(event: FormEvent) {
    event.preventDefault();
    setSavingConnection(true);
    setTestMessage("");
    try {
      const response = await fetch("/api/model-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: serviceUrl, model: customModel, apiKey }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Connection failed.");
      setCustomConnected(true);
      setApiKey("");
      setTestMessage("Connected and saved for this browser session. Mimi will use this model first.");
    } catch (error) {
      setCustomConnected(false);
      setTestMessage(error instanceof Error ? error.message : "Connection failed.");
    } finally {
      setSavingConnection(false);
    }
  }

  return (
    <div className="model-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="model-center" role="dialog" aria-modal="true" aria-labelledby="model-center-title">
        <div className="model-center-heading">
          <div>
            <p className="kicker">Mimi's looking glass</p>
            <h2 id="model-center-title">AI Model Center</h2>
            <p>Choose which vision model watches your drawing.</p>
          </div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close model center">×</button>
        </div>

        <form className="custom-connection" onSubmit={saveCustomConnection}>
          <div className="custom-connection-title">
            <div><strong>连接模型</strong><small>填写兼容 OpenAI 格式的视觉模型服务</small></div>
            <span className={customConnected ? "connection-badge ready" : "connection-badge"}>{customConnected ? "已连接" : "未连接"}</span>
          </div>
          <label>服务地址<input type="url" required value={serviceUrl} onChange={(event) => setServiceUrl(event.target.value)} placeholder="https://api.example.com/v1" /></label>
          <label>模型名称<input required value={customModel} onChange={(event) => setCustomModel(event.target.value)} placeholder="vision-model-name" /></label>
          <label>API Key<input type="password" required={!customConnected} value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" placeholder={customConnected ? "已安全保存；留空保持原密钥" : "sk-..."} /></label>
          <button className="primary-button" disabled={savingConnection || !serviceUrl.trim() || !customModel.trim() || (!apiKey.trim() && !customConnected)} type="submit">{savingConnection ? "正在连接..." : "保存"}</button>
        </form>

        {testMessage && <p className="test-message" aria-live="polite">{testMessage}</p>}
        <p className="privacy-note">API Key 会加密保存到 HttpOnly 会话，页面脚本无法读取；连接不可用时游戏仍会进入 fallback 模式。</p>
      </section>
    </div>
  );
}

function InviteScreen({ onPlay, mood }: { onPlay: () => void; mood: Mood }) {
  return (
    <div className="invite-layout">
      <div className="invite-copy">
        <p className="kicker">Draw It, I'll Guess!</p>
        <h1>你画，我来猜！</h1>
        <CompanionDialogue lines={["Hey! Wanna play a drawing game with me?", "I'll give you a word. You draw it, and I'll guess!"]} />
        <button className="primary-button" type="button" onClick={onPlay}>Play with Mimi</button>
      </div>
      <CompanionAvatar mood={mood} />
    </div>
  );
}

function WordReveal({ word, dialogue, onStart }: { word: GameWordEntry; dialogue: string; onStart: () => void }) {
  return (
    <div className="center-stack">
      <CompanionAvatar mood="happy" compact />
      <h2>Mimi picked a word for you!</h2>
      <CompanionDialogue lines={[dialogue]} />
      <div className="word-card">
        <span>🎨 YOUR WORD</span>
        <strong>{word.word} {word.emoji}</strong>
        <p>{word.category} · {word.difficulty} · Draw it without writing the word!</p>
      </div>
      <button className="primary-button" type="button" onClick={onStart}>Start Drawing</button>
    </div>
  );
}

function DrawingScreen({ word, mood, onSubmit }: { word: GameWordEntry; mood: Mood; onSubmit: (submission: DrawingSubmission) => void }) {
  const [line, setLine] = useState(drawingLines[0]);
  useEffect(() => {
    const timer = window.setInterval(() => setLine(randomItem(drawingLines)), 2800);
    return () => window.clearInterval(timer);
  }, []);
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
        <h2>Draw: {word.word} {word.emoji}</h2>
        <div className="tool-row compact-tools">
          <button type="button" onClick={undo} title="Undo">↶</button>
          <button type="button" onClick={clear} title="Clear">⌫</button>
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
            <button className={size === brushSize ? "selected" : ""} key={brushSize} onClick={() => setSize(brushSize)} type="button">{brushSize}</button>
          ))}
        </div>
        <button className={eraser ? "tool-button selected" : "tool-button"} type="button" onClick={() => setEraser((value) => !value)}>Eraser</button>
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
        Let Mimi Guess!
      </button>
    </section>
  );
}

function GuessScreen({
  attempt,
  attempts,
  dialogue,
  drawing,
  hintInput,
  isThinking,
  isUsingHint,
  mood,
  needsHint,
  onAnswer,
  onHintInput,
  onSubmitHint,
  userHints,
}: {
  attempt: GuessAttempt | null;
  attempts: GuessAttempt[];
  dialogue: string;
  drawing: string;
  hintInput: string;
  isThinking: boolean;
  isUsingHint: boolean;
  mood: Mood;
  needsHint: boolean;
  onAnswer: (playerSaysCorrect: boolean) => void;
  onHintInput: (value: string) => void;
  onSubmitHint: () => void;
  userHints: string[];
}) {
  const round = Math.max(1, attempts.length);
  return (
    <div className="guess-layout">
      <CompanionAvatar mood={mood} />
      <div className="guess-card">
        <CompanionDialogue lines={[dialogue]} />
        <div className={isThinking ? "guess-preview thinking-preview" : "guess-preview"}>
          <img src={drawing} alt="Mimi looking at your drawing" />
          {isThinking && <span className="scan-line" aria-hidden="true" />}
        </div>
        {needsHint ? (
          <div className="hint-panel">
            <p>Mimi has missed three times. Give her a small text hint, then she will keep guessing.</p>
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
                aria-label="Give Mimi a hint"
                maxLength={80}
                onChange={(event) => onHintInput(event.target.value)}
                placeholder="e.g. It is sweet / It lives in water"
                value={hintInput}
              />
              <button className="primary-button" disabled={!hintInput.trim()} type="submit">Give Hint</button>
            </form>
          </div>
        ) : isThinking || !attempt ? (
          <div className="thinking-block">
            <div className="thinking-dots" aria-label="Mimi is thinking"><i /><i /><i /></div>
            <p>{isUsingHint ? "Mimi is using your hint and checking the drawing again." : "Mimi is looking closely. She'll guess in a moment."}</p>
            {isUsingHint && userHints.length > 0 && <span className="active-hint">Current clue: {userHints[userHints.length - 1]}</span>}
          </div>
        ) : (
          <>
            <p className="round-label">Round {round} · confidence {Math.round(attempt.confidence * 100)}%</p>
            <h2>{attempt.guess}?</h2>
            <p className="guess-note">{guessNote(attempt, userHints.length > 0)}</p>
            <div className="guess-actions">
              <button className="primary-button" type="button" onClick={() => onAnswer(true)}>Yes! 🎉</button>
              <button className="secondary-button" type="button" onClick={() => onAnswer(false)}>{attempts.length >= 3 ? "Still nope 😂" : "Nope 😂"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultScreen({ word, drawing, attempts, solved, dialogue, onMemory }: { word: GameWordEntry; drawing: string; attempts: GuessAttempt[]; solved: boolean; dialogue: string; onMemory: () => void }) {
  const reward = getGameReward(solved, attempts.length);
  useEffect(() => {
    const timer = window.setTimeout(onMemory, 4200);
    return () => window.clearTimeout(timer);
  }, [onMemory]);
  return (
    <div className="result-layout">
      <div className="result-art">
        <span className="burst">{solved ? "🎉" : "✨"}</span>
        <h2>{solved ? "Mimi guessed it!" : "Mimi gave it her best shot!"}</h2>
        <img src={drawing} alt="Your drawing" />
      </div>
      <div className="result-details">
        <strong>{word.word} {word.emoji}</strong>
        <GuessList attempts={attempts} />
        <RewardPanel reward={reward} attemptCount={attempts.length} />
        <CompanionDialogue lines={[dialogue, solved ? randomItem(correctLines) : "I'm keeping this mystery for training my vibes."]} />
      </div>
    </div>
  );
}

function MemoryScreen({ word, drawing, attempts, saveStatus, saveError, solved, onSave, onPlayAgain }: { word: GameWordEntry; drawing: string; attempts: GuessAttempt[]; saveStatus: SaveStatus; saveError: string; solved: boolean; onSave: (copy: MemoryCopy) => void; onPlayAgain: () => void }) {
  const title = useMemo(() => randomItem(memoryTitles), []);
  const story = useMemo(() => randomItem(memoryLines), []);
  const saved = saveStatus === "saved";
  return (
    <div className="memory-layout">
      <div className="memory-heading">
        <span>✨ New Memory Created</span>
        <h2>Game Complete!</h2>
        <p>You made a new memory with Mimi.</p>
      </div>
      <MemoryCard word={word} drawing={drawing} attempts={attempts} solved={solved} title={title} story={story} />
      <CompanionDialogue lines={[saved ? "I'm definitely remembering this one." : "I'm keeping this.", solved ? randomItem(memoryLines) : "Unsolved mysteries are memories too. Very fancy."]} />
      <div className="ending-actions">
        <button className="primary-button" disabled={saveStatus === "saving" || saved} type="button" onClick={() => onSave({ title, story })}>
          {saveStatus === "saving" ? "Saving..." : saved ? "Saved ✓" : saveStatus === "error" ? "Try Saving Again" : "Save Memory"}
        </button>
        <button className="secondary-button" type="button" onClick={onPlayAgain}>Play Again</button>
        <button className="plain-button warm" type="button" onClick={onPlayAgain}>Back to LumaVill</button>
      </div>
      {saveError && <p className="save-error" role="alert">{saveError}</p>}
    </div>
  );
}

function MemoryCard({ word, drawing, attempts, solved, title, story }: { word: GameWordEntry; drawing: string; attempts: GuessAttempt[]; solved: boolean; title: string; story: string }) {
  const reward = getGameReward(solved, attempts.length);
  return (
    <article className="memory-card">
      <img src={drawing} alt="Saved drawing thumbnail" />
      <div>
        <h3>{title}</h3>
        <p>{story}</p>
        <p>You drew: <b>{word.emoji} {word.word}</b></p>
        <p>Mimi guessed:</p>
        <ul>{attempts.map((attempt, index) => <li key={`${attempt.guess}-${index}`}>{attempt.guess} {attempt.isCorrect ? "✅" : "❌"}</li>)}</ul>
        <strong>{solved ? `Mimi got it on try ${attempts.length}.` : "Mimi did not crack the case this time."}</strong>
        <p className={`memory-reward reward-${reward.type}`}>{reward.quantity > 0 ? `Reward: ${reward.name} ×${reward.quantity}` : "Reward: No material"}</p>
        <time>Today</time>
      </div>
    </article>
  );
}

function RewardPanel({ reward, attemptCount }: { reward: GameReward; attemptCount: number }) {
  return (
    <section className={`reward-panel reward-${reward.type}`} aria-label="Round reward">
      <div className={`reward-icon ${reward.type}`} aria-hidden="true"><i /><i /><i /></div>
      <div>
        <span>ROUND REWARD · {attemptCount} {attemptCount === 1 ? "GUESS" : "GUESSES"}</span>
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
  return (
    <div className={`avatar-wrap ${compact ? "compact" : ""} mood-${mood}`} aria-label="Mimi">
      <img src="/mimi-gator.png" alt="Mimi, your playful drawing partner" />
      <span className="shadow" />
    </div>
  );
}

function CompanionDialogue({ lines }: { lines: string[] }) {
  return <div className="dialogue">{lines.map((line) => <p key={line}>{line}</p>)}</div>;
}

function buildGuessLine(attempt: GuessAttempt, mood: Mood, round: number) {
  const guess = attempt.guess;
  if (round >= 3) return fillGuessLine(randomItem(clueRoundGuessOpeners), attempt);
  if (round === 2) return fillGuessLine(randomItem(retryGuessOpeners), attempt);
  if (attempt.confidence < 0.48) return fillGuessLine(randomItem(uncertainGuessOpeners), attempt);
  if (mood !== "playful" && mood !== "dramatic" && mood !== "confident") return `Is it... ${guess}?`;
  return fillGuessLine(randomItem(guessOpeners[mood]), attempt);
}

function guessNote(attempt: GuessAttempt, hasHint: boolean) {
  if (hasHint) return "Mimi weighed your hint against the drawing before guessing.";
  if (attempt.source === "vision") return "Mimi spotted this from your drawing.";
  return "Mimi is guessing from her cozy backup instincts.";
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
