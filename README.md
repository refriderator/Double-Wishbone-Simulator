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
| `ol-racing-factory-white.png`, `body-model.js` | The OL! Racing Factory logo, and the car bodies and wheel rims shown in the 3D view |
| `three.min.js`, `OrbitControls.js` | three.js r128 and its OrbitControls (library code, leave as is) |

## `core.js`

- `legacyStock()`: the stock car, written down in the fields of versions 41 to 56, because every number in it was found, fitted or checked in those terms. The comment above it says which numbers are published, measured, fitted or estimated.
- `fromLegacy()`: turns such a setup into the fields the program works in now, without changing the car. `stockCar()` is the converted stock car. `coensCar()` is the stock car plus Coen's parts, written in today's fields, so its knuckles, pivots and rack are stock's to the last digit. `PRESETS` holds the two for the Stock and Coen's buttons. `defaults()` returns the stock car, which is what a new visitor starts with (floor still, plain box instead of the body).
- `GEO`, `SPR`, `VEH`, `STEER`: every number field, as `[key, label, unit, scale to SI, step, min, max]`. `geoOf(axle)` leaves out the fields an axle does not have.
- `armOf`, `legsOf`, `fromLegs`, `reseat`: one arm from its fields (pivot axis, pivot spacing, reach, ball joint position), its two leg lengths, and the two ways an edit can be taken (see the Geometry tab below).
- `poseK`, `design`, `pose`: the 3D linkage of one corner: two arms that each swing about their own pivot axis, the knuckle as one rigid part, and the tie rod. `instant` gives how the knuckle is moving (roll center, anti-dive). `casterAt`, `setCaster`: caster as a result of where the ball joints sit, and the move that sets it.
- `buildAxle`: lookup tables over wheel travel and rack position.
- `solveFor`, `axleNumbers`, `TARGETS`: the Solver box of the Geometry tab.
- `fvL`, `designL`, `tieSolveL`, `fromOldCamberL`, `axleFromLegacy`, `isLegacy`: the front-view model of versions 41 to 56. It is kept only to read the stock car as it is written down and setups saved or exported by those versions.
- `step`: one time step of the equations of motion. With `inp.U > 0` the car is driven: the tires make the side force and the car slides and yaws.
- `sheet`: the setup-sheet numbers.
- `tireFy`, `tirePeak`, `TIRE_PRESETS`: the tire side-force curve and the three sets of typical grip numbers.
- `balance`, `gripNow`, `axleSolve`: grip in use per axle against lateral g, the cornering limit of each axle, and the understeer gradient.
- `CT, KBS, KBS2, CBS, KTOP, DT`: tire damping, bump-stop and droop-stop rates, time step. `TREF, TSHAPE, TCURV, TRELAX`: tire curve constants.

## `ui.js`

- `readColors`: reads the OL! color tokens from `style.css` for the canvases and the 3D view.
- `buildFields`, `renderForms`: the input forms.
- `renderGeoPart`, `geoEdit`, `drawAxisSk`, `drawArmSk`, `drawKnSk`: the Geometry tab, one part at a time, and its lettered drawings. `buildTargets`, `solveRun`, `drawSolve`: the Solver box.
- `VOCAB`, `VT`: the vocabulary shown in the Guide, and the function that turns a marked word in a description into a link to it (see "Descriptions and vocabulary").
- `init3D`: the 3D view.
- `drawRear`, `drawCurve`, `drawHist`, `drawTele`: the panels under the 3D view.
- `frame`: the main loop that steps the physics and redraws.

## Signs and units

- Everything is SI inside (m, kg, N, s, rad). The fields convert to mm, N/mm and degrees.
- Vehicle frame: x forward, y to the right, z up.
- Steering + is right. Roll + is right side up. Lateral g + is a right turn. Pitch + is nose up. Travel + is bump. Toe + is toe-in.

## The two cars: where each number comes from

Both are a Mazda MX-5 NB 1.8 (NB8C). The **Stock** button loads the car as Mazda built it. The **Coen's** button loads the same pivots, knuckles and rack with these changes: 15×7 ET35 wheels with 30 mm (front) and 12 mm (rear) spacers, 195/45R15 tires at 240 kPa (loaded radius 267.5 mm and 234 N/mm, from the size), Swift 8 / 6 kgf/mm springs on Fortune Auto 510 coilovers, a front lower arm extension that moves the ball joint about 5 mm out (the owner's estimate; the shock and bar mounts stay where they were on the arm), front camber of −4.2° at ride height with the hub angle on the knuckle at 0 (the owner's choice): lowered, with the extension, stock-length upper arms and the eccentrics centered the car reads −1.77°, and the upper arm is cut 9.7 mm (240.3 mm) for the rest (worked out, not measured; how the camber is split between eccentrics and cut makes no difference to grip or to camber at full lock), rear camber −1.5° from its hub angle, caster 3°, toe −0.5° front and 0° rear at ride height, and ride height −26 mm front and −38 mm rear from stock height measured at the body (so it includes the 6.5 mm smaller tire radius). Its knuckles are the stock parts, tie rod end included, and its chassis pivots, rear arms and rack are where stock has them: `coensCar()` in `core.js` is the stock car with only Coen's own parts changed. Travel is 62.5 mm of bump and 67 mm of droop from ride height in front, 48.5 and 69 mm at the rear: bump stops where the stock dampers have them, droop to where an unpreloaded spring goes loose (the coilovers' real stroke is not known). Stock has Mazda's 15×6 ET40 wheels with 195/50R15 tires (loaded radius 274 mm); the rim diameter only changes the drawing and the tire-size estimate. Coen's damper curves are an estimate, not a measurement: low-speed slopes for 0.45 (bump) and 0.70 (rebound) of critical damping at the wheel, a knee at 75 mm/s and 30 % of the slope above it. Any edit lights the **Session** button instead: your edits are kept in this browser as the session setup, and Session loads them back after you try Stock or Coen's. Until you edit something, Session is the stock car. A new visitor starts on the stock car with the floor still and the plain box shown. The Guide window opens on its Quick start page every time the page loads; close it with the ✕, Esc or a click outside, and reopen it with the **Guide** button. Its second page is the Vocabulary. **Export** saves the setup on screen as a `.json` file (named `dws-<car>-<date>.json`); **Import** loads such a file as the session setup, replacing the session setup kept in the browser. A file whose geometry cannot be built is refused and nothing changes. A file exported by version 56 or earlier still loads: its geometry is converted to today's fields and the car comes out the same (see "Setups from older versions" below). The Steering tab has a **Cut knuckles** switch: it shortens the front steering arm by the amount entered (20 mm is a placeholder) and re-sets the tie rod so static toe holds; it is off in both cars.

| Basis | Numbers |
|---|---|
| Published by Mazda | Wheelbase 2265 mm, track 1415 / 1440 mm, mass 1030 kg, front camber 0°02′, caster 5°40′, kingpin 11°39′, caster trail 17.5 mm, rear camber −0°42′, toe-in 3 mm per axle, roll center 41 / 120 mm, wheel stroke 82 / 93 mm front and 80 / 96 mm rear, springs 2.9 / 2.1 kgf/mm, damper forces at 0.1 and 0.3 m/s, rack stroke 121 mm, 2.6 turns, full lock 38° / 33° |
| Measured by others | Motion ratios 0.686 / 0.721 (owner measurement), CG height 449 mm (from NHTSA's static stability factor 1.59) |
| Measured on the parts | Front arms: lower 336.6 mm from the pivot line to the ball joint, inner pivots 325 mm apart, ball joint 25 mm ahead of the front pivot; upper 250 mm, inner pivots 220 mm apart. Front knuckle: upper ball joint 120.7 mm above the axle, lower ball joint 92.1 mm below it and 88.9 mm in from the wheel face. Rear chassis pivots: lower 243.9 mm and upper 387.3 mm from the centerline, upper 192.1 mm above lower, lower pivots 320.4 mm apart front to back, upper 164.5 mm. Rear arms: lower 393.7 mm, upper 212.7 mm. Rear knuckle: the axle sits 45 % of the way up from the lower arm mount to the upper one (photo) |
| NA drawing values already in this project | Upper pivots 183 mm above lower (188.8 mm on the NB). The drawing's pivot spacings (656 / 756 mm) and 350 mm lower arm are no longer used |
| Fitted so the model reproduces the numbers above | Front: pivots 646 / 736 mm apart and 171.8 / 360.6 mm above ground, knuckle 217.2 mm in front view (the measured heights leaned to Mazda's 11°39′ kingpin; with the caster that is 218.2 mm from joint to joint, the number on the Geometry tab), spindle and hub-face positions, tie rod outer joint 105 mm ahead of the kingpin axis and 4 mm outboard of it (full lock 38° / 33°; a rough 135 mm measurement gave 27° / 25° and was not used; the Geometry tab gives the same joint on the knuckle itself, along and square to the leaning kingpin: 104.8 mm ahead, 1.7 mm outboard, 7.7 mm up), rack height 187.3 mm, 16 mm above the lower arm pivots (least bump steer: 0.03° of toe-out at 30 mm of bump is left; the outer joint's height, 200 mm, is an estimate), and the front shock's mount on the lower arm (0.707 of the arm, 238 mm from the pivot line, from the 0.686 motion ratio). The rack's inner joints are an owner's estimate, not a measurement: 50 mm ahead of the lower arm's front pivot and 650 mm apart, in line with the lower arm pivots (646 mm apart). The shock towers are from Mazda's body manual (underbody projected dimensions): centers 981 mm apart in front and 984 mm at the rear. The top mount heights, 640 mm (front) and 537 mm (rear) above ground, come from the replacement shocks' lengths (KYB 341253: 530.1 mm fully extended; KYB 341254: 453.9 mm; eye to stud shoulder), each taken to top out at Mazda's droop of 93 / 96 mm. The OEM Showa shocks have 119 mm (front) and 131 mm (rear) of stroke, and Mazda's wheel strokes use 119.9 and 129.8 mm of that in the model, which checks both motion ratios. Two direct measurements of the front shock bolt were not used: 273.5 mm from a drawing of the NB arm (motion ratio 0.776, and 136 mm of travel from a 119 mm shock) and 222 mm, 30 mm above the arm line, in a CAD model of the NA arm (0.650). Rear: knuckle 240 mm (a rough 230 mm estimate could not give the roll center with enough droop reach), lower pivot 186.4 mm above ground, hub face 137.9 mm from the kingpin axis (137.5 mm on the Geometry tab, where the wheel's 40 mm offset is taken along the spindle), fitted to the 120 mm roll center and 1440 mm track. The rear shock bolts to the lower arm 0.790 of the way out (310.9 of 393.7 mm), taken from a third-party CAD model of the NA rear suspension whose arm lengths match the drawings to 0.1 mm; with it the rear motion ratio comes out 0.732 with no fitting (measured: 0.721) |
| Worked out from Fat Cat Motorsports' spreadsheet | Anti-roll bars: 22 mm front on 215.9 mm arms (NB), 822.3 mm long, motion ratio 0.548; 11 mm rear on 122.2 mm arms, 812.8 mm long, motion ratio 0.586. In roll that is 29.3 N/mm at each front wheel and 6.6 N/mm at each rear wheel; the field on the Springs tab is half of that (14.7 / 3.3 N/mm) |
| Estimates | Unsprung mass 32 kg per corner, front weight share 52 %, inertias (yaw 1400 kg·m²), tire rate 185 N/mm, and every tire grip number (typical street tires on Stock, typical sporty street tires on Coen's) |

Checks that were not used in the fit: with the lower pivot 5.8 mm higher (the NA position) the model's front roll center is 62.5 mm (Mazda's NA figure: 61 mm), and with the NA's 4°26′ caster the trail is 11.6 mm (Mazda: 11.6 mm). The turning radius at the outer front tire is 4.49 m (Mazda: 4.6 m).

### The rear arms

The Miata has no rear toe link. Its rear lower arm holds the knuckle at two outer pivots. The model draws the arm as two legs: the front leg from the front inner pivot to the ball joint, and the rear leg from the rear inner pivot to a second outer point `ee` (field K) behind the ball joint. The rear leg holds the toe. Both legs swing about the same axis, so the model's rear has no toe change by construction. A real rear end has some; the model does not.

The rear's pivot axes are kept parallel to the car's centerline, so the rear has no axis angle fields. With rigid joints that arm only moves freely that way: tilt its axis 2° in side view and the upper joint would have to give 2 mm over ±60 mm of travel, which on the car is taken up by the bushings. The model has no bushings.

## The car bodies and wheels in the 3D view

- Each setup carries a `look` (0 or 1) that picks the body and the rim the 3D view draws. Stock is 0 and Coen's is 1. An edited (Session) or exported setup keeps the look of the car it started from; a setup saved before the looks existed gets 0. `LOOKS` in `ui.js` maps each look to a body and a rim in `body-model.js`. The look has no effect on the numbers.
- `body-model.js` holds two bodies and two rims, reduced from Assetto Corsa car models:

| Mesh | Drawn for | Taken from |
|---|---|---|
| Body `rs` | Stock | `mazda_roadster.kn5` in the mod "Mazda Roadster 1.8 RS (NB)" by Sam S.: the exterior with the soft top up, reduced to 4,110 triangles |
| Body `gv` | Coen's | `mazda_roadster_lod_d.kn5` in the mod "Mazda Roadster (NB8C) Garage Vary" (author listed as Sam S.) |
| Rim `rs`, five spokes | Stock | The same Roadster RS model |
| Rim `gl`, six spokes | Coen's | `rim.kn5` in the mod "ADC Mazda MX-5 NB Stock" by Aussie Drift Co |

- Credits as the mods list them. Roadster RS: base model Microsoft Studios, 1.8 RS parts DeathRace / Tousan / HUM3D, Assetto Corsa adaptation Sam S. / RKGaming. ADC Mazda MX-5 NB Stock: model Turn 10 / Forza, conversion BCV and JTSDG.
- These models are other people's work. Sam S. allows edits of the Roadster RS mod and asks to be credited; the ADC mod states no terms. Check before sharing a copy of this page that includes them. Without `body-model.js` the page still works: it shows the box and plain rim discs.
- The BOX / BODY switch on the display chooses between the body and the plain chassis box. The choice is remembered in the browser. The wheels are drawn either way.
- A body is a see-through shell with lit edges (the `car` materials in `init3D` in `ui.js`; the color comes from `--arm-upper` in `style.css`). It rides on the sprung mass. Its heights are measured from the hub line of the stock car at stock height (`HUB0` in `ui.js`), plus the body's own `lift` in `body-model.js` (one value at the front axle, one at the rear). The lifts put both shells at the same height on the chassis: on the stock car at stock height the fender lip is 13.3 in (338 mm) above the wheel center in front and 13.8 in (351 mm) at the rear, measured on a stock car. That takes +1.0 / −2.6 mm for the Roadster RS and +72.1 / +65.8 mm for the Garage Vary shell, which was modeled as a lowered car. The lift changes the drawing only.
- The wheels are drawn from each axle's numbers. The tire is a section turned about the axle: bead on the rim, widest (the section width) at half height, tread at the loaded radius, so it touches the ground. The rim mesh is scaled so its lip matches the rim diameter and its width matches the rim width, and its center is set so the mounting face sits at the wheel offset. The center keeps the depth it has in the model unless the outer lip is nearer than that, so how deep the face sits is a rule, not a measured wheel.
- The steering rack is drawn in three parts: the housing, fixed to the chassis; the rack bar, which slides through it and carries the two inner tie-rod joints; and the tie rods, which keep their length. That is also how it is calculated: steering moves both inner joints sideways together and each wheel is solved to keep its tie rod's length.
- While Drive is on, the wheels turn with the distance covered. The turn is limited to 80 mm of travel per frame (`ROLL_MAX` in `ui.js`) so that at speed the spokes turn steadily forward instead of seeming to stand still or run backwards.

## Tabs

| Tab | What is on it |
|---|---|
| Geometry | One part at a time, per axle: upper arm, lower arm, knuckle, alignment. Then the Solver, and the solved points |
| Wheels & tires | Wheel, tire size and rate, tire grip, per axle |
| Springs & heights | Springs, dampers, anti-roll bar, coilover mount, travel limits, ride height |
| Steering | Steering wheel, rack, cut knuckles, tie rod |
| Forces | Lateral and longitudinal g, a point load, road bumps. While Drive is on the tab reads *Forces, the lateral slider is dimmed, and the Drive controls (steady speed, steering wheel, step steer) sit under it |
| Vehicle | Mass, inertias, wheelbase, CG, front share of braking |

## Geometry tab

The linkage is solved in 3D. Each arm swings about its own pivot axis, and that axis can be angled in side view and in top view, so nothing is assumed parallel to the car's centerline. With both axes parallel it gives what the front-view model of versions 41 to 56 gave: the stock car and setups saved by those versions come out the same to 1e-8 of each number. Coen's car differs a little from version 56 on purpose, because its knuckles are now the stock parts exactly (see "The two cars").

- **An arm** (upper or lower) has eight fields, lettered A to H (six on the rear, which has no D and E), and each letter is printed in a box in the arm's drawings and beside its field. A, B, C place the point midway between the two inner pivots (from the centerline, above the ground, ahead of the axle). D and E angle the pivot axis through that point: side view (+ = front pivot higher) and top view (+ = front pivot further out). F is the distance between the inner pivots, G the reach from the axis to the ball joint, H how far ahead of the midpoint the ball joint sits. I and J are the two leg lengths (pivot to ball joint). They follow from F, G and H; type one and G and H change to match. The rear lower arm has K, the second outer pivot.
- **When the axis moves, keep: Ball joint / Arm.** Moving a pivot (A to E) can mean two things. *Ball joint*: the joint stays where it is and the arm is re-measured to fit (G and H change), so the alignment at design height stays. *Arm*: the arm stays the same part, so its ball joint moves with the pivots and the alignment changes. The status line says what was re-measured.
- **The knuckle** is one rigid part with its own dimensions, lettered A to H: A ball joint to ball joint, B the knuckle angle (between the kingpin and the plane of the wheel; the arms split it into kingpin inclination and camber), C to E where the wheel mounting face is, F to H where the tie rod end is (front only). They are measured on the part: up the kingpin from the lower ball joint, outboard square to the kingpin, ahead square to both.
- **Alignment**: the hub angle on the knuckle (+1° to −3° on top of what the arms give), static toe, and caster. The hub angle is the model's camber adjuster: it tips the hub on the knuckle, where the car has eccentric bolts at the lower arm's pivots. Caster is not stored any more: it comes from where the two ball joints sit along their arms (H of each arm). The caster box shows it at design height, and typing a value there slides both joints until the kingpin leans by that much, with the wheel staying where it is fore-aft. The setup sheet shows caster at ride height, so a lowered car reads slightly differently from the number typed (Coen's: 3.00° typed, 3.01° on the sheet).
- **Wheel: on / off** draws the tire at design height behind every drawing as a gray shape, to scale. A small **red dot** marks each drawing's origin, the point its numbers are measured from: the centerline, the ground and the axle line in the pivot axis views, the pivot midpoint on the arm, the lower ball joint on the knuckle. Clicking a lettered number in a drawing goes to its field.
- **The Solver** works out a change for you. Tick the setup-sheet numbers you want (the targets) and type their values (camber, toe, caster, kingpin inclination, roll center height, camber gain, bump steer, anti-dive, scrub radius, trail, track, motion ratio). Then tick the fields to solve for: each arm and knuckle field, static toe and the hub angle have a box under "Solve for", and the wheel offset, spacer, rack joint and coilover mounts are listed under "More fields to solve for". Ticked fields are solved for; unticked fields stay as they are. It finds the smallest change to the ticked fields that hits the targets at ride height (1 mm counts the same as 0.25°), shows what would change and what else on the setup sheet would move, and changes nothing until you press Apply. It says so plainly when there is no answer: more targets than ticked fields, targets the ticked fields cannot move independently (camber and kingpin inclination from the upper arm alone, for example), a field that would leave its range, a linkage that stops assembling, or a car that could not be built over its whole wheel travel with the answer.
- **Anti-dive** is on the setup sheet (front: anti-dive, rear: anti-lift, both under braking, in %). It needs a pivot axis angled in side view; both cars read 0 because their real angles are not measured. It uses the front share of braking on the Vehicle tab (65 %, an assumed value). The dynamics do not use it yet: longitudinal load transfer still goes through the springs.
- **Roll center** is taken from the arms alone, with the wheel held straight. That is the kind that is published, and with parallel axes it is where the two arm lines cross in front view.

### Descriptions and vocabulary

The small descriptions under the controls are kept short and use the proper words. The Guide's **Vocabulary** page explains those words in plain language, in five groups: parts, alignment, how it moves, mass and grip, and this program's own words. A word with a dotted underline in a description opens the vocabulary at that word.

- `VOCAB` in `ui.js` holds the words as `[id, word, meaning]`. To add one, add a line.
- A description marks a word as `{word}` (the id is the word in lower case with hyphens) or `{shown text|id}`. `VT()` turns that into the link. Descriptions written in `index.html` carry `data-vt` and are converted when the page starts.
- A mark whose id is not in `VOCAB` stays plain text.

### Setups from older versions

Versions up to 56 stored the geometry as front-view arm lengths, pivot positions, a caster field and the tie rod's outer joint in car coordinates. A setup kept in the browser by one of them, or exported by one, is still read: it is laid over that version's defaults and converted with `fromLegacy()`. The converted car is the same car (every setup-sheet number agrees with the old program's to 1e-8 of its value), with two visible differences: caster is shown at ride height, and there is a new anti-dive row. An arm's inner pivots that an old setup had in reverse order fore-aft, or less than 20 mm apart, are put in order and 20 mm apart; with the axes parallel that changes only the drawing. The page then saves in the new fields under new names (`dws.setup.nb5`, `dws.session.nb5`) and leaves the old entries alone. Export files written by this version carry `"format": 2`.

The Coen's car itself was redefined in version 57, so that its knuckles are the stock parts exactly. Up to version 56 the knuckle was stored as its length in front view, so this car's 3° of caster (stock: 5.67°) made its front knuckle 0.7 mm shorter than stock's. With the stock part its front roll center reads 16 mm instead of 15, camber gain −0.288 instead of −0.281 and bump steer −0.067 instead of −0.066°/10 mm. Front camber reads −4.20° instead of −4.21°, rear mechanical trail 0.3 mm instead of 0.0 (with zero toe the stock rear knuckle carries the wheel 0.26 mm further back), and seven more rows of the setup sheet moved by one step of their last digit (kingpin inclination, wheel rate, motion ratio, front load transfer, full lock, Ackermann, CG above the roll axis). A session or file based on the old Coen's car keeps its old knuckle; press the Coen's button for the car as it is defined now.

## Wheels and tires

- **Wheel** (rim diameter, rim width, offset, spacer) and **Tire** (section width, aspect ratio, pressure, loaded radius, vertical rate).
- **Camber comes from the arms.** The wheel is fixed on the knuckle: camber = knuckle angle (`kinc`, field B of the knuckle: 11.67° front and 8.05° rear on the NB) − the kingpin inclination the arms give + the hub angle on the knuckle (`cadj`, a slider from +1° to −3°). Shortening an upper arm adds negative camber and the same amount of kingpin inclination, as on the car: 1 mm is 0.25° on the front. A setup saved before version 41 had a free camber field; it is converted to the hub angle on load, limited to its range.
- **A tire radius change moves the car, not the suspension.** Editing the loaded radius (or "Estimate from size") shifts that axle's height targets by the change and moves the bump and droop limits the other way, so the stops stay with the dampers. The tie rod end is part of the knuckle, so it goes with it by itself.
- The wheel bolts to the knuckle's mounting face. Its center sits the wheel's offset inboard of the face, and a spacer moves it outboard, both along the spindle as on the car, so a smaller offset or a spacer widens the track and adds scrub radius without moving the suspension. The hub angle's pivot is 40 mm inboard of the face (`ET_FIT` in `core.js`), which is where versions up to 56 had the hub.
- "Estimate from size" fills in the tire's vertical rate (Rhyne's empirical formula) and loaded radius (free radius − static load ÷ rate). Both stay editable. Rim width is used for the drawing and the setup sheet's Wheel row only; it does not enter the physics.
- **Tire grip**: five numbers per axle (peak grip, grip lost with load, cornering stiffness, camber thrust, best camber into the turn). "Kind of tire" fills them with typical values for a street, sporty street or semi-slick tire. Tire makers do not publish these, so they are not measured data: trust the direction of a change more than its size.

## Grip and handling

- **Telemetry** shows each tire's slip angle and the share of its grip in use.
- **History** shows the last 10 s of lateral g, yaw rate, roll, pitch, heave and tire loads. **Record** starts a recording of up to 60 s; **Stop** ends it and the panel then shows the whole recording. **Export graph** saves it as a PNG picture, **Export numbers** as a CSV table (one row per 0.01 s, with the steering wheel angle as an extra column), **Discard** goes back to the live history. Settle, Step steer or loading a car restarts a recording in progress, so a recording started before Step steer begins at the step; a spin stops it and keeps it.
- **Setup sheet** runs from everyday numbers to detail: alignment at ride height, wheels and ride height, springs and dampers, then roll, pitch and grip (the cornering limit of the front and rear tires, which end runs out first, and the understeer gradient), steering, and geometry detail.
- The **space bar** runs and pauses the simulation from anywhere on the page.
- The **Curve** menu names both axes of each curve (for example "Camber vs wheel travel" and "Camber vs steering"). **Grip in use vs lateral g** plots both axles against lateral g. The line that reaches 100 % first sets the limit.
- The **Drive** button at the top (next to Pause and Settle) lights up and runs the car at the steady speed: the tires make the side force, the car slides and yaws, and lateral g comes out of that. With it off you set lateral g on the Forces tab. It is a mode, not part of a setup: it is off every time the page opens or a car is loaded, and switching it does not change which car button is lit. **Step steer** (only while it is on) centers the wheel, then turns it to the angle entered; the History panel shows lateral g, yaw rate and roll building up.
- While Drive is on, the floor grid in the 3D view moves under the car: it streams back at the car's speed, turns as the car yaws and drifts sideways when the car slides. `GND` in `ui.js` holds the car's heading and position. Each tire also leaves a faint track on the floor, as wide as the tire and fading over 14 m (`TRK` in `ui.js`), so the car's path, and the gap between where the front and rear tires run, can be read when the grid is moving too fast to see.
- Speed is constant, the road is flat, and no drive or brake force acts at the tires. If the car slides sideways faster than it moves forward it has spun, and the page centers the steering.

## Good to know

- The page saves the setup in the browser. After editing `legacyStock()` or `coensCar()`, click Stock or Coen's on the page to see the change.
- If the page stops working after an edit, open the browser console (F12, then Console) to see the error and its line number.
- The look follows the OL! design system: night only, a closed palette (black, grays, midnight blue, ice), square corners. Change colors through the tokens at the top of `style.css`, not in the rules below them.
