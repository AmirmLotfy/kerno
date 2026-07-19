# Third-party notices

Kerno source and the original `relaycart-ts` and `gatehouse-python` fixtures are authored for this project and licensed under Apache-2.0. The Kerno SVG marks are original; the dashboard screenshot is generated from Kerno’s own UI and fixture data. No third-party benchmark repository or external image is checked in.

Direct runtime dependencies:

| Package | Version | License |
|---|---:|---|
| @lezer/python | 1.1.19 | MIT |
| @modelcontextprotocol/sdk | 1.29.0 | MIT |
| better-sqlite3 | 11.10.0 | MIT |
| ignore | 7.0.6 | MIT |
| zod | 3.25.76 | MIT |

Development and UI dependencies include React 19.2.7, React DOM 19.2.7, Vite 7.3.6, Vitest 3.2.7, ESLint 9.39.5, tsx 4.23.1, esbuild 0.25.12, and related type/tooling packages under MIT; TypeScript 5.9.3 and Playwright 1.61.1 are Apache-2.0. `caniuse-lite` browser-compatibility data is CC-BY-4.0 and originates from the [Can I Use](https://caniuse.com/) project.

`npm run audit:licenses` checks installed package metadata against the allowed permissive-license policy. The package lock controls exact transitive versions. Copyright and license texts remain in each installed package and upstream distribution.
