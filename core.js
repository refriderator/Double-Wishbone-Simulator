/* ===== Physics core. SI units (m, kg, N, s, rad) unless a name says deg.
   Corner frame: x forward, y outboard, z up, origin on the ground under the axle line at design height.
   Vehicle frame: x forward, y to the right, z up. Corners FL, FR, RL, RR; side = -1 on the left, +1 on the right.
   Roll + = right side up, lateral g + = right turn, rack + = toward the right, steer angles + = right. ===== */
const G=9.81, D2R=Math.PI/180;
const ET_FIT=0.040;      // the wheel offset the hub position was fitted with (Mazda's ET40): see design()

/* Two cars, both a Mazda MX-5 / Roadster NB 1.8 (NB8C): STOCK (as Mazda built it) and COEN'S (the one this tool was built for).
   The Stock / Coen's buttons on the page load them. Both use the same arms, pivots and rack. Source of each number:
   PUBLISHED by Mazda: wheelbase 2265 mm, track 1415 / 1440 mm, mass 1030 kg, front camber 0°02', caster 5°40', kingpin 11°39',
     caster trail 17.5 mm, rear camber -0°42', toe-in 3 mm total per axle, roll center height 41 / 120 mm, wheel stroke 82 bump / 93 droop
     (front) and 80 / 96 (rear), springs 2.9 / 2.1 kgf/mm, damper forces at 0.1 and 0.3 m/s, rack stroke 121 mm, 2.6 turns lock to
     lock, full lock 38° inner / 33° outer.
   MEASURED on the parts: front arms (lower 336.6 mm, upper 250 mm), front knuckle (ball joints 120.7 mm above and 92.1 mm below the
     axle, lower joint 88.9 mm from the wheel face), rear chassis pivots (lower 243.9 mm and upper 387.3 mm from the centerline,
     192.1 mm apart in height), rear arms (lower 393.7 mm, upper 212.7 mm).
   MEASURED by others: spring motion ratios 0.686 / 0.721; static stability factor 1.59 (NHTSA), CG 449 mm for the whole car.
   FITTED so the model reproduces the published numbers: front inner pivot positions, all pivot heights, rear upright (240 mm),
     spindle and hub-face positions, tie rod outer joint (full lock 38° / 33°), rack height (least bump steer), and the front shock's
     mount on the lower arm (0.707 of the arm, 238 mm from the pivot line, from the 0.686 motion ratio).
   SHOCK TOWERS, from Mazda's body manual (underbody projected dimensions): front tower centers 981 mm apart, rear 984 mm.
   SHOCKS: top mount heights 640.3 mm front and 536.8 mm rear, from the replacement shocks' lengths: 530.1 mm (KYB 341253, front) and
     453.9 mm (KYB 341254, rear) fully extended, eye to stud shoulder, each taken to top out at Mazda's droop (93 / 96 mm).
     The OEM Showa shocks have 119 mm (front) and 131 mm (rear) of stroke; Mazda's wheel strokes use 119.9 and 129.8 mm of that in
     the model, which checks both motion ratios independently.
   FROM A CAD MODEL of the NA suspension (third party, part numbers NA01-...): the rear shock bolts to the lower arm 0.7897 of the
     way out (310.9 of 393.7 mm). With that, the tower spacing and the shock length, the rear motion ratio comes out 0.732 without
     any fitting (measured: 0.721). The same CAD has the NA front shock bolt 222 mm from the pivot line and 30 mm above the arm
     line; a drawing measurement of 273.5 mm for the NB arm was not used (it gives a motion ratio of 0.776 and needs 136 mm of
     travel from a 119 mm shock).
   OWNER'S ESTIMATE, not measured: the rack's inner joints are 50 mm ahead of the lower arm's front pivot and 650 mm apart, in line
     with the lower arm pivots (646 mm apart).
   ANTI-ROLL BARS, worked out from Fat Cat Motorsports' suspension spreadsheet (measured arm and bar lengths, bar motion ratios):
     22 mm front bar, 215.9 mm arms (NB), 822.3 mm long, motion ratio 0.548; 11 mm rear bar, 122.2 mm arms, 812.8 mm long, 0.586.
     In roll that is 29.3 N/mm at each front wheel and 6.6 N/mm at each rear wheel; the arb field is half of that (14.67 / 3.31),
     because the model applies arb to the difference between left and right wheel travel.
   ESTIMATES: unsprung mass, roll, pitch and yaw inertia, tire rate, front weight share, the height of the tie rod's outer joint
     (18 mm above the lower ball joint), and every tire grip
     number (typical values for the kind of tire, not measured).
   The Miata has no rear toe link. Its rear lower arm has two outer pivots; the model draws the arm as two legs (front leg to the
   ball joint, rear leg to a second outer point ee behind it) and the rear leg holds the toe, so no rear tie-rod numbers are used.
   COEN'S car, on top of stock (same pivots, same knuckles, same rack position): 15x7 ET35 wheels with 30 / 12 mm spacers, 195/45R15
   tires (loaded radius 267.5 mm and 234 N/mm from the size), Fortune Auto 510 coilovers with Swift 8 / 6 kgf/mm springs, ride height
   -26 mm front and -38 mm rear measured at the body (so it includes the 6.5 mm smaller tire radius), caster 3°, toe -0.5° front and
   0° rear at ride height, rear camber -1.5° on its adjuster.
   Front lower arm: an extension moves the ball joint out; Coen's estimate is about 5 mm. The shock and the anti-roll bar stay where
   they were on the arm, so the shock mount is 0.6967 of the longer arm and the bar acts 3 % less at the wheel.
   Front camber: -4.2° at ride height (Coen's choice), with the camber adjuster at 0. Lowered, with the extension, stock-length upper
   arms and the eccentrics centered, the car reads -1.77°; the upper arm is cut 9.7 mm (240.3 mm) for the rest. The cut is worked
   out, not measured. How the camber is split between the eccentrics and the cut changes nothing that matters (same grip, same camber
   at full lock, because camber + kingpin angle is fixed by the knuckle), so the eccentrics are left centered. 1 mm of cut is 0.25°.
   Knuckles: the stock parts, front and rear, tie rod end included (version 57). Until version 52 the tie rod's outer joint stayed
   where stock has it in the car, about 20 mm too high on this car's knuckle, and the rack was 6.8 mm above stock for no known reason.
   Versions 53 to 56 carried the joint with the knuckle, but their fields held the knuckle's length as seen in front view, so this
   car's 3 deg of caster made its front knuckle 0.7 mm shorter than stock's (217.5 against 218.2 mm from ball joint to ball joint).
   Dampers: not measured. Low-speed slopes set for 0.45 (bump) and 0.70 (rebound) of critical at the wheel, knee at 75 mm/s of shaft
   speed, 30 % of the slope above it, as a typical single-adjuster digressive monotube; Fortune Auto ships a dyno sheet with each set.
   Travel: bump stops where the stock dampers have them (62.5 / 48.5 mm above ride height); droop ends where an unpreloaded spring
   goes loose (67 / 69 mm below ride height). The coilovers' real stroke is not known.
   The wheel is fixed on the knuckle (version 41): camber = knuckle angle (kinc; inc in the old fields) - kingpin inclination + adjuster
   (cadj, +1 to -3°).
   look says which body and rims the 3D view draws (0: Roadster RS, 1: Coen's). It has no effect on the numbers.

   SINCE VERSION 57 the stock car is still written down below in the fields of versions 41 to 56 (legacyStock), because every number
   above was found, fitted or checked in those terms. fromLegacy() turns it into the fields the program now works in, without changing
   the car: each arm becomes a pivot axis (the point midway between its two inner pivots, and the axis's angle in side view and in top
   view), the spacing of the pivots, the reach from the axis to the ball joint and where the ball joint sits along the axis; the
   knuckle becomes one rigid part described in its own frame (ball joint to ball joint, the angle between kingpin and spindle, where
   the wheel bolts on, where the tie rod bolts on). Caster is then a result of where the ball joints sit, not a field.
   A setup saved or exported by an older version is read the same way.
   COEN'S car is written in today's fields (coensCar, further down): the stock car with his wheels, tires, springs, dampers, heights,
   travel limits, his two front arms and his alignment. Nothing else is touched, so its knuckles, pivots and rack are stock's to the
   last digit. Against version 56 that moved its front roll center from 14.9 to 16.2 mm, camber gain from -0.281 to -0.288 and bump
   steer from -0.066 to -0.067 deg/10 mm; its rear mechanical trail reads 0.3 mm instead of 0, because with zero toe the same rear
   knuckle carries the wheel 0.26 mm further back. */
function legacyStock(){
  return {
    veh:{M:902,mu:32,L:2.265,wf:0.523,h:0.474,Ixx:260,Iyy:1050,Izz:1400},
    steer:{c:0.0465,rmax:0.0605,speed:60/3.6,link:0,cut:0,cutL:0.020},
    ax:[
      {g:{Ll:0.3366,Lu:0.25,Lk:0.2172,yli:0.3232,zli:0.1718,yui:0.368,zui:0.3606,xlf:-0.0258,xlr:-0.3508,xuf:0.0881,xur:-0.1319,ee:0.13,hsp:0.0805,hf:0.1057,xk:0.0086,rimD:0.381,rimW:0.1524,et:0.040,sp:0,tw:0.195,ar:0.50,pk:180000,R:0.274,tmu:0.95,tls:6e-5,tca:0.20,tcg:0.012,tgo:2,inc:11.712479,cadj:0,caster:5.6667,toe:0.15,kt:185000,
          xto:0.1027,yto:0.6595,zto:0.2,xti:0.0242,yti:0.325,zti:0.1873,fMount:0.707,ydm:0.4905,zdm:0.6403,bump:0.082,droop:0.093},
       s:{k:28440,arb:14670,cbl:3430,cbh:1080,vkb:0.1,crl:6080,crh:2600,vkr:0.1}},
      {g:{Ll:0.3937,Lu:0.2127,Lk:0.24,yli:0.2439,zli:0.1864,yui:0.3873,zui:0.3785,xlf:0.0982,xlr:-0.2222,xuf:0.0657,xur:-0.0989,ee:0.132,hsp:0.1074,hf:0.1379,xk:0,rimD:0.381,rimW:0.1524,et:0.040,sp:0,tw:0.195,ar:0.50,pk:180000,R:0.274,tmu:0.95,tls:6e-5,tca:0.20,tcg:0.012,tgo:2,inc:8.046475,cadj:0,caster:0,toe:0.15,kt:185000,
          fMount:0.7897,ydm:0.492,zdm:0.5368,bump:0.080,droop:0.096},
       s:{k:20590,arb:3310,cbl:3430,cbh:2060,vkb:0.1,crl:6080,crh:2600,vkr:0.1}}
    ],
    dh:[0,0,0,0],
    look:0
  };
}
/* Typical grip numbers for three kinds of tire. None of them is measured data. */
const TIRE_PRESETS={street:{tmu:0.95,tls:6e-5,tca:0.20,tcg:0.012,tgo:2},sport:{tmu:1.10,tls:6e-5,tca:0.26,tcg:0.015,tgo:2.5},semi:{tmu:1.30,tls:7e-5,tca:0.32,tcg:0.018,tgo:3}};

/* ===== Field specs: [key, label, unit, scale to SI, step, min, max]; min and max are in the displayed unit. =====
   UARM and LARM: the upper and the lower arm, the same eight fields with the key prefix u or l. The page gives each a letter (A to H, and
   I, J for the two leg lengths that follow from them) and prints it in the arm's drawings.
   KNUCKLE: the knuckle in its own frame. "Up the kingpin" is along the line through the two ball joints, from the lower one. "Outboard"
   is the way the spindle points, square to the kingpin. "Ahead" is square to both. */
const ARM_FIELDS=k=>[
  [k+"ym","Pivot midpoint from centerline","mm",1e-3,5,0,900],[k+"zm","Pivot midpoint above ground","mm",1e-3,5,20,900],[k+"xm","Pivot midpoint ahead of axle (− = behind)","mm",1e-3,5,-600,600],
  [k+"sv","Axis angle, side view (+ = front pivot higher)","°",1,0.25,-20,20],[k+"pv","Axis angle, top view (+ = front pivot further out)","°",1,0.25,-20,20],
  [k+"w","Inner pivots apart","mm",1e-3,5,20,1200],[k+"R","Reach: pivot axis to ball joint","mm",1e-3,5,80,1000],[k+"t","Ball joint ahead of the pivot midpoint (− = behind)","mm",1e-3,5,-600,600]];
const GEO=[
  ["UARM",ARM_FIELDS("u")],
  ["LARM",ARM_FIELDS("l").concat([["ee","Second outer pivot, behind the ball joint","mm",1e-3,5,20,400]])],
  ["KNUCKLE",[["kLk","Ball joint to ball joint","mm",1e-3,5,80,700],["kinc","Knuckle angle: kingpin inclination + camber","°",1,0.1,-15,45],
              ["kwk","Wheel mounting face, up the kingpin","mm",1e-3,5,-100,500],["kwo","Wheel mounting face, outboard of the kingpin","mm",1e-3,5,-50,400],["kwf","Wheel mounting face, ahead of the kingpin (− = behind)","mm",1e-3,1,-80,80],
              ["kpk","Tie rod end, up the kingpin","mm",1e-3,5,-300,500],["kpo","Tie rod end, outboard of the kingpin (− = inboard)","mm",1e-3,5,-600,500],["kpf","Tie rod end, ahead of the kingpin (− = behind)","mm",1e-3,5,-450,450]]],
  ["Wheel",[["rimD","Rim diameter","in",0.0254,1,10,22],["rimW","Rim width","in",0.0254,0.5,4,12],["et","Offset (ET), + = wheel center inboard of hub face","mm",1e-3,1,-60,90],["sp","Wheel spacer, pushes the wheel outboard","mm",1e-3,1,0,100]]],
  ["TIRE",[["tw","Section width","mm",1e-3,5,125,355],["ar","Aspect ratio","%",1e-2,5,25,85],["pk","Pressure","kPa",1e3,5,100,350],["R","Loaded radius","mm",1e-3,5,150,500],["kt","Vertical rate","N/mm",1e3,10,50,1000]]],
  ["GRIP",[["tmu","Peak grip at 2.5 kN of load","",1,0.05,0.3,2.5],["tls","Grip lost per kN of extra load","/kN",1e-3,0.01,0,0.2],["tca","Cornering stiffness, share of load per degree of slip","/°",1,0.01,0.05,0.6],
           ["tcg","Camber thrust, share of load per degree","/°",1,0.001,0,0.06],["tgo","Camber into the turn that gives the most grip","°",1,0.5,0,8]]],
  ["Alignment",[["cadj","Camber adjuster, added to what the arms give","°",1,0.05,-3,1,"slider"],["toe","Static toe per wheel, + = toe-in","°",1,0.05,-5,5]]],
  ["TIE",[["xti","Inner joint, ahead of axle (− = behind)","mm",1e-3,5,-500,500],["yti","Inner joint, from centerline","mm",1e-3,5,0,800],["zti","Inner joint, above ground","mm",1e-3,0.1,20,800]]],
  ["Coilover",[["fMount","Mount on lower arm (fraction from inner pivot)","",1,0.05,0.2,1],["ydm","Top mount, from centerline","mm",1e-3,5,0,900],["zdm","Top mount, above ground","mm",1e-3,5,100,1200]]],
  ["Travel limits",[["bump","Bump travel (to bump stop)","mm",1e-3,5,10,200],["droop","Droop travel (to limit)","mm",1e-3,5,10,200]]]
];
/* The rear has no tie rod: its lower arm holds the knuckle at a second outer pivot (ee) instead, and its pivot axes stay parallel to the
   centerline (no angle fields). The front has no second outer pivot. */
const REAR_ONLY=["ee"], FRONT_ONLY=["usv","upv","lsv","lpv","kpk","kpo","kpf","xti","yti","zti"];
const geoOf=a=>GEO.map(([t,fs])=>[t,fs.filter(f=>!(a?FRONT_ONLY:REAR_ONLY).includes(f[0]))]).filter(([,fs])=>fs.length);
const SPR=[
  ["Rates",[["k","Spring rate","N/mm",1e3,5,5,500],["arb","Anti-roll bar rate at wheel","N/mm",1e3,1,0,200]]],
  ["Damper / bump",[["cbl","Low-speed slope","N·s/m",1,100,0,20000],["cbh","High-speed slope","N·s/m",1,100,0,20000],["vkb","Knee speed","mm/s",1e-3,10,5,1000]]],
  ["Damper / rebound",[["crl","Low-speed slope","N·s/m",1,100,0,20000],["crh","High-speed slope","N·s/m",1,100,0,20000],["vkr","Knee speed","mm/s",1e-3,10,5,1000]]]
];
const VEH=[
  ["Mass",[["M","Sprung mass","kg",1,10,100,5000],["mu","Unsprung mass per corner","kg",1,1,10,150],["Ixx","Roll inertia about the CG (sprung)","kg·m²",1,10,20,3000],["Iyy","Pitch inertia about the CG (sprung)","kg·m²",1,10,100,15000],["Izz","Yaw inertia about the CG (whole car)","kg·m²",1,10,200,15000]]],
  ["Layout",[["L","Wheelbase","mm",1e-3,10,1000,5000],["wf","Front weight share","%",1e-2,0.5,20,80],["h","CG height at design ride height","mm",1e-3,5,100,1500],
             ["bias","Front share of braking (for the anti-dive number only)","%",1e-2,1,30,95]]]
];
const STEER=[
  ["Rack",[["c","Rack travel per steering-wheel turn","mm",1e-3,1,20,150],["rmax","Rack travel each way","mm",1e-3,1,10,120]]],
  ["SPEED",[["speed","Steady speed","km/h",1/3.6,5,5,250]]],
  ["Cut knuckles",[["cutL","Steering arm shortened by","mm",1e-3,1,0,60]]]
];
function check(P){
  const one=(obj,groups,who)=>{for(const [,fs] of groups) for(const [k,lab,u,sc,,mn,mx] of fs){
    const x=obj[k]/sc; if(!(Number.isFinite(x)&&x>=mn-1e-9&&x<=mx+1e-9)) throw new Error(who+lab+" must be between "+mn+" and "+mx+(u?" "+u:"")+".");}};
  one(P.veh,VEH,""); one(P.steer,STEER,"");
  for(let a=0;a<2;a++){const who=a?"Rear: ":"Front: "; one(P.ax[a].g,geoOf(a),who); one(P.ax[a].s,SPR,who);}
  for(const d of P.dh) if(!Number.isFinite(d)) throw new Error("Ride-height targets must be numbers.");
}


/* ---- small vector helpers ---- */
const vsub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], vadd=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], vscale=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const vdot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], vlen=a=>Math.hypot(a[0],a[1],a[2]);
const vcross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const vunit=a=>{const l=vlen(a);return [a[0]/l,a[1]/l,a[2]/l];};
function vrot(v,ax,ang){const c=Math.cos(ang),s=Math.sin(ang),d=vdot(ax,v)*(1-c),x=vcross(ax,v);return [v[0]*c+x[0]*s+ax[0]*d,v[1]*c+x[1]*s+ax[1]*d,v[2]*c+x[2]*s+ax[2]*d];}
function lineInt(p1,p2,p3,p4){
  const d1y=p2[0]-p1[0],d1z=p2[1]-p1[1],d2y=p4[0]-p3[0],d2z=p4[1]-p3[1],den=d1y*d2z-d1z*d2y;
  if(Math.abs(den)<1e-12) return null;
  const t=((p3[0]-p1[0])*d2z-(p3[1]-p1[1])*d2y)/den;
  return [p1[0]+t*d1y,p1[1]+t*d1z];
}

/* ===== The linkage, in 3D =====
   Each arm swings about its own pivot axis, which may be angled in side view and in top view, so its ball joint rides a circle around
   that axis. The knuckle is one rigid part: the distance between its ball joints, the spindle's angle to the kingpin, where the wheel
   bolts on and where the tie rod bolts on are fixed in its own frame. Nothing is assumed parallel to the car's centerline.
   The solve is exact, with no iteration: lower-arm angle -> lower ball joint; upper ball joint = its circle meets the sphere the knuckle
   allows; turn about the kingpin = the tie rod's length. With both axes parallel to the centerline it gives the same joints as the
   front-view four-bar of versions 41 to 56 (checked to 1e-12 mm).
   The rear has no tie rod. Its lower arm holds the knuckle at a second outer pivot ee behind the ball joint; that leg is treated as the
   link that holds the toe (from the arm's rear inner pivot to the second outer pivot), so with the rear's axes parallel the rear has no
   toe change by construction. */
const vlin=(a,ka,b,kb,c,kc)=>[a[0]*ka+b[0]*kb+c[0]*kc,a[1]*ka+b[1]*kb+c[1]*kc,a[2]*ka+b[2]*kb+c[2]*kc];
const wrapA=x=>x>Math.PI?x-2*Math.PI:(x<=-Math.PI?x+2*Math.PI:x);
/* B cos x + C sin x = A  ->  [middle, half-spread] (x = middle +/- spread), or null when nothing fits */
function trigSolve(A,B,C){const rho=Math.hypot(B,C); if(rho<1e-14) return null; const c=A/rho; if(c>1||c<-1) return null; return [Math.atan2(C,B),Math.acos(c)];}

/* One arm from its fields; k is "l" (lower) or "u" (upper).
   xm, ym, zm: the point midway between the two inner pivots. sv, pv: the pivot axis's angle in side view (+ = front pivot higher) and in
   top view (+ = front pivot further outboard), degrees. w: distance between the inner pivots. R: reach, from the axis to the ball joint,
   square to the axis. t: how far ahead of the midpoint the ball joint sits, measured along the axis.
   Returns the axis direction u, the midpoint M, e1 (outboard, square to the axis), e2 (up, square to both), the foot C of the ball joint
   on the axis, and the front and rear inner pivots F and B. */
function armOf(g,k){
  const u=vunit([1,Math.tan((g[k+"pv"]||0)*D2R),Math.tan((g[k+"sv"]||0)*D2R)]), M=[g[k+"xm"],g[k+"ym"],g[k+"zm"]], w=g[k+"w"];
  const e1=vunit(vsub([0,1,0],vscale(u,u[1]))), e2=vcross(u,e1);
  return {u,M,e1,e2,R:g[k+"R"],C:vadd(M,vscale(u,g[k+"t"])),F:vadd(M,vscale(u,w/2)),B:vadd(M,vscale(u,-w/2))};
}
/* The two leg lengths of an arm (front pivot to ball joint, rear pivot to ball joint), and back to reach and ball-joint position. */
function legsOf(g,k){const w=g[k+"w"], R=g[k+"R"], t=g[k+"t"]; return {Lf:Math.hypot(R,w/2-t),Lr:Math.hypot(R,w/2+t)};}
function fromLegs(g,k,Lf,Lr){const w=g[k+"w"], t=(Lr*Lr-Lf*Lf)/(2*w), R2=Lf*Lf-(w/2-t)*(w/2-t); return R2>1e-8?{t,R:Math.sqrt(R2)}:null;}      // null: legs too short to meet
/* Change an arm's axis fields (vals) but leave its ball joint where it is at design height (bj): reach and ball-joint position are re-measured. */
function reseat(g,k,vals,bj){Object.assign(g,vals); const A=armOf(g,k), d=vsub(bj,A.M), t=vdot(d,A.u); g[k+"t"]=t; g[k+"R"]=vlen(vsub(d,vscale(A.u,t))); return g;}

/* The knuckle's place for lower-arm angle al (rad, + = ball joint up). Its turn about the kingpin comes from one of:
   mode 0: the tie rod, with the rack's inner joint moved outboard by val;   mode 1: the wheel's heading (local steer angle val);
   mode 2: the turn itself (val). Returns the ball joints, the knuckle's frame (k up the kingpin, o outboard, f forward), the spindle
   direction av (fixed on the knuckle: D.nb, its parts along k, o and f), the wheel center and the tie rod's outer joint, or null if
   the parts can't reach. */
function poseK(D,al,mode,val){
  const lo=D.lo, up=D.up, LBJ=vlin(lo.C,1,lo.e1,lo.R*Math.cos(al),lo.e2,lo.R*Math.sin(al));
  const d=vsub(up.C,LBJ), q=trigSolve((D.Lk*D.Lk-vdot(d,d)-up.R*up.R)/(2*up.R),vdot(d,up.e1),vdot(d,up.e2)); if(!q) return null;
  const ua=q[0]+q[1], ub=q[0]-q[1];
  let UBJ=vlin(up.C,1,up.e1,up.R*Math.cos(ua),up.e2,up.R*Math.sin(ua)); const U2=vlin(up.C,1,up.e1,up.R*Math.cos(ub),up.e2,up.R*Math.sin(ub));
  if(U2[2]>UBJ[2]) UBJ=U2;                                           // the assembly with the upper joint on top
  const k=vunit(vsub(UBJ,LBJ)); if(!(k[2]>1e-3)) return null;
  const o0=vunit([-k[1]*k[0],1-k[1]*k[1],-k[1]*k[2]]), f0=vcross(o0,k);      // reference frame on the kingpin, before the turn psi
  let psi, spread=0;
  if(mode===2) psi=val;
  else if(mode===1){
    const c0=Math.cos(val), s0=Math.sin(val), nb=D.nb, hd=v=>v[0]*c0+v[1]*s0;      // the spindle's heading: its horizontal part must point along the steer angle asked
    const s=trigSolve(-nb[0]*hd(k),hd(vlin(o0,nb[1],f0,nb[2],k,0)),hd(vlin(o0,nb[2],f0,-nb[1],k,0))); if(!s) return null;
    const a=wrapA(s[0]+s[1]), b=wrapA(s[0]-s[1]); psi=Math.abs(a)<=Math.abs(b)?a:b;
  } else {
    const pt=D.pt, e=[LBJ[0]+k[0]*pt[0]-D.TRI[0],LBJ[1]+k[1]*pt[0]-D.TRI[1]-val,LBJ[2]+k[2]*pt[0]-D.TRI[2]];
    const a=vlin(f0,pt[2],o0,pt[1],k,0), b=vlin(o0,pt[2],f0,-pt[1],k,0), s=trigSolve(D.Lt*D.Lt-vdot(e,e)-pt[1]*pt[1]-pt[2]*pt[2],2*vdot(e,a),2*vdot(e,b)); if(!s) return null;
    psi=wrapA(s[0]+D.br*s[1]); spread=s[1];
  }
  const c=Math.cos(psi), s=Math.sin(psi), f=vlin(f0,c,o0,s,k,0), o=vlin(o0,c,f0,-s,k,0);
  return {al,LBJ,UBJ,k,o,f,av:vlin(k,D.nb[0],o,D.nb[1],f,D.nb[2]),WC:vadd(LBJ,vlin(k,D.wc[0],o,D.wc[1],f,D.wc[2])),TRO:vadd(LBJ,vlin(k,D.pt[0],o,D.pt[1],f,D.pt[2])),psi,spread};
}

/* ---- design position: the lower-arm angle that puts the tire's lowest point on the ground with the static toe ----
   The tie rod is then as long as it has to be (on the car, toe is set by turning the tie rod). The wheel bolts to the knuckle's mounting
   face: its center is the wheel's offset inboard of the face, a spacer outboard of that. The camber adjuster (cadj, +1 to -3 deg) tilts
   the spindle on the knuckle so that the camber at design height changes by exactly its value, with the heading unchanged; its pivot
   is 40 mm inboard of the mounting face, where versions 41 to 56 had the hub (ET_FIT). */
function design(g,name){
  const rear=name==="Rear", lo=armOf(g,"l"), up=armOf(g,"u"), a0=g.kinc*D2R, dw=ET_FIT-g.et+g.sp, d0=-g.toe*D2R, cadj=g.cadj*D2R;
  if(Math.abs(lo.u[0])<0.2||Math.abs(up.u[0])<0.2) throw new Error(name+": a pivot axis is angled too far from the car's centerline.");
  const hub=[g.kwk+ET_FIT*Math.sin(a0),g.kwo-ET_FIT*Math.cos(a0),g.kwf];      // the adjuster's pivot, in the knuckle's frame [up the kingpin, outboard, ahead]
  const D={lo,up,Lk:g.kLk,nb:[-Math.sin(a0),Math.cos(a0),0],d0,Rt:g.R,pt:[0,0,0],TRI:[0,0,0],Lt:0,br:1,arm:0,
           wc:hub.slice(),sk:hub[0],fm:g.fMount,As:vadd(lo.M,vscale(lo.u,-lo.M[0]/lo.u[0])),top:[0,g.ydm,g.zdm]};
  /* the spindle with the adjuster applied, for the knuckle at p (unadjusted spindle already at the heading d0) */
  const adj=p=>{const c=Math.asin(-p.av[2])+cadj; return [-Math.sin(d0)*Math.cos(c),Math.cos(d0)*Math.cos(c),-Math.sin(c)];};
  const f=a=>{const p=poseK(D,a,1,d0); if(!p) return NaN; const n=adj(p); return p.WC[2]+dw*n[2]-D.Rt*Math.sqrt(1-n[2]*n[2]);};      // height of the tire's lowest point
  let best=null; const stp=0.002;
  for(let a=-1.2;a<1.2;a+=stp){
    const f1=f(a), f2=f(a+stp);
    if(isFinite(f1)&&isFinite(f2)&&f1*f2<=0){
      let l=a, h=a+stp;
      for(let i=0;i<50;i++){const mid=(l+h)/2; if(f(l)*f(mid)<=0)h=mid; else l=mid;}
      const r=(l+h)/2; if(best===null||Math.abs(r)<Math.abs(best)) best=r;
    }
  }
  if(best===null) throw new Error(name+": the linkage can't put the tire on the ground at design height. Check the arms' reach, the knuckle's ball joint spacing and the pivot heights.");
  const p0=poseK(D,best,1,d0), n=adj(p0);
  D.nb=[vdot(n,p0.k),vdot(n,p0.o),vdot(n,p0.f)]; D.wc=[hub[0]+dw*D.nb[0],hub[1]+dw*D.nb[1],hub[2]+dw*D.nb[2]];      // from here on the adjusted spindle is fixed on the knuckle
  if(rear){const t=vscale(lo.u,-g.ee); D.pt=[vdot(t,p0.k),vdot(t,p0.o),vdot(t,p0.f)]; D.TRI=lo.B.slice();}      // the lower arm's rear leg holds the toe
  else {
    let po=g.kpo, pf=g.kpf;
    if(g.cutL>0){const a=Math.hypot(po,pf); if(a>1e-6){const s=Math.max(a-g.cutL,0)/a; po*=s; pf*=s;}}      // cut knuckle: the tie rod end moves straight toward the kingpin axis
    D.pt=[g.kpk,po,pf]; D.TRI=[g.xti,g.yti,g.zti];
  }
  D.Lt=vlen(vsub(vadd(p0.LBJ,vlin(p0.k,D.pt[0],p0.o,D.pt[1],p0.f,D.pt[2])),D.TRI));
  if(D.Lt<0.03) throw new Error(name+": the tie rod is shorter than 30 mm. Move its inner and outer joints apart.");
  D.arm=Math.hypot(D.pt[1],D.pt[2]);
  if(D.arm<0.02) throw new Error(name+": the tie rod's outer joint is within 20 mm of the kingpin axis, so it can't hold the wheel's steer angle. Move it forward or back.");
  D.br=1; const A=poseK(D,best,0,0); D.br=-1; const B=poseK(D,best,0,0);
  if(!A||!B||A.spread<0.05||A.spread>Math.PI-0.05) throw new Error(name+": the tie rod and steering arm are almost in line at design height, so the steer angle isn't held. Move the tie rod's inner or outer joint.");
  D.br=Math.abs(wrapA(A.psi-p0.psi))<=Math.abs(wrapA(B.psi-p0.psi))?1:-1;
  D.a0=best;
  return D;
}

/* ---- full pose of one corner at lower-arm angle al and local rack offset r (+ = inner tie-rod joint moves outboard) ----
   lock: hold the wheel's heading at its design value instead of asking the tie rod (used while a tie rod is being fitted).
   ax: unit vector up the kingpin. S: where the wheel carrier leaves the kingpin. dm: the coilover's mount on the lower arm, a fraction
   fMount of the reach out from the pivot axis, at the axle line; its top mount is straight above the axle line. */
function pose(g,D,al,r,lock){
  const p=lock?poseK(D,al,1,D.d0):poseK(D,al,0,r); if(!p) return null;
  const av=p.av, cg=Math.sqrt(1-av[2]*av[2]), CP=[p.WC[0]+D.Rt*av[2]*av[0]/cg,p.WC[1]+D.Rt*av[2]*av[1]/cg,p.WC[2]-D.Rt*cg];      // lowest point of the tire circle
  const fm=D.fm*D.lo.R, dm=vlin(D.As,1,D.lo.e1,fm*Math.cos(al),D.lo.e2,fm*Math.sin(al));
  return {al,LBJ:p.LBJ,UBJ:p.UBJ,ax:p.k,o:p.o,f:p.f,WC:p.WC,av,TRO:p.TRO,TRI:[D.TRI[0],D.TRI[1]+r,D.TRI[2]],CP,dm,psi:p.psi,S:vadd(p.LBJ,vscale(p.k,D.sk)),
          cam:Math.asin(-av[2]),steer:Math.atan2(-av[0],av[1]),L:vlen(vsub(dm,D.top))};
}

/* How the knuckle is moving at pose p (rack offset r), per unit of lower-arm angle, with the wheel held straight: its turn about the
   vertical is taken out, which leaves exactly the motion the two arms give it. v is the velocity of the knuckle's point at the contact
   patch. From it: the roll center height for equal travel on both sides (rch, above the contact patch), the side-view slope that makes
   anti-dive (side = forward travel of the contact patch per unit of bump), and the front-view instant center ic (null when the patch
   moves straight up and down). With both pivot axes parallel to the centerline, ic is where the two arm lines cross in front view. */
function instant(D,p,r){
  const h=1e-5, A=poseK(D,p.al+h,0,r), B=poseK(D,p.al-h,0,r); if(!A||!B) return null;
  const d=(a,b)=>[(a[0]-b[0])/(2*h),(a[1]-b[1])/(2*h),(a[2]-b[2])/(2*h)];
  let w=vscale(vadd(vadd(vcross(p.f,d(A.f,B.f)),vcross(p.o,d(A.o,B.o))),vcross(p.ax,d(A.k,B.k))),0.5);      // angular velocity from the frame's rate of change
  w=vadd(w,vscale(p.ax,-w[2]/p.ax[2]));                                                                   // minus the part that steers the wheel
  const v=vadd(d(A.LBJ,B.LBJ),vcross(w,vsub(p.CP,p.LBJ)));
  if(!(Math.abs(v[2])>1e-9)) return null;
  return {v,w,rch:v[1]/v[2]*p.CP[1],side:v[0]/v[2],ic:Math.abs(w[0])>1e-7?[p.CP[1]-v[2]/w[0],p.CP[2]+v[1]/w[0]]:null};
}
/* Share of the car's braking force at an axle, signed so that a positive anti-dive number always means less pitch under braking:
   the front's contact patch must move forward in bump for that, the rear's rearward. */
function brakeShare(v,ax){const b=v.bias===undefined?0.65:v.bias; return ax===0?b:-(1-b);}

/* Caster is a result of where the two ball joints sit along their arms. To set it, both joints are slid along their arms' axes until
   the kingpin leans by the angle asked at design height, with the wheel's mounting face kept where it is fore-aft. Returns the two
   ball-joint positions {lt, ut}, or throws if the linkage can't do it. */
function casterAt(g,name){const D=design(g,name), p=poseK(D,D.a0,1,D.d0); return {caster:Math.atan2(-p.k[0],p.k[2])/D2R,x:p.LBJ[0]+p.k[0]*g.kwk+p.o[0]*g.kwo+p.f[0]*g.kwf};}
function setCaster(g,name,deg){
  const q=Object.assign({},g), x0=casterAt(q,name).x, F=()=>{const c=casterAt(q,name); return [c.caster-deg,(c.x-x0)*1e3];}, h=1e-5;
  for(let it=0;it<30;it++){
    const f0=F(); if(Math.abs(f0[0])<1e-9&&Math.abs(f0[1])<1e-7) return {lt:q.lt,ut:q.ut};
    q.lt+=h; const fa=F(); q.lt-=h; q.ut+=h; const fb=F(); q.ut-=h;
    const a=(fa[0]-f0[0])/h, b=(fb[0]-f0[0])/h, c=(fa[1]-f0[1])/h, d=(fb[1]-f0[1])/h, det=a*d-b*c;
    if(!(Math.abs(det)>1e-12)) break;
    let dl=-(d*f0[0]-b*f0[1])/det, du=-(-c*f0[0]+a*f0[1])/det; const big=Math.max(Math.abs(dl),Math.abs(du)); if(big>0.03){dl*=0.03/big; du*=0.03/big;}
    q.lt+=dl; q.ut+=du;
  }
  throw new Error(name+": the ball joints can't be moved far enough along their arms to give "+deg+"° of caster.");
}


/* ---- lookup tables over travel s (contact-patch height relative to the body) and rack offset r ---- */
function buildAxle(g,name,rmax){
  const D=design(g,name);
  const margin=0.03, sLo=-(g.droop+margin), sHi=g.bump+margin, ext=0.05, da=0.004;
  let nUp=0, nDn=0, sp=0;
  while(nUp<350){const p=pose(g,D,D.a0+(nUp+1)*da,0); if(!p||p.CP[2]<=sp) break; sp=p.CP[2]; nUp++; if(sp>sHi+ext) break;}
  const sTop=sp; sp=0;
  while(nDn<350){const p=pose(g,D,D.a0-(nDn+1)*da,0); if(!p||p.CP[2]>=sp) break; sp=p.CP[2]; nDn++; if(sp<sLo-ext) break;}
  const sBot=sp;
  if(sBot>sLo) throw new Error(name+": the linkage or tie rod runs out of reach before full droop ("+Math.round(-sBot*1000)+" mm available, "+Math.round(-sLo*1000)+" mm needed including a 30 mm margin). Reduce droop travel or change the geometry.");
  if(sTop<sHi) throw new Error(name+": the linkage or tie rod runs out of reach before full bump ("+Math.round(sTop*1000)+" mm available, "+Math.round(sHi*1000)+" mm needed including a 30 mm margin). Reduce bump travel or change the geometry.");
  const NA=nUp+nDn+1, aG=new Float64Array(NA), s0=new Float64Array(NA);
  for(let i=0;i<NA;i++){aG[i]=D.a0+(i-nDn)*da; s0[i]=pose(g,D,aG[i],0).CP[2];}
  const armTravel=al=>{let x=(al-aG[0])/da; if(x<0)x=0; else if(x>NA-1)x=NA-1; let i=x|0; if(i>NA-2)i=NA-2; return s0[i]+(s0[i+1]-s0[i])*(x-i);};
  const nr=rmax>0?41:1, ns=241, dS=(sHi-sLo)/(ns-1), rLo=-rmax, dR=nr>1?2*rmax/(nr-1):1, j0=(nr-1)/2, N=nr*ns;
  const T={D,nr,ns,sLo,sHi,dS,rLo,dR,L:new Float64Array(N),MR:new Float64Array(N),cam:new Float64Array(N),steer:new Float64Array(N),
           al:new Float64Array(N),sa:new Float64Array(N),cas:new Float64Array(N),rch:new Float64Array(ns),dtr:new Float64Array(ns)};
  const sj=new Float64Array(NA); let bind=Infinity;
  for(let j=0;j<nr;j++){
    const r=nr>1?rLo+j*dR:0;
    for(let i=0;i<NA;i++){const p=pose(g,D,aG[i],r); sj[i]=p?p.CP[2]:NaN;}
    let lo=nDn, hi=nDn;
    if(sj[nDn]===sj[nDn]){while(lo>0&&sj[lo-1]<sj[lo])lo--; while(hi<NA-1&&sj[hi+1]>sj[hi])hi++;}
    if(hi-lo<1||sj[lo]>-g.droop||sj[hi]<g.bump){bind=Math.min(bind,Math.abs(r)); continue;}
    let i=lo;
    for(let q=0;q<ns;q++){
      const sc=Math.min(sj[hi],Math.max(sj[lo],sLo+q*dS));
      while(i<hi-1&&sj[i+1]<sc) i++;
      const sl=(sj[i+1]-sj[i])/da; let al=aG[i]+(sc-sj[i])/sl, p=pose(g,D,al,r);
      if(p){const al2=al+(sc-p.CP[2])/sl, p2=pose(g,D,al2,r); if(p2){al=al2;p=p2;}} else {al=aG[i]; p=pose(g,D,al,r);}
      const o=j*ns+q;
      T.L[o]=p.L; T.cam[o]=p.cam/D2R; T.steer[o]=p.steer/D2R; T.al[o]=al; T.sa[o]=armTravel(al); T.cas[o]=Math.atan2(-p.ax[0],p.ax[2])/D2R;
    }
  }
  if(bind<Infinity) throw new Error(name+": the steering binds at "+Math.round(bind*1000)+" mm of rack travel (the tie rod runs out of reach somewhere in the suspension travel). Reduce rack travel each way, or lengthen the steering arm or tie rod.");
  for(let j=0;j<nr;j++) for(let q=0;q<ns;q++){const a=Math.max(0,q-1), b=Math.min(ns-1,q+1); T.MR[j*ns+q]=-(T.L[j*ns+b]-T.L[j*ns+a])/((b-a)*dS);}
  const P0=pose(g,D,D.a0,0);
  for(let q=0;q<ns;q++){
    const p=pose(g,D,T.al[j0*ns+q],0), I=instant(D,p,0);
    T.rch[q]=I?I.rch:0; T.dtr[q]=p.CP[1]-P0.CP[1];
  }
  T.P0=P0; T.tHalf=P0.CP[1]; T.L0=P0.L; T.MR0=lk2(T,T.MR,0,0);
  const t=-P0.LBJ[2]/(P0.UBJ[2]-P0.LBJ[2]);
  T.kp=[P0.LBJ[0]+t*(P0.UBJ[0]-P0.LBJ[0]),P0.LBJ[1]+t*(P0.UBJ[1]-P0.LBJ[1])];      // kingpin axis at ground level
  T.sgn=nr>1?(lk2(T,T.steer,0,dR)>=lk2(T,T.steer,0,0)?1:-1):1;                     // rack direction that steers right
  if(T.MR0<0.05) throw new Error(name+": the coilover barely moves with the wheel (motion ratio "+T.MR0.toFixed(3)+"). Move its mount further out on the arm or align it with wheel travel.");
  if(T.tHalf<=0.05) throw new Error(name+": the contact patch ends up at or past the centerline.");
  return T;
}
const _c={o0:0,o1:0,f:0,g:0};
function cell(T,s,r){
  let x=(s-T.sLo)/T.dS; if(!(x>0))x=0; else if(x>T.ns-1)x=T.ns-1;
  let i=x|0; if(i>T.ns-2)i=T.ns-2; _c.f=x-i;
  if(T.nr===1){_c.o0=i;_c.o1=i;_c.g=0;return;}
  let y=(r-T.rLo)/T.dR; if(!(y>0))y=0; else if(y>T.nr-1)y=T.nr-1;
  let j=y|0; if(j>T.nr-2)j=T.nr-2; _c.g=y-j; _c.o0=j*T.ns+i; _c.o1=_c.o0+T.ns;
}
function cv(arr){const c=_c, v0=arr[c.o0]+(arr[c.o0+1]-arr[c.o0])*c.f; if(c.g===0) return v0; const v1=arr[c.o1]+(arr[c.o1+1]-arr[c.o1])*c.f; return v0+(v1-v0)*c.g;}
function lk2(T,arr,s,r){cell(T,s,r);return cv(arr);}
function lk1(T,arr,s){let x=(s-T.sLo)/T.dS; if(!(x>0))x=0; else if(x>T.ns-1)x=T.ns-1; let i=x|0; if(i>T.ns-2)i=T.ns-2; return arr[i]+(arr[i+1]-arr[i])*(x-i);}

const kinCache=[null,null], NOT_KIN=["rimD","rimW","tw","ar","pk","kt","tmu","tls","tca","tcg","tgo"];      // fields of g that the linkage does not use
function tables(g,name,rmax,slot){
  const key=JSON.stringify(g,(k,v)=>NOT_KIN.includes(k)?undefined:v)+"|"+rmax, c=kinCache[slot];
  if(c&&c.key===key) return c.T;
  const T=buildAxle(g,name,rmax); kinCache[slot]={key,T}; return T;
}

/* Inner tie-rod joint height that gives the least toe change over the travel range (x and y of the joint are kept). */
function bestTieHeight(g,name){
  const D0=design(g,name);
  const find=target=>{let lo=D0.a0-0.9, hi=D0.a0+0.9; for(let i=0;i<60;i++){const mid=(lo+hi)/2, p=pose(g,D0,mid,0,true); if(!p){if(mid<D0.a0)lo=mid; else hi=mid; continue;} if(p.CP[2]<target)lo=mid; else hi=mid;} return (lo+hi)/2;};
  const aLo=find(-g.droop), aHi=find(g.bump), n=17;
  const cost=z=>{let D; const g2=Object.assign({},g,{zti:z}); try{D=design(g2,name);}catch(e){return 1e9;}
    const p0=pose(g2,D,D.a0,0); if(!p0) return 1e9; let c=0;
    for(let i=0;i<n;i++){const p=pose(g2,D,aLo+(aHi-aLo)*i/(n-1),0); if(!p) return 1e9; const d=p.steer-p0.steer; c+=d*d;} return c;};
  let bz=g.zti, bc=cost(g.zti);
  for(let i=0;i<=120;i++){const z=0.02+0.78*i/120, c=cost(z); if(c<bc){bc=c;bz=z;}}
  let lo=Math.max(0.02,bz-0.0065), hi=Math.min(0.8,bz+0.0065); const gr=(Math.sqrt(5)-1)/2;
  for(let i=0;i<40;i++){const x1=hi-gr*(hi-lo), x2=lo+gr*(hi-lo); if(cost(x1)<cost(x2))hi=x2; else lo=x1;}
  const z=(lo+hi)/2; return cost(z)<bc?z:bz;
}

/* Tire numbers from its size and pressure, for one axle. Free radius is exact geometry. The vertical rate is Rhyne's empirical
   formula for radial tires (an estimate), and the loaded radius is the free radius minus static load / rate. */
function tireFromSize(P,ax){
  const g=P.ax[ax].g, v=P.veh, SN=g.tw*1000, AR=g.ar*100, OD=2*SN*AR/100+g.rimD*1000;          // mm
  const kt=(0.00028*(g.pk/1000)*Math.sqrt((1.03-0.004*AR)*SN*OD)+3.45)*9.80665*1000;         // N/m
  const load=(v.M*(ax===0?v.wf:1-v.wf)/2+v.mu)*G;
  return {free:OD/2000,kt,R:OD/2000-load/kt};
}

/* Front geometry as built: with cut knuckles on, the steering arm is shorter by steer.cutL. */
function frontG(P){return P.steer.cut?Object.assign({},P.ax[0].g,{cutL:P.steer.cutL}):P.ax[0].g;}

/* ===== Versions 41 to 56: kept only to read the stock car as it is written down above, and setups saved or exported by those versions. ===== */
/* front-view four-bar of versions 41 to 56: lower arm at angle a (rad from horizontal, + = outer end up) */
function fvL(g,a){
  const ly=g.yli+g.Ll*Math.cos(a), lz=g.zli+g.Ll*Math.sin(a);
  const dx=ly-g.yui, dz=lz-g.zui, d=Math.hypot(dx,dz), r1=g.Lu, r2=g.Lk;
  if(d<1e-9||d>r1+r2||d<Math.abs(r1-r2)) return null;
  const aa=(r1*r1-r2*r2+d*d)/(2*d), hh=Math.sqrt(Math.max(0,r1*r1-aa*aa)), px=g.yui+aa*dx/d, pz=g.zui+aa*dz/d;
  let uy=px-hh*dz/d, uz=pz+hh*dx/d; const uy2=px+hh*dz/d, uz2=pz-hh*dx/d;
  if(uz2>uz){uy=uy2;uz=uz2;}
  const vy=(uy-ly)/r2, vz=(uz-lz)/r2;
  if(vz<=0) return null;
  return {ly,lz,uy,uz,vy,vz,beta:Math.atan2(vy,vz)};   // beta: upright lean in front view, + = top outboard
}

/* tie rod of versions 41 to 56 */
function tieSolveL(D,LBJ,ax,p,r){
  const par=vscale(ax,vdot(p,ax)), perp=vsub(p,par), q=vcross(ax,p);
  const d=[LBJ[0]+par[0]-D.TRI[0], LBJ[1]+par[1]-D.TRI[1]-r, LBJ[2]+par[2]-D.TRI[2]];
  const A=vdot(d,d)+vdot(perp,perp)-D.Lt*D.Lt, B=2*vdot(d,perp), C=2*vdot(d,q), rho=Math.hypot(B,C);
  if(rho<1e-12) return null;
  const cc=-A/rho; if(cc>1||cc<-1) return null;
  return [Math.atan2(C,B),Math.acos(cc)];
}

/* design position of versions 41 to 56 */
function designL(g,name){
  /* The wheel is fixed on the knuckle: its camber is the knuckle's own angle (inc, kingpin inclination + camber, which no setting changes)
     minus the kingpin inclination the arms give, plus the adjuster (cadj, +1 to -3 deg, the one place the wheel may tilt on the knuckle).
     So arm lengths and pivots set the camber, as on the car. beta is the kingpin's lean, + = top outboard, so inclination = -beta. */
  const ka=(g.inc+g.cadj)*D2R, d0=-g.toe*D2R;                     // local steer angle is + outboard, so toe-in is negative
  const spin=c=>[-Math.sin(d0)*Math.cos(c),Math.cos(d0)*Math.cos(c),-Math.sin(c)];   // spindle direction, pointing outboard, for camber c
  /* The hub is fixed on the upright where the fit put the center of the ET40 wheel: hf - 40 mm out from the kingpin axis, square to it.
     Any other offset, and a spacer, slide the wheel along the spindle from there, as on the car. (Before version 40 they slid it
     square to the kingpin, which also lifted it 0.2 mm per mm.) */
  const dsR=g.hf-ET_FIT, dw=ET_FIT-g.et+g.sp;
  const f=a=>{const k=fvL(g,a); if(!k) return NaN; const c=ka+k.beta; return k.lz+g.hsp*k.vz-dsR*k.vy-dw*Math.sin(c)-g.R*Math.cos(c);};
  let best=null; const stp=0.002;
  for(let a=-1.2;a<1.2;a+=stp){
    const f1=f(a), f2=f(a+stp);
    if(isFinite(f1)&&isFinite(f2)&&f1*f2<=0){
      let lo=a, hi=a+stp;
      for(let i=0;i<50;i++){const mid=(lo+hi)/2; if(f(lo)*f(mid)<=0)hi=mid; else lo=mid;}
      const r=(lo+hi)/2; if(best===null||Math.abs(r)<Math.abs(best)) best=r;
    }
  }
  if(best===null) throw new Error(name+": the linkage can't put the tire on the ground at design height. Check arm lengths, upright length and pivot heights.");
  const k=fvL(g,best), av0=spin(ka+k.beta), tk=Math.tan(g.caster*D2R), xk=g.xk||0;
  const Sy=k.ly+g.hsp*k.vy, Sz=k.lz+g.hsp*k.vz;                  // spindle root on the kingpin axis; the wheel center sits xk ahead of it
  const xl=(Sz-k.lz)*tk-xk, xu=-(k.uz-Sz)*tk-xk;                  // ball-joint x offsets that give the caster angle
  const LBJ=[xl,k.ly,k.lz], UBJ=[xu,k.uy,k.uz], WC=[dw*av0[0],Sy+dsR*k.vz+dw*av0[1],Sz-dsR*k.vy+dw*av0[2]];
  const rear=name==="Rear";                                      // rear: the lower arm's second leg (rear inner pivot to a second outer pivot) holds the toe
  let TRO=rear?[xl-g.ee,k.ly,k.lz]:[g.xto,g.yto,g.zto]; const TRI=rear?[g.xlr,g.yli,g.zli]:[g.xti,g.yti,g.zti];
  if(!rear&&g.cutL>0){                                            // cut knuckle: the outer joint moves straight toward the kingpin axis; the tie rod is re-set below, so static toe holds
    const ax0=vunit(vsub(UBJ,LBJ)), q0=vsub(TRO,LBJ), foot=vadd(LBJ,vscale(ax0,vdot(q0,ax0))), r0=vsub(TRO,foot), a0=vlen(r0);
    if(a0>1e-6) TRO=vadd(foot,vscale(r0,Math.max(a0-g.cutL,0)/a0));
  }
  const Lt=vlen(vsub(TRO,TRI));
  if(Lt<0.03) throw new Error(name+": the tie rod is shorter than 30 mm. Move its inner and outer joints apart.");
  const axis=vunit(vsub(UBJ,LBJ)), p0=vsub(TRO,LBJ), arm=vlen(vsub(p0,vscale(axis,vdot(p0,axis))));
  if(arm<0.02) throw new Error(name+": the tie rod's outer joint is within 20 mm of the kingpin axis, so it can't hold the wheel's steer angle. Move it forward or back.");
  const D={a0:best,beta0:k.beta,xl,xu,p0,w0:vsub(WC,LBJ),sl:vlen(vsub([-xk,Sy,Sz],LBJ)),av0,Lt,TRI,br:1,arm};
  const q=tieSolveL(D,LBJ,axis,p0,0);
  if(!q||q[1]<0.05||q[1]>Math.PI-0.05) throw new Error(name+": the tie rod and steering arm are almost in line at design height, so the steer angle isn't held. Move the tie rod's inner or outer joint.");
  const wrap=x=>x>Math.PI?x-2*Math.PI:(x<=-Math.PI?x+2*Math.PI:x);
  D.br=Math.abs(wrap(q[0]+q[1]))<=Math.abs(wrap(q[0]-q[1]))?1:-1;
  return D;
}

/* A setup saved before version 41 carries a free camber field (cam0) instead of the adjuster. Give it the adjuster that reproduces that
   camber on its own arms, limited to the adjuster's range. Returns the axles whose camber had to be limited. */
function fromOldCamberL(P,src){
  const cut=[];
  for(let a=0;a<2;a++){const o=src&&src.ax&&src.ax[a]&&src.ax[a].g; if(!o||typeof o.cam0!=="number"||typeof o.cadj==="number") continue;
    const g=P.ax[a].g; g.cadj=0;
    for(let it=0;it<4;it++){let D; try{D=designL(g,a?"Rear":"Front");}catch(e){break;} g.cadj=o.cam0-(g.inc+D.beta0/D2R);}
    const lim=Math.max(-3,Math.min(1,g.cadj)); if(Math.abs(lim-g.cadj)>1e-6) cut.push(a?"rear":"front"); g.cadj=+lim.toFixed(4);}
  return cut;
}

/* One axle's geometry from the fields of versions 41 to 56 into today's, without changing the car: the design position the old fields
   describe is worked out with the old code, and the arms and the knuckle are read off it. Wheel, tire, coilover and travel fields carry over.
   The old fore-aft pivot positions were only drawn, so they could be in reverse order or on top of each other; the spacing is taken
   as a length of at least 20 mm, which with the axes parallel changes nothing but the drawing. */
function axleFromLegacy(g,name){
  const D=designL(g,name), k=fvL(g,D.a0), rear=name==="Rear", LBJ=[D.xl,k.ly,k.lz], UBJ=[D.xu,k.uy,k.uz], kk=vunit(vsub(UBJ,LBJ));
  const d0=-g.toe*D2R, c0=g.inc*D2R+k.beta, n0=[-Math.sin(d0)*Math.cos(c0),Math.cos(d0)*Math.cos(c0),-Math.sin(c0)];      // the spindle with the camber adjuster at zero
  const nk=vdot(n0,kk), o=vunit(vsub(n0,vscale(kk,nk))), f=vcross(o,kk), dw=ET_FIT-g.et+g.sp;
  const face=vadd(vsub(D.w0,vscale(D.av0,dw)),vscale(n0,ET_FIT));      // from the lower ball joint to the old hub (the center of an ET40 wheel), plus 40 mm out along the spindle
  const xl=(g.xlf+g.xlr)/2, xu=(g.xuf+g.xur)/2, apart=w=>Math.max(0.02,Math.abs(w));
  const n={lxm:xl,lym:g.yli,lzm:g.zli,lsv:0,lpv:0,lw:apart(g.xlf-g.xlr),lR:g.Ll,lt:D.xl-xl,
           uxm:xu,uym:g.yui,uzm:g.zui,usv:0,upv:0,uw:apart(g.xuf-g.xur),uR:g.Lu,ut:D.xu-xu,ee:g.ee,
           kLk:vlen(vsub(UBJ,LBJ)),kinc:-Math.asin(nk)/D2R,kwk:vdot(face,kk),kwo:vdot(face,o),kwf:vdot(face,f)};
  if(!rear){const q=[g.xto-LBJ[0],g.yto-LBJ[1],g.zto-LBJ[2]]; n.kpk=vdot(q,kk); n.kpo=vdot(q,o); n.kpf=vdot(q,f);}
  for(const key of ["rimD","rimW","et","sp","tw","ar","pk","R","tmu","tls","tca","tcg","tgo","cadj","toe","kt"]) n[key]=g[key];
  if(!rear){n.xti=g.xti; n.yti=g.yti; n.zti=g.zti;}
  for(const key of ["fMount","ydm","zdm","bump","droop"]) n[key]=g[key];
  return n;
}
/* A whole setup in the fields of versions 41 to 56 into today's. */
function fromLegacy(P){
  return {veh:Object.assign({},P.veh,{bias:P.veh.bias===undefined?0.65:P.veh.bias}),steer:Object.assign({},P.steer),
          ax:[{g:axleFromLegacy(P.ax[0].g,"Front"),s:Object.assign({},P.ax[0].s)},{g:axleFromLegacy(P.ax[1].g,"Rear"),s:Object.assign({},P.ax[1].s)}],
          dh:P.dh.slice(),look:P.look||0};
}
const isLegacy=j=>!!(j&&j.ax&&j.ax[0]&&j.ax[0].g&&j.ax[0].g.Ll!==undefined&&j.ax[0].g.lR===undefined);      // a stored or imported setup from version 56 or earlier

function stockCar(){return fromLegacy(legacyStock());}
/* COEN'S car: the stock car with his parts, in today's fields. Knuckles, chassis pivots and rack are untouched, so they are stock's.
   Front arms: lower reach 341.6 mm (the 5 mm extension at the ball joint; the shock mount stays 238 mm from the pivots, so 0.6967 of
   the arm), upper reach 240.3 mm (cut 9.7 mm). lt and ut put the two front ball joints where the caster is 3 deg at design height
   with the hub on the axle line. The toe field holds -0.5 deg at ride height. Rear: stock arms; camber -1.5 deg on the adjuster. */
function coensCar(){
  const P=stockCar(), f=P.ax[0].g, r=P.ax[1].g;
  for(const g of [f,r]) Object.assign(g,{rimD:0.381,rimW:0.1778,et:0.035,tw:0.195,ar:0.45,pk:240000,R:0.2675,kt:234000},TIRE_PRESETS.sport);
  Object.assign(f,{lR:0.3416,lt:0.18372,fMount:0.6967,uR:0.2403,ut:0.0063,cadj:0,toe:-0.3306,sp:0.030,bump:0.0885,droop:0.041});
  Object.assign(r,{cadj:0.388,toe:0,sp:0.012,bump:0.0865,droop:0.031});
  Object.assign(P.ax[0].s,{k:78450,arb:14240,cbl:5820,cbh:1750,vkb:0.075,crl:9060,crh:2720,vkr:0.075});
  Object.assign(P.ax[1].s,{k:58840,cbl:4400,cbh:1320,vkb:0.075,crl:6840,crh:2050,vkr:0.075});
  P.dh=[-0.026,-0.026,-0.038,-0.038]; P.look=1; return P;
}
const PRESETS={stock:stockCar,coen:coensCar};
function defaults(){return stockCar();}      // the car a new visitor starts with


/* ---- vehicle model ---- */
function makeModel(P){
  check(P);
  const T=[tables(frontG(P),"Front",P.steer.rmax,0),tables(P.ax[1].g,"Rear",0,1)];
  const v=P.veh, a=v.L*(1-v.wf), b=v.L*v.wf;
  const m={P,T,a,b,xs:[a,a,-b,-b],ys:[-T[0].tHalf,T[0].tHalf,-T[1].tHalf,T[1].tHalf],W:[],d0:[],Fpre:[],FpreDesign:[],st:[],zt:[],arbOff:[0,0],zs:0};
  const yF=T[0].tHalf, yR=T[1].tHalf, zt=m.zt;
  for(let i=0;i<4;i++){const g=P.ax[i<2?0:1].g; zt[i]=Math.min(g.droop-0.002,Math.max(-(g.bump-0.002),P.dh[i]));}   // target body height at each corner
  /* Body attitude at the targets (best-fit plane). A tilted body carries its CG off-center over the wheels,
     so the corner loads the perches must hold differ slightly from the level-car loads. */
  const zF=(zt[0]+zt[1])/2, zR=(zt[2]+zt[3])/2, th=(zF-zR)/v.L, ph=(yF*(zt[1]-zt[0])+yR*(zt[3]-zt[2]))/(2*(yF*yF+yR*yR));
  m.zs=(zF*b+zR*a)/v.L;
  const hcg=v.h+m.zs, hra=lk1(T[0],T[0].rch,-zF)*v.wf+lk1(T[1],T[1].rch,-zR)*(1-v.wf), ycg=-(hcg-hra)*ph;
  const WF=v.M*G*(v.wf-hcg*th/v.L), WR=v.M*G-WF;
  for(let i=0;i<4;i++){
    const ax=i<2?0:1, g=P.ax[ax].g, s=P.ax[ax].s, Tx=T[ax], side=i%2===0?-1:1;
    const Wn=v.M*G*(ax===0?v.wf:1-v.wf)/2, W=(ax===0?WF:WR)*(0.5+side*ycg/(2*(ax===0?yF:yR)));
    const st=(Wn-W)/g.kt-zt[i];                                 // wheel travel at the target, allowing for the tire's deflection change
    m.W[i]=Wn; m.d0[i]=(Wn+v.mu*G)/g.kt; m.st[i]=st;
    m.Fpre[i]=W/lk2(Tx,Tx.MR,st,0)-s.k*(Tx.L0-lk2(Tx,Tx.L,st,0));
    m.FpreDesign[i]=Wn/Tx.MR0;
  }
  m.arbOff=[m.st[0]-m.st[1],m.st[2]-m.st[3]];
  return m;
}
function newState(){return {t:0,z:0,zd:0,th:0,thd:0,ph:0,phd:0,zw:[0,0,0,0],zwd:[0,0,0,0],vy:0,r:0,ay:0,al:[0,0,0,0],spun:false,ev:[],out:[{},{},{},{}],hrc:[0,0]};}

function damperF(s,v){
  if(v>=0) return v<=s.vkb?s.cbl*v:s.cbl*s.vkb+s.cbh*(v-s.vkb);
  const u=-v; return -(u<=s.vkr?s.crl*u:s.crl*s.vkr+s.crh*(u-s.vkr));
}
function groundAt(st,i){
  let z=0, zd=0;
  for(const e of st.ev){if(e.i!==i) continue; const tau=(st.t-e.t0)/e.dur; if(tau<0||tau>1) continue;
    z+=e.h*(1-Math.cos(2*Math.PI*tau))/2; zd+=e.h*Math.PI*Math.sin(2*Math.PI*tau)/e.dur;}
  return [z,zd];
}
const CT=300, KBS=200000, KBS2=2e7, CBS=1500, KTOP=800000, DT=1/4000;
const _s=[0,0,0,0], _sd=[0,0,0,0], _sa=[0,0,0,0], _Fw=[0,0,0,0];

/* One time step. inp: {ay, ax in g; Fp N at (xp, yp) m from the CG; rack m, + = toward the car's right; U m/s}.
   With U > 0 the car is driven: the tires make the side force from their slip angles, the car slides sideways (vy) and yaws (r, + = turning right),
   and the lateral acceleration comes out of that instead of from inp.ay. */
function step(m,st,inp,dt,extraDamp){
  const P=m.P, v=P.veh, T=m.T, out=st.out, rack=inp.rack||0, s=_s, sd=_sd, sa=_sa, Fw=_Fw;
  for(let i=0;i<4;i++){
    const ax=i<2?0:1, Tx=T[ax], ss=P.ax[ax].s, g=P.ax[ax].g, x=m.xs[i], y=m.ys[i];
    const zc=st.z+x*st.th+y*st.ph, zcd=st.zd+x*st.thd+y*st.phd;
    s[i]=st.zw[i]-zc; sd[i]=st.zwd[i]-zcd;
    cell(Tx,s[i],ax===0?(i===0?-rack:rack):0);
    const L=cv(Tx.L), MR=cv(Tx.MR); sa[i]=cv(Tx.sa);            // sa: travel of the arm itself (steer lifts the tire without moving the arm)
    const Fs=Math.max(0,m.Fpre[i]+ss.k*(Tx.L0-L)), vd=MR*sd[i], Fd=damperF(ss,vd);
    let F=(Fs+Fd)*MR;
    if(sa[i]>g.bump){const e=sa[i]-g.bump; F+=KBS*e+KBS2*e*e+CBS*sd[i];}
    if(sa[i]<-g.droop){const e=-g.droop-sa[i]; F+=-KTOP*e+CBS*sd[i];}
    Fw[i]=F; const o=out[i]; o.s=s[i]; o.vd=vd;
    if(inp.U>0){                                               // slip angle from the wheel's own path over the ground, with a short lag (relaxation length)
      const side=i%2===0?-1:1, de=side*cv(Tx.steer)*D2R, lean=side*(cv(Tx.cam)-side*st.ph/D2R);
      const vx=Math.max(0.5,inp.U-y*st.r), al=de-Math.atan2(st.vy+x*st.r,vx);
      st.al[i]+=(al-st.al[i])*Math.min(1,vx*dt/TRELAX);
      const Fz=o.Ft!==undefined?o.Ft:m.W[i]+v.mu*G, Fy=tireFy(g,st.al[i]/D2R,Fz,lean), D=tirePeak(g,Fz,Fy>=0?lean:-lean);
      o.Fy=Fy; o.slip=st.al[i]/D2R; o.used=D>0?Math.abs(Fy)/D:0;
    }
  }
  let ayDrive=0;
  if(inp.U>0){
    const Mt=v.M+4*v.mu; let Fy=0, Mz=0; for(let i=0;i<4;i++){Fy+=out[i].Fy; Mz+=m.xs[i]*out[i].Fy;}
    ayDrive=Fy/Mt; st.vy+=(ayDrive-inp.U*st.r)*dt; st.r+=Mz/v.Izz*dt;
    if(Math.abs(st.vy)>inp.U) st.spun=true;                   // sliding sideways faster than it is going forward
  } else {st.vy=0; st.r=0; st.al[0]=st.al[1]=st.al[2]=st.al[3]=0;}
  for(let ax=0;ax<2;ax++){
    const k=P.ax[ax].s.arb, iL=ax*2, iR=iL+1, dif=(sa[iL]-sa[iR])-m.arbOff[ax];
    Fw[iL]+=k*dif; Fw[iR]-=k*dif;
  }
  const ay=inp.U>0?ayDrive:inp.ay*G, axl=inp.ax*G; st.ay=ay/G;
  const hrcF=lk1(T[0],T[0].rch,(sa[0]+sa[1])/2), hrcR=lk1(T[1],T[1].rch,(sa[2]+sa[3])/2);
  st.hrc[0]=hrcF; st.hrc[1]=hrcR;
  const hra=hrcF+(hrcR-hrcF)*m.a/v.L, hcg=v.h+st.z, hp=hcg-hra;   // CG height follows the body; hp = CG above the roll axis
  let Fz=-v.M*G-inp.Fp;
  let Mth=v.M*axl*hcg+v.M*G*hcg*st.th-inp.xp*inp.Fp;              // pitching shifts the CG back over the wheels by h*theta
  let Mph=v.M*ay*hp+v.M*G*hp*st.ph-inp.yp*inp.Fp;                 // rolling shifts the CG sideways by hp*phi
  for(let i=0;i<4;i++){Fz+=Fw[i]; Mth+=m.xs[i]*Fw[i]; Mph+=m.ys[i]*Fw[i];}
  for(let i=0;i<4;i++){
    const ax=i<2?0:1, g=P.ax[ax].g, side=i%2===0?-1:1, tH=m.ys[ax*2+1];
    const Max=v.M*(ax===0?v.wf:1-v.wf), hr=ax===0?hrcF:hrcR;
    let dF=-side*(Max*ay*hr+2*v.mu*ay*g.R)/(2*tH);               // load transfer through the links, plus the unsprung part
    dF+=(ax===0?-1:1)*(4*v.mu*axl*g.R/v.L)/2;
    const gr=groundAt(st,i);
    let Ft=g.kt*(m.d0[i]+gr[0]-st.zw[i]);
    if(Ft>0){Ft+=CT*(gr[1]-st.zwd[i]); if(Ft<0)Ft=0;} else Ft=0;
    st.zwd[i]+=(Ft-Fw[i]-v.mu*G-dF)/v.mu*dt;
    const o=out[i]; o.Ft=Ft; o.zg=gr[0];
  }
  st.zd+=Fz/v.M*dt; st.thd+=Mth/v.Iyy*dt; st.phd+=Mph/(v.Ixx+v.M*hp*hp)*dt;   // the body rolls about the roll axis (parallel-axis term)
  if(extraDamp){const f=1-extraDamp; st.zd*=f; st.thd*=f; st.phd*=f; for(let i=0;i<4;i++) st.zwd[i]*=f;}
  st.z+=st.zd*dt; st.th+=st.thd*dt; st.ph+=st.phd*dt;
  for(let i=0;i<4;i++) st.zw[i]+=st.zwd[i]*dt;
  st.t+=dt;
  if(st.ev.length&&st.ev.every(e=>st.t>e.t0+e.dur)) st.ev=[];
}
function settle(m,st,inp,sec){const n=Math.round(sec/DT); for(let k=0;k<n;k++) step(m,st,inp,DT,0.002);}
function finite(st){return Number.isFinite(st.vy+st.r+st.z+st.th+st.ph+st.zd+st.thd+st.phd+st.zw[0]+st.zw[1]+st.zw[2]+st.zw[3]+st.zwd[0]+st.zwd[1]+st.zwd[2]+st.zwd[3]);}


/* ---- tire side force ----
   Magic Formula shape. slip and lean are in degrees: slip + and lean + (top toward the car's right) both push the tire to the right.
   Peak grip falls with load (tls) and changes a little with camber into the turn, best at tgo. Cornering stiffness rises with load
   but flattens off (it peaks at three times the reference load). Camber thrust shifts the curve sideways. */
const TREF=2500, TSHAPE=1.4, TCURV=-0.6, TRELAX=0.35;
function tirePeak(g,Fz,gin){
  if(!(Fz>0)) return 0;
  const mu=Math.max(0.3*g.tmu,g.tmu-g.tls*(Fz-TREF));
  const f=g.tgo>0?1+g.tcg/g.tmu*(gin-gin*gin/(2*g.tgo)):1;
  return Math.max(0.5,f)*mu*Fz;
}
function tireFy(g,slip,Fz,lean){
  if(!(Fz>0)) return 0;
  const Ca=g.tca*TREF/0.6*Math.sin(2*Math.atan(Fz/(3*TREF)));      // N per degree
  const x=slip+g.tcg*Fz/Ca*lean, D=tirePeak(g,Fz,x>=0?lean:-lean), bx=Ca/(TSHAPE*D)*x;
  return D*Math.sin(TSHAPE*Math.atan(bx-TCURV*(bx-Math.atan(bx))));
}
/* One axle in a steady corner: the slip angle (deg, at the axle, before each wheel's own toe) at which its two tires make the side force F,
   and the most the axle can make. Fz, toe (deg, + = steered right) and lean (deg, + = top to the right) are per wheel, left then right. */
function axleSolve(g,F,Fz,toe,lean){
  const f=a=>tireFy(g,a+toe[0],Fz[0],lean[0])+tireFy(g,a+toe[1],Fz[1],lean[1]);
  let cap=-Infinity, ap=0; for(let a=-4;a<=25;a+=0.25){const v=f(a); if(v>cap){cap=v;ap=a;}}
  if(!(cap>0)) return {a:NaN,cap:0,used:Infinity};
  if(F>=cap) return {a:ap,cap,used:F/cap};
  let lo=-25, hi=ap; for(let i=0;i<40;i++){const mid=(lo+hi)/2; if(f(mid)<F)lo=mid; else hi=mid;}
  return {a:(lo+hi)/2,cap,used:F/cap};
}
/* Per-tire slip, side force and share of grip in use for the state st cornering at ay (g, + = right turn), with the wheels' present
   loads, camber and toe (rack centered). Used when the car is not being driven by the tire model. */
function gripNow(m,st,ay){
  const P=m.P, r={tire:[],ax:[]}, sg=ay<0?-1:1;
  for(let ax=0;ax<2;ax++){
    const T=m.T[ax], g=P.ax[ax].g, Fz=[], toe=[], lean=[];
    for(let k=0;k<2;k++){const i=ax*2+k, side=k?1:-1, o=st.out[i], s=o.s||0;
      Fz[k]=o.Ft!==undefined?o.Ft:m.W[i]+P.veh.mu*G; toe[k]=sg*side*lk2(T,T.steer,s,0); lean[k]=sg*side*(lk2(T,T.cam,s,0)-side*st.ph/D2R);}
    const F=Math.abs(ay)*2*(m.W[ax*2]+P.veh.mu*G), q=axleSolve(g,F,Fz,toe,lean);
    r.ax.push(q);
    for(let k=0;k<2;k++){const al=q.a+toe[k], Fy=tireFy(g,al,Fz[k],lean[k]), D=tirePeak(g,Fz[k],lean[k]); r.tire.push({slip:sg*al,Fy:sg*Fy,used:D>0?Math.abs(Fy)/D:0});}
  }
  return r;
}
/* Steady cornering sweep: the car is settled at each lateral g in turn and each axle's side force is compared with what its tires can make.
   Returns the share of grip in use per axle against lateral g, the g at which each axle runs out, and the understeer gradient (deg/g, + = understeer). */
function balance(m){
  const st=newState(), z={ay:0,ax:0,Fp:0,xp:0,yp:0,rack:0}, out={ay:[],uF:[],uR:[],aF:[],aR:[],limF:NaN,limR:NaN,K:NaN};
  settle(m,st,z,1.5);
  for(let k=0;k<=40;k++){
    const ay=k*0.05; z.ay=ay; settle(m,st,z,k?0.5:0.1);
    if(!finite(st)) break;
    const q=gripNow(m,st,ay);
    out.ay.push(ay); out.uF.push(q.ax[0].used); out.uR.push(q.ax[1].used); out.aF.push(q.ax[0].a); out.aR.push(q.ax[1].a);
    if(q.ax[0].used>1.15&&q.ax[1].used>1.15) break;
  }
  const lim=u=>{for(let k=1;k<u.length;k++) if(u[k]>=1) return out.ay[k-1]+(1-u[k-1])/(u[k]-u[k-1])*0.05; return NaN;};
  out.limF=lim(out.uF); out.limR=lim(out.uR);
  const i2=out.ay.findIndex(a=>a>0.199), i4=out.ay.findIndex(a=>a>0.399);
  if(i2>0&&i4>0&&out.uF[i4]<1&&out.uR[i4]<1) out.K=((out.aF[i4]-out.aR[i4])-(out.aF[i2]-out.aR[i2]))/(out.ay[i4]-out.ay[i2]);
  return out;
}

/* Road-wheel angles (deg, + = right), Ackermann and the low-speed turn for a rack position and the front wheel travels. */
function steerInfo(m,rack,sL,sR){
  const T=m.T[0], v=m.P.veh;
  const dL=-lk2(T,T.steer,sL,-rack), dR=lk2(T,T.steer,sR,rack), dm=(dL+dR)/2*D2R;
  const kra=Math.tan(dm)/v.L, right=dm>=0, di=Math.abs(right?dR:dL), dout=Math.abs(right?dL:dR);
  let ack=NaN;
  if(di>2){const tk=2*T.kp[1], ideal=Math.atan(1/(1/Math.tan(di*D2R)+tk/v.L))/D2R; ack=(di-dout)/(di-ideal)*100;}
  const kay=kra/(1+m.b*m.b*kra*kra);                              // lateral acceleration at the CG = v^2 * kay
  const turn=Math.abs(kra)>1e-6, Rr=turn?1/Math.abs(kra):Infinity;   // radius of the rear axle's center
  return {dL,dR,di,dout,ack,kra,kay,R:turn?Math.hypot(Rr,m.b):Infinity,Ro:turn?Math.hypot(Rr+T.tHalf,v.L):Infinity};   // R at the CG, Ro at the outer front tire
}

/* Derived setup numbers at the target ride heights (linearised about the static position). */
function sheet(m){
  const P=m.P, v=P.veh, r={ax:[]}, hs=v.h+m.zs; let Kr=0, Kth=0, Kz=0, Kzx=0;
  for(let ax=0;ax<2;ax++){
    const T=m.T[ax], s=P.ax[ax].s, g=P.ax[ax].g, t=2*T.tHalf, ms=m.W[ax*2]/G, i=ax*2, st=(m.st[i]+m.st[i+1])/2, e=0.002;
    const Fw=(j,x)=>Math.max(0,m.Fpre[j]+s.k*(T.L0-lk2(T,T.L,x,0)))*lk2(T,T.MR,x,0);
    const MR=lk2(T,T.MR,st,0), kw=(Fw(i,m.st[i]+e)-Fw(i,m.st[i]-e)+Fw(i+1,m.st[i+1]+e)-Fw(i+1,m.st[i+1]-e))/(4*e);   // tangent wheel rate (k*MR^2 plus the motion-ratio change term), mean of left and right
    const kr=kw*g.kt/(kw+g.kt), fr=Math.sqrt(kr/ms)/(2*Math.PI), cc=2*Math.sqrt(kw*ms);
    const Ks=(kw/2+s.arb)*t*t, Kt=g.kt*t*t/2, Kax=1/(1/Ks+1/Kt), rch=lk1(T,T.rch,st);
    const Mg=v.M*(ax===0?v.wf:1-v.wf)*rch+2*v.mu*g.R;                             // link + unsprung load-transfer moment per unit lateral acceleration
    Kr+=Kax; Kth+=2*kr*m.xs[i]*m.xs[i]; Kz+=2*kr; Kzx+=2*kr*m.xs[i];
    const pr=pose(ax?g:frontG(P),T.D,lk2(T,T.al,st,0),0)||T.P0, tk=(pr.CP[2]-pr.LBJ[2])/(pr.UBJ[2]-pr.LBJ[2]), I=instant(T.D,pr,0);      // the corner at ride height, and where its kingpin axis meets the ground
    r.ax.push({MR,kw,kr,fr,zb:s.cbl*MR*MR/cc,zr:s.crl*MR*MR/cc,rch,t,Kax,Kt,Mg,cam:lk2(T,T.cam,st,0),toe:-lk2(T,T.steer,st,0),
      camGain:(lk2(T,T.cam,st+e,0)-lk2(T,T.cam,st-e,0))/(2*e)*0.01, bumpSteer:-(lk2(T,T.steer,st+e,0)-lk2(T,T.steer,st-e,0))/(2*e)*0.01,
      kpi:Math.atan2(pr.LBJ[1]-pr.UBJ[1],pr.UBJ[2]-pr.LBJ[2])/D2R,caster:Math.atan2(-pr.ax[0],pr.ax[2])/D2R,scrub:pr.CP[1]-(pr.LBJ[1]+tk*(pr.UBJ[1]-pr.LBJ[1])),trail:pr.LBJ[0]+tk*(pr.UBJ[0]-pr.LBJ[0])-pr.CP[0],
      st,sideAngle:I?Math.atan(I.side)/D2R:NaN,antiDive:I?I.side*brakeShare(v,ax)*v.L/hs*100:NaN});
  }
  const A=r.ax, hra=A[0].rch*v.wf+A[1].rch*(1-v.wf), hp=hs-hra, MgH=v.M*G*hp, MgHs=v.M*G*hs;
  Kth-=Kzx*Kzx/Kz;                                               // the body is free to heave, which softens pitch slightly
  r.hp=hp;
  const stable=Kr>MgH;
  const phi=stable?(v.M*hp+A[0].Kax/A[0].Kt*A[0].Mg+A[1].Kax/A[1].Kt*A[1].Mg)/(Kr-MgH):Infinity;     // roll per unit lateral acceleration
  r.rollGrad=phi*G/D2R;
  r.rollFreq=stable?Math.sqrt((Kr-MgH)/(v.Ixx+v.M*hp*hp))/(2*Math.PI):NaN;
  const uns=4*v.mu*(P.ax[0].g.R*A[0].kr/P.ax[0].g.kt*m.a+P.ax[1].g.R*A[1].kr/P.ax[1].g.kt*m.b)/v.L;
  r.pitchGrad=Kth>MgHs?(v.M*hs+uns)/(Kth-MgHs)*G/D2R:Infinity;
  const dW=a=>stable?(a.Kax*phi+a.Mg*(1-a.Kax/a.Kt))/a.t:a.Mg/a.t;
  r.lltd=dW(A[0])/(dW(A[0])+dW(A[1]));
  const T0=m.T[0], stF=(m.st[0]+m.st[1])/2, dr=T0.dR;
  r.ratio=(360/P.steer.c)/Math.abs((lk2(T0,T0.steer,stF,dr)-lk2(T0,T0.steer,stF,-dr))/(2*dr));
  r.lock=steerInfo(m,T0.sgn*P.steer.rmax,m.st[0],m.st[1]);
  r.swMax=P.steer.rmax/P.steer.c*360;
  return r;
}


/* ===== Solve for: the smallest change to chosen fields that makes chosen numbers of one axle hit their targets at ride height ===== */
/* Numbers that can be aimed at: [key, label, unit, shown per SI, how close counts as reached (shown units)]. The keys are the setup sheet's. */
const TARGETS=[["cam","Camber","°",1,1e-4],["toe","Toe-in per wheel","°",1,1e-4],["caster","Caster","°",1,1e-4],["kpi","Kingpin inclination","°",1,1e-4],
  ["rch","Roll center height","mm",1e3,1e-3],["camGain","Camber gain in bump","°/10 mm",1,1e-5],["bumpSteer","Bump steer (toe-in)","°/10 mm",1,1e-5],["antiDive","Anti-dive under braking","%",1,1e-3],
  ["scrub","Scrub radius","mm",1e3,1e-3],["trail","Mechanical trail","mm",1e3,1e-3],["t","Track","mm",1e3,2e-3],["MR","Motion ratio","",1,1e-6]];
/* Lower-arm angle that puts the contact patch at travel s (m, + = bump) with the rack centered. Newton, then checked. */
function angleAt(g,D,s){
  let al=D.a0+s/D.lo.R; const h=1e-6;
  for(let i=0;i<40;i++){
    const p=pose(g,D,al,0); if(!p) return null; const e=p.CP[2]-s; if(Math.abs(e)<1e-13) return al;
    const a=pose(g,D,al+h,0), b=pose(g,D,al-h,0); if(!a||!b) return null; const sl=(a.CP[2]-b.CP[2])/(2*h); if(!(sl>1e-4)) return null;
    let st=-e/sl; if(st>0.1)st=0.1; else if(st<-0.1)st=-0.1; al+=st;
  }
  const p=pose(g,D,al,0); return p&&Math.abs(p.CP[2]-s)<1e-9?al:null;
}
/* The same numbers the setup sheet shows for an axle, straight from its linkage at wheel travel s. c: {s, L, h, share} (wheelbase, CG
   height and the axle's share of braking, for the anti-dive number). Returns null if the linkage can't reach that travel. */
function axleNumbers(g,name,c){
  const D=design(g,name), e=0.002, al=angleAt(g,D,c.s), a1=angleAt(g,D,c.s+e), a0=angleAt(g,D,c.s-e); if(al===null||a1===null||a0===null) return null;
  const p=pose(g,D,al,0), pa=pose(g,D,a1,0), pb=pose(g,D,a0,0), P0=pose(g,D,D.a0,0), I=instant(D,p,0); if(!I) return null;
  const tk=(p.CP[2]-p.LBJ[2])/(p.UBJ[2]-p.LBJ[2]);
  return {cam:p.cam/D2R,toe:-p.steer/D2R,caster:Math.atan2(-p.ax[0],p.ax[2])/D2R,kpi:Math.atan2(p.LBJ[1]-p.UBJ[1],p.UBJ[2]-p.LBJ[2])/D2R,
    scrub:p.CP[1]-(p.LBJ[1]+tk*(p.UBJ[1]-p.LBJ[1])),trail:p.LBJ[0]+tk*(p.UBJ[0]-p.LBJ[0])-p.CP[0],rch:I.rch,t:2*P0.CP[1],
    camGain:(pa.cam-pb.cam)/D2R/(2*e)*0.01,bumpSteer:-(pa.steer-pb.steer)/D2R/(2*e)*0.01,MR:-(pa.L-pb.L)/(2*e),antiDive:I.side*c.share*c.L/c.h*100};
}
function gaussSolve(A,b){                                           // solves A y = b; null if A is singular
  const n=b.length; let big=0; for(let i=0;i<n;i++) big=Math.max(big,Math.abs(A[i][i]));
  for(let c=0;c<n;c++){
    let p=c; for(let i=c+1;i<n;i++) if(Math.abs(A[i][c])>Math.abs(A[p][c])) p=i;
    if(Math.abs(A[p][c])<=1e-9*big) return null;
    [A[c],A[p]]=[A[p],A[c]]; [b[c],b[p]]=[b[p],b[c]];
    for(let i=c+1;i<n;i++){const m=A[i][c]/A[c][c]; for(let j=c;j<n;j++)A[i][j]-=m*A[c][j]; b[i]-=m*b[c];}
  }
  const y=new Array(n); for(let i=n-1;i>=0;i--){let s=b[i]; for(let j=i+1;j<n;j++)s-=A[i][j]*y[j]; y[i]=s/A[i][i];} return y;
}
/* g: the axle's geometry (for the front with cut knuckles, as frontG gives it). targets: {cam:-2, rch:60, ...} in shown units.
   free: keys of g that may change. c: see axleNumbers. "Smallest" counts 1 mm the same as 0.25 deg (and as 0.01 of a fraction).
   It never guesses: {ok:false, why} when there are more targets than free fields, when the free fields can't move the targets
   independently, when a field would leave its allowed range, or when no geometry reaches the targets. */
function solveFor(g0,name,c,targets,free){
  const keys=Object.keys(targets), m=keys.length, n=free.length, spec={}, short=l=>l.split(" (")[0].replace(/, (added to|\+ =).*$/,"");      // a field's label without its sign note, for a sentence
  for(const [grp,fs] of GEO) for(const f of fs) spec[f[0]]={label:f[1],unit:f[2],sc:f[3],mn:f[5],mx:f[6],wt:f[2]==="°"?0.25:f[2]===""?0.01:1,group:grp};
  if(!m) return {ok:false,why:"Pick at least one number to solve for."};
  if(!n) return {ok:false,why:"Tick at least one field that is allowed to change."};
  if(m>n) return {ok:false,why:m+" targets but only "+n+" field"+(n>1?"s":"")+" allowed to change. Each target needs its own field to change, so this has no exact answer. Tick "+(m-n)+" more or drop a target."};
  const T=keys.map(k=>TARGETS.find(t=>t[0]===k)), F=free.map(k=>spec[k]), x0=free.map((k,i)=>g0[k]/F[i].sc/F[i].wt);
  const evalAt=x=>{const g=Object.assign({},g0); free.forEach((k,i)=>{g[k]=x[i]*F[i].wt*F[i].sc;}); let o; try{o=axleNumbers(g,name,c);}catch(e){return null;}
    if(!o) return null; const y=T.map(t=>o[t[0]]*t[3]); return y.every(Number.isFinite)?{g,y,o}:null;};
  let x=x0.slice(), cur=evalAt(x); if(!cur) return {ok:false,why:"The geometry as it is does not reach this ride height."};
  const start=cur.o; let it=0, err=Infinity;
  for(;it<60;it++){
    const res=cur.y.map((v,i)=>v-targets[keys[i]]); err=Math.max(...res.map((v,i)=>Math.abs(v)/T[i][4]));
    if(err<=1) break;
    const J=T.map(()=>new Array(n)), h=1e-3;
    for(let j=0;j<n;j++){const xa=x.slice(), xb=x.slice(); xa[j]+=h; xb[j]-=h; const a=evalAt(xa), b=evalAt(xb);
      if(!a||!b) return {ok:false,why:"The linkage stops assembling near "+short(F[j].label)+" = "+(x[j]*F[j].wt).toFixed(2)+(F[j].unit?" "+F[j].unit:"")+"."};
      for(let i=0;i<m;i++) J[i][j]=(a.y[i]-b.y[i])/(2*h);}
    for(let i=0;i<m;i++) if(Math.hypot(...J[i])<1e-9) return {ok:false,why:"None of the ticked fields changes "+T[i][1]+". Tick a field that does."};
    const Jn=J.map(r=>{const l=Math.hypot(...r); return r.map(v=>v/l);});            // rows scaled so a dependency shows up whatever the units
    const A=Jn.map(a=>Jn.map(b=>a.reduce((s,v,k)=>s+v*b[k],0)));
    const rhs=Jn.map((r,i)=>(r.reduce((s,v,k)=>s+v*(x[k]-x0[k]),0))-res[i]/Math.hypot(...J[i]));
    const dep=[]; for(let i=0;i<m;i++) for(let j=i+1;j<m;j++) if(Math.abs(A[i][j])>0.9995) dep.push(T[i][1]+" and "+T[j][1]);
    const y=gaussSolve(A.map(r=>r.slice()),rhs.slice());
    const xn=y?x0.map((v,k)=>v+Jn.reduce((s,r,i)=>s+r[k]*y[i],0)):null;              // least change from the starting values
    if(!y||Math.max(...xn.map((v,k)=>Math.abs(v-x0[k])))>400)                        // no answer, or one that needs hundreds of millimeters: the targets fight each other
      return {ok:false,why:"The ticked fields can't set these targets independently"+(dep.length?": "+dep.join("; ")+" move together":"")+". Tick a different field or drop a target."};
    let dx=xn.map((v,k)=>v-x[k]); const big=Math.max(...dx.map(Math.abs)); if(big>15) dx=dx.map(v=>v*15/big);
    let nx=null, tr=null;
    for(let cut=0;cut<10&&!tr;cut++){nx=x.map((v,k)=>v+dx[k]); tr=evalAt(nx); if(!tr) dx=dx.map(v=>v/2);}
    if(!tr) return {ok:false,why:"The linkage stops assembling on the way to these targets."};
    x=nx; cur=tr;
  }
  const reached=keys.map((k,i)=>({key:k,label:T[i][1],unit:T[i][2],want:targets[k],got:cur.y[i]}));
  if(err>1) return {ok:false,why:"No geometry within reach hits these targets. Closest found: "+reached.map(r=>r.label+" "+r.got.toFixed(3)+" (wanted "+r.want+")").join(", ")+".",reached};
  for(let i=0;i<n;i++){const v=x[i]*F[i].wt; if(v<F[i].mn-1e-9||v>F[i].mx+1e-9) return {ok:false,why:short(F[i].label)+" would have to be "+v.toFixed(F[i].unit==="°"?2:1)+(F[i].unit?" "+F[i].unit:"")+", outside what the field allows ("+F[i].mn+" to "+F[i].mx+")."};}
  const changes=free.map((k,i)=>({key:k,label:F[i].label,group:F[i].group,unit:F[i].unit,from:x0[i]*F[i].wt,to:x[i]*F[i].wt,si:x[i]*F[i].wt*F[i].sc})).filter(q=>Math.abs(q.to-q.from)>5e-5);
  return {ok:true,changes,reached,start,end:cur.o,iterations:it,spare:n-m};
}

