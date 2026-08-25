# Draw It, I'll Guess! · LumaVill

A cozy drawing-and-guessing mini game where the player draws a prompted word and Mimi, an AI crocodile companion, tries to recognize it. The experience combines real vision-model guesses with a lightweight game director, character dialogue, hints, and durable memory cards.

## What It Does

- Picks from a 50+ word bank with categories, difficulty levels, aliases, and recent-word deduplication.
- Captures the canvas as PNG plus structured SVG/ASCII drawing data.
- Supports OpenAI, Anthropic Claude, and Google Gemini vision models.
- Keeps the target word away from the vision model and judges correctness inside game logic.
- Falls back to the local guess engine if a provider is missing, slow, or unavailable.
- Lets the player confirm whether Mimi's guess is right.
- Requests text hints after three misses and keeps guessing until the player confirms success.
- Saves completed games as persistent Memory records in Cloudflare D1.

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

The `AI Model` button in the top-right corner opens the model center. It shows which providers are configured, lets the player select a supported model, and can run a connection test.

| Provider | Environment variable | Included models |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | GPT-4.1 mini, GPT-4o mini, GPT-5 mini |
| Anthropic | `ANTHROPIC_API_KEY` | Claude Sonnet 4.5, Claude Haiku |
| Google | `GEMINI_API_KEY` | Gemini 2.5 Flash, Gemini 2.5 Pro |

API keys are never returned to the browser. The client sends only the selected provider/model and drawing data to the project's own API routes.

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
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
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
