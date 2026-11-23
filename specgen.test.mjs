import test from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES, estimateCapacity, generateSpec } from "./specgen.mjs";

test("estimateCapacity computes Little's Law concurrency and replica floor", () => {
  const cap = estimateCapacity(1000, 200);
  assert.equal(cap.concurrency, 200);
  assert.ok(cap.recommendedReplicas >= 6);
  assert.match(cap.availabilityTarget, /99\.95%/);
});

test("generateSpec produces complete RFC markdown, OpenAPI 3.1 YAML, Mermaid and 6 STRIDE items", () => {
  const res = generateSpec(TEMPLATES.ai_agent_api);
  assert.match(res.markdown, /# Engineering RFC: PulseRouter AI Gateway/);
  assert.match(res.openApi, /openapi: 3\.1\.0/);
  assert.match(res.openApi, /\/v1\/completions\/route:/);
  assert.match(res.mermaid, /flowchart LR/);
  assert.equal(res.strideChecklist.length, 6);
});
