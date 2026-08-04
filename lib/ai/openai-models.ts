export type OpenAiModelEnvironment = {
  OPENAI_TRIP_MODEL?: string;
  OPENAI_ASSISTANT_MODEL?: string;
  OPENAI_DOCUMENT_MODEL?: string;
  OPENAI_INBOX_MODEL?: string;
};

export const DEFAULT_OPENAI_MODELS = {
  assistant: "gpt-5.6-luna",
  document: "gpt-5.6-luna",
  inbox: "gpt-5.6-terra",
} as const;

export function resolveOpenAiModel(
  environment: OpenAiModelEnvironment,
  task: keyof typeof DEFAULT_OPENAI_MODELS,
) {
  const taskSetting = {
    assistant: environment.OPENAI_ASSISTANT_MODEL,
    document: environment.OPENAI_DOCUMENT_MODEL,
    inbox: environment.OPENAI_INBOX_MODEL,
  }[task];

  return taskSetting || environment.OPENAI_TRIP_MODEL || DEFAULT_OPENAI_MODELS[task];
}
