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
   ESTIMATES: unsprung mass, roll, pitch and yaw inertia, tire rate, anti-roll bar rates, front weight share, and every tire grip
     number (typical values for the kind of tire, not measured).
   The Miata has no rear toe link. Its rear lower arm has two outer pivots; the model draws the arm as two legs (front leg to the
   ball joint, rear leg to a second outer point ee behind it) and the rear leg holds the toe, so no rear tie-rod numbers are used.
   COEN'S car, on top of stock: 8 / 6 kgf/mm springs with dampers scaled up by the square root of the spring ratio (a guess),
   15x7 ET35 wheels with 30 / 12 mm spacers, 185/45R15 tires, ride height -26 mm front and -38 mm rear (measured at the body, so
   it includes the 14 mm smaller tire radius), rack 6.8 mm higher, caster 3°, toe -0.5° front and 0° rear at ride height.
   Camber: the adjusters give -2° front and -1.5° rear at ride height on uncut arms (Coen's alignment); the front upper arm is then
   10.5 mm shorter (239.5 mm), which brings the front to -4.64°. 10.5 mm brings the inside front wheel to about zero camber
   at full lock (+0.15°); Coen's real cut is not measured. Travel limits are the stock dampers' stops, which sit 14 mm
   further from ride height on the smaller tire (96 / 79 mm front, 94 / 82 mm rear).
   The wheel is fixed on the knuckle (version 41): camber = knuckle angle (inc) - kingpin inclination + adjuster (cadj, +1 to -3°).
   look says which body and rims the 3D view draws (0: Roadster RS, 1: Coen's). It has no effect on the numbers. */
function stockCar(){
  return {
    veh:{M:902,mu:32,L:2.265,wf:0.523,h:0.474,Ixx:260,Iyy:1050,Izz:1400},
    steer:{c:0.0465,rmax:0.0605,speed:60/3.6,link:0,cut:0,cutL:0.020},
    ax:[
      {g:{Ll:0.3366,Lu:0.25,Lk:0.2172,yli:0.3232,zli:0.1718,yui:0.368,zui:0.3606,xlf:-0.0258,xlr:-0.3508,xuf:0.0881,xur:-0.1319,ee:0.13,hsp:0.0805,hf:0.1057,xk:0.0086,rimD:0.381,rimW:0.1524,et:0.040,sp:0,tw:0.195,ar:0.50,pk:180000,R:0.274,tmu:0.95,tls:6e-5,tca:0.20,tcg:0.012,tgo:2,inc:11.712479,cadj:0,caster:5.6667,toe:0.15,kt:185000,
          xto:0.1011,yto:0.6567,zto:0.215,xti:0.0242,yti:0.325,zti:0.2001,fMount:0.707,ydm:0.4905,zdm:0.6403,bump:0.082,droop:0.093},
       s:{k:28440,arb:8000,cbl:3430,cbh:1080,vkb:0.1,crl:6080,crh:2600,vkr:0.1}},
      {g:{Ll:0.3937,Lu:0.2127,Lk:0.24,yli:0.2439,zli:0.1864,yui:0.3873,zui:0.3785,xlf:0.0982,xlr:-0.2222,xuf:0.0657,xur:-0.0989,ee:0.132,hsp:0.1074,hf:0.1379,xk:0,rimD:0.381,rimW:0.1524,et:0.040,sp:0,tw:0.195,ar:0.50,pk:180000,R:0.274,tmu:0.95,tls:6e-5,tca:0.20,tcg:0.012,tgo:2,inc:8.046475,cadj:0,caster:0,toe:0.15,kt:185000,
          fMount:0.7897,ydm:0.492,zdm:0.5368,bump:0.080,droop:0.096},
       s:{k:20590,arb:1400,cbl:3430,cbh:2060,vkb:0.1,crl:6080,crh:2600,vkr:0.1}}
    ],
    dh:[0,0,0,0],
    look:0
  };
}
/* Typical grip numbers for three kinds of tire. None of them is measured data. */
const TIRE_PRESETS={street:{tmu:0.95,tls:6e-5,tca:0.20,tcg:0.012,tgo:2},sport:{tmu:1.10,tls:6e-5,tca:0.26,tcg:0.015,tgo:2.5},semi:{tmu:1.30,tls:7e-5,tca:0.32,tcg:0.018,tgo:3}};
function coensCar(){ const P=stockCar(), sf=Math.sqrt(8/2.9), sr=Math.sqrt(6/2.1);
       for(const g of [P.ax[0].g,P.ax[1].g]) Object.assign(g,{rimD:0.381,rimW:0.1778,et:0.035,tw:0.185,ar:0.45,pk:240000,R:0.260,kt:235000},TIRE_PRESETS.sport);
       Object.assign(P.ax[0].g,{Lu:0.2395,cadj:-1.7,caster:3,toe:-0.8782,zti:0.2069,sp:0.030,bump:0.096,droop:0.079});
       Object.assign(P.ax[1].g,{cadj:0.05,toe:0,sp:0.012,bump:0.094,droop:0.082});
       P.ax[0].s.k=78450; P.ax[1].s.k=58840;
       for(const k of ["cbl","cbh","crl","crh"]){P.ax[0].s[k]=Math.round(P.ax[0].s[k]*sf); P.ax[1].s[k]=Math.round(P.ax[1].s[k]*sr);}
       P.dh=[-0.026,-0.026,-0.038,-0.038]; P.look=1; return P; }
const PRESETS={stock:stockCar,coen:coensCar};
function defaults(){return stockCar();}      // the car a new visitor starts with

/* Field specs: [key, label, unit, scale to SI, step, min, max]; min and max are in the displayed unit. */
const GEO=[
  ["Wishbones",[["Ll","Lower arm length","mm",1e-3,5,100,1000],["Lu","Upper arm length","mm",1e-3,5,80,1000],["Lk","Upright length in front view (ball joint to ball joint)","mm",1e-3,5,80,600]]],
  ["Chassis pivots",[["yli","Lower inner pivot, from centerline","mm",1e-3,5,0,800],["zli","Lower inner pivot, above ground","mm",1e-3,5,20,600],["yui","Upper inner pivot, from centerline","mm",1e-3,5,0,900],["zui","Upper inner pivot, above ground","mm",1e-3,5,60,900]]],
  ["Pivots fore-aft / 3D only",[["xlf","Lower arm front pivot, ahead of axle (− = behind)","mm",1e-3,5,-600,600],["xlr","Lower arm rear pivot, ahead of axle (− = behind)","mm",1e-3,5,-600,600],["xuf","Upper arm front pivot, ahead of axle (− = behind)","mm",1e-3,5,-600,600],["xur","Upper arm rear pivot, ahead of axle (− = behind)","mm",1e-3,5,-600,600],["ee","Lower arm outer pivots: rear one this far behind the front one","mm",1e-3,5,20,400]]],
  ["Upright",[["hsp","Spindle height above lower ball joint","mm",1e-3,5,0,500],["hf","Hub face outboard of kingpin","mm",1e-3,5,0,400],["xk","Wheel center ahead of kingpin axis, side view","mm",1e-3,1,-60,60],
              ["inc","Knuckle angle: kingpin inclination + camber","°",1,0.1,-10,40]]],
  ["Wheel",[["rimD","Rim diameter","in",0.0254,1,10,22],["rimW","Rim width","in",0.0254,0.5,4,12],["et","Offset (ET), + = wheel center inboard of hub face","mm",1e-3,1,-60,90],["sp","Wheel spacer, pushes the wheel outboard","mm",1e-3,1,0,100]]],
  ["TIRE",[["tw","Section width","mm",1e-3,5,125,355],["ar","Aspect ratio","%",1e-2,5,25,85],["pk","Pressure","kPa",1e3,5,100,350],["R","Loaded radius","mm",1e-3,5,150,500],["kt","Vertical rate","N/mm",1e3,10,50,1000]]],
  ["GRIP",[["tmu","Peak grip at 2.5 kN of load","",1,0.05,0.3,2.5],["tls","Grip lost per kN of extra load","/kN",1e-3,0.01,0,0.2],["tca","Cornering stiffness, share of load per degree of slip","/°",1,0.01,0.05,0.6],
           ["tcg","Camber thrust, share of load per degree","/°",1,0.001,0,0.06],["tgo","Camber into the turn that gives the most grip","°",1,0.5,0,8]]],
  ["Alignment",[["cadj","Camber adjuster, added to what the arms give","°",1,0.05,-3,1,"slider"],["caster","Caster","°",1,0.5,-5,20],["toe","Static toe per wheel, + = toe-in","°",1,0.05,-5,5]]],
  ["TIE",[["xto","Outer joint, ahead of axle (− = behind)","mm",1e-3,5,-400,400],["yto","Outer joint, from centerline","mm",1e-3,5,100,1100],["zto","Outer joint, above ground","mm",1e-3,5,20,800],["xti","Inner joint, ahead of axle (− = behind)","mm",1e-3,5,-500,500],["yti","Inner joint, from centerline","mm",1e-3,5,0,800],["zti","Inner joint, above ground","mm",1e-3,0.1,20,800]]],
  ["Coilover",[["fMount","Mount on lower arm (fraction from inner pivot)","",1,0.05,0.2,1],["ydm","Top mount, from centerline","mm",1e-3,5,0,900],["zdm","Top mount, above ground","mm",1e-3,5,100,1200]]],
  ["Travel limits",[["bump","Bump travel (to bump stop)","mm",1e-3,5,10,200],["droop","Droop travel (to limit)","mm",1e-3,5,10,200]]]
];
const SPR=[
  ["Rates",[["k","Spring rate","N/mm",1e3,5,5,500],["arb","Anti-roll bar rate at wheel","N/mm",1e3,1,0,200]]],
  ["Damper / bump",[["cbl","Low-speed slope","N·s/m",1,100,0,20000],["cbh","High-speed slope","N·s/m",1,100,0,20000],["vkb","Knee speed","mm/s",1e-3,10,5,1000]]],
  ["Damper / rebound",[["crl","Low-speed slope","N·s/m",1,100,0,20000],["crh","High-speed slope","N·s/m",1,100,0,20000],["vkr","Knee speed","mm/s",1e-3,10,5,1000]]]
];
const VEH=[
  ["Mass",[["M","Sprung mass","kg",1,10,100,5000],["mu","Unsprung mass per corner","kg",1,1,10,150],["Ixx","Roll inertia about the CG (sprung)","kg·m²",1,10,20,3000],["Iyy","Pitch inertia about the CG (sprung)","kg·m²",1,10,100,15000],["Izz","Yaw inertia about the CG (whole car)","kg·m²",1,10,200,15000]]],
  ["Layout",[["L","Wheelbase","mm",1e-3,10,1000,5000],["wf","Front weight share","%",1e-2,0.5,20,80],["h","CG height at design ride height","mm",1e-3,5,100,1500]]]
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
  for(let a=0;a<2;a++){const who=a?"Rear: ":"Front: "; one(P.ax[a].g,a?GEO.filter(([t])=>t!=="TIE"):GEO,who); one(P.ax[a].s,SPR,who);}      // the rear has no tie rod
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

/* ---- front-view four-bar: lower arm at angle a (rad from horizontal, + = outer end up) ---- */
function fv(g,a){
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
function icOf(g,k){return lineInt([g.yli,g.zli],[k.ly,k.lz],[g.yui,g.zui],[k.uy,k.uz]);}

/* ---- tie rod: angle psi about the kingpin axis that keeps |outer - inner| = tie-rod length ---- */
function tieSolve(D,LBJ,ax,p,r){
  const par=vscale(ax,vdot(p,ax)), perp=vsub(p,par), q=vcross(ax,p);
  const d=[LBJ[0]+par[0]-D.TRI[0], LBJ[1]+par[1]-D.TRI[1]-r, LBJ[2]+par[2]-D.TRI[2]];
  const A=vdot(d,d)+vdot(perp,perp)-D.Lt*D.Lt, B=2*vdot(d,perp), C=2*vdot(d,q), rho=Math.hypot(B,C);
  if(rho<1e-12) return null;
  const cc=-A/rho; if(cc>1||cc<-1) return null;
  return [Math.atan2(C,B),Math.acos(cc)];
}

/* ---- design position: the lower-arm angle that puts the tire's lowest point on the ground ---- */
function design(g,name){
  /* The wheel is fixed on the knuckle: its camber is the knuckle's own angle (inc, kingpin inclination + camber, which no setting changes)
     minus the kingpin inclination the arms give, plus the adjuster (cadj, +1 to -3 deg, the one place the wheel may tilt on the knuckle).
     So arm lengths and pivots set the camber, as on the car. beta is the kingpin's lean, + = top outboard, so inclination = -beta. */
  const ka=(g.inc+g.cadj)*D2R, d0=-g.toe*D2R;                     // local steer angle is + outboard, so toe-in is negative
  const spin=c=>[-Math.sin(d0)*Math.cos(c),Math.cos(d0)*Math.cos(c),-Math.sin(c)];   // spindle direction, pointing outboard, for camber c
  /* The hub is fixed on the upright where the fit put the center of the ET40 wheel: hf - 40 mm out from the kingpin axis, square to it.
     Any other offset, and a spacer, slide the wheel along the spindle from there, as on the car. (Before version 40 they slid it
     square to the kingpin, which also lifted it 0.2 mm per mm.) */
  const dsR=g.hf-ET_FIT, dw=ET_FIT-g.et+g.sp;
  const f=a=>{const k=fv(g,a); if(!k) return NaN; const c=ka+k.beta; return k.lz+g.hsp*k.vz-dsR*k.vy-dw*Math.sin(c)-g.R*Math.cos(c);};
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
  const k=fv(g,best), av0=spin(ka+k.beta), tk=Math.tan(g.caster*D2R), xk=g.xk||0;
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
  const q=tieSolve(D,LBJ,axis,p0,0);
  if(!q||q[1]<0.05||q[1]>Math.PI-0.05) throw new Error(name+": the tie rod and steering arm are almost in line at design height, so the steer angle isn't held. Move the tie rod's inner or outer joint.");
  const wrap=x=>x>Math.PI?x-2*Math.PI:(x<=-Math.PI?x+2*Math.PI:x);
  D.br=Math.abs(wrap(q[0]+q[1]))<=Math.abs(wrap(q[0]-q[1]))?1:-1;
  return D;
}

/* ---- full 3D pose of one corner at lower-arm angle al and local rack offset r (+ = inner tie-rod joint moves outboard) ---- */
function pose(g,D,al,r,lock){
  const k=fv(g,al); if(!k) return null;
  const LBJ=[D.xl,k.ly,k.lz], UBJ=[D.xu,k.uy,k.uz], ax=vunit(vsub(UBJ,LBJ));
  const th=D.beta0-k.beta, c=Math.cos(th), s=Math.sin(th);
  const rx=v=>[v[0],v[1]*c-v[2]*s,v[1]*s+v[2]*c];               // front-view lean change is a rotation about x
  const p=rx(D.p0); let psi=0;
  if(!lock){
    const q=tieSolve(D,LBJ,ax,p,r); if(!q) return null;
    psi=q[0]+D.br*q[1]; if(psi>Math.PI)psi-=2*Math.PI; else if(psi<=-Math.PI)psi+=2*Math.PI;
  }
  const WC=vadd(LBJ,vrot(rx(D.w0),ax,psi)), av=vrot(rx(D.av0),ax,psi), TRO=vadd(LBJ,vrot(p,ax,psi));
  const cg=Math.sqrt(1-av[2]*av[2]), up=[-av[2]*av[0]/cg,-av[2]*av[1]/cg,cg];     // in-plane "up" of the wheel
  const CP=[WC[0]-g.R*up[0],WC[1]-g.R*up[1],WC[2]-g.R*up[2]];                     // lowest point of the tire circle
  const dm=[0,g.yli+g.fMount*g.Ll*Math.cos(al),g.zli+g.fMount*g.Ll*Math.sin(al)];
  return {al,k,LBJ,UBJ,ax,WC,av,TRO,TRI:[D.TRI[0],D.TRI[1]+r,D.TRI[2]],CP,dm,psi,S:vadd(LBJ,vscale(ax,D.sl)),
          cam:Math.asin(-av[2]),steer:Math.atan2(-av[0],av[1]),L:Math.hypot(dm[1]-g.ydm,dm[2]-g.zdm)};
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
           al:new Float64Array(N),sa:new Float64Array(N),rch:new Float64Array(ns),dtr:new Float64Array(ns)};
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
      T.L[o]=p.L; T.cam[o]=p.cam/D2R; T.steer[o]=p.steer/D2R; T.al[o]=al; T.sa[o]=armTravel(al);
    }
  }
  if(bind<Infinity) throw new Error(name+": the steering binds at "+Math.round(bind*1000)+" mm of rack travel (the tie rod runs out of reach somewhere in the suspension travel). Reduce rack travel each way, or lengthen the steering arm or tie rod.");
  for(let j=0;j<nr;j++) for(let q=0;q<ns;q++){const a=Math.max(0,q-1), b=Math.min(ns-1,q+1); T.MR[j*ns+q]=-(T.L[j*ns+b]-T.L[j*ns+a])/((b-a)*dS);}
  const P0=pose(g,D,D.a0,0);
  for(let q=0;q<ns;q++){
    const p=pose(g,D,T.al[j0*ns+q],0), ic=icOf(g,p.k), cy=p.CP[1], cz=p.CP[2]; let zr;
    if(ic&&Math.abs(ic[0]-cy)>1e-9) zr=cz+(ic[1]-cz)*(0-cy)/(ic[0]-cy);
    else {const dy=p.k.uy-g.yui, dz=p.k.uz-g.zui; zr=cz+(dz/dy)*(0-cy);}
    T.rch[q]=zr-cz; T.dtr[q]=cy-P0.CP[1];
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

/* A setup saved before version 41 carries a free camber field (cam0) instead of the adjuster. Give it the adjuster that reproduces that
   camber on its own arms, limited to the adjuster's range. Returns the axles whose camber had to be limited. */
function fromOldCamber(P,src){
  const cut=[];
  for(let a=0;a<2;a++){const o=src&&src.ax&&src.ax[a]&&src.ax[a].g; if(!o||typeof o.cam0!=="number"||typeof o.cadj==="number") continue;
    const g=P.ax[a].g; g.cadj=0;
    for(let it=0;it<4;it++){let D; try{D=design(g,a?"Rear":"Front");}catch(e){break;} g.cadj=o.cam0-(g.inc+D.beta0/D2R);}
    const lim=Math.max(-3,Math.min(1,g.cadj)); if(Math.abs(lim-g.cadj)>1e-6) cut.push(a?"rear":"front"); g.cadj=+lim.toFixed(4);}
  return cut;
}

/* Front geometry as built: with cut knuckles on, the steering arm is shorter by steer.cutL. */
function frontG(P){return P.steer.cut?Object.assign({},P.ax[0].g,{cutL:P.steer.cutL}):P.ax[0].g;}

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
    const pr=pose(ax?g:frontG(P),T.D,lk2(T,T.al,st,0),0)||T.P0, tk=(pr.CP[2]-pr.LBJ[2])/(pr.UBJ[2]-pr.LBJ[2]);      // the corner at ride height, and where its kingpin axis meets the ground
    r.ax.push({MR,kw,kr,fr,zb:s.cbl*MR*MR/cc,zr:s.crl*MR*MR/cc,rch,t,Kax,Kt,Mg,cam:lk2(T,T.cam,st,0),toe:-lk2(T,T.steer,st,0),
      camGain:(lk2(T,T.cam,st+e,0)-lk2(T,T.cam,st-e,0))/(2*e)*0.01, bumpSteer:-(lk2(T,T.steer,st+e,0)-lk2(T,T.steer,st-e,0))/(2*e)*0.01,
      kpi:Math.atan2(pr.LBJ[1]-pr.UBJ[1],pr.UBJ[2]-pr.LBJ[2])/D2R,caster:g.caster,scrub:pr.CP[1]-(pr.LBJ[1]+tk*(pr.UBJ[1]-pr.LBJ[1])),trail:pr.LBJ[0]+tk*(pr.UBJ[0]-pr.LBJ[0])-pr.CP[0]});
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
