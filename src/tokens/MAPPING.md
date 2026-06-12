# ink ↔ MD3 token mapping

The Horizon token layer keeps the **Material Design 3 token vocabulary**
(`primary`, `surfaceContainerHigh`, `outline`, …) so existing consumers keep
compiling, but remaps every **value** onto the canonical prototype's
**gold-on-ink** palette (`docs/handoff/prototype/src/tokens.js`). Where MD3
lacks a needed gradation, a new named key is added (right-most column).

`tokens.js` (the prototype) is the source of truth for every value.

## Palette primitives (prototype `T.color`)

| Ink token       | Value                    | Role                            |
| --------------- | ------------------------ | ------------------------------- |
| `ink0`          | `#0C0E12`                | app base (behind shell)         |
| `ink1`          | `#111419`                | content background              |
| `ink2`          | `#161A21`                | card surface (Level 1)          |
| `ink3`          | `#1C212A`                | raised / hover / nested         |
| `ink4`          | `#232A34`                | modal / popover (Level 2)       |
| `ink5`          | `#2B333F`                | highest                         |
| `text`          | `#ECEEF2`                | primary text                    |
| `textMuted`     | `#9BA3B0`                | secondary text                  |
| `textDim`       | `#646C7A`                | dim text                        |
| `textFaint`     | `#454C58`                | faint text                      |
| `line`          | `rgba(255,255,255,0.07)` | hairline border                 |
| `lineStrong`    | `rgba(255,255,255,0.12)` | stronger hairline               |
| `lineFaint`     | `rgba(255,255,255,0.04)` | faintest hairline               |
| `accent`        | `#E6B559`                | horizon gold (payoff / primary) |
| `accentBright`  | `#F4CC74`                | lighter gold                    |
| `accentDim`     | `rgba(230,181,89,0.16)`  | gold wash                       |
| `accentLine`    | `rgba(230,181,89,0.30)`  | gold hairline                   |
| `onAccent`      | `#1A1306`                | ink-on-gold                     |
| `pos` / `neg`   | `#74C29B` / `#CE8278`    | growth / debt                   |
| `info` / `warn` | `#7FA7D9` / `#E0A86B`    | steel / clay                    |
| `liquid`        | `#E6B559`                | Total Liquid line (= accent)    |
| `debt`          | `#CE8278`                | Restschuld line                 |
| `flow`          | `#7C93B4`                | Net Cashflow line (cool)        |

## MD3 key → ink value

| MD3 key                   | Ink source     | Value                    |
| ------------------------- | -------------- | ------------------------ |
| `primary`                 | `accent`       | `#E6B559`                |
| `onPrimary`               | `onAccent`     | `#1A1306`                |
| `primaryContainer`        | `accentDim`    | `rgba(230,181,89,0.16)`  |
| `onPrimaryContainer`      | `accentBright` | `#F4CC74`                |
| `secondary`               | `pos`          | `#74C29B`                |
| `secondaryContainer`      | `posDim`       | `rgba(116,194,155,0.14)` |
| `tertiary`                | `warn`         | `#E0A86B`                |
| `tertiaryContainer`       | `warnDim`      | `rgba(224,168,107,0.14)` |
| `error`                   | `neg`          | `#CE8278`                |
| `errorContainer`          | `negDim`       | `rgba(206,130,120,0.14)` |
| `surface`                 | `ink1`         | `#111419`                |
| `onSurface`               | `text`         | `#ECEEF2`                |
| `onSurfaceVariant`        | `textMuted`    | `#9BA3B0`                |
| `surfaceContainerLowest`  | `ink0`         | `#0C0E12`                |
| `surfaceContainerLow`     | `ink1`         | `#111419`                |
| `surfaceContainer`        | `ink2`         | `#161A21`                |
| `surfaceContainerHigh`    | `ink3`         | `#1C212A`                |
| `surfaceContainerHighest` | `ink5`         | `#2B333F`                |
| `surfaceVariant`          | `ink3`         | `#1C212A`                |
| `outline`                 | `lineStrong`   | `rgba(255,255,255,0.12)` |
| `outlineVariant`          | `line`         | `rgba(255,255,255,0.07)` |
| `background`              | `ink0`         | `#0C0E12`                |
| `surfaceTint`             | `accent`       | `#E6B559`                |
| `restschuldStrokeColor`   | `debt`         | `#CE8278`                |

## New gradation keys (no MD3 equivalent)

`accentBright`, `accentLine`, `onSurfaceDim` (= `textDim`),
`onSurfaceFaint` (= `textFaint`), `lineFaint`, `info`, `infoDim`, `warn`,
`warnDim`, and the data-viz line roles `liquid` / `debt` / `flow`.

## Per-kind identity (`chartColors`)

| AccountKind  | Value     | Swatch |
| ------------ | --------- | ------ |
| `Girokonto`  | `#7FA7D9` | steel  |
| `Tagesgeld`  | `#74C29B` | sage   |
| `Mortgage`   | `#CE8278` | rose   |
| `CreditCard` | `#5FB8C0` | teal   |
| `Investment` | `#B79CE0` | lilac  |

## Type & shape

- **Fonts:** Space Grotesk (UI) + IBM Plex Mono (figures), self-hosted woff2
  via `@font-face` in `src/styles/Fonts.ts` — no CDN. Figures use
  `font-variant-numeric: tabular-nums`.
- **Radius:** `sm 6 / md 8 / lg 10 / xl 14 / pill 999` (+ semantic
  `card 12 / button 8 / badge 9999` aliases).
- **Spacing:** `space(n) = n * 4px`.
