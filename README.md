# Double Wishbone Simulator

A four-corner double wishbone suspension simulator that runs in the browser. Set the linkage, springs and dampers, then load the car, steer it or drive it and watch what the suspension does.

Open `index.html`. Everything it needs is in this folder, so it works offline. All files sit at one level.

## Files

| File | What it holds |
|---|---|
| `index.html` | Page structure, the Data table, the model notes |
| `style.css` | Design tokens (colors, fonts, spacing) at the top, then layout |
| `core.js` | Physics: linkage, lookup tables, tires, equations of motion, setup sheet, solver, the two cars |
| `ui.js` | Forms, drawings, 3D view, panels, main loop |
| `body-model.js` | Car body and rim meshes for the 3D view |
| `three.min.js`, `OrbitControls.js`, `LICENSE-three.txt` | three.js r128. Library code: leave as is |
| `*.woff2` | Michroma, Chakra Petch, VT323 |
| `ol-racing-factory-white.png`, `intro-*.jpg` | Logo, and the three pictures in the Guide |

`index.html` loads `style.css`, `core.js`, `ui.js`, `body-model.js` and the Guide pictures with a `?v=` tag: the first 8 hex digits of the file's SHA-1. Update the tag when a file changes, or browsers keep the old copy.

## Code layout

Both scripts open with a numbered list of their sections.

`core.js` has no page code and runs in Node as well.

| Section | Main functions |
|---|---|
| Fields | `GEO`, `SPR`, `VEH`, `STEER`: every input as `[key, label, unit, factor, step, min, max]`. `check` |
| Linkage | `armOf`, `poseK`, `design`, `pose`, `instant`, `setCaster` |
| Tables | `buildAxle`, `lk1`, `lk2` |
| Tires | `tireFromSize`, `tirePeak`, `tireFy`, `TIRE_PRESETS` |
| Car model | `makeModel`, `step`, `settle` |
| Steady cornering | `gripNow`, `balance`, `steerInfo` |
| Setup sheet | `sheet` |
| Solver | `solveFor`, `axleNumbers`, `TARGETS` |
| Cars | `legacyStock`, `stockCar`, `coensCar`, `PRESETS` |
| Older setups | `fromLegacy`, `isLegacy` |

`ui.js`: setup and state, forms (`buildFields`, `renderForms`, `applyEdit`), Geometry tab (`renderGeoPart`, `drawAxisSk`, `drawArmSk`, `drawKnSk`, `solveRun`), controls, setup sheet (`refreshStatic`), 3D view (`init3D`), panels (`drawRear`, `drawCurve`, `drawHist`, `drawTele`), setup files, Guide (`VOCAB`, `VT`), main loop (`frame`).

## Signs and units

- SI inside (m, kg, N, s, rad). The fields convert to mm, N/mm and degrees.
- Vehicle frame: x forward, y right, z up.
- Positive: steering right, roll right side up, pitch nose up, lateral g in a right turn, travel in bump, toe-in.

## The two cars

**Stock** is the Mazda MX-5 NB 1.8 (NB8C) as built. **Coen's** is Stock with his parts: wheels, tires, spacers, springs, dampers, ride height, a front lower arm extension, shorter front upper arms and his alignment. Any edit becomes the **Session** setup, kept in the browser.

Each number is one of:

| Basis | Meaning |
|---|---|
| Verified | Published by Mazda or printed on the part |
| Measured | Taken off the car, a part or a drawing |
| Interpreted | Fitted so the model reproduces the verified numbers, worked out, or estimated |

The Data table on the page lists the main numbers with their basis. `core.js` section 10 holds the numbers themselves. After editing them, click Stock or Coen's on the page to load the change.

The stock car is written in front-view fields (arm lengths, pivot positions, a caster field), the terms its numbers were fitted in, and converted on load. Coen's car is written in the fields the page shows.

## The model in brief

- Each corner: a rigid knuckle on two wishbones and a tie rod, solved in 3D. Each wishbone swings about its own pivot axis, which can be angled in side and top view.
- The wheel is fixed on the knuckle, so the arms set the camber: camber = knuckle angle − kingpin inclination + hub angle. The hub angle (+1° to −3°) stands in for the car's eccentric bolts.
- Caster follows from where the ball joints sit along their arms. The tie rod's length sets static toe.
- The rear has no toe link. Its lower arm holds the toe at a second outer pivot, and its pivot axes stay parallel to the centerline.
- Dynamics: body heave, pitch and roll, four wheel hops, and slide and yaw while driven (Drive: constant speed, flat road, no drive or brake force at the tires).
- Cornering load transfer goes partly straight through the links (the body's share at the roll center height) and the rest through springs and bars. Braking and accelerating load transfer goes through the springs. No jacking, no anti-dive in the dynamics.
- Tires: a Magic Formula side-force curve with typical grip numbers, not test data.
- A tire radius change raises or lowers the car and leaves the suspension where it was.

The page's Model notes say the same in more detail.

## Setups in the browser and in files

- The setup on screen is saved under `dws.setup.nb5`, the session setup under `dws.session.nb5`.
- **Export** writes `dws-<car>-<date>.json`. **Import** loads such a file as the session setup. A file that cannot be built is refused and nothing changes.
- Setups in the front-view fields (older exports, and the `nb4` keys) still load: `fromLegacy()` converts them and the car comes out the same.
- Drive and its speed are a mode, not part of a setup.

## Vocabulary

Descriptions under the controls stay short. The Guide's Vocabulary page explains the words.

- `VOCAB` in `ui.js` holds them as `[id, word, meaning]`. Add a line to add a word.
- A description marks a word as `{word}` or `{shown text|id}`. Descriptions in `index.html` need `data-vt`.

## Look

The OL! design system: night only, a closed palette (black, grays, midnight blue, ice), square corners. Change colors through the tokens at the top of `style.css`.

## Credits

| Asset | From |
|---|---|
| Body `rs`, rim `rs` (Stock) | Assetto Corsa mod "Mazda Roadster 1.8 RS (NB)" by Sam S. Base model Microsoft Studios; 1.8 RS parts DeathRace, Tousan, HUM3D; adaptation Sam S., RKGaming |
| Body `gv` (Coen's) | Assetto Corsa mod "Mazda Roadster (NB8C) Garage Vary", author listed as Sam S. |
| Rim `gl` (Coen's) | Assetto Corsa mod "ADC Mazda MX-5 NB Stock" by Aussie Drift Co. Model Turn 10 / Forza; conversion BCV, JTSDG |
| three.js r128 | MIT license, `LICENSE-three.txt` |
| Michroma, Chakra Petch, VT323 | SIL Open Font License 1.1 |

The car models are other people's work. Sam S. allows edits of the Roadster RS mod and asks for credit; the ADC mod states no terms. Check before sharing a copy that includes `body-model.js`. Without it the page still works and shows a plain box and rim discs.
