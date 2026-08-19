"use client";

import { PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { requestHybridGuess } from "./hybridGuessEngine";
import { GameWordEntry, GuessAttempt, pickWord, wordBank } from "./mockAgentService";

type GameState = "INVITE" | "WORD_REVEAL" | "DRAWING" | "GUESSING" | "RESULT" | "MEMORY";
type Mood = "idle" | "thinking" | "happy" | "oops" | "dramatic" | "playful" | "confident";
type BrushSize = "Small" | "Medium" | "Large";

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

const guessOpeners: Record<Exclude<Mood, "idle" | "thinking" | "happy" | "oops">, string[]> = {
  playful: ["Wait... is that a {guess}? 👀", "Tiny guess time: {guess}?", "I see shapes. I see destiny. {guess}?"],
  dramatic: ["My reputation is on the line. {guess}?!", "The room goes silent... {guess}?", "If I am wrong, remember me kindly: {guess}."],
  confident: ["Easy. That's definitely {guess}.", "I am feeling shiny about this one: {guess}.", "Final-ish answer energy: {guess}."],
};

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

export default function GameDemo() {
  const [gameState, setGameState] = useState<GameState>("INVITE");
  const [firstRound, setFirstRound] = useState(true);
  const [word, setWord] = useState<GameWordEntry>(wordBank[0]);
  const [drawing, setDrawing] = useState("");
  const [attempts, setAttempts] = useState<GuessAttempt[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<GuessAttempt | null>(null);
  const [thinking, setThinking] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");
  const [dialogue, setDialogue] = useState("Hey! Wanna play a drawing game with me?");
  const [saved, setSaved] = useState(false);
  const [solved, setSolved] = useState(false);

  const requestNextGuess = useCallback(async (canvasImage: string, existingAttempts: GuessAttempt[]) => {
    const round = existingAttempts.length + 1;
    setThinking(true);
    setMood("thinking");
    setDialogue(randomItem(thinkingLines));
    setCurrentAttempt(null);

    const minimumThinkTime = delay(850);
    const attempt = await requestHybridGuess({
      canvasImage,
      previousGuesses: existingAttempts.map((item) => item.guess),
      round,
      targetWord: word,
    });
    await minimumThinkTime;

    const directedAttempt = gameDirector(attempt, word, round, existingAttempts);
    const nextMood = directedAttempt.isCorrect ? "confident" : randomItem(["playful", "dramatic", "confident"] as const);
    setCurrentAttempt(directedAttempt);
    setThinking(false);
    setMood(nextMood);
    setDialogue(buildGuessLine(directedAttempt.guess, nextMood));
  }, [word]);

  function beginGame() {
    const nextWord = pickWord(firstRound);
    setFirstRound(false);
    setWord(nextWord);
    setDrawing("");
    setAttempts([]);
    setCurrentAttempt(null);
    setSaved(false);
    setSolved(false);
    setMood("happy");
    setDialogue("I picked something good. No peeking at my tiny brain.");
    setGameState("WORD_REVEAL");
  }

  function startGuessing(dataUrl: string) {
    setDrawing(dataUrl);
    setAttempts([]);
    setCurrentAttempt(null);
    setSolved(false);
    setGameState("GUESSING");
    void requestNextGuess(dataUrl, []);
  }

  function handleGuessAnswer() {
    if (!currentAttempt) return;
    const nextAttempts = [...attempts, currentAttempt];
    setAttempts(nextAttempts);

    if (currentAttempt.isCorrect) {
      setSolved(true);
      setMood("happy");
      setDialogue(randomItem(correctLines));
      window.setTimeout(() => setGameState("RESULT"), 900);
      return;
    }

    if (nextAttempts.length >= 3) {
      setSolved(false);
      setMood("oops");
      setDialogue(randomItem(finalMissLines));
      window.setTimeout(() => setGameState("RESULT"), 900);
      return;
    }

    setMood("oops");
    setDialogue(randomItem(wrongLines));
    window.setTimeout(() => void requestNextGuess(drawing, nextAttempts), 900);
  }

  function playAgain() {
    setGameState("INVITE");
    setMood("idle");
    setSaved(false);
    setSolved(false);
    setDrawing("");
    setAttempts([]);
    setCurrentAttempt(null);
    setDialogue("Hey! Wanna play a drawing game with me?");
  }

  const displayedAttempts = currentAttempt && gameState === "GUESSING" ? [...attempts, currentAttempt] : attempts;

  return (
    <main className="game-shell">
      <div className="room-backdrop" aria-hidden="true" />
      <GameChrome state={gameState} />
      <section className={`stage state-${gameState.toLowerCase()}`}>
        {gameState === "INVITE" && <InviteScreen onPlay={beginGame} mood={mood} />}
        {gameState === "WORD_REVEAL" && <WordReveal word={word} onStart={() => setGameState("DRAWING")} />}
        {gameState === "DRAWING" && <DrawingScreen word={word} mood={mood} onSubmit={startGuessing} />}
        {gameState === "GUESSING" && (
          <GuessScreen
            attempt={currentAttempt}
            attempts={displayedAttempts}
            dialogue={dialogue}
            isThinking={thinking}
            mood={mood}
            onAnswer={handleGuessAnswer}
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
            saved={saved}
            solved={solved}
            onSave={() => {
              setSaved(true);
              setMood("happy");
            }}
            onPlayAgain={playAgain}
          />
        )}
      </section>
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

function GameChrome({ state }: { state: GameState }) {
  const active = state === "INVITE" || state === "WORD_REVEAL" || state === "DRAWING" ? "Draw" : state === "GUESSING" || state === "RESULT" ? "Guess" : "Memory";
  return (
    <header className="game-chrome">
      <button className="plain-button" type="button">← LumaVill</button>
      <nav className="progress-pills" aria-label="Game progress">
        {["Draw", "Guess", "Memory"].map((step) => (
          <span className={step === active ? "active" : ""} key={step}>{step}</span>
        ))}
      </nav>
      <button className="sound-button" aria-label="Sound on" type="button">🔊</button>
    </header>
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

function WordReveal({ word, onStart }: { word: GameWordEntry; onStart: () => void }) {
  return (
    <div className="center-stack">
      <CompanionAvatar mood="happy" compact />
      <h2>Mimi picked a word for you!</h2>
      <div className="word-card">
        <span>🎨 YOUR WORD</span>
        <strong>{word.word} {word.emoji}</strong>
        <p>{word.category} · {word.difficulty} · Draw it without writing the word!</p>
      </div>
      <button className="primary-button" type="button" onClick={onStart}>Start Drawing</button>
    </div>
  );
}

function DrawingScreen({ word, mood, onSubmit }: { word: GameWordEntry; mood: Mood; onSubmit: (dataUrl: string) => void }) {
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

function DrawingCanvas({ word, onSubmit }: { word: GameWordEntry; onSubmit: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshots = useRef<string[]>([]);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
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
  }, []);

  function canvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawing.current = true;
    lastPoint.current = canvasPoint(event);
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
    snapshots.current.push(canvas.toDataURL());
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
          if (canvas) onSubmit(canvas.toDataURL("image/png"));
        }}
      >
        Let Mimi Guess!
      </button>
    </section>
  );
}

function GuessScreen({ attempt, attempts, dialogue, isThinking, mood, onAnswer }: { attempt: GuessAttempt | null; attempts: GuessAttempt[]; dialogue: string; isThinking: boolean; mood: Mood; onAnswer: () => void }) {
  const round = Math.max(1, attempts.length);
  return (
    <div className="guess-layout">
      <CompanionAvatar mood={mood} />
      <div className="guess-card">
        <CompanionDialogue lines={[dialogue]} />
        {isThinking || !attempt ? (
          <div className="thinking-dots" aria-label="Mimi is thinking"><i /><i /><i /></div>
        ) : (
          <>
            <p className="round-label">Round {round} · confidence {Math.round(attempt.confidence * 100)}%</p>
            <h2>{attempt.guess}?</h2>
            <div className="guess-actions">
              <button className="primary-button" type="button" onClick={onAnswer}>{attempt.isCorrect ? "YES!! 🎉" : attempts.length >= 3 ? "Nice try, Mimi" : "Nope 😂"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultScreen({ word, drawing, attempts, solved, dialogue, onMemory }: { word: GameWordEntry; drawing: string; attempts: GuessAttempt[]; solved: boolean; dialogue: string; onMemory: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onMemory, 2400);
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
        <CompanionDialogue lines={[dialogue, solved ? randomItem(correctLines) : "I'm keeping this mystery for training my vibes."]} />
      </div>
    </div>
  );
}

function MemoryScreen({ word, drawing, attempts, saved, solved, onSave, onPlayAgain }: { word: GameWordEntry; drawing: string; attempts: GuessAttempt[]; saved: boolean; solved: boolean; onSave: () => void; onPlayAgain: () => void }) {
  return (
    <div className="memory-layout">
      <div className="memory-heading">
        <span>✨ New Memory Created</span>
        <h2>Game Complete!</h2>
        <p>You made a new memory with Mimi.</p>
      </div>
      <MemoryCard word={word} drawing={drawing} attempts={attempts} solved={solved} />
      <CompanionDialogue lines={[saved ? "I'm definitely remembering this one." : "I'm keeping this.", solved ? randomItem(memoryLines) : "Unsolved mysteries are memories too. Very fancy."]} />
      <div className="ending-actions">
        <button className="primary-button" type="button" onClick={onSave}>{saved ? "Saved ✓" : "Save Memory"}</button>
        <button className="secondary-button" type="button" onClick={onPlayAgain}>Play Again</button>
        <button className="plain-button warm" type="button" onClick={onPlayAgain}>Back to LumaVill</button>
      </div>
    </div>
  );
}

function MemoryCard({ word, drawing, attempts, solved }: { word: GameWordEntry; drawing: string; attempts: GuessAttempt[]; solved: boolean }) {
  const title = useMemo(() => randomItem(memoryTitles), []);
  const line = useMemo(() => randomItem(memoryLines), []);
  return (
    <article className="memory-card">
      <img src={drawing} alt="Saved drawing thumbnail" />
      <div>
        <h3>{title}</h3>
        <p>{line}</p>
        <p>You drew: <b>{word.emoji} {word.word}</b></p>
        <p>Mimi guessed:</p>
        <ul>{attempts.map((attempt, index) => <li key={`${attempt.guess}-${index}`}>{attempt.guess} {attempt.isCorrect ? "✅" : "❌"}</li>)}</ul>
        <strong>{solved ? `Mimi got it on try ${attempts.length}.` : "Mimi did not crack the case this time."}</strong>
        <time>Today</time>
      </div>
    </article>
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

function buildGuessLine(guess: string, mood: Mood) {
  if (mood !== "playful" && mood !== "dramatic" && mood !== "confident") return `Is it... ${guess}?`;
  return randomItem(guessOpeners[mood]).replace("{guess}", guess);
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
