export function generateSpec({ name = "MyApp", stack = "Node.js + Web", goal = "Automate workflow" }) {
  return `# ${name}\n\n## Stack\n${stack}\n\n## Goal\n${goal}\n\n## Automated Verification Plan\n- Unit test core deterministic module\n- Verify HTTP 200 & zero console errors\n`;
}
