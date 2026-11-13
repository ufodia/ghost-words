# Contributing

Thank you for making transcript review easier to trust.

## Run the project

Use Node.js 24 LTS. Run `npm ci`, then `npm run dev`. Before submitting a pull request, run `npm run typecheck`, `npm test`, and `npm run build`.

## Useful contributions

- A minimal synthetic SRT/VTT parsing edge case.
- A false-positive example with an explanation of why the words are legitimate.
- Improvements to keyboard flow, waveform readability, or error messages.
- Browser/codec compatibility observations with browser and OS versions.

Keep changes focused. Core heuristics belong in `src/core.ts` with a test demonstrating the user-visible behavior. DOM rendering must treat imported text as text. Update the guide and changelog when behavior changes.

## Report an issue

Include the exact steps, expected result, observed result, browser version, and a small non-sensitive reproduction. Never post private audio, customer transcripts, access tokens, or identifying file paths. Security reports follow [SECURITY.md](SECURITY.md).

Contributions are provided under the MIT license. By submitting a change, you confirm you can share the code and included data under that license. Original examples and synthetic fixtures are preferred.
