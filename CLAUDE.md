@AGENTS.md

# Model Selection

Before responding to every message, recommend which Claude model is best suited:

- **claude-haiku-4-5** — simple Q&A, short lookups, quick edits
- **claude-sonnet-4-6** — most coding tasks, debugging, feature work (default)
- **claude-opus-4-7** — complex architecture, long-horizon reasoning, hard problems

Format at the top of every response:
> 🤖 Recommended: **Sonnet 4.6** — [one-line reason] | switch: `/model claude-sonnet-4-6`

If current model already matches, still show the line so user can confirm.
