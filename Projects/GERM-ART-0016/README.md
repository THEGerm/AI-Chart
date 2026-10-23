# Ancient Egypt, one image per Kingdom

**GERM-ART-0016.** Former location `Egypt/`, moved 2026-10-23. Live page: https://thegerm.github.io/AI-Chart/Projects/GERM-ART-0016/

A single HTML file that prints a four-ink risograph poster of ancient Egypt: six isometric cut-away dioramas, one per period, each with its main pharaoh present somewhere in the scene. Every scene, person, object and ink dot is drawn in code with Canvas 2D.

- **File:** `index.html`, **190,645 bytes** (one file, no images, no data-URI images, no fonts, no libraries, no WebGL).
- **Network:** the page loads with exactly one request, itself. (`<link rel="icon" href="data:,">` is an empty data URI that stops the browser from requesting `/favicon.ico`. It contains no image.)
- **Text:** the only text is the chapter card, set in system serif stacks (`"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`). The hieroglyphs on the card are drawn as paths, not set from a font.

## Controls

| Input | Action |
| :--- | :--- |
| Drag / one finger | Pan, with inertia |
| Wheel / trackpad pinch / two fingers | Zoom, anchored on the cursor or pinch centre |
| Double-click / double-tap a scene | Fly to it (the chapter card eases in) |
| Arrow keys | Pan |
| `+` / `-` | Zoom |
| `0` | Fit the sheet |
| `C` | Toggle the chapter card |

The sheet prints in first, the scenes coming off the press one by one. After about six seconds the camera tours the chapters in order, holds on each, returns to the full sheet, and repeats. Any input pauses the tour; it resumes after about 12 seconds of no input.

## The kingdoms, years and card text

Dates follow the conventional chronology (Shaw, *The Oxford History of Ancient Egypt*); reign dates for individual kings vary between sources.

### I. The Old Kingdom
- **Card line:** Dynasties III – VI · c. 2686 – 2181 BCE
- **Scene:** Khufu raises the Great Pyramid at Giza, c. 2560 BCE
- **Pharaoh:** hidden. The red-ochre gang mark with Khufu's cartouche on the block being hauled up the ramp.
- **Cartouche on card:** Khufu (Aa1, G43, I9, G43: kh-w-f-w)
- **Text:** The age of the pyramid builders. For Khufu of the Fourth Dynasty, crews of conscripted and paid workers, fed with bread and beer from bakeries beside the site, dragged limestone blocks on wooden sledges up ramps of rubble, wetting the sand ahead of the runners. Masons dressed each block with copper chisels while scribes kept the tallies. The gangs painted their names on the stones, one of them "Friends of Khufu": find the red cartouche on the block being hauled.

### II. The Middle Kingdom
- **Card line:** Dynasties XI – XIV · c. 2055 – 1650 BCE
- **Scene:** A royal sculptors' workshop, reign of Senusret III, c. 1850 BCE
- **Pharaoh:** obvious. The careworn granite statue of the king, plus a red-ink sketch of him on a squared grid and a painted stela.
- **Cartouche on card:** throne name Kha-kau-Ra (N5, N28, D28 x3)
- **Text:** After a century of division, kings from Thebes reunited the country and a classical age of literature and art followed. Senusret III (reigned c. 1878 – 1839 BCE) reorganised the provinces and fortified the Nubian frontier. His statues are unlike any before them: heavy-lidded eyes, lined cheeks, large ears, a careworn face of kingship. Here sculptors finish a granite king laid out on a squared grid, using stone pounders, copper chisels and sand to polish.

### III. The New Kingdom
- **Card line:** Dynasties XVIII – XX · c. 1550 – 1069 BCE
- **Scene:** A banquet at Pi-Ramesses, Ramesses II and Queen Nefertari, c. 1250 BCE
- **Pharaoh:** obvious. Enthroned on the dais in the blue crown; his name is also stamped on the wine jars.
- **Cartouche on card:** Ra-mes-su (N5, F31, S29, S29)
- **Text:** Egypt's imperial age, when its armies reached the Euphrates and deep into Nubia. Ramesses II ruled for 66 years (1279 – 1213 BCE), built from Abu Simbel to his Delta capital Pi-Ramesses, and agreed one of the earliest surviving peace treaties, with the Hittites. At this court feast he sits in the blue crown beside Nefertari. Guests wear perfumed cones, musicians play harp, lute and double pipe, and servants pour wine by the light of oil lamps.

### IV. The Late Period
- **Card line:** Dynasties XXVI – XXXI · 664 – 332 BCE
- **Scene:** The Greek port of Naukratis, year one of Nectanebo I, 380 BCE
- **Pharaoh:** an engraving. The Naukratis stela on the quay, the king offering to the goddess Neith.
- **Cartouche on card:** throne name Kheper-ka-Ra (N5, L1, D28)
- **Text:** Native kings from Sais, Mendes and Sebennytos held Egypt between two Persian conquests. Greek merchants lived and traded at Naukratis, a Nile port in the western Delta, bringing wine, oil and silver for grain and linen. In his first year Nectanebo I set up a granite stela here, decreeing that a tenth of the duties on Greek imports and on goods made in the town go to the goddess Neith at Sais. The king, carved offering to Neith, stands on the quay.

### V. The Ptolemaic Kingdom
- **Card line:** Dynasties XXXII – XXXIII · 332 – 30 BCE (Macedonian and Ptolemaic)
- **Scene:** The Library of Alexandria by lamplight, Cleopatra VII, c. 40 BCE
- **Pharaoh:** obvious and hidden. The queen in her diadem (the visit is imagined, and the card says so); her gold coin lies on the copyist's desk.
- **Cartouche on card:** Cleopatra (q-l-i-o-p-a-d-r-a-t with egg determinative)
- **Text:** After Alexander the Great, his general Ptolemy founded a Greek-speaking dynasty that ruled as pharaohs for nearly three centuries. In Alexandria they gathered scholars and many thousands of papyrus scrolls in the Library and the Museum. Cleopatra VII (51 – 30 BCE), the last of the line, was by Plutarch's account the first of her family to learn Egyptian. Scholars copy, read and measure the sky; the queen's visit is imagined, and her coin lies on a desk.

### VI. Roman Egypt
- **Card line:** Roman Period · Emperors as Pharaohs · 30 BCE – 395 CE
- **Scene:** Moonlight at Philae, temple of Isis, reign of Augustus, c. 10 BCE
- **Pharaoh:** a carving. Augustus as pharaoh offering to Isis on the pylon, with the cartouche "Kaisaros".
- **Cartouche on card:** Kaisaros (V31, M17 M17, S29, D21, S29: k-y-s-r-s)
- **Text:** After Actium and the death of Cleopatra, Egypt became the province of the emperor and the granary of Rome. On temple walls the emperors were still carved as pharaohs, offering to Egyptian gods, their names written in hieroglyphs. At Philae, by the southern frontier and its Roman garrison, Augustus built a temple, and here he appears as king before Isis while pilgrims land by moonlight. The cult lasted so long that the last known hieroglyphic inscription was carved at Philae in 394 CE.

**Editorial notes**
- The pyramid workers are shown as organised, fed labour crews rather than slaves, following the evidence from the Giza workers' town and the gang graffiti.
- Roman rule has no standard dynasty number, so its card line names the period instead of a roman numeral.
- The relief of Augustus before Isis is a representative scene of the type carved for him (as at Dendur); it is not a copy of a specific Philae wall.

## The four inks

| Ink | Hex | Screen angle | Misregistration (sheet units) | Used for |
| :--- | :--- | :--- | :--- | :--- |
| Lapis | `#21327a` | 45° | 0, 0 | Key line, shadow, night |
| Carnelian | `#d9472e` | 75° | +0.95, -0.6 | Skin, red ochre, fire |
| Ochre | `#f0b232` | 0° | -0.7, +0.85 | Sand, gold, sun and lamplight |
| Turquoise | `#18a09c` | 15° | +0.6, +1.0 | Faience, water, the Nile, moonlight |

Paper is warm cream `rgb(246, 237, 215)`. Every other colour on the sheet (greens, browns, purples, near-black) comes only from overprinting these four.

## How the print simulation works

1. **Separations.** Each scene is recorded once per boil variant into a display list of polygons. Each polygon carries a coverage value (0 to 1) for each of the four inks and a mode. Coverage is painted as greyscale into two offscreen canvases: canvas A holds Lapis, Carnelian and Ochre in its RGB channels; canvas B holds Turquoise in red and an object mask in green.
2. **Knock-out and overprint.** A normal fill uses `source-over` on every channel, so it erases whatever is behind it in all four separations, the way a printer's knock-out does. Lines, shading and light use `lighter` on their own channels only, so they overprint.
3. **Screening.** A per-pixel pass turns coverage into an amplitude-modulated dot screen for each ink, at that ink's angle, with a 2.1-unit cell. Dots get small seeded jitter in position and size, and their edges are anti-aliased. When the screen falls below about two device pixels it blends into the averaged tone, so the far view doesn't moiré.
4. **Press defects.** Each ink is sampled with its own drum offset (misregistration). Ink density drifts with low-frequency noise, and solids above 60% coverage get random dropout speckle from a seeded noise field.
5. **Multiply on paper.** The inks multiply over a grained cream paper, so secondary colours appear only where inks overlap.
6. **Light is ink.** The sun, lamp pools, fire glow, the Pharos beacon and moonlight are concentric overprinted rings. The ink steps up toward the source, and every step is screened like any other tone, so there are no smooth gradients anywhere.
7. **Hand-drawn line.** Every stroke is a tapered polygon whose centre line wobbles with seeded sine noise and whose ends overshoot slightly. Fills wobble too. Each scene is baked in three variants with different wobble seeds and cycled at 3 Hz, so the linework boils. All randomness is seeded: layout per scene, wobble per scene, op and variant, so the sheet draws the same way on every load.

## Rendering and performance

- **Tile pyramid.** The static sheet is printed into 256 px tiles at seven levels (0.25 to 16 device px per sheet unit), only for the visible area, under a per-frame time budget. Coarser tiles stand in until finer ones are ready, so zooming stays smooth and the result is crisp on 4K. Tiles are cached with LRU eviction, and three boil variants are kept only at levels where the wobble is visible.
- **Live sprites.** People, boats, fish and flames are re-inked as small sprites 12 times a second, "on twos", staggered and under a time budget. Each sprite is a knock-out paper silhouette plus a multiplied ink layer, so moving figures knock out the scene behind them like everything else.
- **Redraw only what moves.** The frame is recomposited only when the camera, a sprite or the boil frame changes.
- **Phones.** The sheet reflows to two columns in portrait. Device pixel ratio is capped at 2, the cache is smaller, and pinch and pan work by touch.

## People

All figures share one skeleton (pelvis, spine, neck, head, shoulders, elbows, wrists, hips, knees, ankles) driven by keyframed pose clips: walk, haul, carry, yoke, shoulder, tray, pour, sit, sit-and-offer, drink, scribe, kneel, grind, chisel, polish, point, staff, adore, offer, read, row, pole, cast a net, climb, sleep, harp, lute, pipes, clap, dance, guard, write, sistrum, and seated statue. Limbs are tapered volumes with muscle profiles, torsos are shaped along the spine, and every part carries a halftone shadow side. Heads have brows, kohl-lined eyes, noses, lips, ears and beards. Figures walk scripted loops through their scenes.

**Social class at a glance:**
- **Kings:** blue crown or nemes, gold apron kilt, broad collar, false beard.
- **Queens:** vulture crown with plumes (Nefertari) or the Hellenistic diadem (Cleopatra).
- **Officials and guests:** wigs, long pleated linen, collars, sandals, perfumed cones.
- **Priests:** shaved heads, white linen, leopard skin.
- **Scribes:** seated with papyrus.
- **Workers:** loincloths or short kilts, barefoot.
- **Greeks:** curly hair, beards, chiton and himation.
- **Roman soldiers:** helmet, mail, red tunic, shield.
