"use client";

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { GameWord, getGuesses, pickWord, wordEmoji } from "./mockAgentService";

type GameState = "INVITE" | "WORD_REVEAL" | "DRAWING" | "GUESSING" | "RESULT" | "MEMORY";
type Mood = "idle" | "thinking" | "happy" | "oops";
type BrushSize = "Small" | "Medium" | "Large";

const brushSizes: Record<BrushSize, number> = { Small: 4, Medium: 9, Large: 16 };
const colors = ["#25231d", "#e75f54", "#4c8bd8", "#f2c94c", "#6c9f49"];
const waitingLines = [
  "Hmm... what are you drawing?",
  "I'm watching 👀",
  "This better be something I can recognize...",
  "Tiny brush moves. Big mystery.",
];

export default function GameDemo() {
  const [gameState, setGameState] = useState<GameState>("INVITE");
  const [firstRound, setFirstRound] = useState(true);
  const [word, setWord] = useState<GameWord>("Birthday Cake");
  const [drawing, setDrawing] = useState("");
  const [guessIndex, setGuessIndex] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");
  const [saved, setSaved] = useState(false);
  const guesses = useMemo(() => getGuesses(word), [word]);

  function beginGame() {
    const nextWord = pickWord(firstRound);
    setFirstRound(false);
    setWord(nextWord);
    setDrawing("");
    setGuessIndex(0);
    setSaved(false);
    setMood("happy");
    setGameState("WORD_REVEAL");
  }

  function startGuessing(dataUrl: string) {
    setDrawing(dataUrl);
    setGameState("GUESSING");
    setGuessIndex(0);
    setThinking(true);
    setMood("thinking");
    window.setTimeout(() => {
      setThinking(false);
      setMood("idle");
    }, 1000);
  }

  function answerGuess(correct: boolean) {
    if (correct) {
      setMood("happy");
      window.setTimeout(() => setGameState("RESULT"), 900);
      return;
    }
    setMood("oops");
    setThinking(true);
    window.setTimeout(() => {
      setGuessIndex((current) => Math.min(current + 1, guesses.length - 1));
      setThinking(false);
      setMood("thinking");
      window.setTimeout(() => setMood("idle"), 450);
    }, 1000);
  }

  function playAgain() {
    setGameState("INVITE");
    setMood("idle");
    setSaved(false);
    setDrawing("");
  }

  return (
    <main className="game-shell">
      <div className="room-backdrop" aria-hidden="true" />
      <GameChrome state={gameState} />
      <section className={`stage state-${gameState.toLowerCase()}`}>
        {gameState === "INVITE" && <InviteScreen onPlay={beginGame} mood={mood} />}
        {gameState === "WORD_REVEAL" && <WordReveal word={word} onStart={() => setGameState("DRAWING")} />}
        {gameState === "DRAWING" && <DrawingScreen word={word} mood={mood} onSubmit={startGuessing} />}
        {gameState === "GUESSING" && (
          <GuessScreen guess={guesses[guessIndex]} guessIndex={guessIndex} isThinking={thinking} mood={mood} onAnswer={answerGuess} />
        )}
        {gameState === "RESULT" && <ResultScreen word={word} drawing={drawing} guesses={guesses} onMemory={() => setGameState("MEMORY")} />}
        {gameState === "MEMORY" && (
          <MemoryScreen
            word={word}
            drawing={drawing}
            guesses={guesses}
            saved={saved}
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

function WordReveal({ word, onStart }: { word: GameWord; onStart: () => void }) {
  return (
    <div className="center-stack">
      <CompanionAvatar mood="happy" compact />
      <h2>Mimi picked a word for you!</h2>
      <div className="word-card">
        <span>🎨 YOUR WORD</span>
        <strong>{word} {wordEmoji[word]}</strong>
        <p>Draw it without writing the word!</p>
      </div>
      <button className="primary-button" type="button" onClick={onStart}>Start Drawing</button>
    </div>
  );
}

function DrawingScreen({ word, mood, onSubmit }: { word: GameWord; mood: Mood; onSubmit: (dataUrl: string) => void }) {
  const [line, setLine] = useState(waitingLines[0]);
  useEffect(() => {
    const timer = window.setInterval(() => setLine(waitingLines[Math.floor(Math.random() * waitingLines.length)]), 2800);
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

function DrawingCanvas({ word, onSubmit }: { word: GameWord; onSubmit: (dataUrl: string) => void }) {
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
        <h2>Draw: {word} {wordEmoji[word]}</h2>
        <div className="tool-row compact-tools">
          <button type="button" onClick={undo} title="Undo">↶</button>
          <button type="button" onClick={clear} title="Clear">⌫</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        aria-label={`Drawing canvas for ${word}`}
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

function GuessScreen({ guess, guessIndex, isThinking, mood, onAnswer }: { guess: string; guessIndex: number; isThinking: boolean; mood: Mood; onAnswer: (correct: boolean) => void }) {
  const correctRound = guessIndex === 2;
  const lead = isThinking ? (guessIndex === 0 ? "Let me look..." : "Wait wait... let me look again.") : correctRound ? "Okay, I think I got it!" : "Hmm...";
  return (
    <div className="guess-layout">
      <CompanionAvatar mood={mood} />
      <div className="guess-card">
        <CompanionDialogue lines={[lead]} />
        {isThinking ? (
          <div className="thinking-dots" aria-label="Mimi is thinking"><i /><i /><i /></div>
        ) : (
          <>
            <h2>Is it... {guess}?</h2>
            <div className="guess-actions">
              <button className="primary-button" type="button" onClick={() => onAnswer(correctRound)}>{correctRound ? "YES!! 🎉" : "Yes!"}</button>
              {!correctRound && <button className="secondary-button" type="button" onClick={() => onAnswer(false)}>Nope 😂</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultScreen({ word, drawing, guesses, onMemory }: { word: GameWord; drawing: string; guesses: string[]; onMemory: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onMemory, 2300);
    return () => window.clearTimeout(timer);
  }, [onMemory]);
  return (
    <div className="result-layout">
      <div className="result-art">
        <span className="burst">🎉</span>
        <h2>Mimi guessed it!</h2>
        <img src={drawing} alt="Your drawing" />
      </div>
      <div className="result-details">
        <strong>{word} {wordEmoji[word]}</strong>
        <ol>{guesses.map((guess, index) => <li key={guess}>{guess} {index === guesses.length - 1 ? "✅" : "❌"}</li>)}</ol>
        <CompanionDialogue lines={["YES!! I knew it!", "Your drawing is... surprisingly understandable 😂"]} />
      </div>
    </div>
  );
}

function MemoryScreen({ word, drawing, guesses, saved, onSave, onPlayAgain }: { word: GameWord; drawing: string; guesses: string[]; saved: boolean; onSave: () => void; onPlayAgain: () => void }) {
  return (
    <div className="memory-layout">
      <div className="memory-heading">
        <span>✨ New Memory Created</span>
        <h2>Game Complete!</h2>
        <p>You made a new memory with Mimi.</p>
      </div>
      <MemoryCard word={word} drawing={drawing} guesses={guesses} />
      <CompanionDialogue lines={[saved ? "I'm definitely remembering this one." : "I'm keeping this.", "This might be the weirdest cake anyone has ever drawn for me. 😂"]} />
      <div className="ending-actions">
        <button className="primary-button" type="button" onClick={onSave}>{saved ? "Saved ✓" : "Save Memory"}</button>
        <button className="secondary-button" type="button" onClick={onPlayAgain}>Play Again</button>
        <button className="plain-button warm" type="button" onClick={onPlayAgain}>Back to LumaVill</button>
      </div>
    </div>
  );
}

function MemoryCard({ word, drawing, guesses }: { word: GameWord; drawing: string; guesses: string[] }) {
  return (
    <article className="memory-card">
      <img src={drawing} alt="Saved drawing thumbnail" />
      <div>
        <h3>Our First Drawing Game</h3>
        <p>Today we played Draw & Guess together.</p>
        <p>You drew: <b>{wordEmoji[word]} {word}</b></p>
        <p>Mimi guessed:</p>
        <ul>{guesses.map((guess) => <li key={guess}>{guess}</li>)}</ul>
        <strong>Mimi got it on the 3rd try.</strong>
        <time>Today</time>
      </div>
    </article>
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
