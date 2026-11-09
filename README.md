# Ahmed Bawazir — Portfolio

Personal portfolio and live CV for **Ahmed Bawazir**, a software engineer and Oracle Fusion HCM consultant based in Riyadh.

Hand-built with plain HTML, CSS and JavaScript modules. No framework, no build step and no dependencies; Google Fonts is the only thing loaded from outside.

## What's inside

- **Particle "ab" monogram hero.** It moves away from the cursor and scatters when clicked (a still image when reduced motion is on).
- **IDE-style status bar.** It shows the current section, scroll position and a `⌘K` / `Ctrl+K` / `/` command palette.
- **Experience as a `git log`.** Each role is a commit card on a graph line that draws itself as you scroll.
- **A playground of three working demos:**
  - *Bug hunt*: a checkout with four planted bugs to find.
  - *Absence accrual simulator*: monthly accrual, a carry-over limit and days lost at year end, as configured in Oracle HCM absence plans.
  - *Validation rules, live*: new-hire form rules tested as you type.
- **English and Arabic**, with full right-to-left layout (`ع` / `EN` button).
- **Light and dark themes** that follow the system setting and remember your choice.
- Downloadable CV, a click-to-copy email, structured data for search engines, and an Open Graph image for link previews.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)

Settings → Pages → *Deploy from a branch* → pick the branch and `/ (root)`.
All paths are relative, so it also works under `https://aaaprog.github.io/WebCv/`.

## Editing content

- English text lives directly in `index.html`.
- Arabic translations are in `js/i18n.js` (the `ar` object, keyed by each element's `data-i18n` value).
- Text created by the scripts (playground messages, command palette) is in `dyn` in the same file.
- Replace `assets/Ahmed_Bawazir_CV.pdf` to update the downloadable CV.
