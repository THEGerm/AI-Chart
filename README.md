

# File Structure 

├── .github/                     # 🤖 Automation Hub
│   └── workflows/
│       └── compile-charts.yml   # The GitHub Action script that handles processing
├── assets/                      # 🖼️ Generated Output Destination
│   └── images/                  # Processed .png/.svg files are saved here automatically
├── charts/                      # ✍️ Source Code Destination
│   ├── royal-family-tree.mmd    # Write your Mermaid code inside files here
│   └── historical-timeline.mmd
├── templates/
│   └── template.mmd             # Your global UsefulCharts configuration skeleton
├── README.md                    # Project documentation
└── style.md                     # Core style guidelines & design tokens
