# OnQ Brand

## The mark

A **Q whose bowl is a clock**. The tail crosses the bowl (as a real Q's does), and a
detached amber dot trails it — "the queue keeps moving".

Why this one: it is simultaneously the letter, a clock, and a queue. Earlier
explorations that detached the tail read as a magnifying glass, and a dotted-ring
version never resolved into a Q at all.

Assets are generated, not hand-drawn — `npm run brand:assets` regenerates every
size for both apps from `scripts/generate-onq-brand.mjs`. To restyle, edit
`markInk()` in that file and re-run; nothing else needs touching.

## Colours

| Token | Hex | Use |
|---|---|---|
| `accent` | `#5980A6` | Primary. Chrome, buttons, links, the calm default. |
| `accent700` | `#416180` | Pressed states, headings on tinted surfaces. |
| `amber` | `#E6A84A` | **Attention only.** "It's your turn", rating stars, logo hour hand. |
| `amberDeep` | `#B87C22` | Text on amber-soft backgrounds. |
| `amberSoft` | `#FCEFDC` | "Are you coming?" prompt, owner stall-guard warning. |
| `success` | `#4A7D5F` | Confirmations, verified-visit badge. |
| `danger` | `#A64848` | Destructive actions (leave queue, delete account). |

### The amber rule

Amber is the app's *second* colour, not decoration. It marks the moments where
the product delivers its promise: **your turn is now**. Everything routine stays
blue. If amber starts appearing on ordinary buttons, the signal is lost.

Deliberately amber:
- "It's your turn" takeover card
- "Are you coming?" confirmation prompt
- Rating stars
- Owner "Still going?" stall-guard nudge

Deliberately **not** amber: navigation, primary CTAs, headings, the route map's
chrome.

## Typography

- Headings: **Barlow Condensed** 600 — condensed, confident, space-efficient.
- Body: **Barlow** 400/500/700.

## The illustrated map

The Salons route is an illustrated countryside lane, not a street map: an earth
track with cart ruts, storefront pins that scale with distance, and roadside
props (trees, stones, hay bales, fences, sheep, one tractor). Placement is seeded
per shop so it is organic but stable across refreshes.

Shops that upload a logo show it in their pin; everything else falls back to the
storefront glyph.
