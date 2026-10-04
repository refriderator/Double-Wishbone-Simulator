# Double Wishbone Simulator

Open `index.html` in a browser. Everything it needs is in this folder, so it works offline. All files sit at one level, with no subfolders, so they can be uploaded to GitHub through its web page.

## Files

| File | What it holds |
|---|---|
| `index.html` | Page structure: tabs, sliders, panels, the data table |
| `style.css` | The OL! Racing Factory look: tokens (colors, fonts, spacing) at the top, then layout |
| `core.js` | Physics: linkage geometry, lookup tables, equations of motion, setup-sheet formulas |
| `ui.js` | Input forms, 3D view, charts, main loop |
| `*.woff2` | Michroma, Chakra Petch and VT323 from the OL! design system |
| `ol-racing-factory-white.png`, `body-model.js` | The OL! Racing Factory logo, and the car body shown in the 3D view |
| `three.min.js`, `OrbitControls.js` | three.js r128 and its OrbitControls (library code, leave as is) |

## `core.js`

- `stockCar()`, `coensCar()`, `PRESETS`: the two cars the Stock and Coen's buttons load. `defaults()` returns the stock car, which is what a new visitor starts with (floor still, plain box instead of the body). The comment above them says which numbers are published, measured, fitted or estimated.
- `GEO`, `SPR`, `VEH`, `STEER`: every number field, as `[key, label, unit, scale to SI, step, min, max]`.
- `fv`, `design`, `pose`: geometry of one corner (wishbones, upright, tie rod).
- `buildAxle`: lookup tables over wheel travel and rack position.
- `step`: one time step of the equations of motion. With `inp.U > 0` the car is driven: the tires make the side force and the car slides and yaws.
- `sheet`: the setup-sheet numbers.
- `tireFy`, `tirePeak`, `TIRE_PRESETS`: the tire side-force curve and the three sets of typical grip numbers.
- `balance`, `gripNow`, `axleSolve`: grip in use per axle against lateral g, the cornering limit of each axle, and the understeer gradient.
- `CT, KBS, KBS2, CBS, KTOP, DT`: tire damping, bump-stop and droop-stop rates, time step. `TREF, TSHAPE, TCURV, TRELAX`: tire curve constants.

## `ui.js`

- `readColors`: reads the OL! color tokens from `style.css` for the canvases and the 3D view.
- `buildFields`, `renderForms`: the input forms.
- `init3D`: the 3D view.
- `drawRear`, `drawCurve`, `drawHist`, `drawTele`: the panels under the 3D view.
- `frame`: the main loop that steps the physics and redraws.

## Signs and units

- Everything is SI inside (m, kg, N, s, rad). The fields convert to mm, N/mm and degrees.
- Vehicle frame: x forward, y to the right, z up.
- Steering + is right. Roll + is right side up. Lateral g + is a right turn. Pitch + is nose up. Travel + is bump. Toe + is toe-in.

## The two cars: where each number comes from

Both are a Mazda MX-5 NB 1.8 (NB8C). The **Stock** button loads the car as Mazda built it. The **Coen's** button loads the same arms, pivots and rack with these changes: 8 / 6 kgf/mm springs, 15×7 ET35 wheels with 30 mm (front) and 12 mm (rear) spacers, 185/45R15 tires at 240 kPa (loaded radius 260 mm, 235 N/mm, as entered), alignment at ride height of front camber −4.67°, caster 3°, toe −0.5° and rear camber −3.17°, toe 0° (the Geometry fields read front −3.98° and −0.82°, rear −1.91°, because they are set at stock height and lowering adds the rest, as after a realignment), rack inner joint 207.0 mm (6.8 mm above stock), travel limits as stock, ride height −26 mm front and −38 mm rear from stock height. Stock has 16 in rims (15 in on Coen's), so wheel sizes can be compared; the rim diameter only changes the drawing and the tire-size estimate, and stock loaded radius stays 274 mm so the numbers match Mazda's. Coen's dampers are the stock slopes × 1.66 front and × 1.69 rear, which is a guess (the real ones are stiffer by an unknown amount). Any edit lights the **Session** button instead: your edits are kept in this browser as the session setup, and Session loads them back after you try Stock or Coen's. Until you edit something, Session is the stock car. A new visitor starts on the stock car with the floor still and the plain box shown. A one-window quick start guide opens every time the page loads; close it with the ✕, Esc or a click outside, and reopen it with the **Guide** button. **Export** saves the setup on screen as a `.json` file (named `dws-<car>-<date>.json`); **Import** loads such a file as the session setup, replacing the session setup kept in the browser. A file whose geometry cannot be built is refused and nothing changes. The Steering tab has a **Cut knuckles** switch: it shortens the front steering arm by the amount entered (20 mm is a placeholder) and re-sets the tie rod so static toe holds; it is off in both cars.

| Basis | Numbers |
|---|---|
| Published by Mazda | Wheelbase 2265 mm, track 1415 / 1440 mm, mass 1030 kg, front camber 0°02′, caster 5°40′, kingpin 11°39′, caster trail 17.5 mm, rear camber −0°42′, toe-in 3 mm per axle, roll center 41 / 120 mm, wheel stroke 82 / 93 mm front and 80 / 96 mm rear, springs 2.9 / 2.1 kgf/mm, damper forces at 0.1 and 0.3 m/s, rack stroke 121 mm, 2.6 turns, full lock 38° / 33° |
| Measured by others | Motion ratios 0.686 / 0.721 (owner measurement), CG height 449 mm (from NHTSA's static stability factor 1.59) |
| Measured on the parts | Front arms: lower 336.6 mm from the pivot line to the ball joint, inner pivots 325 mm apart, ball joint 25 mm ahead of the front pivot; upper 250 mm, inner pivots 220 mm apart. Front knuckle: upper ball joint 120.7 mm above the axle, lower ball joint 92.1 mm below it and 88.9 mm in from the wheel face. Rear chassis pivots: lower 243.9 mm and upper 387.3 mm from the centerline, upper 192.1 mm above lower, lower pivots 320.4 mm apart front to back, upper 164.5 mm. Rear arms: lower 393.7 mm, upper 212.7 mm. Rear upright: the axle sits 45 % of the way up from the lower arm mount to the upper one (photo) |
| NA drawing values already in this project | Upper pivots 183 mm above lower (188.8 mm on the NB). The drawing's pivot spacings (656 / 756 mm) and 350 mm lower arm are no longer used |
| Fitted so the model reproduces the numbers above | Front: pivots 646 / 736 mm apart and 171.8 / 360.6 mm above ground, upright 217.2 mm (the measured heights leaned to Mazda's 11°39′ kingpin), spindle and hub-face positions, tie rod outer joint 101 mm ahead of the ball joint axis (full lock 38° / 33°; a rough 135 mm measurement gave 27° / 25° and was not used), rack height 200.2 mm (zero bump steer), coilover mount. Rear: upright 240 mm (a rough 230 mm estimate could not give the roll center with enough droop reach), lower pivot 186.4 mm above ground, hub face 137.9 mm, damper mount 0.874 along the arm, fitted to the 120 mm roll center, 1440 mm track and 0.721 motion ratio |
| Estimates | Unsprung mass 32 kg per corner, front weight share 52 %, inertias (yaw 1400 kg·m²), tire rate 185 N/mm, anti-roll bar rates 8.0 / 1.4 N/mm, and every tire grip number (typical street tires on Stock, typical sporty street tires on Coen's) |

Checks that were not used in the fit: with the lower pivot 5.8 mm higher (the NA position) the model's front roll center is 62.5 mm (Mazda's NA figure: 61 mm), and with the NA's 4°26′ caster the trail is 11.6 mm (Mazda: 11.6 mm). The turning radius at the outer front tire is 4.49 m (Mazda: 4.6 m).

### The rear arms

The Miata has no rear toe link. Its rear lower arm holds the upright at two outer pivots. The model draws the arm as two legs: the front leg from the front inner pivot to the ball joint, and the rear leg from the rear inner pivot to a second outer point `ee` behind the ball joint. The rear leg holds the toe. Both legs swing about the same axis, so the model's rear has no toe change by construction. A real rear end has some; the model does not. The "pivots fore-aft" fields only change the drawing, except `ee`, which also places the second outer point.

## The car body in the 3D view

- `body-model.js` holds the body mesh. It was converted from `mazda_roadster_lod_d.kn5` in the Assetto Corsa mod "Mazda Roadster (NB8C) Garage Vary" (author listed as Sam S.). The wheels were left out because the simulator draws its own.
- The BOX / BODY switch on the display chooses between the body and the plain chassis box. The choice is remembered in the browser.
- The body's look (see-through fill, lit edges) is set by the `car` materials in `init3D` in `ui.js`. Its color comes from `--arm-upper` in `style.css`.
- The model is someone else's work. Check the mod's terms before sharing a copy of this page that includes it. Without `body-model.js` the page still works and shows the box.

## Tabs

| Tab | What is on it |
|---|---|
| Geometry | Arms, chassis pivots, upright, alignment, per axle |
| Wheels & tires | Wheel, tire size and rate, tire grip, per axle |
| Springs & heights | Springs, dampers, anti-roll bar, coilover mount, travel limits, ride height |
| Steering | Steering wheel, rack, cut knuckles, tie rod |
| Forces | Lateral and longitudinal g, a point load, road bumps. While Drive is on the tab reads *Forces, the lateral slider is dimmed, and the Drive controls (steady speed, steering wheel, step steer) sit under it |
| Vehicle | Mass, inertias, wheelbase, CG |

## Wheels and tires

- **Wheel** (rim diameter, rim width, offset, spacer) and **Tire** (section width, aspect ratio, pressure, loaded radius, vertical rate).
- The hub is fixed on the upright. Wheel offset and a spacer slide the wheel along the spindle from there, as on the car, so a smaller offset or a spacer widens the track and adds scrub radius without moving the suspension. `ET_FIT` in `core.js` (40 mm) is the offset the hub position was fitted with.
- "Estimate from size" fills in the tire's vertical rate (Rhyne's empirical formula) and loaded radius (free radius − static load ÷ rate). Both stay editable. Rim width only appears in the setup sheet's Wheel row; it does not enter the physics or the drawing.
- **Tire grip**: five numbers per axle (peak grip, grip lost with load, cornering stiffness, camber thrust, best camber into the turn). "Kind of tire" fills them with typical values for a street, sporty street or semi-slick tire. Tire makers do not publish these, so they are not measured data: trust the direction of a change more than its size.

## Grip and handling

- **Telemetry** shows each tire's slip angle and the share of its grip in use.
- **History** shows the last 10 s of lateral g, yaw rate, roll, pitch, heave and tire loads. **Record** starts a recording of up to 60 s; **Stop** ends it and the panel then shows the whole recording. **Export graph** saves it as a PNG picture, **Export numbers** as a CSV table (one row per 0.01 s, with the steering wheel angle as an extra column), **Discard** goes back to the live history. Settle, Step steer or loading a car restarts a recording in progress, so a recording started before Step steer begins at the step; a spin stops it and keeps it.
- **Setup sheet** runs from everyday numbers to detail: alignment at ride height, wheels and ride height, springs and dampers, then roll, pitch and grip (the cornering limit of the front and rear tires, which end runs out first, and the understeer gradient), steering, and geometry detail.
- The **space bar** runs and pauses the simulation from anywhere on the page.
- The **Curve** menu names both axes of each curve (for example "Camber vs wheel travel" and "Camber vs steering"). **Grip in use vs lateral g** plots both axles against lateral g. The line that reaches 100 % first sets the limit.
- The **Drive** button at the top (next to Pause and Settle) lights up and runs the car at the steady speed: the tires make the side force, the car slides and yaws, and lateral g comes out of that. With it off you set lateral g on the Forces tab. It is a mode, not part of a setup: it is off every time the page opens or a car is loaded, and switching it does not change which car button is lit. **Step steer** (only while it is on) centers the wheel, then turns it to the angle entered; the History panel shows lateral g, yaw rate and roll building up.
- While Drive is on, the floor grid in the 3D view moves under the car: it streams back at the car's speed, turns as the car yaws and drifts sideways when the car slides. `GND` in `ui.js` holds the car's heading and position.
- Speed is constant, the road is flat, and no drive or brake force acts at the tires. If the car slides sideways faster than it moves forward it has spun, and the page centers the steering.

## Good to know

- The car shell in the 3D view comes from a lowered Assetto Corsa car. `BODY_LIFT` in `ui.js` (0.038 m) raises it on the wheels so it sits right at stock height. It changes the drawing only, not the numbers.
- The page saves the setup in the browser. After editing `stockCar()` or `coensCar()`, click Stock or Coen's on the page to see the change.
- If the page stops working after an edit, open the browser console (F12, then Console) to see the error and its line number.
- The look follows the OL! design system: night only, a closed palette (black, grays, midnight blue, ice), square corners. Change colors through the tokens at the top of `style.css`, not in the rules below them.
