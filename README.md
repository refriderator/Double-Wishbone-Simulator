# Double Wishbone Simulator

Open `index.html` in a browser. Everything it needs is in this folder, so it works offline. All files sit at one level, with no subfolders, so they can be uploaded to GitHub through its web page.

## Files

| File | What it holds |
|---|---|
| `index.html` | Page structure: tabs, sliders, panels, the data table |
| `style.css` | The OL! Racing Factory look: tokens (colours, fonts, spacing) at the top, then layout |
| `core.js` | Physics: linkage geometry, lookup tables, equations of motion, setup-sheet formulas |
| `ui.js` | Input forms, 3D view, charts, main loop |
| `*.woff2` | Michroma, Chakra Petch and VT323 from the OL! design system |
| `ol-racing-factory-white.png`, `body-model.js` | The OL! Racing Factory logo, and the car body shown in the 3D view |
| `three.min.js`, `OrbitControls.js` | three.js r128 and its OrbitControls (library code, leave as is) |

## `core.js`

- `stockCar()`, `coensCar()`, `PRESETS`: the two cars the Stock and Coen's buttons load. `defaults()` returns Coen's, the car the page starts with. The comment above them says which numbers are published, measured, fitted or estimated.
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

## The two cars: where each number comes from

Both are a Mazda MX-5 NB 1.8 (NB8C). The **Stock** button loads the car as Mazda built it. The **Coen's** button loads the same arms, pivots and rack with these changes: 8 / 6 kgf/mm springs, 15×7 ET35 wheels with 30 mm (front) and 12 mm (rear) spacers, 185/45R15 tires at 240 kPa (loaded radius 260 mm, 235 N/mm, as entered), alignment at ride height of front camber −4.67°, caster 3°, toe −0.5° and rear camber −3.17°, toe 0° (the Geometry fields read front −3.97° and −0.97°, rear −1.94°, because they are set at stock height and lowering adds the rest, as after a realignment), rack inner joint 204.9 mm (6.8 mm above stock), travel limits as stock, ride height −26 mm front and −38 mm rear from stock height. Stock has 16 in rims (15 in on Coen's), so wheel sizes can be compared; the rim diameter only changes the drawing and the tire-size estimate, and stock loaded radius stays 274 mm so the numbers match Mazda's. Coen's dampers are the stock slopes × 1.66 front and × 1.69 rear, which is a guess (the real ones are stiffer by an unknown amount). Any edit lights the **Session** button instead: your edits are kept in this browser as the session setup, and Session loads them back after you try Stock or Coen's. Until you edit something, Session is Coen's setup.

| Basis | Numbers |
|---|---|
| Published by Mazda | Wheelbase 2265 mm, track 1415 / 1440 mm, mass 1030 kg, front camber 0°02′, caster 5°40′, kingpin 11°39′, caster trail 17.5 mm, rear camber −0°42′, toe-in 3 mm per axle, roll centre 41 / 120 mm, wheel stroke 82 / 93 mm front and 80 / 96 mm rear, springs 2.9 / 2.1 kgf/mm, damper forces at 0.1 and 0.3 m/s, rack stroke 121 mm, 2.6 turns, full lock 38° / 33° |
| Measured by others | Motion ratios 0.686 / 0.721 (owner measurement), CG height 449 mm (from NHTSA's static stability factor 1.59) |
| Measured on the parts | Front knuckle: upper ball joint 120.7 mm above the axle, lower ball joint 92.1 mm below it and 88.9 mm in from the wheel face. Rear chassis pivots: lower 243.9 mm and upper 387.3 mm from the centreline, upper 192.1 mm above lower, lower pivots 320.4 mm apart front to back, upper 164.5 mm. Rear arms: lower 393.7 mm, upper 212.7 mm. Rear upright: the axle sits 45 % of the way up from the lower arm mount to the upper one (photo) |
| NA drawing values already in this project | Front lower pivots 656 mm apart, upper pivots 756 mm apart, upper 183 mm above lower (188.8 mm on the NB) |
| Fitted so the model reproduces the numbers above | Front: pivot heights 170.1 / 358.9 mm, lower arm 331.8 mm (was 350 mm from the NA drawing; it had to change to fit the measured knuckle), upper arm 240.4 mm, upright 217.2 mm (the measured heights leaned to Mazda's 11°39′ kingpin), spindle and hub-face positions, tie rod outer joint 102 mm ahead of the ball joint axis (full lock 38° / 33°; a rough 135 mm measurement gave 27° / 25° and was not used), rack height 198.1 mm (zero bump steer), coilover mount. This fit is sensitive: a 0.7° change in kingpin angle moves the pivot heights by about 20 mm. Rear: upright 240 mm (a rough 230 mm estimate could not give the roll centre with enough droop reach), lower pivot 186.4 mm above ground, hub face 137.9 mm, damper mount 0.874 along the arm, fitted to the 120 mm roll centre, 1440 mm track and 0.721 motion ratio |
| Estimates | Unsprung mass 32 kg per corner, front weight share 52 %, inertias, tire rate 185 N/mm, anti-roll bar rates 8.0 / 1.4 N/mm, grip limit 0.9 g |

Checks that were not used in the fit: with the lower pivot 5.8 mm higher (the NA position) the model's front roll centre is 62.9 mm (Mazda's NA figure: 61 mm), and with the NA's 4°26′ caster the trail is 11.6 mm (Mazda: 11.6 mm). The turning radius at the outer front tire is 4.49 m (Mazda: 4.6 m).

### The rear arms

The Miata has no rear toe link. Its rear lower arm holds the upright at two outer pivots. The model draws the arm as two legs: the front leg from the front inner pivot to the ball joint, and the rear leg from the rear inner pivot to a second outer point `ee` behind the ball joint. The rear leg holds the toe. Both legs swing about the same axis, so the model's rear has no toe change by construction. A real rear end has some; the model does not. The "pivots fore-aft" fields only change the drawing, except `ee`, which also places the second outer point.

## The car body in the 3D view

- `body-model.js` holds the body mesh. It was converted from `mazda_roadster_lod_d.kn5` in the Assetto Corsa mod "Mazda Roadster (NB8C) Garage Vary" (author listed as Sam S.). The wheels were left out because the simulator draws its own.
- The BOX / BODY switch on the display chooses between the body and the plain chassis box. The choice is remembered in the browser.
- The body's look (see-through fill, lit edges) is set by the `car` materials in `init3D` in `ui.js`. Its colour comes from `--arm-upper` in `style.css`.
- The model is someone else's work. Check the mod's terms before sharing a copy of this page that includes it. Without `body-model.js` the page still works and shows the box.

## Wheels and tires

- Geometry tab, per axle: **Wheel** (rim diameter, rim width, offset) and **Tire** (section width, aspect ratio, pressure, loaded radius, vertical rate).
- The wheel centre sits `hub face − offset` outboard of the kingpin axis, so a smaller offset widens the track and adds scrub radius.
- "Estimate from size" fills in the tire's vertical rate (Rhyne's empirical formula) and loaded radius (free radius − static load ÷ rate). Both stay editable. Rim width is only drawn, it does not enter the physics.

## Good to know

- The car shell in the 3D view comes from a lowered Assetto Corsa car. `BODY_LIFT` in `ui.js` (0.038 m) raises it on the wheels so it sits right at stock height. It changes the drawing only, not the numbers.
- The page saves the setup in the browser. After editing `stockCar()` or `coensCar()`, click Stock or Coen's on the page to see the change.
- If the page stops working after an edit, open the browser console (F12, then Console) to see the error and its line number.
- The look follows the OL! design system: night only, a closed palette (black, greys, midnight blue, ice), square corners. Change colours through the tokens at the top of `style.css`, not in the rules below them.
