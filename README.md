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
- **Live terminal.** Visitors can type `help`, `whoami`, `projects`, `skills --hcm`, `matrix` or `sudo hire ahmed`. Tab autocompletes and the arrow keys bring back history.
- **Motion layer** (`js/motion.js`):
  - a custom cursor that shows labels like "open" or "copy"
  - buttons that pull towards the cursor
  - project and certificate cards that tilt in 3D with a light glare
  - headings that rise in word by word, and kicker labels that unscramble
  - hero letters that drop in and react on hover, plus a spotlight and parallax in the hero
  - a skills marquee that speeds up and skews with scroll speed
  - projects that scroll sideways while pinned (desktop)
  - button ripples and confetti
  - all of it switches off when the visitor has reduced motion enabled
- **Live product demos (faux UI).** Each project card, plus an Oracle HCM approval, is a small looping demo driven by a scripted cursor (`js/stage.js`). The demos follow a few rules:
  - only the words the story needs are real text, and the rest are placeholder lines
  - windows are cropped on purpose
  - every change has a cause (the cursor)
  - each loop ends exactly where it began
  - they pause when off screen, and show a still final state when reduced motion is on
- **Rolling digits** (`js/roll.js`) for the stats, the clock, the CGPA and the demo numbers. Only the digits that change move.
- **2026 platform features**, all used as progressive enhancement:
  - a bento "at a glance" grid with a live Riyadh clock (it shows whether it is Saudi working hours) and an animated CGPA gauge, sized with container queries
  - variable-font kinetic type in the hero (the weight eases with the cursor)
  - View Transitions: a circular theme reveal from the button and a language cross-fade
  - the command palette as a native `<dialog>` with `@starting-style` entrance and exit animations
  - CSS scroll-driven animations (`animation-timeline: view()` / `scroll()`) where supported
  - `text-wrap: balance / pretty` and a subtle grain texture
  - an accessible **Motion** on/off switch in the status bar, saved per visitor
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
