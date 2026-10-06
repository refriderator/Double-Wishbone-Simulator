/* Physics core of the Double Wishbone Simulator.

   Units: SI (m, kg, N, s, rad) in the linkage and the equations of motion. In degrees: the angle fields of a setup, the cam, steer
   and cas tables, the setup sheet's angles, and the tire model's slip and lean. inp.ay and inp.ax are in g.
   Corner frame: x forward, y outboard, z up. Origin on the ground under the axle line at design height.
   Vehicle frame: x forward, y right, z up. Corners FL, FR, RL, RR; side = -1 left, +1 right.
   Signs: roll + = right side up, pitch + = nose up, lateral g + = right turn, rack + = toward the right, steer + = right.

   Sections
     1  Fields            every input: key, label, unit, range
     2  Vectors
     3  Linkage           one corner in 3D: two arms, the knuckle, the tie rod
     4  Tables            the linkage over wheel travel and rack travel
     5  Tires             size, side force
     6  Car model         static loads, equations of motion
     7  Steady cornering  grip in use, limits, steering geometry
     8  Setup sheet
     9  Solver
    10  Cars              Stock and Coen's
    11  Older setups      reads setups saved in the front-view fields */
const G=9.81, D2R=Math.PI/180;
const ET_FIT=0.040;      // m. The hub angle's pivot sits this far inboard of the wheel mounting face.


/* ===== 1. Fields =====
   One row per input: [key, label, unit, factor from the shown unit to the stored one, step, min, max, kind]. Lengths, rates and
   masses are stored in SI, angles in degrees. min and max are in the shown unit; kind is "slider" or absent.
   UARM, LARM: the eight fields of an arm, with the key prefix u or l.
   KNUCKLE: in the knuckle's own frame. "Up the kingpin" runs from the lower ball joint to the upper; "outboard" is the way the
   spindle points, square to the kingpin; "ahead" is square to both. */
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
  ["Alignment",[["cadj","Hub angle on knuckle","°",1,0.05,-3,1,"slider"],["toe","Static toe per wheel, + = toe-in","°",1,0.05,-5,5]]],
  ["TIE",[["xti","Inner joint, ahead of axle (− = behind)","mm",1e-3,5,-500,500],["yti","Inner joint, from centerline","mm",1e-3,5,0,800],["zti","Inner joint, above ground","mm",1e-3,0.1,20,800]]],
  ["Coilover",[["fMount","Mount on lower arm (fraction from inner pivot)","",1,0.05,0.2,1],["ydm","Top mount, from centerline","mm",1e-3,5,0,900],["zdm","Top mount, above ground","mm",1e-3,5,100,1200]]],
  ["Travel limits",[["bump","Bump travel (to bump stop)","mm",1e-3,5,10,200],["droop","Droop travel (to limit)","mm",1e-3,5,10,200]]]
];
/* The rear has no tie rod and no axis angles: its lower arm holds the toe at a second outer pivot (ee). */
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
/* Throws with a readable message if any field is outside its range. */
function check(P){
  const one=(obj,groups,who)=>{for(const [,fs] of groups) for(const [k,lab,u,sc,,mn,mx] of fs){
    const x=obj[k]/sc; if(!(Number.isFinite(x)&&x>=mn-1e-9&&x<=mx+1e-9)) throw new Error(who+lab+" must be between "+mn+" and "+mx+(u?" "+u:"")+".");}};
  one(P.veh,VEH,""); one(P.steer,STEER,"");
  for(let a=0;a<2;a++){const who=a?"Rear: ":"Front: "; one(P.ax[a].g,geoOf(a),who); one(P.ax[a].s,SPR,who);}
  for(const d of P.dh) if(!Number.isFinite(d)) throw new Error("Ride-height targets must be numbers.");
}


/* ===== 2. Vectors ===== */
const vsub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], vadd=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], vscale=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const vdot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], vlen=a=>Math.hypot(a[0],a[1],a[2]);
const vcross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const vunit=a=>{const l=vlen(a);return [a[0]/l,a[1]/l,a[2]/l];};
const vlin=(a,ka,b,kb,c,kc)=>[a[0]*ka+b[0]*kb+c[0]*kc,a[1]*ka+b[1]*kb+c[1]*kc,a[2]*ka+b[2]*kb+c[2]*kc];
const wrapA=x=>x>Math.PI?x-2*Math.PI:(x<=-Math.PI?x+2*Math.PI:x);
/* Solves B cos x + C sin x = A. Returns [middle, half-spread] (x = middle ± spread), or null if there is no solution. */
function trigSolve(A,B,C){const rho=Math.hypot(B,C); if(rho<1e-14) return null; const c=A/rho; if(c>1||c<-1) return null; return [Math.atan2(C,B),Math.acos(c)];}
/* Where two lines cross in a plane, each given by two points [y, z]. Null if parallel. */
function lineInt(p1,p2,p3,p4){
  const d1y=p2[0]-p1[0],d1z=p2[1]-p1[1],d2y=p4[0]-p3[0],d2z=p4[1]-p3[1],den=d1y*d2z-d1z*d2y;
  if(Math.abs(den)<1e-12) return null;
  const t=((p3[0]-p1[0])*d2z-(p3[1]-p1[1])*d2y)/den;
  return [p1[0]+t*d1y,p1[1]+t*d1z];
}


/* ===== 3. Linkage =====
   Each arm swings about its own pivot axis, so its ball joint rides a circle around that axis. The knuckle is rigid: ball-joint
   spacing, spindle angle, wheel mounting face and tie rod end are fixed in its own frame.
   A pose is solved in closed form: lower-arm angle -> lower ball joint; the upper ball joint is where its circle meets the sphere
   the knuckle allows; the turn about the kingpin comes from the tie rod's length.
   Rear: no tie rod. The lower arm's rear leg (rear inner pivot to the second outer pivot ee) takes the tie rod's place. */

/* One arm from its fields. k: "l" or "u".
   xm, ym, zm: midpoint of the two inner pivots. sv, pv: axis angle in side view (+ = front pivot higher) and top view (+ = front
   pivot further out), deg. w: pivot spacing. R: reach, axis to ball joint. t: ball joint ahead of the midpoint, along the axis.
   Returns the axis direction u, midpoint M, e1 (outboard, square to u), e2 (up), the ball joint's foot on the axis C, and the
   front and rear pivots F and B. */
function armOf(g,k){
  const u=vunit([1,Math.tan((g[k+"pv"]||0)*D2R),Math.tan((g[k+"sv"]||0)*D2R)]), M=[g[k+"xm"],g[k+"ym"],g[k+"zm"]], w=g[k+"w"];
  const e1=vunit(vsub([0,1,0],vscale(u,u[1]))), e2=vcross(u,e1);
  return {u,M,e1,e2,R:g[k+"R"],C:vadd(M,vscale(u,g[k+"t"])),F:vadd(M,vscale(u,w/2)),B:vadd(M,vscale(u,-w/2))};
}
/* Leg lengths (front pivot to ball joint, rear pivot to ball joint), and back to reach and position. Null if the legs can't meet. */
function legsOf(g,k){const w=g[k+"w"], R=g[k+"R"], t=g[k+"t"]; return {Lf:Math.hypot(R,w/2-t),Lr:Math.hypot(R,w/2+t)};}
function fromLegs(g,k,Lf,Lr){const w=g[k+"w"], t=(Lr*Lr-Lf*Lf)/(2*w), R2=Lf*Lf-(w/2-t)*(w/2-t); return R2>1e-8?{t,R:Math.sqrt(R2)}:null;}
/* Applies axis fields (vals) to arm k and re-measures R and t so the ball joint stays at bj. */
function reseat(g,k,vals,bj){Object.assign(g,vals); const A=armOf(g,k), d=vsub(bj,A.M), t=vdot(d,A.u); g[k+"t"]=t; g[k+"R"]=vlen(vsub(d,vscale(A.u,t))); return g;}

/* The knuckle at lower-arm angle al (rad, + = ball joint up). Its turn about the kingpin comes from
     mode 0: the tie rod, with the rack's inner joint moved outboard by val;
     mode 1: the wheel's heading (steer angle val).
   Returns the ball joints, the knuckle frame (k up the kingpin, o outboard, f forward), the spindle direction av, the wheel
   center WC and the tie rod end TRO. Null if the parts can't reach. */
function poseK(D,al,mode,val){
  const lo=D.lo, up=D.up, LBJ=vlin(lo.C,1,lo.e1,lo.R*Math.cos(al),lo.e2,lo.R*Math.sin(al));
  const d=vsub(up.C,LBJ), q=trigSolve((D.Lk*D.Lk-vdot(d,d)-up.R*up.R)/(2*up.R),vdot(d,up.e1),vdot(d,up.e2)); if(!q) return null;
  const ua=q[0]+q[1], ub=q[0]-q[1];
  let UBJ=vlin(up.C,1,up.e1,up.R*Math.cos(ua),up.e2,up.R*Math.sin(ua)); const U2=vlin(up.C,1,up.e1,up.R*Math.cos(ub),up.e2,up.R*Math.sin(ub));
  if(U2[2]>UBJ[2]) UBJ=U2;      // of the two ways to assemble, the one with the upper joint on top
  const k=vunit(vsub(UBJ,LBJ)); if(!(k[2]>1e-3)) return null;
  const o0=vunit([-k[1]*k[0],1-k[1]*k[1],-k[1]*k[2]]), f0=vcross(o0,k);      // frame on the kingpin before the turn psi
  let psi, spread=0;
  if(mode===1){
    const c0=Math.cos(val), s0=Math.sin(val), nb=D.nb, hd=v=>v[0]*c0+v[1]*s0;      // the spindle's horizontal part must point along val
    const s=trigSolve(-nb[0]*hd(k),hd(vlin(o0,nb[1],f0,nb[2],k,0)),hd(vlin(o0,nb[2],f0,-nb[1],k,0))); if(!s) return null;
    const a=wrapA(s[0]+s[1]), b=wrapA(s[0]-s[1]); psi=Math.abs(a)<=Math.abs(b)?a:b;
  } else {
    const pt=D.pt, e=[LBJ[0]+k[0]*pt[0]-D.TRI[0],LBJ[1]+k[1]*pt[0]-D.TRI[1]-val,LBJ[2]+k[2]*pt[0]-D.TRI[2]];
    const a=vlin(f0,pt[2],o0,pt[1],k,0), b=vlin(o0,pt[2],f0,-pt[1],k,0), s=trigSolve(D.Lt*D.Lt-vdot(e,e)-pt[1]*pt[1]-pt[2]*pt[2],2*vdot(e,a),2*vdot(e,b)); if(!s) return null;
    psi=wrapA(s[0]+D.br*s[1]); spread=s[1];
  }
  const c=Math.cos(psi), s=Math.sin(psi), f=vlin(f0,c,o0,s,k,0), o=vlin(o0,c,f0,-s,k,0);
  return {LBJ,UBJ,k,o,f,av:vlin(k,D.nb[0],o,D.nb[1],f,D.nb[2]),WC:vadd(LBJ,vlin(k,D.wc[0],o,D.wc[1],f,D.wc[2])),TRO:vadd(LBJ,vlin(k,D.pt[0],o,D.pt[1],f,D.pt[2])),psi,spread};
}

/* Design position: the lower-arm angle that puts the tire on the ground with the static toe. The tie rod takes whatever length
   that needs. The wheel center sits the offset inboard of the mounting face, a spacer outboard of that. The hub angle (cadj)
   tips the spindle on the knuckle by its value at this position, about a pivot ET_FIT inboard of the face. */
function design(g,name){
  const rear=name==="Rear", lo=armOf(g,"l"), up=armOf(g,"u"), a0=g.kinc*D2R, dw=ET_FIT-g.et+g.sp, d0=-g.toe*D2R, cadj=g.cadj*D2R;
  if(Math.abs(lo.u[0])<0.2||Math.abs(up.u[0])<0.2) throw new Error(name+": a pivot axis is angled too far from the car's centerline.");
  const hub=[g.kwk+ET_FIT*Math.sin(a0),g.kwo-ET_FIT*Math.cos(a0),g.kwf];      // the hub angle's pivot, in the knuckle frame [k, o, f]
  const D={lo,up,Lk:g.kLk,nb:[-Math.sin(a0),Math.cos(a0),0],d0,Rt:g.R,pt:[0,0,0],TRI:[0,0,0],Lt:0,br:1,arm:0,
           wc:hub.slice(),sk:hub[0],fm:g.fMount,As:vadd(lo.M,vscale(lo.u,-lo.M[0]/lo.u[0])),top:[0,g.ydm,g.zdm]};
  /* the spindle with the hub angle applied, for the knuckle at p */
  const adj=p=>{const c=Math.asin(-p.av[2])+cadj; return [-Math.sin(d0)*Math.cos(c),Math.cos(d0)*Math.cos(c),-Math.sin(c)];};
  const f=a=>{const p=poseK(D,a,1,d0); if(!p) return NaN; const n=adj(p); return p.WC[2]+dw*n[2]-D.Rt*Math.sqrt(1-n[2]*n[2]);};      // height of the tire's lowest point: zero at design height
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
  D.nb=[vdot(n,p0.k),vdot(n,p0.o),vdot(n,p0.f)]; D.wc=[hub[0]+dw*D.nb[0],hub[1]+dw*D.nb[1],hub[2]+dw*D.nb[2]];      // the tipped spindle is now part of the knuckle
  if(rear){const t=vscale(lo.u,-g.ee); D.pt=[vdot(t,p0.k),vdot(t,p0.o),vdot(t,p0.f)]; D.TRI=lo.B.slice();}      // rear: the lower arm's rear leg is the toe link
  else {
    let po=g.kpo, pf=g.kpf;
    if(g.cutL>0){const a=Math.hypot(po,pf); if(a>1e-6){const s=Math.max(a-g.cutL,0)/a; po*=s; pf*=s;}}      // cut knuckle: the tie rod end moves straight toward the kingpin
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

/* One corner at lower-arm angle al and rack offset r (+ = inner joint moves outboard). lock: hold the wheel at its design
   heading instead of using the tie rod.
   Adds to poseK: ax (unit vector up the kingpin), S (spindle root on the kingpin), CP (contact patch), dm (coilover mount on the
   lower arm), L (coilover length), cam, steer. */
function pose(D,al,r,lock){
  const p=lock?poseK(D,al,1,D.d0):poseK(D,al,0,r); if(!p) return null;
  const av=p.av, cg=Math.sqrt(1-av[2]*av[2]), CP=[p.WC[0]+D.Rt*av[2]*av[0]/cg,p.WC[1]+D.Rt*av[2]*av[1]/cg,p.WC[2]-D.Rt*cg];      // lowest point of the tire
  const fm=D.fm*D.lo.R, dm=vlin(D.As,1,D.lo.e1,fm*Math.cos(al),D.lo.e2,fm*Math.sin(al));
  return {al,LBJ:p.LBJ,UBJ:p.UBJ,ax:p.k,o:p.o,f:p.f,WC:p.WC,av,TRO:p.TRO,TRI:[D.TRI[0],D.TRI[1]+r,D.TRI[2]],CP,dm,S:vadd(p.LBJ,vscale(p.k,D.sk)),
          cam:Math.asin(-av[2]),steer:Math.atan2(-av[0],av[1]),L:vlen(vsub(dm,D.top))};
}

/* How the knuckle moves at pose p, per unit of lower-arm angle, with the wheel's heading held. v: velocity of the knuckle point
   at the contact patch. From it:
     rch   roll center height for equal travel on both sides
     hu    the same for the unsprung mass: the height at which the links carry its side force
     side  forward travel of the contact patch per unit of bump (anti-dive)
     ic    front-view instant center [y, z], null when the knuckle does not turn in front view (parallel arms) */
function instant(D,p,r){
  const h=1e-5, A=poseK(D,p.al+h,0,r), B=poseK(D,p.al-h,0,r); if(!A||!B) return null;
  const d=(a,b)=>[(a[0]-b[0])/(2*h),(a[1]-b[1])/(2*h),(a[2]-b[2])/(2*h)];
  let w=vscale(vadd(vadd(vcross(p.f,d(A.f,B.f)),vcross(p.o,d(A.o,B.o))),vcross(p.ax,d(A.k,B.k))),0.5);      // angular velocity from the frame's rate of change
  const hd=x=>{const c=vcross(x,p.av); return p.av[0]*c[1]-p.av[1]*c[0];};      // how fast a rotation x turns the spindle's heading
  w=vadd(w,vscale(p.ax,-hd(w)/hd(p.ax)));      // take out the turn about the kingpin that would steer the wheel
  const v=vadd(d(A.LBJ,B.LBJ),vcross(w,vsub(p.CP,p.LBJ)));
  if(!(Math.abs(v[2])>1e-9)) return null;
  const up=vsub(p.WC,p.CP), hu=-(w[2]*up[0]-w[0]*up[2])/v[2]*p.CP[1];
  return {v,rch:v[1]/v[2]*p.CP[1],hu,side:v[0]/v[2],ic:Math.abs(w[0])>1e-7?[p.CP[1]-v[2]/w[0],p.CP[2]+v[1]/w[0]]:null};
}

/* Caster follows from where the ball joints sit along their arms. setCaster slides both along their axes until the kingpin
   leans by deg at design height, keeping the wheel mounting face where it is fore-aft. Returns {lt, ut}; throws if out of reach. */
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

/* The front axle's geometry as built: cut knuckles shorten the steering arm by steer.cutL. */
function frontG(P){return P.steer.cut?Object.assign({},P.ax[0].g,{cutL:P.steer.cutL}):P.ax[0].g;}

/* Rack height (zti) with the least toe change over the wheel travel. */
function bestTieHeight(g,name){
  const D0=design(g,name);
  const find=target=>{let lo=D0.a0-0.9, hi=D0.a0+0.9; for(let i=0;i<60;i++){const mid=(lo+hi)/2, p=pose(D0,mid,0,true); if(!p){if(mid<D0.a0)lo=mid; else hi=mid; continue;} if(p.CP[2]<target)lo=mid; else hi=mid;} return (lo+hi)/2;};
  const aLo=find(-g.droop), aHi=find(g.bump), n=17;
  const cost=z=>{let D; const g2=Object.assign({},g,{zti:z}); try{D=design(g2,name);}catch(e){return 1e9;}
    const p0=pose(D,D.a0,0); if(!p0) return 1e9; let c=0;
    for(let i=0;i<n;i++){const p=pose(D,aLo+(aHi-aLo)*i/(n-1),0); if(!p) return 1e9; const d=p.steer-p0.steer; c+=d*d;} return c;};
  let bz=g.zti, bc=cost(g.zti);
  for(let i=0;i<=120;i++){const z=0.02+0.78*i/120, c=cost(z); if(c<bc){bc=c;bz=z;}}
  let lo=Math.max(0.02,bz-0.0065), hi=Math.min(0.8,bz+0.0065); const gr=(Math.sqrt(5)-1)/2;
  for(let i=0;i<40;i++){const x1=hi-gr*(hi-lo), x2=lo+gr*(hi-lo); if(cost(x1)<cost(x2))hi=x2; else lo=x1;}
  const z=(lo+hi)/2; return cost(z)<bc?z:bz;
}


/* ===== 4. Tables =====
   Each axle's linkage, tabulated over wheel travel s (contact patch height against the body, + = bump) and rack offset r.
   The simulation reads these instead of solving the linkage every step. */
function buildAxle(g,name,rmax){
  const D=design(g,name);
  const margin=0.03, sLo=-(g.droop+margin), sHi=g.bump+margin, ext=0.05, da=0.004;
  let nUp=0, nDn=0, sp=0;
  while(nUp<350){const p=pose(D,D.a0+(nUp+1)*da,0); if(!p||p.CP[2]<=sp) break; sp=p.CP[2]; nUp++; if(sp>sHi+ext) break;}
  const sTop=sp; sp=0;
  while(nDn<350){const p=pose(D,D.a0-(nDn+1)*da,0); if(!p||p.CP[2]>=sp) break; sp=p.CP[2]; nDn++; if(sp<sLo-ext) break;}
  const sBot=sp;
  if(sBot>sLo) throw new Error(name+": the linkage or tie rod runs out of reach before full droop ("+Math.round(-sBot*1000)+" mm available, "+Math.round(-sLo*1000)+" mm needed including a 30 mm margin). Reduce droop travel or change the geometry.");
  if(sTop<sHi) throw new Error(name+": the linkage or tie rod runs out of reach before full bump ("+Math.round(sTop*1000)+" mm available, "+Math.round(sHi*1000)+" mm needed including a 30 mm margin). Reduce bump travel or change the geometry.");
  const NA=nUp+nDn+1, aG=new Float64Array(NA), s0=new Float64Array(NA);
  for(let i=0;i<NA;i++){aG[i]=D.a0+(i-nDn)*da; s0[i]=pose(D,aG[i],0).CP[2];}
  const armTravel=al=>{let x=(al-aG[0])/da; if(x<0)x=0; else if(x>NA-1)x=NA-1; let i=x|0; if(i>NA-2)i=NA-2; return s0[i]+(s0[i+1]-s0[i])*(x-i);};
  const nr=rmax>0?41:1, ns=241, dS=(sHi-sLo)/(ns-1), rLo=-rmax, dR=nr>1?2*rmax/(nr-1):1, j0=(nr-1)/2, N=nr*ns;
  const T={D,nr,ns,sLo,sHi,dS,rLo,dR,L:new Float64Array(N),MR:new Float64Array(N),cam:new Float64Array(N),steer:new Float64Array(N),
           al:new Float64Array(N),sa:new Float64Array(N),cas:new Float64Array(N),rch:new Float64Array(ns),hu:new Float64Array(ns),dtr:new Float64Array(ns)};
  const sj=new Float64Array(NA); let bind=Infinity;
  for(let j=0;j<nr;j++){
    const r=nr>1?rLo+j*dR:0;
    for(let i=0;i<NA;i++){const p=pose(D,aG[i],r); sj[i]=p?p.CP[2]:NaN;}
    let lo=nDn, hi=nDn;
    if(sj[nDn]===sj[nDn]){while(lo>0&&sj[lo-1]<sj[lo])lo--; while(hi<NA-1&&sj[hi+1]>sj[hi])hi++;}
    if(hi-lo<1||sj[lo]>-g.droop||sj[hi]<g.bump){bind=Math.min(bind,Math.abs(r)); continue;}
    let i=lo;
    for(let q=0;q<ns;q++){
      const sc=Math.min(sj[hi],Math.max(sj[lo],sLo+q*dS));
      while(i<hi-1&&sj[i+1]<sc) i++;
      const sl=(sj[i+1]-sj[i])/da; let al=aG[i]+(sc-sj[i])/sl, p=pose(D,al,r);
      if(p){const al2=al+(sc-p.CP[2])/sl, p2=pose(D,al2,r); if(p2){al=al2;p=p2;}} else {al=aG[i]; p=pose(D,al,r);}
      const o=j*ns+q;
      T.L[o]=p.L; T.cam[o]=p.cam/D2R; T.steer[o]=p.steer/D2R; T.al[o]=al; T.sa[o]=armTravel(al); T.cas[o]=Math.atan2(-p.ax[0],p.ax[2])/D2R;
    }
  }
  if(bind<Infinity) throw new Error(name+": the steering binds at "+Math.round(bind*1000)+" mm of rack travel (the tie rod runs out of reach somewhere in the suspension travel). Reduce rack travel each way, or lengthen the steering arm or tie rod.");
  for(let j=0;j<nr;j++) for(let q=0;q<ns;q++){const a=Math.max(0,q-1), b=Math.min(ns-1,q+1); T.MR[j*ns+q]=-(T.L[j*ns+b]-T.L[j*ns+a])/((b-a)*dS);}
  const P0=pose(D,D.a0,0);
  for(let q=0;q<ns;q++){
    const p=pose(D,T.al[j0*ns+q],0), I=instant(D,p,0);
    T.rch[q]=I?I.rch:0; T.hu[q]=I?I.hu:0; T.dtr[q]=p.CP[1]-P0.CP[1];
  }
  T.P0=P0; T.tHalf=P0.CP[1]; T.L0=P0.L; T.MR0=lk2(T,T.MR,0,0);
  const t=-P0.LBJ[2]/(P0.UBJ[2]-P0.LBJ[2]);
  T.kp=[P0.LBJ[0]+t*(P0.UBJ[0]-P0.LBJ[0]),P0.LBJ[1]+t*(P0.UBJ[1]-P0.LBJ[1])];      // where the kingpin axis meets the ground
  T.sgn=nr>1?(lk2(T,T.steer,0,dR)>=lk2(T,T.steer,0,0)?1:-1):1;      // +1 if moving the rack right steers right
  if(T.MR0<0.05) throw new Error(name+": the coilover barely moves with the wheel (motion ratio "+T.MR0.toFixed(3)+"). Move its mount further out on the arm or align it with wheel travel.");
  if(T.tHalf<=0.05) throw new Error(name+": the contact patch ends up at or past the centerline.");
  return T;
}
/* Bilinear lookup. cell() finds the cell once; cv() then reads any table at it. lk2: one table at (s, r). lk1: a travel-only table. */
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

const kinCache=[null,null], NOT_KIN=["rimD","rimW","tw","ar","pk","kt","tmu","tls","tca","tcg","tgo"];      // fields the linkage does not use
function tables(g,name,rmax,slot){
  const key=JSON.stringify(g,(k,v)=>NOT_KIN.includes(k)?undefined:v)+"|"+rmax, c=kinCache[slot];
  if(c&&c.key===key) return c.T;
  const T=buildAxle(g,name,rmax); kinCache[slot]={key,T}; return T;
}


/* ===== 5. Tires ===== */
/* Typical grip numbers for three kinds of tire. */
const TIRE_PRESETS={street:{tmu:0.95,tls:6e-5,tca:0.20,tcg:0.012,tgo:2},sport:{tmu:1.10,tls:6e-5,tca:0.26,tcg:0.015,tgo:2.5},semi:{tmu:1.30,tls:7e-5,tca:0.32,tcg:0.018,tgo:3}};

/* Free radius, vertical rate and loaded radius from size and pressure, for one axle. The rate is Rhyne's empirical formula for
   radial tires. */
function tireFromSize(P,ax){
  const g=P.ax[ax].g, v=P.veh, SN=g.tw*1000, AR=g.ar*100, OD=2*SN*AR/100+g.rimD*1000;      // mm
  const kt=(0.00028*(g.pk/1000)*Math.sqrt((1.03-0.004*AR)*SN*OD)+3.45)*9.80665*1000;      // N/m
  const load=(v.M*(ax===0?v.wf:1-v.wf)/2+v.mu)*G;
  return {free:OD/2000,kt,R:OD/2000-load/kt};
}

/* Side force: a Magic Formula curve. slip and lean in deg; + slip and + lean (top toward the car's right) both push the tire right.
   Peak grip falls with load (tls) and peaks at tgo of camber into the turn. Cornering stiffness rises with load up to three
   times TREF and falls beyond. Camber thrust shifts the curve sideways.
   TREF: reference load (N). TSHAPE, TCURV: curve shape. TRELAX: relaxation length (m). */
const TREF=2500, TSHAPE=1.4, TCURV=-0.6, TRELAX=0.35;
function tirePeak(g,Fz,gin){
  if(!(Fz>0)) return 0;
  const mu=Math.max(0.3*g.tmu,g.tmu-g.tls*(Fz-TREF));
  const f=g.tgo>0?1+g.tcg/g.tmu*(gin-gin*gin/(2*g.tgo)):1;
  return Math.max(0.5,f)*mu*Fz;
}
function tireFy(g,slip,Fz,lean){
  if(!(Fz>0)) return 0;
  const Ca=g.tca*TREF/0.6*Math.sin(2*Math.atan(Fz/(3*TREF)));      // N/deg
  const x=slip+g.tcg*Fz/Ca*lean, D=tirePeak(g,Fz,x>=0?lean:-lean), bx=Ca/(TSHAPE*D)*x;
  return D*Math.sin(TSHAPE*Math.atan(bx-TCURV*(bx-Math.atan(bx))));
}


/* ===== 6. Car model =====
   Nine degrees of freedom: body heave, pitch and roll, four wheel hops, and sideways slide and yaw while driven. */

/* Tables, static corner loads and the spring preloads that hold the target ride heights. */
function makeModel(P){
  check(P);
  const T=[tables(frontG(P),"Front",P.steer.rmax,0),tables(P.ax[1].g,"Rear",0,1)];
  const v=P.veh, a=v.L*(1-v.wf), b=v.L*v.wf;
  const m={P,T,a,b,xs:[a,a,-b,-b],ys:[-T[0].tHalf,T[0].tHalf,-T[1].tHalf,T[1].tHalf],W:[],d0:[],Fpre:[],FpreDesign:[],st:[],zt:[],arbOff:[0,0],zs:0,
           xc:2*v.mu*(a-b)/(v.M+4*v.mu),      // whole-car CG ahead of the sprung CG: the unsprung masses sit at the axles
           Rm:v.wf*P.ax[0].g.R+(1-v.wf)*P.ax[1].g.R};      // mean wheel-center height, weighted by the sprung weight on each axle
  const yF=T[0].tHalf, yR=T[1].tHalf, zt=m.zt;
  for(let i=0;i<4;i++){const g=P.ax[i<2?0:1].g; zt[i]=Math.min(g.droop-0.002,Math.max(-(g.bump-0.002),P.dh[i]));}      // target height per corner, kept 2 mm inside the travel limits
  /* Body attitude at the targets (best-fit plane). A tilted body carries its CG off-center, which shifts the corner loads. */
  const zF=(zt[0]+zt[1])/2, zR=(zt[2]+zt[3])/2, th=(zF-zR)/v.L, ph=(yF*(zt[1]-zt[0])+yR*(zt[3]-zt[2]))/(2*(yF*yF+yR*yR));
  m.zs=(zF*b+zR*a)/v.L;
  const hcg=v.h+m.zs, hra=lk1(T[0],T[0].rch,-zF)*v.wf+lk1(T[1],T[1].rch,-zR)*(1-v.wf), ycg=-(hcg-hra)*ph;
  const WF=v.M*G*(v.wf-(hcg-m.Rm)*th/v.L), WR=v.M*G-WF;      // rake turns the body about the wheel centers: the CG shifts by (h - R) * pitch
  for(let i=0;i<4;i++){
    const ax=i<2?0:1, g=P.ax[ax].g, s=P.ax[ax].s, Tx=T[ax], side=i%2===0?-1:1;
    const Wn=v.M*G*(ax===0?v.wf:1-v.wf)/2, W=(ax===0?WF:WR)*(0.5+side*ycg/(2*(ax===0?yF:yR)));
    const st=(Wn-W)/g.kt-zt[i];      // wheel travel at the target, with the change in tire deflection
    m.W[i]=Wn; m.d0[i]=(Wn+v.mu*G)/g.kt; m.st[i]=st;
    m.Fpre[i]=W/lk2(Tx,Tx.MR,st,0)-s.k*(Tx.L0-lk2(Tx,Tx.L,st,0));
    m.FpreDesign[i]=Wn/Tx.MR0;
  }
  m.arbOff=[m.st[0]-m.st[1],m.st[2]-m.st[3]];
  return m;
}
function newState(){return {t:0,z:0,zd:0,th:0,thd:0,ph:0,phd:0,zw:[0,0,0,0],zwd:[0,0,0,0],vy:0,r:0,ay:0,al:[0,0,0,0],spun:false,ev:[],out:[{},{},{},{}],hrc:[0,0]};}

/* Damper force at shaft speed v (+ = bump): two slopes joined at the knee, per direction. */
function damperF(s,v){
  if(v>=0) return v<=s.vkb?s.cbl*v:s.cbl*s.vkb+s.cbh*(v-s.vkb);
  const u=-v; return -(u<=s.vkr?s.crl*u:s.crl*s.vkr+s.crh*(u-s.vkr));
}
/* Road height and its rate under wheel i: the sum of the bumps passing now, each 1 - cos shaped. */
function groundAt(st,i){
  let z=0, zd=0;
  for(const e of st.ev){if(e.i!==i) continue; const tau=(st.t-e.t0)/e.dur; if(tau<0||tau>1) continue;
    z+=e.h*(1-Math.cos(2*Math.PI*tau))/2; zd+=e.h*Math.PI*Math.sin(2*Math.PI*tau)/e.dur;}
  return [z,zd];
}
/* CT: tire damping (N s/m). KBS, KBS2, CBS: bump stop rate, its progression and damping. KTOP: droop stop rate. DT: time step (s). */
const CT=300, KBS=200000, KBS2=2e7, CBS=1500, KTOP=800000, DT=1/4000;
const _s=[0,0,0,0], _sd=[0,0,0,0], _sa=[0,0,0,0], _Fw=[0,0,0,0];

/* One time step.
   inp: {ay, ax in g; Fp (N) at (xp, yp) m from the CG; rack (m, + = right); U (m/s)}.
   U > 0: the car is driven. The tires make the side force from their slip angles, the car slides (vy) and yaws (r), and lateral
   acceleration comes out of that instead of inp.ay. */
function step(m,st,inp,dt,extraDamp){
  const P=m.P, v=P.veh, T=m.T, out=st.out, rack=inp.rack||0, s=_s, sd=_sd, sa=_sa, Fw=_Fw;
  for(let i=0;i<4;i++){
    const ax=i<2?0:1, Tx=T[ax], ss=P.ax[ax].s, g=P.ax[ax].g, x=m.xs[i], y=m.ys[i];
    const zc=st.z+x*st.th+y*st.ph, zcd=st.zd+x*st.thd+y*st.phd;
    s[i]=st.zw[i]-zc; sd[i]=st.zwd[i]-zcd;
    cell(Tx,s[i],ax===0?(i===0?-rack:rack):0);
    const L=cv(Tx.L), MR=cv(Tx.MR); sa[i]=cv(Tx.sa);      // sa: travel of the arm itself; steering lifts the tire without moving the arm
    const Fs=Math.max(0,m.Fpre[i]+ss.k*(Tx.L0-L)), vd=MR*sd[i], Fd=damperF(ss,vd);
    let F=(Fs+Fd)*MR;
    if(sa[i]>g.bump){const e=sa[i]-g.bump; F+=KBS*e+KBS2*e*e+CBS*sd[i];}
    if(sa[i]<-g.droop){const e=-g.droop-sa[i]; F+=-KTOP*e+CBS*sd[i];}
    Fw[i]=F; const o=out[i]; o.s=s[i]; o.vd=vd;
    if(inp.U>0){      // slip angle from the wheel's path over the ground, lagged by the relaxation length
      const side=i%2===0?-1:1, de=side*cv(Tx.steer)*D2R, lean=side*(cv(Tx.cam)-side*st.ph/D2R);
      const vx=Math.max(0.5,inp.U-y*st.r), al=de-Math.atan2(st.vy+(x-m.xc)*st.r,vx);      // vy and r are taken at the whole-car CG
      st.al[i]+=(al-st.al[i])*Math.min(1,vx*dt/TRELAX);
      const Fz=o.Ft!==undefined?o.Ft:m.W[i]+v.mu*G, Fy=tireFy(g,st.al[i]/D2R,Fz,lean), D=tirePeak(g,Fz,Fy>=0?lean:-lean);
      o.Fy=Fy; o.slip=st.al[i]/D2R; o.used=D>0?Math.abs(Fy)/D:0;
    }
  }
  let ayDrive=0;
  if(inp.U>0){
    const Mt=v.M+4*v.mu; let Fy=0, Mz=0; for(let i=0;i<4;i++){Fy+=out[i].Fy; Mz+=(m.xs[i]-m.xc)*out[i].Fy;}
    ayDrive=Fy/Mt; st.vy+=(ayDrive-inp.U*st.r)*dt; st.r+=Mz/v.Izz*dt;
    if(Math.abs(st.vy)>inp.U) st.spun=true;      // sliding sideways faster than it moves forward
  } else {st.vy=0; st.r=0; st.al[0]=st.al[1]=st.al[2]=st.al[3]=0;}
  for(let ax=0;ax<2;ax++){
    const k=P.ax[ax].s.arb, iL=ax*2, iR=iL+1, dif=(sa[iL]-sa[iR])-m.arbOff[ax];
    Fw[iL]+=k*dif; Fw[iR]-=k*dif;
  }
  const ay=inp.U>0?ayDrive:inp.ay*G, axl=inp.ax*G; st.ay=ay/G;
  const sF=(sa[0]+sa[1])/2, sR=(sa[2]+sa[3])/2, hrcF=lk1(T[0],T[0].rch,sF), hrcR=lk1(T[1],T[1].rch,sR), huF=lk1(T[0],T[0].hu,sF), huR=lk1(T[1],T[1].hu,sR);
  const Rf=P.ax[0].g.R, Rr=P.ax[1].g.R;
  st.hrc[0]=hrcF; st.hrc[1]=hrcR;
  const hra=hrcF+(hrcR-hrcF)*m.a/v.L, hcg=v.h+st.z, hp=hcg-hra;      // the CG rides with the body; hp: CG above the roll axis
  let Fz=-v.M*G-inp.Fp;
  /* Moments on the body.
     Pitch: body and unsprung inertia both go through the springs (no anti-dive here), and pitching shifts the CG over the wheel
     centers by (h - R) * theta.
     Roll: the links carry part of the side force straight to the tires (dF below). The rest goes through the springs, and rolling
     shifts the CG sideways by hp * phi. */
  let Mth=(v.M*hcg+2*v.mu*(Rf+Rr))*axl+v.M*G*(hcg-m.Rm)*st.th-inp.xp*inp.Fp;
  let Mph=(v.M*hp+2*v.mu*(Rf-huF+Rr-huR))*ay+v.M*G*hp*st.ph-inp.yp*inp.Fp;
  for(let i=0;i<4;i++){Fz+=Fw[i]; Mth+=m.xs[i]*Fw[i]; Mph+=m.ys[i]*Fw[i];}
  for(let i=0;i<4;i++){
    const ax=i<2?0:1, g=P.ax[ax].g, side=i%2===0?-1:1, tH=m.ys[ax*2+1];
    const Max=v.M*(ax===0?v.wf:1-v.wf), hr=ax===0?hrcF:hrcR, hu=ax===0?huF:huR;
    const dF=-side*(Max*hr+2*v.mu*hu)*ay/(2*tH);      // through the links: the body's side force at the roll center height, the unsprung masses' at hu
    const gr=groundAt(st,i);
    let Ft=g.kt*(m.d0[i]+gr[0]-st.zw[i]);
    if(Ft>0){Ft+=CT*(gr[1]-st.zwd[i]); if(Ft<0)Ft=0;} else Ft=0;
    st.zwd[i]+=(Ft-Fw[i]-v.mu*G-dF)/v.mu*dt;
    const o=out[i]; o.Ft=Ft; o.zg=gr[0];
  }
  st.zd+=Fz/v.M*dt; st.thd+=Mth/v.Iyy*dt; st.phd+=Mph/(v.Ixx+v.M*hp*hp)*dt;      // roll is about the roll axis, hence the parallel-axis term
  if(extraDamp){const f=1-extraDamp; st.zd*=f; st.thd*=f; st.phd*=f; for(let i=0;i<4;i++) st.zwd[i]*=f;}
  st.z+=st.zd*dt; st.th+=st.thd*dt; st.ph+=st.phd*dt;
  for(let i=0;i<4;i++) st.zw[i]+=st.zwd[i]*dt;
  st.t+=dt;
  if(st.ev.length&&st.ev.every(e=>st.t>e.t0+e.dur)) st.ev=[];
}
function settle(m,st,inp,sec){const n=Math.round(sec/DT); for(let k=0;k<n;k++) step(m,st,inp,DT,0.002);}
function finite(st){return Number.isFinite(st.vy+st.r+st.z+st.th+st.ph+st.zd+st.thd+st.phd+st.zw[0]+st.zw[1]+st.zw[2]+st.zw[3]+st.zwd[0]+st.zwd[1]+st.zwd[2]+st.zwd[3]);}


/* ===== 7. Steady cornering ===== */
/* One axle: the slip angle (deg, at the axle, before each wheel's toe) at which its two tires make side force F, and the most
   they can make. Fz, toe (deg, + = steered right) and lean (deg, + = top right) are [left, right]. */
function axleSolve(g,F,Fz,toe,lean){
  const f=a=>tireFy(g,a+toe[0],Fz[0],lean[0])+tireFy(g,a+toe[1],Fz[1],lean[1]);
  let cap=-Infinity, ap=0; for(let a=-4;a<=25;a+=0.25){const v=f(a); if(v>cap){cap=v;ap=a;}}
  if(!(cap>0)) return {a:NaN,cap:0,used:Infinity};
  if(F>=cap) return {a:ap,cap,used:F/cap};
  let lo=-25, hi=ap; for(let i=0;i<40;i++){const mid=(lo+hi)/2; if(f(mid)<F)lo=mid; else hi=mid;}
  return {a:(lo+hi)/2,cap,used:F/cap};
}
/* Slip angle and share of grip in use per tire for state st cornering at ay (g), rack centered. */
function gripNow(m,st,ay){
  const P=m.P, r={tire:[],ax:[]}, sg=ay<0?-1:1;
  for(let ax=0;ax<2;ax++){
    const T=m.T[ax], g=P.ax[ax].g, Fz=[], toe=[], lean=[];
    for(let k=0;k<2;k++){const i=ax*2+k, side=k?1:-1, o=st.out[i], s=o.s||0;
      Fz[k]=o.Ft!==undefined?o.Ft:m.W[i]+P.veh.mu*G; toe[k]=sg*side*lk2(T,T.steer,s,0); lean[k]=sg*side*(lk2(T,T.cam,s,0)-side*st.ph/D2R);}
    const F=Math.abs(ay)*2*(m.W[ax*2]+P.veh.mu*G), q=axleSolve(g,F,Fz,toe,lean);
    r.ax.push(q);
    for(let k=0;k<2;k++){const al=q.a+toe[k], Fy=tireFy(g,al,Fz[k],lean[k]), D=tirePeak(g,Fz[k],lean[k]); r.tire.push({slip:sg*al,used:D>0?Math.abs(Fy)/D:0});}
  }
  return r;
}
/* Sweep: settle the car at each lateral g and compare each axle's side force with what its tires can make.
   Returns grip in use per axle, the g where each runs out, and the understeer gradient (deg/g, + = understeer). */
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

/* Road-wheel angles (deg, + = right), Ackermann (%) and low-speed turn radius for a rack position and the front wheel travels. */
function steerInfo(m,rack,sL,sR){
  const T=m.T[0], v=m.P.veh;
  const dL=-lk2(T,T.steer,sL,-rack), dR=lk2(T,T.steer,sR,rack), dm=(dL+dR)/2*D2R;
  const kra=Math.tan(dm)/v.L, right=dm>=0, di=Math.abs(right?dR:dL), dout=Math.abs(right?dL:dR);
  let ack=NaN;
  if(di>2){const tk=2*T.kp[1], ideal=Math.atan(1/(1/Math.tan(di*D2R)+tk/v.L))/D2R; ack=(di-dout)/(di-ideal)*100;}
  const kay=kra/(1+m.b*m.b*kra*kra);      // lateral acceleration at the CG = v^2 * kay
  const turn=Math.abs(kra)>1e-6, Rr=turn?1/Math.abs(kra):Infinity;      // radius at the middle of the rear axle
  return {dL,dR,di,dout,ack,kra,kay,R:turn?Math.hypot(Rr,m.b):Infinity,Ro:turn?Math.hypot(Rr+T.tHalf,v.L):Infinity};      // R: at the CG. Ro: at the outer front tire
}


/* ===== 8. Setup sheet ===== */
/* An axle's share of braking force, signed so a positive anti-dive number means less pitch: the front's contact patch must move
   forward in bump for that, the rear's rearward. */
function brakeShare(v,ax){return ax===0?v.bias:-(1-v.bias);}

/* The car's numbers at ride height, linearized about the static position. */
function sheet(m){
  const P=m.P, v=P.veh, r={ax:[]}, hs=v.h+m.zs; let Kr=0, Kth=0, Kz=0, Kzx=0;
  for(let ax=0;ax<2;ax++){
    const T=m.T[ax], s=P.ax[ax].s, g=P.ax[ax].g, t=2*T.tHalf, ms=m.W[ax*2]/G, i=ax*2, st=(m.st[i]+m.st[i+1])/2, e=0.002;
    const Fw=(j,x)=>Math.max(0,m.Fpre[j]+s.k*(T.L0-lk2(T,T.L,x,0)))*lk2(T,T.MR,x,0);
    const MR=lk2(T,T.MR,st,0), kw=(Fw(i,m.st[i]+e)-Fw(i,m.st[i]-e)+Fw(i+1,m.st[i+1]+e)-Fw(i+1,m.st[i+1]-e))/(4*e);      // tangent wheel rate, mean of left and right
    const kr=kw*g.kt/(kw+g.kt), fr=Math.sqrt(kr/ms)/(2*Math.PI), cc=2*Math.sqrt(kw*ms);
    const Ks=(kw/2+s.arb)*t*t, Kt=g.kt*t*t/2, Kax=1/(1/Ks+1/Kt), rch=lk1(T,T.rch,st), hu=lk1(T,T.hu,st);
    const Mg=v.M*(ax===0?v.wf:1-v.wf)*rch+2*v.mu*hu, Mu=2*v.mu*(g.R-hu);      // per unit lateral acceleration. Mg: moment the links carry. Mu: unsprung moment that goes through the springs
    Kr+=Kax; Kth+=2*kr*m.xs[i]*m.xs[i]; Kz+=2*kr; Kzx+=2*kr*m.xs[i];
    const pr=pose(T.D,lk2(T,T.al,st,0),0)||T.P0, tk=(pr.CP[2]-pr.LBJ[2])/(pr.UBJ[2]-pr.LBJ[2]), I=instant(T.D,pr,0);      // the corner at ride height; tk: where along the kingpin the ground is
    r.ax.push({MR,kw,kr,fr,zb:s.cbl*MR*MR/cc,zr:s.crl*MR*MR/cc,rch,t,Kax,Kt,Mg,Mu,cam:lk2(T,T.cam,st,0),toe:-lk2(T,T.steer,st,0),
      camGain:(lk2(T,T.cam,st+e,0)-lk2(T,T.cam,st-e,0))/(2*e)*0.01, bumpSteer:-(lk2(T,T.steer,st+e,0)-lk2(T,T.steer,st-e,0))/(2*e)*0.01,
      kpi:Math.atan2(pr.LBJ[1]-pr.UBJ[1],pr.UBJ[2]-pr.LBJ[2])/D2R,caster:Math.atan2(-pr.ax[0],pr.ax[2])/D2R,scrub:pr.CP[1]-(pr.LBJ[1]+tk*(pr.UBJ[1]-pr.LBJ[1])),trail:pr.LBJ[0]+tk*(pr.UBJ[0]-pr.LBJ[0])-pr.CP[0],
      st,antiDive:I?I.side*brakeShare(v,ax)*v.L/hs*100:NaN});
  }
  const A=r.ax, hra=A[0].rch*v.wf+A[1].rch*(1-v.wf), hp=hs-hra, MgH=v.M*G*hp, MgHs=v.M*G*(hs-m.Rm);
  Kth-=Kzx*Kzx/Kz;      // the body is free to heave, which softens pitch
  r.hp=hp;
  const stable=Kr>MgH;
  const phi=stable?(v.M*hp+A[0].Mu+A[1].Mu+A[0].Kax/A[0].Kt*A[0].Mg+A[1].Kax/A[1].Kt*A[1].Mg)/(Kr-MgH):Infinity;      // roll per unit lateral acceleration
  r.rollGrad=phi*G/D2R;
  r.rollFreq=stable?Math.sqrt((Kr-MgH)/(v.Ixx+v.M*hp*hp))/(2*Math.PI):NaN;
  r.pitchGrad=Kth>MgHs?(v.M*hs+2*v.mu*(P.ax[0].g.R+P.ax[1].g.R))/(Kth-MgHs)*G/D2R:Infinity;
  const dW=a=>stable?(a.Kax*phi+a.Mg*(1-a.Kax/a.Kt))/a.t:a.Mg/a.t;
  r.lltd=dW(A[0])/(dW(A[0])+dW(A[1]));
  const T0=m.T[0], stF=(m.st[0]+m.st[1])/2, dr=T0.dR;
  r.ratio=(360/P.steer.c)/Math.abs((lk2(T0,T0.steer,stF,dr)-lk2(T0,T0.steer,stF,-dr))/(2*dr));
  r.lock=steerInfo(m,T0.sgn*P.steer.rmax,m.st[0],m.st[1]);
  r.swMax=P.steer.rmax/P.steer.c*360;
  return r;
}


/* ===== 9. Solver =====
   Finds the smallest change to chosen fields that puts chosen setup-sheet numbers on target at ride height. */

/* What can be a target: [key, label, unit, shown per SI, tolerance in shown units]. Keys match the setup sheet's. */
const TARGETS=[["cam","Camber","°",1,1e-4],["toe","Toe-in per wheel","°",1,1e-4],["caster","Caster","°",1,1e-4],["kpi","Kingpin inclination","°",1,1e-4],
  ["rch","Roll center height","mm",1e3,1e-3],["camGain","Camber gain in bump","°/10 mm",1,1e-5],["bumpSteer","Bump steer (toe-in)","°/10 mm",1,1e-5],["antiDive","Anti-dive under braking","%",1,1e-3],
  ["scrub","Scrub radius","mm",1e3,1e-3],["trail","Mechanical trail","mm",1e3,1e-3],["t","Track","mm",1e3,2e-3],["MR","Motion ratio","",1,1e-6]];
/* Lower-arm angle that puts the contact patch at travel s, rack centered. Null if out of reach. */
function angleAt(D,s){
  let al=D.a0+s/D.lo.R; const h=1e-6;
  for(let i=0;i<40;i++){
    const p=pose(D,al,0); if(!p) return null; const e=p.CP[2]-s; if(Math.abs(e)<1e-13) return al;
    const a=pose(D,al+h,0), b=pose(D,al-h,0); if(!a||!b) return null; const sl=(a.CP[2]-b.CP[2])/(2*h); if(!(sl>1e-4)) return null;
    let st=-e/sl; if(st>0.1)st=0.1; else if(st<-0.1)st=-0.1; al+=st;
  }
  const p=pose(D,al,0); return p&&Math.abs(p.CP[2]-s)<1e-9?al:null;
}
/* One axle's setup-sheet numbers straight from its linkage at travel c.s. c: {s, L, h, share} (wheelbase, CG height and share of
   braking, for anti-dive). Null if the linkage can't reach that travel. */
function axleNumbers(g,name,c){
  const D=design(g,name), e=0.002, al=angleAt(D,c.s), a1=angleAt(D,c.s+e), a0=angleAt(D,c.s-e); if(al===null||a1===null||a0===null) return null;
  const p=pose(D,al,0), pa=pose(D,a1,0), pb=pose(D,a0,0), P0=pose(D,D.a0,0), I=instant(D,p,0); if(!I) return null;
  const tk=(p.CP[2]-p.LBJ[2])/(p.UBJ[2]-p.LBJ[2]);
  return {cam:p.cam/D2R,toe:-p.steer/D2R,caster:Math.atan2(-p.ax[0],p.ax[2])/D2R,kpi:Math.atan2(p.LBJ[1]-p.UBJ[1],p.UBJ[2]-p.LBJ[2])/D2R,
    scrub:p.CP[1]-(p.LBJ[1]+tk*(p.UBJ[1]-p.LBJ[1])),trail:p.LBJ[0]+tk*(p.UBJ[0]-p.LBJ[0])-p.CP[0],rch:I.rch,t:2*P0.CP[1],
    camGain:(pa.cam-pb.cam)/D2R/(2*e)*0.01,bumpSteer:-(pa.steer-pb.steer)/D2R/(2*e)*0.01,MR:-(pa.L-pb.L)/(2*e),antiDive:I.side*c.share*c.L/c.h*100};
}
/* Solves A y = b by elimination. Null if A is singular. */
function gaussSolve(A,b){
  const n=b.length; let big=0; for(let i=0;i<n;i++) big=Math.max(big,Math.abs(A[i][i]));
  for(let c=0;c<n;c++){
    let p=c; for(let i=c+1;i<n;i++) if(Math.abs(A[i][c])>Math.abs(A[p][c])) p=i;
    if(Math.abs(A[p][c])<=1e-9*big) return null;
    [A[c],A[p]]=[A[p],A[c]]; [b[c],b[p]]=[b[p],b[c]];
    for(let i=c+1;i<n;i++){const m=A[i][c]/A[c][c]; for(let j=c;j<n;j++)A[i][j]-=m*A[c][j]; b[i]-=m*b[c];}
  }
  const y=new Array(n); for(let i=n-1;i>=0;i--){let s=b[i]; for(let j=i+1;j<n;j++)s-=A[i][j]*y[j]; y[i]=s/A[i][i];} return y;
}
/* g0: the axle's geometry. targets: {cam:-2, rch:60, ...} in shown units. free: keys of g0 that may change. c: see axleNumbers.
   "Smallest" weighs 1 mm the same as 0.25 deg and as 0.01 of a ratio.
   Returns {ok:true, changes, start, end, spare} or {ok:false, why}. It refuses when there are more targets than free fields, when
   the fields can't move the targets independently, when a field would leave its range, or when nothing in reach hits the targets. */
function solveFor(g0,name,c,targets,free){
  const keys=Object.keys(targets), m=keys.length, n=free.length, spec={}, short=l=>l.split(" (")[0].replace(/, \+ =.*$/,"");      // a label without its sign note
  for(const [grp,fs] of GEO) for(const f of fs) spec[f[0]]={label:f[1],unit:f[2],sc:f[3],mn:f[5],mx:f[6],wt:f[2]==="°"?0.25:f[2]===""?0.01:1,group:grp};
  if(!m) return {ok:false,why:"Tick at least one target: a number you want."};
  if(!n) return {ok:false,why:"Tick at least one field to solve for."};
  if(m>n) return {ok:false,why:m+" targets but only "+n+" ticked field"+(n>1?"s":"")+". Each target needs a field of its own: tick "+(m-n)+" more or drop a target."};
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
    const Jn=J.map(r=>{const l=Math.hypot(...r); return r.map(v=>v/l);});      // rows scaled, so a dependency shows whatever the units
    const A=Jn.map(a=>Jn.map(b=>a.reduce((s,v,k)=>s+v*b[k],0)));
    const rhs=Jn.map((r,i)=>(r.reduce((s,v,k)=>s+v*(x[k]-x0[k]),0))-res[i]/Math.hypot(...J[i]));
    const dep=[]; for(let i=0;i<m;i++) for(let j=i+1;j<m;j++) if(Math.abs(A[i][j])>0.9995) dep.push(T[i][1]+" and "+T[j][1]);
    const y=gaussSolve(A.map(r=>r.slice()),rhs.slice());
    const xn=y?x0.map((v,k)=>v+Jn.reduce((s,r,i)=>s+r[k]*y[i],0)):null;      // least change from the starting values
    if(!y||Math.max(...xn.map((v,k)=>Math.abs(v-x0[k])))>400)      // no answer, or one that needs hundreds of mm: the targets fight each other
      return {ok:false,why:"The ticked fields can't set these targets independently"+(dep.length?": "+dep.join("; ")+" move together":"")+". Tick a different field or drop a target."};
    let dx=xn.map((v,k)=>v-x[k]); const big=Math.max(...dx.map(Math.abs)); if(big>15) dx=dx.map(v=>v*15/big);
    let nx=null, tr=null;
    for(let cut=0;cut<10&&!tr;cut++){nx=x.map((v,k)=>v+dx[k]); tr=evalAt(nx); if(!tr) dx=dx.map(v=>v/2);}
    if(!tr) return {ok:false,why:"The linkage stops assembling on the way to these targets."};
    x=nx; cur=tr;
  }
  const reached=keys.map((k,i)=>({key:k,label:T[i][1],unit:T[i][2],want:targets[k],got:cur.y[i]}));
  if(err>1) return {ok:false,why:"No geometry within reach hits these targets. Closest found: "+reached.map(r=>r.label+" "+r.got.toFixed(3)+" (wanted "+r.want+")").join(", ")+"."};
  for(let i=0;i<n;i++){const v=x[i]*F[i].wt; if(v<F[i].mn-1e-9||v>F[i].mx+1e-9) return {ok:false,why:short(F[i].label)+" would have to be "+v.toFixed(F[i].unit==="°"?2:1)+(F[i].unit?" "+F[i].unit:"")+", outside what the field allows ("+F[i].mn+" to "+F[i].mx+")."};}
  const changes=free.map((k,i)=>({key:k,label:F[i].label,group:F[i].group,unit:F[i].unit,from:x0[i]*F[i].wt,to:x[i]*F[i].wt,si:x[i]*F[i].wt*F[i].sc})).filter(q=>Math.abs(q.to-q.from)>5e-5);
  return {ok:true,changes,start,end:cur.o,spare:n-m};
}


/* ===== 10. Cars =====
   Stock: Mazda MX-5 NB 1.8 (NB8C). Coen's: Stock with his parts.
   How each number is known:
     verified     published by Mazda, printed on the part, or from the body manual
     measured     taken off the car, a part or a drawing of it
     interpreted  fitted so the model reproduces the verified numbers, worked out, or estimated

   Stock
     verified     wheelbase, mass, wheel and tire size, springs, rack stroke and turns lock to lock, shock tower spacing.
                  The model is fitted to Mazda's track, camber, caster, kingpin, trail, toe, roll centers, wheel stroke, damper
                  forces and full lock.
     measured     front arm lengths and inner pivot spacing, front knuckle (ball joints from the axle and from the wheel face),
                  rear chassis pivots from the centerline and their height difference, rear arm lengths, rear shock mount on the
                  arm, CG height of the whole car. Spring motion ratios (0.686 / 0.721) are measured too; the model's follow from
                  its geometry.
     interpreted  front pivots from the centerline, pivot heights above ground, pivot axis angles (0), rear knuckle, hub face
                  positions, tie rod end, rack position, front shock mount, shock top heights, anti-roll bar rates, unsprung
                  mass, inertias, weight share, tire rate and radius, tire grip
   Coen's
     verified     wheels, tires, spacers, spring rates
     interpreted  ride height, lower arm extension, upper arm length, camber, caster, toe, dampers, travel limits, tire rate and
                  radius, tire grip

   The stock car is written in the front-view fields its numbers were fitted in and converted on load (section 11).
   Anti-roll bars: arb is half the roll rate at the wheel, because it acts on the left-right difference in travel.
   look picks the body and rims the 3D view draws (0: Roadster RS, 1: Coen's). It does not affect the numbers. */
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
function stockCar(){return fromLegacy(legacyStock());}
/* Stock plus: 15x7 ET35 wheels on 30 / 12 mm spacers, 195/45R15 tires, 8 / 6 kgf/mm springs, a 5 mm front lower arm extension
   (lR; the shock and the bar stay where they were, so fMount and arb drop), front upper arms cut to 240.3 mm (uR) for -4.2 deg of camber, caster 3 deg
   (lt, ut), toe -0.5 deg front and 0 rear at ride height, rear camber -1.5 deg from the hub angle, ride height -26 / -38 mm. */
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
function defaults(){return stockCar();}      // what the page opens with


/* ===== 11. Older setups =====
   Setups saved or exported before the 3D linkage hold the geometry in front-view fields: arm lengths, pivot positions, a caster
   field, the tie rod end in car coordinates. The stock car above is written the same way. fromLegacy() converts them; the car
   comes out the same. */

/* Front-view four-bar: the joints for lower-arm angle a (rad from horizontal, + = outer end up). Null if it can't assemble. */
function fvL(g,a){
  const ly=g.yli+g.Ll*Math.cos(a), lz=g.zli+g.Ll*Math.sin(a);
  const dx=ly-g.yui, dz=lz-g.zui, d=Math.hypot(dx,dz), r1=g.Lu, r2=g.Lk;
  if(d<1e-9||d>r1+r2||d<Math.abs(r1-r2)) return null;
  const aa=(r1*r1-r2*r2+d*d)/(2*d), hh=Math.sqrt(Math.max(0,r1*r1-aa*aa)), px=g.yui+aa*dx/d, pz=g.zui+aa*dz/d;
  let uy=px-hh*dz/d, uz=pz+hh*dx/d; const uy2=px+hh*dz/d, uz2=pz-hh*dx/d;
  if(uz2>uz){uy=uy2;uz=uz2;}
  const vy=(uy-ly)/r2, vz=(uz-lz)/r2;
  if(vz<=0) return null;
  return {ly,lz,uy,uz,vy,vz,beta:Math.atan2(vy,vz)};      // beta: the kingpin's lean in front view, + = top outboard
}

/* Design position in the front-view fields. */
function designL(g,name){
  /* Camber = knuckle angle (inc) - kingpin inclination + hub angle (cadj). beta: the kingpin's lean, + = top outboard. */
  const ka=(g.inc+g.cadj)*D2R, d0=-g.toe*D2R;      // steer is + outboard, so toe-in is negative
  const spin=c=>[-Math.sin(d0)*Math.cos(c),Math.cos(d0)*Math.cos(c),-Math.sin(c)];      // spindle direction for camber c
  /* The hub sits hf - ET_FIT out from the kingpin, square to it. Offset and spacer slide the wheel along the spindle from there. */
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
  if(best===null) throw new Error(name+": the linkage can't put the tire on the ground at design height. Check arm lengths, knuckle length and pivot heights.");
  const k=fvL(g,best), av0=spin(ka+k.beta), tk=Math.tan(g.caster*D2R), xk=g.xk||0;
  const Sy=k.ly+g.hsp*k.vy, Sz=k.lz+g.hsp*k.vz;      // spindle root on the kingpin; the wheel center sits xk ahead of it
  const xl=(Sz-k.lz)*tk-xk, xu=-(k.uz-Sz)*tk-xk;      // ball joint x positions that give the caster
  const LBJ=[xl,k.ly,k.lz], WC=[dw*av0[0],Sy+dsR*k.vz+dw*av0[1],Sz-dsR*k.vy+dw*av0[2]];
  return {a0:best,beta0:k.beta,xl,xu,w0:vsub(WC,LBJ),av0};
}

/* Older still: a free camber field (cam0) instead of the hub angle. Sets the hub angle that gives that camber on the setup's own
   arms, held to the hub angle's range. Returns the axles where it had to be held. */
function fromOldCamberL(P,src){
  const cut=[];
  for(let a=0;a<2;a++){const o=src&&src.ax&&src.ax[a]&&src.ax[a].g; if(!o||typeof o.cam0!=="number"||typeof o.cadj==="number") continue;
    const g=P.ax[a].g; g.cadj=0;
    for(let it=0;it<4;it++){let D; try{D=designL(g,a?"Rear":"Front");}catch(e){break;} g.cadj=o.cam0-(g.inc+D.beta0/D2R);}
    const lim=Math.max(-3,Math.min(1,g.cadj)); if(Math.abs(lim-g.cadj)>1e-6) cut.push(a?"rear":"front"); g.cadj=+lim.toFixed(4);}
  return cut;
}

/* One axle from the front-view fields: the arms and the knuckle are read off the design position those fields describe.
   Wheel, tire, coilover and travel fields carry over. Pivot spacing is taken as at least 20 mm. */
function axleFromLegacy(g,name){
  const D=designL(g,name), k=fvL(g,D.a0), rear=name==="Rear", LBJ=[D.xl,k.ly,k.lz], UBJ=[D.xu,k.uy,k.uz], kk=vunit(vsub(UBJ,LBJ));
  const d0=-g.toe*D2R, c0=g.inc*D2R+k.beta, n0=[-Math.sin(d0)*Math.cos(c0),Math.cos(d0)*Math.cos(c0),-Math.sin(c0)];      // the spindle with the hub angle at zero
  const nk=vdot(n0,kk), o=vunit(vsub(n0,vscale(kk,nk))), f=vcross(o,kk), dw=ET_FIT-g.et+g.sp;
  const face=vadd(vsub(D.w0,vscale(D.av0,dw)),vscale(n0,ET_FIT));      // lower ball joint to the mounting face
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
/* A whole setup from the front-view fields. Those setups carry no brake share: without one it is 65 %. */
function fromLegacy(P){
  return {veh:Object.assign({},P.veh,{bias:P.veh.bias===undefined?0.65:P.veh.bias}),steer:Object.assign({},P.steer),
          ax:[{g:axleFromLegacy(P.ax[0].g,"Front"),s:Object.assign({},P.ax[0].s)},{g:axleFromLegacy(P.ax[1].g,"Rear"),s:Object.assign({},P.ax[1].s)}],
          dh:P.dh.slice(),look:P.look||0};
}
const isLegacy=j=>!!(j&&j.ax&&j.ax[0]&&j.ax[0].g&&j.ax[0].g.Ll!==undefined&&j.ax[0].g.lR===undefined);      // true for a setup in the front-view fields
