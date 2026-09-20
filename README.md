# Background 

I want to make a chart of AI and machine learning in the style of usefulcharts. Let's go step by step. Recommend two main roots structures. Don't go yet in the specific examples/companies/models. I want to start a bit of higher level.

# File Structure

```text
├── .github/                         # Automation Hub
│   └── workflows/
│       └── compile-charts.yml       # The GitHub Action script that handles processing
├── assets/                          # Generated Output Destination
│   └── images/                      # Processed .png/.svg files are saved here automatically
├── charts/                          # Source Code Destination
│   ├── Level_1.md        # Description of the top levels (main branches)
│   ├── Level_1.mmd        # Write the Mermaid code inside files here
│   ├── Level_2_1.md        # Description of the lower levels levels
│   ├── Level_2_1.mmd
│   ├── Level_2_2.md
│   ├── Level_2_2.mmd  
│   └── Main.mmd        # Write the Mermaid code for the whole file (all levels)      
├── templates/
│   └── template.mmd                 # Your global UsefulCharts configuration skeleton
├── README.md                        # Project documentation
└── style.md                         # Core style guidelines & design tokens
```
