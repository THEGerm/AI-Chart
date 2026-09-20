# Background 

I want to make a chart of AI and machine learning in the style of usefulcharts. Let's go step by step. Recommend two main roots structures. Don't go yet in the specific examples/companies/models. I want to start a bit of higher level.

# UsefulCharts Design Style Guide

This guide outlines the design constraints, color systems, and tools required to accurately replicate the distinct visual style created by Matt Baker for UsefulCharts.

## Core Design Principles

### 1. Canvas Background
Avoid a harsh white background. UsefulCharts utilizes a signature warm, matte cream canvas.
*   **HEX:** `#EDE8D8`

### 2. Box Borders
Box boundaries should use a thin, sharp, deep earth tone instead of solid black.
*   **HEX:** `#78501E`

### 3. Block Color Palette
Use this specific muted, historical pastel-vibrant palette to categorize nodes, dynasties, or themes:

| Category | HEX Code | Visual Indicator |
| :--- | :--- | :--- |
| **Red** | `#F26654` | 🔴 |
| **Orange** | `#EF953A` | 🟠 |
| **Yellow** | `#EFC239` | 🟡 |
| **Green** | `#96BC96` | 🟢 |
| **Blue** | `#80C3E1` | 🔵 |
| **Violet** | `#AD81AF` | 🟣 |

### 4. Typography & Hierarchy
*   **Font Family:** Use a clean, timeless sans-serif font family (e.g., *Inter*, *Helvetica*, or *Arial*).
*   **Headers / Names:** Always use **Bold** weighting.
*   **Minor Details / Dates:** *Italics* weighting for chronological transitions or supplementary meta-data.

### 5. Layout & Connections
*   **No Arrows:** Do not use arrowheads on connection lines. Let the vertical or lateral generation layers establish the flow naturally.
*   **Grid Alignment:** Keep boxes perfectly aligned on horizontal and vertical axes to preserve clean negative space.


# File Structure

```text
├── .github/                         # Automation Hub
│   └── workflows/
│       └── compile-charts.yml       # The GitHub Action script that handles processing
├── assets/                          # Generated Output Destination
│   └── images/                      # Processed .png/.svg files are saved here automatically
├── charts/                          # Source Code Destination
│   ├── Level_1.md                   # Description of the top levels (main branches)
│   ├── Level_1.mmd                  # Write the Mermaid code inside files here
│   ├── Level_2_1.md                 # Description of the lower levels levels
│   ├── Level_2_1.mmd
│   ├── Level_2_2.md
│   ├── Level_2_2.mmd  
│   └── Main.mmd                     # Write the Mermaid code for the whole file (all levels)      
├── README.md                        # Project documentation
└── style.css                        # Core style guidelines & design tokens
```
