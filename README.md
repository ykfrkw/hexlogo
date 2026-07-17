# hexsticker

A build-less, browser-based hexagon sticker / hex logo maker for packages, projects, and
any brand that wants a clean six-sided badge.

Live app: **https://ykfrkw.github.io/hexsticker/**

## Why

Hex logos are everywhere in open-source and developer tooling, but making one usually means
fiddling with a design tool or a code-based generator just to nudge a border width or swap a
colour. This app puts a live, interactive hex-sticker editor directly in the browser — no
install, no account, no server round-trip.

## Features

- Live SVG preview of the hex sticker as you edit.
- Full parameter set: hexagon border/fill, subplot placement, spotlight, package/title text,
  URL text, white-around-sticker margin.
- Upload your own image (drag & drop) to use as the subplot.
- Multiple starter presets / colour variants to pick from and refine.
- Export at multiple sizes: PNG at several resolutions, vector SVG, and a small favicon.

## Running locally

No build step. Serve the folder statically:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Credits & licence

- App code: MIT (see [LICENSE](LICENSE)).
