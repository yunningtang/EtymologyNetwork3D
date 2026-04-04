<div align="center">

# Etymology Network 词源星图

**See how English words connect — one living network of language.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-00E5FF?style=for-the-badge&logo=github&logoColor=white)](https://yunningtang.github.io/EtymologyNetwork3D/)
[![Version](https://img.shields.io/badge/v3.0-release-69F0AE?style=for-the-badge)]()
[![Words](https://img.shields.io/badge/30,000+-words-FFD740?style=for-the-badge)]()
[![Morphemes](https://img.shields.io/badge/200+-morphemes-FF80AB?style=for-the-badge)]()

<br/>

*An interactive 3D/2D visualization for exploring English word origins through prefixes, roots, and suffixes.*
*Designed for Chinese learners mastering English vocabulary.*

<br/>

### [>>> Try it now — Live Demo <<<](https://yunningtang.github.io/EtymologyNetwork3D/)

<br/>

![3D Globe View](screenshot.png)

</div>

---

## Features

| Feature | Description |
|---------|-------------|
| **3D Globe** | Navigate morpheme connections in a WebGL-powered star-map with smooth camera controls |
| **2D Mind Map** | Hierarchical radial layout — expand groups, morphemes, and individual words |
| **Smart Search** | Instant bilingual search across 30k+ words with dropdown results |
| **Word Details** | Tap any word for etymology breakdown, morpheme composition, and Chinese meaning |
| **Pronunciation** | Built-in text-to-speech — hear any word spoken aloud |
| **Favorites** | Save words to your collection and track learning progress |
| **Category Filters** | Filter by Prefix / Root / Suffix with fine-grained sub-category chips |
| **Bilingual UI** | Full English + Chinese interface throughout |

## Quick Start

**Option 1 — Browser**
> Open [`index.html`](index.html) directly — no server needed.

**Option 2 — Electron Desktop App**
```bash
git clone https://github.com/yunningtang/EtymologyNetwork3D.git
cd EtymologyNetwork3D
npm install
npm start
```

## How It Works

```
Browse / Search  →  Understand (etymology breakdown)  →  Practice (pronunciation)  →  Remember (favorites)
```

Every English word is built from **morphemes** — small meaning units inherited from Latin, Greek, and Old English. This tool maps those connections visually:

- **Prefixes** (`pre-`, `un-`, `re-`) — modify direction or degree
- **Roots** (`struct`, `ject`, `duct`) — carry the core meaning
- **Suffixes** (`-tion`, `-ly`, `-able`) — determine word class

Explore one morpheme and discover dozens of related words. See patterns across the entire vocabulary.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D Rendering | **Three.js** r128 — custom GLSL shaders, point sprites, additive blending |
| 2D Visualization | **Canvas 2D** — radial mind map with collision avoidance |
| Desktop | **Electron** v28 |
| Architecture | Single-file HTML — all CSS/JS embedded for zero-dependency deployment |
| Data | 200+ morphemes, 30k+ words with etymology mappings |
| Storage | `localStorage` for favorites and progress tracking |

## Project Structure

```
EtymologyNetwork3D/
├── public/
│   └── index.html          # Main application (single-file app)
├── index.html               # GitHub Pages entry point
├── main.js                  # Electron main process
├── package.json
├── data/
│   └── etymology.db         # Source etymology database
└── scripts/
    ├── build-html.js         # HTML builder
    ├── build-vocabulary.js   # Vocabulary processor
    ├── embed-words.js        # Word data embedder
    └── scrape-words.js       # Word scraper
```

## 17 Semantic Categories

The morpheme network is organized into color-coded semantic groups:

> **Create** · **Action** · **Sense** · **Mind** · **Language** · **Nature** · **Society** · **Number** · **Direction** · **Negation** · **Degree** · **Noun** · **Adj** · **Verb** · **Adv** · **Auxiliary** · **Fidelity**

---

<div align="center">

### Author

**Yunning Tang** · [tangyunning27@gmail.com](mailto:tangyunning27@gmail.com)

<br/>

MIT License

</div>
