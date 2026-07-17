# hexsticker

A build-less, browser-based GUI for designing **hexagon stickers** (hex logos) for R packages
and any other project — a visual front-end for the R package
[hexSticker](https://github.com/GuangchuangYu/hexSticker).

Live app: **https://ykfrkw.github.io/hexsticker/**

## Why

`hexSticker` is the de-facto way to make hex logos in R, but it has no GUI: you tweak
parameters in code and re-render to see the result. This app reproduces hexSticker's
coordinate system, default values and output dimensions in the browser so you can design
interactively, then **copy the equivalent `hexSticker::sticker(...)` R code**.

## Features

- Live SVG preview of the hex sticker as you edit.
- Full hexSticker parameter set: hexagon border/fill, subplot placement, spotlight,
  package-name text, URL text, white-around-sticker.
- Upload your own image (drag & drop) to use as the subplot.
- Multiple starter presets / colour variants to pick from and refine.
- Export at multiple sizes: PNG at several resolutions, vector SVG, and a small favicon.
- Copy equivalent `hexSticker::sticker(...)` R code.

## Running locally

No build step. Serve the folder statically:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Credits & licence

- App code: MIT (see [LICENSE](LICENSE)).
- Geometry, parameter model and defaults follow
  [hexSticker](https://github.com/GuangchuangYu/hexSticker) by Guangchuang Yu (MIT-style licence).
- The Aller typeface used by hexSticker's defaults is approximated with an open web font;
  the original Aller is © Dalton Maag.
