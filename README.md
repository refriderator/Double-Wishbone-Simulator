# Double Wishbone Simulator

Open `index.html` in a browser. Everything it needs is in this folder, so it works offline.

## Files

| File | What it holds |
|---|---|
| `index.html` | Page structure: tabs, sliders, panels, the data table |
| `style.css` | The OL! Racing Factory look: tokens (colours, fonts, spacing) at the top, then layout |
| `core.js` | Physics: linkage geometry, lookup tables, equations of motion, setup-sheet formulas |
| `ui.js` | Input forms, 3D view, charts, main loop |
| `fonts/` | Michroma, Chakra Petch and VT323 from the OL! design system |
| `assets/` | The OL! Racing Factory logo (white on transparent) and `body-model.js`, the car body shown in the 3D view |
| `tools/kn5_to_body.py` | Makes `assets/body-model.js` from an Assetto Corsa `.kn5` model |
| `lib/` | three.js r128 and its OrbitControls (library code, leave as is) |

## `core.js`

- `defaults()`: the default car, a Mazda MX-5 NB 1.8 (NB8C). The comment above it says which numbers are published, measured, fitted or estimated.
- `GEO`, `SPR`, `VEH`, `STEER`: every number field, as `[key, label, unit, scale to SI, step, min, max]`.
- `fv`, `design`, `pose`: geometry of one corner (wishbones, upright, tie rod).
- `buildAxle`: lookup tables over wheel travel and rack position.
- `step`: one time step of the equations of motion.
- `sheet`: the setup-sheet numbers.
- `CT, KBS, KBS2, CBS, KTOP, DT`: tire damping, bump-stop and droop-stop rates, time step.

## `ui.js`

- `readColors`: reads the OL! colour tokens from `style.css` for the canvases and the 3D view.
- `buildFields`, `renderForms`: the input forms.
- `init3D`: the 3D view.
- `drawRear`, `drawCurve`, `drawHist`, `drawTele`: the panels under the 3D view.
- `frame`: the main loop that steps the physics and redraws.

## Signs and units

- Everything is SI inside (m, kg, N, s, rad). The fields convert to mm, N/mm and degrees.
- Vehicle frame: x forward, y to the right, z up.
- Steering + is right. Roll + is right side up. Lateral g + is a right turn. Pitch + is nose up. Travel + is bump. Toe + is toe-in.

## The default car: where each number comes from

| Basis | Numbers |
|---|---|
| Published by Mazda | Wheelbase 2265 mm, track 1415 / 1440 mm, mass 1030 kg, front camber 0°02′, caster 5°40′, kingpin 11°39′, caster trail 17.5 mm, rear camber −0°42′, toe-in 3 mm per axle, roll centre 41 / 120 mm, wheel stroke 82 / 93 mm front and 80 / 96 mm rear, springs 2.9 / 2.1 kgf/mm, damper forces at 0.1 and 0.3 m/s, rack stroke 121 mm, 2.6 turns, full lock 38° / 33° |
| Measured by others | Motion ratios 0.686 / 0.721 (owner measurement), CG height 449 mm (from NHTSA's static stability factor 1.59) |
| NA drawing values already in this project | Front lower pivots 656 mm apart, upper pivots 756 mm apart, upper 183 mm above lower (188.8 mm on the NB), lower arm 350 mm |
| Fitted so the model reproduces the numbers above | Pivot heights, front upper arm length (261.1 mm), upright lengths, spindle positions, kingpin offset, tie-rod joints, coilover mount positions, every rear length |
| Estimates | Lower ball joint height 160 mm, unsprung mass 32 kg per corner, front weight share 52 %, inertias, tire rate 185 N/mm, anti-roll bar rates 8.0 / 1.4 N/mm, zero bump steer, grip limit 0.9 g |

Two checks that were not used in the fit: with the lower pivot 5.8 mm higher (the NA position) the model's front roll centre is 59.7 mm (Mazda's NA figure: 61 mm), and with the NA's 4°26′ caster the trail is 11.8 mm (Mazda: 11.6 mm).

## The car body in the 3D view

- `assets/body-model.js` holds the body mesh. It was converted from `mazda_roadster_lod_d.kn5` in the Assetto Corsa mod "Mazda Roadster (NB8C) Garage Vary" (author listed as Sam S.). The wheels were left out because the simulator draws its own.
- The BOX / BODY switch on the display chooses between the body and the plain chassis box. The choice is remembered in the browser.
- To use a different model: `python3 tools/kn5_to_body.py path/to/model_lod_d.kn5`, then reload the page. Use a low-detail LOD file; the script stops above 65,535 vertices.
- The body's look (see-through fill, lit edges) is set by the `car` materials in `init3D` in `ui.js`. Its colour comes from `--arm-upper` in `style.css`.
- The model is someone else's work. Check the mod's terms before sharing a copy of this page that includes it. Without `body-model.js` the page still works and shows the box.

## Wheels and tires

- Geometry tab, per axle: **Wheel** (rim diameter, rim width, offset) and **Tire** (section width, aspect ratio, pressure, loaded radius, vertical rate).
- The wheel centre sits `hub face − offset` outboard of the kingpin axis, so a smaller offset widens the track and adds scrub radius.
- "Estimate from size" fills in the tire's vertical rate (Rhyne's empirical formula) and loaded radius (free radius − static load ÷ rate). Both stay editable. Rim width is only drawn, it does not enter the physics.

## Good to know

- The page saves the setup in the browser. After editing `defaults()`, click Defaults on the page to see the change.
- If the page stops working after an edit, open the browser console (F12, then Console) to see the error and its line number.
- The look follows the OL! design system: night only, a closed palette (black, greys, midnight blue, ice), square corners. Change colours through the tokens at the top of `style.css`, not in the rules below them.
