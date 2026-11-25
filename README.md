# Beyond the Postcard — A Museum of Imagined Senses

An original, self-contained five-gallery WebGL museum adapting the previous *Museum of Missing Senses* walkable-gallery engine. No frameworks, accounts, tracking, network calls, or build process required.

## Start the museum

For GitHub Pages, upload **all** files in this folder (including the `assets/` folder) to a repository, then enable **Settings → Pages → Deploy from a branch → main / (root)**. Open the generated GitHub Pages URL. The site has no external runtime dependencies.

For local testing, run `python3 -m http.server 8000` in this directory and open http://localhost:8000. Some browsers also allow direct opening of `index.html`, but a local server is recommended for WebGL image loading.

## Controls

- WASD / arrow up/down: walk; mouse drag / pointer lock: look; E: interact with nearby artwork; Esc: release mouse or close a panel.
- The **Galleries** menu has room shortcuts. The **Collection** stores a personal set of five sensory postcards. **Final room** becomes available after five completed galleries.
- Your answers are saved **only in this browser's local storage**. They are not uploaded. The visitor guide can reset them.
- At the end, collect **Final Sensory Receipt** from the museum reception and use the browser **Print / Save as PDF** option.

## Gallery sequence

1. Greece: imagined soundscape; locate self, choose sounds/intensity, source/memory, flip to visitor view, revise, silence test, postcard.
2. China: imagined body journey; movement/rest markers, body-meter, flip, rebuild, different routes/bodies, postcard.
3. Iceland: imagined thermal/tactile body map; immersion, body zones, comfort, flip, revise, temperature-versus-feeling reflection, postcard.
4. UK: imagined weather timeline; visual cues, three moments, comfort, flip, revise, missing moments, postcard.
5. Spain: personal space map and crop lab; choose position and space, flip, revise, physically crop the visitor image, reflect on what is omitted, postcard.

## Sources and limitations

The ten images are supplied by the project creator. `assets/{country}_{promo|visitor}.jpg` are editable replacements. Gallery captions identify distinct **promotional** versus **visitor** views but do not claim identical camera positions, dates or conditions. The UK material represents the **Lake District region**, not a verified same-site paired shoot. The Iceland night/day images also differ in lighting/time. Interactions show **imagined**, not recorded or measured, sensory experience.

The core scholarly framework belongs in the separate academic reflection, not the visitor-facing questions: Degen & Rose (2012) *The Sensory Experiencing of Urban Design*; Kate McLean (2019/assigned edition) *Sensory Maps*; D'Ignazio & Klein (2020) *Data Feminism*, chapter 4. Urry & Larsen and Stepchenkova & Zhan are supplementary contextual readings.

Before public publication, the creator should still check source metadata/permission, annotate photographer or account, and complete any course AI-use declaration. The AI-use declaration is separate from image-use permissions.

## Files

- `index.html`: museum structure / prologue
- `styles.css`: museum styles and print receipt
- `museum.js`: five-room geometry, movement, local data model, all interaction stages
- `assets/`: five pairs of creator-supplied photographs

### Direct opening from Finder on macOS

The website now includes `embedded_images.js` so Chrome can render the ten photos on the WebGL walls when opening `index.html` directly as a `file://` URL. This file is generated from the `assets/` JPEGs; do not delete it or move it. If you later replace an image in `assets/`, run the website over a local HTTP server to see the new photo or regenerate `embedded_images.js`. GitHub Pages uses the original images from `assets/` automatically.
