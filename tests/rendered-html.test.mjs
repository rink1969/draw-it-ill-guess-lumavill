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
  assert.match(html, /连接模型后开始/);
  assert.match(html, /mimi-gator\.png/);
  assert.match(html, /嗨！想和我玩你画我猜吗？/);
  assert.match(html, />中<.*>EN</s);
  assert.doesNotMatch(html, /SkeletonPreview|codex-preview|react-loading-skeleton/);
});

test("keeps the full drawing game flow in source", async () => {
  const [game, agent, hybrid, api, memoryApi, connectionApi, connectionVault, schema, gateway, css, packageJson] = await Promise.all([
    readFile(new URL("../app/GameDemo.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/mockAgentService.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/hybridGuessEngine.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/guess/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/memories/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/model-connection/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/modelConnection.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/modelGateway.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  for (const state of ["INVITE", "WORD_REVEAL", "DRAWING", "GUESSING", "RESULT", "MEMORY", "SUMMARY"]) {
    assert.match(game, new RegExp(`"${state}"`));
  }

  assert.match(game, /<canvas/);
  assert.match(game, /onPointerDown/);
  assert.match(game, /toDataURL\("image\/png"\)/);
  assert.match(game, /Let Kaka Guess!/);
  assert.match(game, /Nope 😂/);
  assert.match(game, /Yes! 🎉/);
  assert.match(game, /playerSaysCorrect/);
  assert.match(game, /thinking-preview/);
  assert.match(game, /scan-line/);
  assert.match(game, /Save Memory/);
  assert.match(game, /fetch\("\/api\/memories"/);
  assert.match(game, /Saving\.\.\./);
  assert.match(game, /Silver Ore/);
  assert.match(game, /attemptCount <= 3/);
  assert.match(game, /attemptCount <= 5/);
  assert.match(game, /RewardPanel/);
  assert.match(game, /Today's Partner Report/);
  assert.match(game, /getRapport/);
  assert.match(game, /silverOre/);
  assert.match(game, /partner-progress/);
  assert.match(memoryApi, /db\.insert\(memories\)/);
  assert.match(memoryApi, /saveKey/);
  assert.match(schema, /sqliteTable\("memories"/);
  assert.match(schema, /idx_memories_save_key/);
  assert.match(game, /requestNextGuess/);
  assert.match(game, /gameDirector/);
  assert.match(game, /nextAttempts\.length >= 8/);
  assert.match(game, /round === 6 && Math\.random\(\) < 0\.28/);
  assert.match(game, /finalMissLines/);
  assert.match(agent, /category:/);
  assert.match(agent, /difficulty:/);
  assert.match(agent, /fallbackGuesses/);
  assert.match(agent, /aliases:/);
  assert.ok((agent.match(/word:/g) ?? []).length >= 50);
  assert.match(hybrid, /fetch\("\/api\/guess"/);
  assert.match(hybrid, /getFallbackGuess\(targetWord, previousGuesses, round, userHints, true\)/);
  assert.match(hybrid, /error\.message === "connection_missing"/);
  assert.match(agent, /!excludeAnswer \|\| !isCorrectGuess\(guess, word\)/);
  assert.match(game, /if \(!modelConnected\)/);
  assert.match(game, /重新连接模型/);
  assert.match(hybrid, /isCorrectGuess/);
  assert.match(game, /AI Model Center/);
  assert.match(game, /服务地址/);
  assert.match(game, /模型名称/);
  assert.match(game, /API Key/);
  assert.match(game, /api\/model-connection/);
  assert.match(connectionApi, /Set-Cookie/);
  assert.match(connectionVault, /AES-GCM/);
  assert.match(connectionVault, /HttpOnly/);
  assert.match(gateway, /runCustomVisionGuess/);
  assert.doesNotMatch(game, /网站已配置模型|Needs key|provider-tabs/);
  assert.doesNotMatch(gateway, /OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY/);
  assert.match(api, /previousGuesses/);
  assert.match(gateway, /image_url/);
  assert.doesNotMatch(api, /targetWord|Birthday Cake|aliases/);
  assert.match(css, /@keyframes floaty/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
