# 350 ml tumbler — showcase page

A single-page showcase for a 350 ml matte steel tumbler. Plain HTML, CSS and
vanilla JS with no build step: `index.html` is the whole site.

```bash
python3 -m http.server 8412
# then open http://127.0.0.1:8412/
```

A server is needed rather than opening the file directly, because the browser
will not `fetch` the GLB over `file://`.

## What this page is

It shows the product; it does not sell it. There is no price, no cart and no
checkout, and no invented social proof. The interactive 3D model is the
subject, and every figure quoted on the page comes from
`assets/model/validation.json`.

Four sections, in order:

1. **Hero** — two lines of display serif set into the corners of the stage,
   the model turning between them.
2. **Measurements strip** — capacity, base diameter, height and part count,
   counting up as they come into view.
3. **Anatomy** — the interactive centrepiece: the exploded view, three
   hotspots on the model, and the parts list they highlight.
4. **Measurements** — the full specification table and the materials.

## Files

| Path | What it is |
|---|---|
| `index.html` | The page. Its assumptions are listed in a comment at the top. |
| `style.css` | Components. Every value resolves to a token — no literal colours or sizes. |
| `script.js` | Theme toggle, the two 3D stages, hotspots, the exploded view, count-ups. |
| `assets/design-system/tokens.css` | The Mykonos Blue design system: colour, type, space, radius, elevation. |
| `assets/model/tumbler.glb` | The tumbler model — five named parts, one PBR atlas, one `Explode_and_Return` clip. |
| `assets/model/validation.json` | Dimensions and per-part geometry checks the page's figures quote. |
| `assets/img/*.svg` | Unused. Placeholder imagery left over from an earlier storefront version; nothing references it. |

## Design system

`assets/design-system/tokens.css` implements the Mykonos Blue system
token-for-token: the Cycladic palette (Mykonos blue, Aegean night, whitewash,
stone, brushed steel, one sunlit brass accent), the Instrument Serif /
General Sans pairing, an 8pt space scale, hierarchical radii and ink-tinted
shadows.

- **Light is the default.** Dark is applied twice, for the `[data-theme]`
  toggle and for `prefers-color-scheme`, because plain CSS has no mixins and
  this project has no build step. Any token added for one dark path must be
  added to the other.
- **The serif is an accent**, not a workhorse: the two hero lines, the four
  measurement figures, the closing line, the wordmark. Nowhere else.
- **Brass is the single accent** — the hotspot markers and selected states.
- Sentence case throughout. No uppercase labels, no arrow glyphs appended to
  links, no uniform border radius.

The header toggle pins a mode to `localStorage`; a small inline script in
`<head>` applies it before first paint so the chosen mode never flashes.

`--stage-core` and `--stage-edge` are the two colours of the radial pool the
product sits in. On light they sink from whitewash to stone. Dark mode lifts
the pool *above* the page ground instead of dissolving into it, because a navy
product on a navy page has nothing to separate it from.

## The 3D stages

Two [`<model-viewer>`](https://modelviewer.dev) instances share one cached GLB:
4:5 in the hero, 1:1 in the anatomy section, both at a fixed aspect ratio so
the model never changes size across breakpoints. Environment map, exposure and
shadow settings are identical in both light and dark mode — a colder
environment in dark mode would shift the matte finish's hue between them.

In the hero the display type is layered *over* the stage and is
pointer-transparent, so a drag always reaches the model underneath it.

Motion is two orchestrated moments and nothing else. The hero model settles
into its stage on load, then turns at 8 seconds per revolution and pauses
while you drag it. Entering the anatomy section settles the second stage into
its close framing, plays the exploded view once, and stills the hero so two
models are never turning at the same time; scrolling back restores the hero.
The camera pulls out for the clip and eases back in when the parts are home
again. Hotspots on either stage fill one callout and highlight the matching
row in the parts list. `prefers-reduced-motion` skips both moments.

## Two caveats, both stated on the page

1. The model is an estimated reconstruction calibrated to roughly 350 ml, not
   a certified measurement.
2. The GLB's baked texture is the original navy, so the on-page finish reads
   darker than the Mykonos blue the design system is built around. Re-baking
   the base colour from a final product render is the one asset change that
   would close that gap.
