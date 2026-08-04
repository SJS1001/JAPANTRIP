import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_OPENAI_MODELS,
  resolveOpenAiModel,
} from "../lib/ai/openai-models.ts";

test("AI tasks use efficient task-specific defaults", () => {
  assert.equal(resolveOpenAiModel({}, "assistant"), DEFAULT_OPENAI_MODELS.assistant);
  assert.equal(resolveOpenAiModel({}, "document"), DEFAULT_OPENAI_MODELS.document);
  assert.equal(resolveOpenAiModel({}, "inbox"), DEFAULT_OPENAI_MODELS.inbox);
});

test("task-specific model settings override the legacy shared setting", () => {
  const environment = {
    OPENAI_TRIP_MODEL: "legacy-model",
    OPENAI_ASSISTANT_MODEL: "assistant-model",
    OPENAI_DOCUMENT_MODEL: "document-model",
    OPENAI_INBOX_MODEL: "inbox-model",
  };

  assert.equal(resolveOpenAiModel(environment, "assistant"), "assistant-model");
  assert.equal(resolveOpenAiModel(environment, "document"), "document-model");
  assert.equal(resolveOpenAiModel(environment, "inbox"), "inbox-model");
});

test("the legacy shared setting remains a compatible fallback", () => {
  const environment = { OPENAI_TRIP_MODEL: "legacy-model" };

  assert.equal(resolveOpenAiModel(environment, "assistant"), "legacy-model");
  assert.equal(resolveOpenAiModel(environment, "document"), "legacy-model");
  assert.equal(resolveOpenAiModel(environment, "inbox"), "legacy-model");
});
