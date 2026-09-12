# VIVITO Agent Core Candidate

Branch: `fix/vivito-agent-core`

Scope:
- Preserve bounded visible conversation history across advisor follow-ups.
- Preserve the same bounded history when routing single-step and multi-step actions.
- Add context-aware deterministic ERP fallback for provider outages.
- Keep role authorization and action execution gates unchanged.
- Add regression coverage for `حلل TNG → طب ليه؟ → طب أعمل إيه؟ → اعمل تاسك لأسماء بأول نقطة`.

Release gate:
- Preview build must be green.
- Authenticated conversation smoke must pass before merge to `main`.
- No direct production promotion from this branch.
