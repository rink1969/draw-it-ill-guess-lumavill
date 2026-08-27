# Draw It, I'll Guess! · LumaVill

A cozy drawing-and-guessing mini game where the player draws a prompted word and Kaka, an AI crocodile companion, tries to recognize it. The experience combines real vision-model guesses with a lightweight game director, character dialogue, hints, and durable memory cards.

## What It Does

- Picks from a 50+ word bank with categories, difficulty levels, aliases, and recent-word deduplication.
- Captures the canvas as PNG plus structured SVG/ASCII drawing data.
- Supports OpenAI, Anthropic Claude, and Google Gemini vision models.
- Keeps the target word away from the vision model and judges correctness inside game logic.
- Falls back to the local guess engine if a provider is missing, slow, or unavailable.
- Lets the player confirm whether Kaka's guess is right.
- Requests text hints after three misses and continues for up to eight guesses.
- Respects the AI's original guesses in rounds 1–5; only round 6 has a 28% Game Director correction chance. If all eight attempts miss, the round settles without a material reward.
- Saves completed games as persistent Memory cards in the browser's localStorage.
- Awards one Silver Ore when Kaka succeeds within three guesses, or one Stone within five guesses.
- Shows a daily partner summary when leaving, including completed questions, rapport, collected materials, and relationship progress.

## Game Flow

```text
Word reveal → Drawing canvas → Vision guess → Player confirms
                                      ↓ wrong
                              Up to three guesses
                                      ↓
                              Player gives a hint
                                      ↓
                             Guess until confirmed
                                      ↓
                             Save Memory (localStorage)
```

## AI Model Center

The `连接模型` button in the top-right corner opens the model center. Visitors connect their own OpenAI-compatible vision service by entering its service URL, model name, and API Key, then pressing Save. The connection is tested immediately and stored in the browser's localStorage (plain text; see the note below). The website does not include or provide a model of its own.

Security note: the API Key is written in plain text to the browser's localStorage, so it is readable by any script on the page (XSS risk). Disconnect and clear it when sharing this browser.

API keys are never returned to page scripts. If no visitor model is connected, the complete game remains playable through the local fallback guess engine.

## Persistence

Memory cards are stored in the browser's localStorage (key `lumavill-memories`, capped at the first 20 records to stay within storage limits). A record contains the displayed memory title and story, target metadata, drawing image, guess history, result, selected provider/model, and creation time. A unique save key prevents accidental duplicate writes.

## Local Development

Requirements: Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No server or environment secrets are required — the model connection lives
entirely in the browser's localStorage.

Without a configured provider, the complete game remains playable through the fallback guess engine.

## Validation

```bash
npm run build
```

`npm run build` produces the static site in `./out`; serve it with `npm start`.

## Main Project Areas

- `app/GameDemo.tsx`: game state, drawing UI, dialogue, model center, and memory save states.
- `app/modelGateway.ts`: OpenAI, Claude, and Gemini vision adapters + prompt builder.
- `app/hybridGuessEngine.ts`: real-model request (browser connects directly) with local fallback.
- `app/memoryStore.ts`: localStorage-backed Memory read/write with saveKey dedupe.
- `app/modelConnection.ts`: localStorage connection storage with SSRF-safe validation.
- `app/mockAgentService.ts`: word bank, aliases, answer normalization, and fallback guesses.

## Deployment

This project is a static Next.js export (no backend server). All game state — the model connection, Memory cards, and recent-word history — lives in the browser's localStorage. To deploy, publish the `./out` folder to any static host.
