# UI/UX Design System Specification: "Classic & Soft"
*Inspired by Claude (Anthropic) & OpenRouter aesthetic principles*

---

## 1. Aesthetic Philosophy

The goal is to move away from harsh high-contrast "cyberpunk" or sterile corporate blue SaaS templates and embrace an editorial, warm, and tactile identity:

* **Warmth over Cold Neutrality**: Avoid pure `#000000` and `#FFFFFF`. Use creamy ivory/paper backgrounds, charcoal typography, and terracotta/clay accents.
* **Editorial & Literary Typography**: Pair an expressive, classic Serif for headings with an ultra-clean, legibly-spaced Monospace for code/API tokens and a neutral geometric Sans for functional microcopy.
* **Soft Depth & Tactile Shadows**: Avoid harsh 1px borders everywhere. Rely on subtle tint-shifts, soft layered shadows (`box-shadow` with low opacity and high blur), and rounded pill/card geometry.
* **Calm Density**: Generous whitespace, relaxed line-heights ($1.6$–$1.8$), and minimal visual noise so the developer feels focused.

---

## 2. Color Palette & Design Tokens

### Light Theme (Default Editorial Paper)
* **Background Canvas (`bg-canvas`)**: `#FAF8F5` (Warm Cream / Soft Paper)
* **Surface / Cards (`bg-surface`)**: `#FFFFFF` (Pure white for raised cards)
* **Subtle Raised (`bg-subtle`)**: `#F2EFE9` (Warm light gray for hover and table headers)
* **Border (`border-soft`)**: `#E8E4DC` (Delicate warm divider)
* **Text Primary (`text-main`)**: `#1C1917` (Deep stone charcoal)
* **Text Secondary (`text-muted`)**: `#6E6A64` (Warm slate)
* **Primary Accent (Claude Terra)**: `#D97757` / `#C85A32` (Terracotta / Warm Coral)
* **Accent Subdued**: `#F4ECE7` (Warm cream tint for badges and highlights)
* **Success / Online**: `#4D7C5F` (Muted Sage Green, avoid electric neon green)
* **Warning / Throttled**: `#C28B38` (Amber Ochre)

### Dark Theme (Warm Obsidian / Night Paper)
* **Background Canvas**: `#161514` (Deep Umber / Warm Black)
* **Surface / Cards**: `#1E1D1A` (Dark Stone Charcoal)
* **Subtle Raised**: `#282622` (Soft elevated container)
* **Border**: `#34312C` (Subtle boundary)
* **Text Primary**: `#EFECE6` (Off-white / Warm bone)
* **Text Secondary**: `#9E988F` (Warm muted beige)
* **Primary Accent**: `#E28567` (Soft Clay Glow)
* **Accent Subdued**: `#2A201C` (Muted terracotta dark wash)

---

## 3. Typography Stack

| Element | Font Family | Size / Leading | Weight | Character |
| :--- | :--- | :--- | :--- | :--- |
| **Hero & Page Titles** | Serif (`Instrument Serif`, `Newsreader`, or `Playfair Display`) | 32px–48px / 1.2 | Regular / Medium (400–500) | Editorial, thoughtful, humane |
| **Section & Card Titles** | Sans (`Geist`, `Inter`, or `Cabinet Grotesk`) | 16px–20px / 1.4 | Semi-Bold (600) | Clear, grounded |
| **Body & Explanations** | Sans (`Inter` or `Geist`) | 14px–15px / 1.6 | Regular (400) | Relaxed, readable |
| **API Keys, Endpoints, Stats** | Mono (`JetBrains Mono` or `Geist Mono`) | 12px–13px / 1.5 | Regular (400) | Technical precision |

---

## 4. Component Design Patterns

### 4.1. Navigation & Header
* **Style**: Floating or borderless top bar with soft glass blur (`backdrop-blur-md bg-canvas/80`).
* **Branding**: Small serif wordmark with a subtle warm dot (e.g., `Antigravity •`).
* **Balance Indicator**: Pill button showing remaining credits:
  * Style: `bg-[#F4ECE7] text-[#C85A32] font-mono text-xs px-3 py-1 rounded-full border border-[#E8D6CC]`.

### 4.2. API Key Generator & Masking (The "OpenRouter" Card)
* Soft white container with a 1px warm border: `rounded-2xl border border-[#E8E4DC] bg-white shadow-sm p-6`.
* Monospace copy input with a clean one-click copy button:
  * Key field: `bg-[#FAF8F5] border border-[#E8E4DC] font-mono text-sm px-4 py-2.5 rounded-lg text-stone-800`.
  * Success toast: Gentle fade-in with muted green tint (`bg-[#EAF3ED] text-[#2D5A3C]`).

### 4.3. Model Catalog & Pricing List
* Tabular or card-based list of models (e.g., `gemini-2.5-pro`, `gemini-2.5-flash`):
  * **Tags**: Soft pill tags (`bg-stone-100 text-stone-600 rounded-md px-2 py-0.5 text-xs`).
  * **Price formatting**: Clear breakdown like `$1.25 / 1M prompt • $5.00 / 1M completion` in warm muted typography.
  * **Latency / Health Indicator**: Small pulsating sage dot (`h-2 w-2 rounded-full bg-emerald-600`).

### 4.4. Code Playground / Quickstart Snippet
* Mimicking Claude's clean code blocks:
  * Dual-tab switcher: `cURL`, `Python`, `Node.js`.
  * Background: Soft deep warm stone (`bg-[#1C1A18]` for code blocks even in light mode) or soft cream container in light mode with syntax highlighting biased toward amber, terracotta, and soft blues.

---

## 5. Tailwind CSS Configuration Preset

Add this directly to your `tailwind.config.ts` or `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#FAF8F5',
          dark: '#161514',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1E1D1A',
        },
        subtle: {
          light: '#F2EFE9',
          dark: '#282622',
        },
        borderSoft: {
          light: '#E8E4DC',
          dark: '#34312C',
        },
        stoneText: {
          main: '#1C1917',
          muted: '#6E6A64',
          bone: '#EFECE6',
        },
        terracotta: {
          50: '#FDF8F6',
          100: '#F4ECE7',
          200: '#E8D6CC',
          500: '#D97757',
          600: '#C85A32',
          700: '#A44422',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Playfair Display', 'serif'],
        sans: ['Geist', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'monospace'],
      },
      boxShadow: {
        'soft-sm': '0 1px 2px 0 rgba(28, 25, 23, 0.04)',
        'soft-card': '0 4px 20px -2px rgba(28, 25, 23, 0.05)',
        'soft-float': '0 12px 32px -4px rgba(28, 25, 23, 0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
```

---

## 6. Ready-to-Use UI Component Example (React + Tailwind)

A sample component matching this design system for your API Dashboard overview:

```tsx
import React, { useState } from 'react';

export function DashboardHero() {
  const [copied, setCopied] = useState(false);
  const sampleKey = "sk-ant-live-49204918230912";

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-canvas-light text-stoneText-main font-sans selection:bg-terracotta-100 selection:text-terracotta-700">
      {/* Top Bar */}
      <header className="border-b border-borderSoft-light/70 bg-canvas-light/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl tracking-tight text-stone-900">Antigravity</span>
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-terracotta-100 text-terracotta-600 border border-terracotta-200">
              Gateway
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="font-mono text-xs px-3 py-1.5 rounded-full bg-white border border-borderSoft-light text-stoneText-muted flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Balance: <strong className="text-stoneText-main font-semibold">$24.50</strong>
            </div>
            <button className="text-xs font-medium px-4 py-2 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white transition-all shadow-soft-sm">
              Add Credits
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        {/* Editorial Heading */}
        <div className="space-y-2">
          <h1 className="font-serif text-4xl text-stone-900 tracking-tight">API Credentials & Routing</h1>
          <p className="text-stoneText-muted text-base font-normal max-w-xl leading-relaxed">
            Standard OpenAI-compatible drop-in endpoints powered by high-throughput pooled infrastructure.
          </p>
        </div>

        {/* API Key Box */}
        <div className="bg-surface-light border border-borderSoft-light rounded-2xl p-6 shadow-soft-card space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-stoneText-muted">Active Secret Key</label>
            <span className="text-xs text-stone-400">Created 2 days ago</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 font-mono text-sm bg-canvas-light border border-borderSoft-light rounded-xl px-4 py-2.5 text-stone-800 select-all">
              {sampleKey}
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 text-xs font-medium rounded-xl border border-borderSoft-light hover:bg-subtle-light transition-colors text-stoneText-main"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Available Models (OpenRouter-style overview) */}
        <div className="space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-stoneText-muted">Available Models</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: "gemini-2.5-pro", context: "1M Context", cost: "$1.25 / 1M" },
              { id: "gemini-2.5-flash", context: "1M Context", cost: "$0.15 / 1M" },
            ].map((m) => (
              <div key={m.id} className="bg-surface-light border border-borderSoft-light rounded-2xl p-5 hover:border-terracotta-300 transition-colors shadow-soft-sm flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-sm font-semibold text-stone-900">{m.id}</h3>
                  <span className="text-xs text-stoneText-muted">{m.context}</span>
                </div>
                <div className="text-right font-mono text-xs text-stone-700">
                  {m.cost}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
```