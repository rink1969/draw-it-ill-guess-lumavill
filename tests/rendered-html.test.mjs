import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the game invite", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Draw It, I&#x27;ll Guess! \| LumaVill<\/title>/i);
  assert.match(html, /你画，我来猜！/);
  assert.match(html, /Play with Mimi/);
  assert.match(html, /mimi-gator\.png/);
  assert.match(html, /Hey! Wanna play a drawing game with me\?/);
  assert.doesNotMatch(html, /SkeletonPreview|codex-preview|react-loading-skeleton/);
});

test("keeps the full drawing game flow in source", async () => {
  const [game, agent, hybrid, api, css, packageJson] = await Promise.all([
    readFile(new URL("../app/GameDemo.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/mockAgentService.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/hybridGuessEngine.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/guess/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  for (const state of ["INVITE", "WORD_REVEAL", "DRAWING", "GUESSING", "RESULT", "MEMORY"]) {
    assert.match(game, new RegExp(`"${state}"`));
  }

  assert.match(game, /<canvas/);
  assert.match(game, /onPointerDown/);
  assert.match(game, /toDataURL\("image\/png"\)/);
  assert.match(game, /Let Mimi Guess!/);
  assert.match(game, /Nope 😂/);
  assert.match(game, /Yes! 🎉/);
  assert.match(game, /playerSaysCorrect/);
  assert.match(game, /thinking-preview/);
  assert.match(game, /scan-line/);
  assert.match(game, /Save Memory/);
  assert.match(game, /requestNextGuess/);
  assert.match(game, /gameDirector/);
  assert.match(game, /finalMissLines/);
  assert.match(agent, /category:/);
  assert.match(agent, /difficulty:/);
  assert.match(agent, /fallbackGuesses/);
  assert.match(agent, /aliases:/);
  assert.ok((agent.match(/word:/g) ?? []).length >= 50);
  assert.match(hybrid, /fetch\("\/api\/guess"/);
  assert.match(hybrid, /getFallbackGuess/);
  assert.match(hybrid, /isCorrectGuess/);
  assert.match(api, /OPENAI_API_KEY/);
  assert.match(api, /previousGuesses/);
  assert.match(api, /input_image/);
  assert.doesNotMatch(api, /targetWord|Birthday Cake|aliases/);
  assert.match(css, /@keyframes floaty/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
