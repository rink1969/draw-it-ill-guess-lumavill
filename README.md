# Draw It, I'll Guess! · LumaVill

A cozy drawing-and-guessing mini game where the player draws a prompted word and Mimi, an AI crocodile companion, tries to recognize it. The experience combines real vision-model guesses with a lightweight game director, character dialogue, hints, and durable memory cards.

## What It Does

- Picks from a 50+ word bank with categories, difficulty levels, aliases, and recent-word deduplication.
- Captures the canvas as PNG plus structured SVG/ASCII drawing data.
- Supports OpenAI, Anthropic Claude, and Google Gemini vision models.
- Keeps the target word away from the vision model and judges correctness inside game logic.
- Falls back to the local guess engine if a provider is missing, slow, or unavailable.
- Lets the player confirm whether Mimi's guess is right.
- Requests text hints after three misses and continues for up to six genuine guesses.
- Never rewrites an AI guess into the correct answer; after six genuine misses, the round settles without a material reward.
- Saves completed games as persistent Memory records in Cloudflare D1.
- Awards one Silver Ore when Mimi succeeds within three guesses, or one Stone within five guesses.
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
                             Save Memory to D1
```

## AI Model Center

The `连接模型` button in the top-right corner opens the model center. Visitors connect their own OpenAI-compatible vision service by entering its service URL, model name, and API Key, then pressing Save. The connection is tested immediately and stored in an encrypted HttpOnly session cookie, so the page cannot read the key back. The website does not include or provide a model of its own.

Set `MODEL_CONNECTION_SECRET` on the server to a long random value before enabling visitor connections in production. Localhost uses a development-only secret automatically.

API keys are never returned to page scripts. If no visitor model is connected, the complete game remains playable through the local fallback guess engine.

## Persistence

Memory cards are stored in Cloudflare D1 through Drizzle ORM. A record contains the displayed memory title and story, target metadata, drawing image, guess history, result, selected provider/model, and creation time. A unique save key prevents accidental duplicate writes.

The schema lives in `db/schema.ts`; generated migrations live in `drizzle/`.

## Local Development

Requirements: Node.js `>=22.13.0`.

```bash
npm install
npm run db:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a local `.env` when testing real providers:

```dotenv
MODEL_CONNECTION_SECRET=
```

Without a configured provider, the complete game remains playable through the fallback guess engine.

## Validation

```bash
npm run build
npm test
```

`npm test` builds the app and checks the rendered invite, complete game flow, multi-model gateway, fallback behavior, and D1 memory route.

## Main Project Areas

- `app/GameDemo.tsx`: game state, drawing UI, dialogue, model center, and memory save states.
- `app/api/guess/route.ts`: target-blind vision guess endpoint.
- `app/modelGateway.ts`: OpenAI, Claude, and Gemini adapters.
- `app/hybridGuessEngine.ts`: real-model request with local fallback.
- `app/api/memories/route.ts`: persistent Memory read/write endpoint.
- `db/schema.ts`: Drizzle D1 schema.
- `app/mockAgentService.ts`: word bank, aliases, answer normalization, and fallback guesses.

## Deployment

The project is a Vinext app configured for OpenAI Sites and Cloudflare Workers. `.openai/hosting.json` declares the logical `DB` binding. Sites provisions and applies the real D1 database and generated migrations during deployment; production API keys are managed as encrypted site secrets.
