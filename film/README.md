# Intro film — «From Kuala Lumpur to Riyadh»

`index.html` draws every frame as a pure function of time (`seek(t)`), so the film can be
previewed live in a browser or rendered frame by frame into `assets/intro.mp4`.

- **Retime to the voice-over:** edit `S` (scene starts) and `CAPTIONS` near the top of the script.
- **Textures (not committed, ~11 MB):** NASA Blue Marble 2004-12 (public domain), resized to
  8K in `tex/earth-8k.jpg`, with full-resolution patches over Malaysia and Arabia; topology and
  clouds from the three-globe examples. Three.js r160 as `three.module.js`.
- **Preview:** serve this folder (`python3 -m http.server`) and open it; `?t=40` starts at 40 s.
