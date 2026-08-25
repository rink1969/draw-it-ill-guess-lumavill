export type ModelProviderId = "openai" | "anthropic" | "gemini";

export type ModelSelection = {
  provider: ModelProviderId;
  model: string;
};

export const modelProviders = [
  {
    id: "openai" as const,
    name: "OpenAI",
    accent: "#26786b",
    envKey: "OPENAI_API_KEY",
    models: [
      { id: "gpt-4.1-mini", name: "GPT-4.1 mini", note: "Fast and balanced" },
      { id: "gpt-4o-mini", name: "GPT-4o mini", note: "Quick visual guesses" },
      { id: "gpt-5-mini", name: "GPT-5 mini", note: "Stronger reasoning" },
    ],
  },
  {
    id: "anthropic" as const,
    name: "Claude",
    accent: "#c56b45",
    envKey: "ANTHROPIC_API_KEY",
    models: [
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", note: "Careful visual reading" },
      { id: "claude-3-5-haiku-latest", name: "Claude Haiku", note: "Light and responsive" },
    ],
  },
  {
    id: "gemini" as const,
    name: "Gemini",
    accent: "#4d72c8",
    envKey: "GEMINI_API_KEY",
    models: [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", note: "Fast multimodal play" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", note: "Detailed visual reasoning" },
    ],
  },
] as const;

export const defaultModelSelection: ModelSelection = {
  provider: "openai",
  model: "gpt-4.1-mini",
};

export function isValidSelection(value: unknown): value is ModelSelection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as ModelSelection;
  const provider = modelProviders.find((item) => item.id === candidate.provider);
  return Boolean(provider?.models.some((model) => model.id === candidate.model));
}

