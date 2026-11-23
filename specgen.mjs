/**
 * OpenBuild SpecGen — Production Engineering RFC, OpenAPI 3.1 & Threat Model Generator
 * Deterministic zero-dependency engine generating:
 *  - Structured Engineering Design Doc (RFC / ADR)
 *  - Mermaid System Architecture Diagram
 *  - Valid OpenAPI 3.1 YAML Contract
 *  - STRIDE Security Checklist & Capacity/SLO Estimator
 */

export const TEMPLATES = {
  ai_agent_api: {
    projectName: "PulseRouter AI Gateway",
    owner: "OpenBuild Core Team",
    domain: "Multi-Model LLM Inference & Semantic Caching",
    targetRps: 350,
    p99BudgetMs: 420,
    authMode: "OAuth2 + Scoped API Keys",
    storageStack: "PostgreSQL 16 + Redis Cluster + S3 Object Store",
    endpoints: [
      { method: "POST", path: "/v1/completions/route", summary: "Route prompt across local/cloud models with latency SLA" },
      { method: "GET", path: "/v1/telemetry/slo", summary: "Fetch rolling P50/P95/P99 latency and token cost metrics" },
      { method: "POST", path: "/v1/policies/guardrail", summary: "Register PII redaction and rate-limit rules" }
    ]
  },
  fintech_ledger: {
    projectName: "ClearSettle Ledger",
    owner: "Payments Infra",
    domain: "Double-Entry Multi-Currency Settlement Engine",
    targetRps: 1200,
    p99BudgetMs: 120,
    authMode: "mTLS + HMAC-SHA256 Signed Requests",
    storageStack: "PostgreSQL Serializable + Kafka Event Log",
    endpoints: [
      { method: "POST", path: "/v1/transfers", summary: "Execute idempotent double-entry transfer" },
      { method: "GET", path: "/v1/accounts/{id}/balance", summary: "Query verified point-in-time balance" },
      { method: "POST", path: "/v1/reconciliations/run", summary: "Trigger deterministic ledger invariant audit" }
    ]
  },
  civic_portal: {
    projectName: "CivicGraph Open Data Hub",
    owner: "Public Digital Goods",
    domain: "Accessible Municipal Services & Eligibility API",
    targetRps: 150,
    p99BudgetMs: 250,
    authMode: "Public Read + OIDC Admin",
    storageStack: "SQLite / Litestream + Cloudflare Edge Cache",
    endpoints: [
      { method: "GET", path: "/v1/programs", summary: "Search municipal aid & transit programs by zip/need" },
      { method: "POST", path: "/v1/eligibility/check", summary: "Privacy-preserving local eligibility evaluation" }
    ]
  }
};

export function estimateCapacity(targetRps, p99BudgetMs) {
  const rps = Math.max(1, Number(targetRps || 100));
  const p99 = Math.max(20, Number(p99BudgetMs || 300));
  const monthlyRequestsM = +((rps * 2_592_000) / 1e6).toFixed(1);
  const concurrency = Math.ceil((rps * p99) / 1000);
  const recommendedReplicas = Math.max(2, Math.ceil(rps / 180) + 1);
  const availabilityTarget = rps >= 500 ? "99.95% (21.9 min/mo error budget)" : "99.90% (43.8 min/mo error budget)";
  return { rps, p99, monthlyRequestsM, concurrency, recommendedReplicas, availabilityTarget };
}

export function generateMermaid(cfg) {
  return [
    "flowchart LR",
    `  Client["Client / SDK"] --> Edge["API Gateway (${cfg.authMode})"]`,
    `  Edge --> Svc["${cfg.projectName} Core Service"]`,
    `  Svc --> DB[("${cfg.storageStack}")]`,
    `  Svc --> Obs["OpenTelemetry & SLO Monitor (<=${cfg.p99BudgetMs}ms P99)"]`
  ].join("\n");
}

export function generateOpenApiYaml(cfg) {
  const lines = [
    "openapi: 3.1.0",
    "info:",
    `  title: "${cfg.projectName}"`,
    `  version: "1.0.0"`,
    `  description: "${cfg.domain}"`,
    "paths:"
  ];
  const byPath = new Map();
  for (const ep of cfg.endpoints || []) {
    if (!byPath.has(ep.path)) byPath.set(ep.path, []);
    byPath.get(ep.path).push(ep);
  }
  for (const [path, eps] of byPath.entries()) {
    lines.push(`  ${path}:`);
    for (const ep of eps) {
      lines.push(`    ${ep.method.toLowerCase()}:`);
      lines.push(`      summary: "${ep.summary}"`);
      lines.push("      responses:");
      lines.push('        "200":');
      lines.push('          description: "Success"');
      lines.push('        "400":');
      lines.push('          description: "Validation Error"');
      lines.push('        "429":');
      lines.push('          description: "Rate Limit Exceeded"');
    }
  }
  return lines.join("\n");
}

export function generateSpec(input) {
  const cfg = {
    projectName: String(input?.projectName || "Untitled Service").trim(),
    owner: String(input?.owner || "Engineering Team").trim(),
    domain: String(input?.domain || "Web API Platform").trim(),
    targetRps: Number(input?.targetRps ?? 200),
    p99BudgetMs: Number(input?.p99BudgetMs ?? 300),
    authMode: String(input?.authMode || "Bearer JWT").trim(),
    storageStack: String(input?.storageStack || "PostgreSQL + Redis").trim(),
    endpoints: Array.isArray(input?.endpoints) && input.endpoints.length
      ? input.endpoints
      : [{ method: "GET", path: "/v1/health", summary: "Service liveness probe" }]
  };

  const cap = estimateCapacity(cfg.targetRps, cfg.p99BudgetMs);
  const mermaid = generateMermaid(cfg);
  const openApi = generateOpenApiYaml(cfg);

  const strideChecklist = [
    { threat: "Spoofing", mitigation: `Enforce ${cfg.authMode} with short-lived rotating credentials.` },
    { threat: "Tampering", mitigation: "Validate strict JSON schemas, signed webhooks, and parameterized SQL." },
    { threat: "Repudiation", mitigation: "Emit immutable structured audit logs with request correlation IDs." },
    { threat: "Information Disclosure", mitigation: "Encrypt TLS 1.3 in transit, AES-256 at rest, and redact PII in logs." },
    { threat: "Denial of Service", mitigation: `Token-bucket rate limiting + autoscaling from ${cap.recommendedReplicas} baseline replicas.` },
    { threat: "Elevation of Privilege", mitigation: "Least-privilege RBAC scopes enforced at API gateway and service layer." }
  ];

  const markdown = [
    `# Engineering RFC: ${cfg.projectName}`,
    ``,
    `- **Owner:** ${cfg.owner}`,
    `- **Domain:** ${cfg.domain}`,
    `- **Availability SLO:** ${cap.availabilityTarget}`,
    `- **Latency Budget:** P99 <= ${cap.p99} ms at ${cap.rps} RPS (~${cap.monthlyRequestsM}M req/mo, ~${cap.concurrency} peak concurrent)`,
    `- **Recommended Baseline Replicas:** ${cap.recommendedReplicas} stateless pods`,
    ``,
    `## 1. System Architecture`,
    "```mermaid",
    mermaid,
    "```",
    ``,
    `## 2. API Surface`,
    ...cfg.endpoints.map(e => `- \`${e.method} ${e.path}\` — ${e.summary}`),
    ``,
    `## 3. STRIDE Threat Model & Controls`,
    ...strideChecklist.map(s => `- **${s.threat}:** ${s.mitigation}`),
    ``,
    `## 4. Rollout & Verification Plan`,
    `1. Contract-test all OpenAPI 3.1 endpoints in CI with deterministic fixtures.`,
    `2. Canary deploy 5% -> 25% -> 100% with automated rollback if P99 > ${cap.p99} ms or 5xx > 0.2%.`
  ].join("\n");

  return { config: cfg, capacity: cap, mermaid, openApi, strideChecklist, markdown };
}
