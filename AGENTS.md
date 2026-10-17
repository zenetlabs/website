# Codex guidance — zenetlabs/website

Read CLAUDE.md first; it is the shared source of rules. Codex adaptations:
- Start non-trivial work with ~/vault/memory/MEMORY.md and ~/vault/projects/zenetlabs-website/README.md. Never put secrets in the vault; never run mutating git there.
- Use $plan-well for plans and $commit only when explicitly asked; plain commit never authorizes a deploy.
- One review pass per PR inside the $commit gate, at the level CLAUDE.md defines; native review only for `high`.
- AskUserQuestion maps to the available question tool. Claude model/agent names are not Codex APIs.
- Never commit or push without explicit instruction. No stash/reset --hard/checkout ./clean.
