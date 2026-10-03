/* ===== Physics core. SI units (m, kg, N, s, rad) unless a name says deg.
   Corner frame: x forward, y outboard, z up, origin on the ground under the axle line at design height.
   Vehicle frame: x forward, y to the right, z up. Corners FL, FR, RL, RR; side = -1 on the left, +1 on the right.
   Roll + = right side up, lateral g + = right turn, rack + = toward the right, steer angles + = right. ===== */
const G=9.81, D2R=Math.PI/180;

/* Two cars, both a Mazda MX-5 / Roadster NB 1.8 (NB8C): STOCK (as Mazda built it) and COEN'S (the one this tool was built for).
   The Stock / Coen's buttons on the page load them. Both use the same arms, pivots and rack; Coen's changes the wheels, tires,
   alignment, springs, dampers, ride height and the travel limits. Source of each number:
   PUBLISHED by Mazda: wheelbase 2265 mm, track 1415 / 1440 mm, mass 1030 kg, front camber 0°02', caster 5°40', kingpin 11°39',
     caster trail 17.5 mm, rear camber -0°42', toe-in 3 mm total per axle, roll centre height 41 / 120 mm, wheel stroke 82 bump / 93 droop
     (front) and 80 / 96 (rear), springs 2.9 / 2.1 kgf/mm, damper forces at 0.1 and 0.3 m/s (62 / 115 kgf rebound, 35 / 57 kgf bump front,
     35 / 77 kgf bump rear), rack stroke 121 mm, 2.6 turns lock to lock, full lock 38° inner / 33° outer.
     Wheels 15x6JJ +40 and 195/50R15 tires at 180 kPa.
   MEASURED by others: spring motion ratios 0.686 / 0.721 (owner measurement on a 2000 car); static stability factor 1.59 (NHTSA),
     which puts the whole car's CG 449 mm above the ground.
   FROM THE NA DRAWING VALUES this file already had: front lower pivots 656 mm apart, upper pivots 756 mm apart, lower arm 350 mm,
     upper pivots 183 mm above the lower ones. Mazda lowered the lower pivots 5.8 mm for the NB, which makes it 188.8 mm.
   FROM A BUSHING-KIT DRAWING of the four arms seen from above (scale 1.21 mm per drawing pixel, set by the front arms, whose
     sideways lengths the drawing and this file agree on; the same scale is assumed for the rear arms): the rear lower arm reaches
     386 mm sideways with inner pivots 306 mm apart and two outer pivots 132 mm apart; the rear upper arm reaches 186 mm sideways
     with inner pivots 142 mm apart, centred on its outer end.
   FITTED so the model reproduces the published numbers (none of these is published): pivot heights above ground, front upper arm
     length (261 mm, not 250), upright lengths, spindle and hub-face positions, kingpin offset, tie-rod joints, coilover mount
     positions. Rear: the two sideways lengths above are kept; the rear pivot positions, hub face and damper top mount are then
     fitted to the 120 mm roll centre, 1440 mm track and 0.721 motion ratio. The lower ball joint is assumed 160 mm above the ground.
   ESTIMATES: unsprung mass, roll and pitch inertia, tire rate, anti-roll bar rates, front weight share, grip limit.
   The Miata has no rear toe link. Its rear lower arm has two outer pivots; the model draws the arm as two legs (front leg to the
   ball joint, rear leg to a second outer point ee behind it) and the rear leg holds the toe, so no rear tie-rod numbers are used.
   COEN'S car, on top of stock: 8 / 6 kgf/mm springs with dampers scaled up by the square root of the spring ratio (a guess, his
   real dampers are stiffer by an unknown amount), 15x7 +40 wheels, 185/50R15 tires at 240 kPa (loaded radius 265 mm, 235 N/mm, as he
   entered them), front camber -4°, caster 4.5°, toe -0.1°, rear camber -1.5°, front tie-rod inner joint 180.2 mm, travel limits
   100 / 120 mm front and 90 / 105 mm rear, ride height -2 mm front and -20 mm rear. */
function stockCar(){
  return {
    veh:{M:902,mu:32,L:2.265,wf:0.523,h:0.474,Ixx:260,Iyy:1050},
    steer:{c:0.0465,rmax:0.0605,speed:60/3.6,grip:0.9,link:0},
    ax:[
      {g:{Ll:0.35,Lu:0.2611,Lk:0.24,yli:0.328,zli:0.1325,yui:0.378,zui:0.3213,xlf:-0.0129,xlr:-0.3529,xuf:0.096,xur:-0.124,ee:0.13,hsp:0.1054,hf:0.0931,xk:0.0086,rimD:0.4064,rimW:0.1524,et:0.040,sp:0,tw:0.195,ar:0.50,pk:180000,R:0.274,cam0:0.0333,caster:5.6667,toe:0.15,kt:185000,
          xto:0.0978,yto:0.6953,zto:0.215,xti:0.0978,yti:0.3609,zti:0.1734,fMount:0.757,ydm:0.378,zdm:0.5825,bump:0.082,droop:0.093},
       s:{k:28440,arb:8000,cbl:3430,cbh:1080,vkb:0.1,crl:6080,crh:2600,vkr:0.1}},
      {g:{Ll:0.3872,Lu:0.1884,Lk:0.24,yli:0.2596,zli:0.185,yui:0.4549,zui:0.3808,xlf:0.091,xlr:-0.215,xuf:0.071,xur:-0.071,ee:0.132,hsp:0.105,hf:0.1125,xk:0,rimD:0.4064,rimW:0.1524,et:0.040,sp:0,tw:0.195,ar:0.50,pk:180000,R:0.274,cam0:-0.7,caster:0,toe:0.15,kt:185000,
          xto:-0.132,yto:0.6464,zto:0.1675,xti:-0.215,yti:0.2596,zti:0.185,fMount:0.9,ydm:0.4397,zdm:0.465,bump:0.080,droop:0.096},
       s:{k:20590,arb:1400,cbl:3430,cbh:2060,vkb:0.1,crl:6080,crh:2600,vkr:0.1}}
    ],
    dh:[0,0,0,0]
  };
}
function coensCar(){ const P=stockCar(), sf=Math.sqrt(8/2.9), sr=Math.sqrt(6/2.1);
       for(const g of [P.ax[0].g,P.ax[1].g]) Object.assign(g,{rimD:0.381,rimW:0.1778,et:0.035,tw:0.185,ar:0.45,pk:240000,R:0.260,kt:235000});
       Object.assign(P.ax[0].g,{cam0:-3.5,caster:3,toe:-0.5,zti:0.1802,sp:0.030});
       Object.assign(P.ax[1].g,{cam0:-1.5,toe:0,sp:0.012});
       P.ax[0].s.k=78450; P.ax[1].s.k=58840;
       for(const k of ["cbl","cbh","crl","crh"]){P.ax[0].s[k]=Math.round(P.ax[0].s[k]*sf); P.ax[1].s[k]=Math.round(P.ax[1].s[k]*sr);}
       P.dh=[-0.026,-0.026,-0.038,-0.038]; return P; }
const PRESETS={stock:stockCar,coen:coensCar};
function defaults(){return coensCar();}

/* Field specs: [key, label, unit, scale to SI, step, min, max]; min and max are in the displayed unit. */
const GEO=[
  ["Wishbones",[["Ll","Lower arm length","mm",1e-3,5,100,1000],["Lu","Upper arm length","mm",1e-3,5,80,1000],["Lk","Upright length in front view (ball joint to ball joint)","mm",1e-3,5,80,600]]],
  ["Chassis pivots",[["yli","Lower inner pivot, from centreline","mm",1e-3,5,0,800],["zli","Lower inner pivot, above ground","mm",1e-3,5,20,600],["yui","Upper inner pivot, from centreline","mm",1e-3,5,0,900],["zui","Upper inner pivot, above ground","mm",1e-3,5,60,900]]],
  ["Pivots fore-aft / 3D only",[["xlf","Lower arm front pivot, ahead of axle (− = behind)","mm",1e-3,5,-600,600],["xlr","Lower arm rear pivot, ahead of axle (− = behind)","mm",1e-3,5,-600,600],["xuf","Upper arm front pivot, ahead of axle (− = behind)","mm",1e-3,5,-600,600],["xur","Upper arm rear pivot, ahead of axle (− = behind)","mm",1e-3,5,-600,600],["ee","Lower arm outer pivots: rear one this far behind the front one","mm",1e-3,5,20,400]]],
  ["Upright",[["hsp","Spindle height above lower ball joint","mm",1e-3,5,0,500],["hf","Hub face outboard of kingpin","mm",1e-3,5,0,400],["xk","Wheel centre ahead of kingpin axis, side view","mm",1e-3,1,-60,60]]],
  ["Wheel",[["rimD","Rim diameter","in",0.0254,1,10,22],["rimW","Rim width","in",0.0254,0.5,4,12],["et","Offset (ET), + = wheel centre inboard of hub face","mm",1e-3,1,-60,90],["sp","Wheel spacer, pushes the wheel outboard","mm",1e-3,1,0,100]]],
  ["TIRE",[["tw","Section width","mm",1e-3,5,125,355],["ar","Aspect ratio","%",1e-2,5,25,85],["pk","Pressure","kPa",1e3,5,100,350],["R","Loaded radius","mm",1e-3,5,150,500],["kt","Vertical rate","N/mm",1e3,10,50,1000]]],
  ["Alignment",[["cam0","Static camber","°",1,0.1,-10,10],["caster","Caster","°",1,0.5,-5,20],["toe","Static toe per wheel, + = toe-in","°",1,0.05,-5,5]]],
  ["TIE",[["xto","Outer joint, ahead of axle (− = behind)","mm",1e-3,5,-400,400],["yto","Outer joint, from centreline","mm",1e-3,5,100,1100],["zto","Outer joint, above ground","mm",1e-3,5,20,800],["xti","Inner joint, ahead of axle (− = behind)","mm",1e-3,5,-500,500],["yti","Inner joint, from centreline","mm",1e-3,5,0,800],["zti","Inner joint, above ground","mm",1e-3,0.1,20,800]]],
  ["Coilover",[["fMount","Mount on lower arm (fraction from inner pivot)","",1,0.05,0.2,1],["ydm","Top mount, from centreline","mm",1e-3,5,0,900],["zdm","Top mount, above ground","mm",1e-3,5,100,1200]]],
  ["Travel limits",[["bump","Bump travel (to bump stop)","mm",1e-3,5,10,200],["droop","Droop travel (to limit)","mm",1e-3,5,10,200]]]
];
const SPR=[
  ["Rates",[["k","Spring rate","N/mm",1e3,5,5,500],["arb","Anti-roll bar rate at wheel","N/mm",1e3,1,0,200]]],
  ["Damper / bump",[["cbl","Low-speed slope","N·s/m",1,100,0,20000],["cbh","High-speed slope","N·s/m",1,100,0,20000],["vkb","Knee speed","mm/s",1e-3,10,5,1000]]],
  ["Damper / rebound",[["crl","Low-speed slope","N·s/m",1,100,0,20000],["crh","High-speed slope","N·s/m",1,100,0,20000],["vkr","Knee speed","mm/s",1e-3,10,5,1000]]]
];
const VEH=[
  ["Mass",[["M","Sprung mass","kg",1,10,100,5000],["mu","Unsprung mass per corner","kg",1,1,10,150],["Ixx","Roll inertia about the CG (sprung)","kg·m²",1,10,20,3000],["Iyy","Pitch inertia about the CG (sprung)","kg·m²",1,10,100,15000]]],
  ["Layout",[["L","Wheelbase","mm",1e-3,10,1000,5000],["wf","Front weight share","%",1e-2,0.5,20,80],["h","CG height at design ride height","mm",1e-3,5,100,1500]]]
];
const STEER=[
  ["Rack",[["c","Rack travel per steering-wheel turn","mm",1e-3,1,20,150],["rmax","Rack travel each way","mm",1e-3,1,10,120]]],
  ["SPEED",[["speed","Speed","km/h",1/3.6,5,5,250],["grip","Grip limit","g",1,0.05,0.3,2.5]]]
];
function check(P){
  const one=(obj,groups,who)=>{for(const [,fs] of groups) for(const [k,lab,u,sc,,mn,mx] of fs){
    const x=obj[k]/sc; if(!(Number.isFinite(x)&&x>=mn-1e-9&&x<=mx+1e-9)) throw new Error(who+lab+" must be between "+mn+" and "+mx+(u?" "+u:"")+".");}};
  one(P.veh,VEH,""); one(P.steer,STEER,"");
  for(let a=0;a<2;a++){const who=a?"Rear: ":"Front: "; one(P.ax[a].g,GEO,who); one(P.ax[a].s,SPR,who);}
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
  const cz=g.R*Math.cos(g.cam0*D2R);
  const ds=g.hf-g.et+g.sp;                                             // wheel centre outboard of the kingpin axis: hub face minus wheel offset
  const f=a=>{const k=fv(g,a); return k? k.lz+g.hsp*k.vz-ds*k.vy-cz : NaN;};
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
  const k=fv(g,best), tk=Math.tan(g.caster*D2R), xk=g.xk||0;
  const Sy=k.ly+g.hsp*k.vy, Sz=k.lz+g.hsp*k.vz;                  // spindle root on the kingpin axis; the wheel centre sits xk ahead of it
  const xl=(Sz-k.lz)*tk-xk, xu=-(k.uz-Sz)*tk-xk;                  // ball-joint x offsets that give the caster angle
  const LBJ=[xl,k.ly,k.lz], UBJ=[xu,k.uy,k.uz], WC=[0,Sy+ds*k.vz,Sz-ds*k.vy];
  const c0=g.cam0*D2R, d0=-g.toe*D2R;                             // local steer angle is + outboard, so toe-in is negative
  const av0=[-Math.sin(d0)*Math.cos(c0),Math.cos(d0)*Math.cos(c0),-Math.sin(c0)];   // spindle direction, pointing outboard
  const rear=name==="Rear";                                      // rear: the lower arm's second leg (rear inner pivot to a second outer pivot) holds the toe
  const TRO=rear?[xl-g.ee,k.ly,k.lz]:[g.xto,g.yto,g.zto], TRI=rear?[g.xlr,g.yli,g.zli]:[g.xti,g.yti,g.zti], Lt=vlen(vsub(TRO,TRI));
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
  const T={D,g,nr,ns,sLo,sHi,dS,rLo,dR,j0,rmax,L:new Float64Array(N),MR:new Float64Array(N),cam:new Float64Array(N),steer:new Float64Array(N),
           cpx:new Float64Array(N),cpy:new Float64Array(N),al:new Float64Array(N),sa:new Float64Array(N),rch:new Float64Array(ns),dtr:new Float64Array(ns)};
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
      T.L[o]=p.L; T.cam[o]=p.cam/D2R; T.steer[o]=p.steer/D2R; T.cpx[o]=p.CP[0]; T.cpy[o]=p.CP[1]; T.al[o]=al; T.sa[o]=armTravel(al);
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
  T.kpi=Math.atan2(P0.LBJ[1]-P0.UBJ[1],P0.UBJ[2]-P0.LBJ[2])/D2R; T.scrub=P0.CP[1]-T.kp[1]; T.trail=T.kp[0]-P0.CP[0];
  T.sgn=nr>1?(lk2(T,T.steer,0,dR)>=lk2(T,T.steer,0,0)?1:-1):1;                     // rack direction that steers right
  if(T.MR0<0.05) throw new Error(name+": the coilover barely moves with the wheel (motion ratio "+T.MR0.toFixed(3)+"). Move its mount further out on the arm or align it with wheel travel.");
  if(T.tHalf<=0.05) throw new Error(name+": the contact patch ends up at or past the centreline.");
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

const kinCache=[null,null];
function tables(g,name,rmax,slot){
  const key=JSON.stringify(g)+"|"+rmax, c=kinCache[slot];
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

/* ---- vehicle model ---- */
function makeModel(P){
  check(P);
  const T=[tables(P.ax[0].g,"Front",P.steer.rmax,0),tables(P.ax[1].g,"Rear",0,1)];
  const v=P.veh, a=v.L*(1-v.wf), b=v.L*v.wf;
  const m={P,T,a,b,xs:[a,a,-b,-b],ys:[-T[0].tHalf,T[0].tHalf,-T[1].tHalf,T[1].tHalf],W:[],Ws:[],d0:[],Fpre:[],FpreDesign:[],st:[],zt:[],arbOff:[0,0],zs:0};
  const yF=T[0].tHalf, yR=T[1].tHalf, zt=m.zt;
  for(let i=0;i<4;i++){const g=P.ax[i<2?0:1].g; zt[i]=Math.min(g.droop-0.002,Math.max(-(g.bump-0.002),P.dh[i]));}   // target body height at each corner
  /* Body attitude at the targets (best-fit plane). A tilted body carries its CG off-centre over the wheels,
     so the corner loads the perches must hold differ slightly from the level-car loads. */
  const zF=(zt[0]+zt[1])/2, zR=(zt[2]+zt[3])/2, th=(zF-zR)/v.L, ph=(yF*(zt[1]-zt[0])+yR*(zt[3]-zt[2]))/(2*(yF*yF+yR*yR));
  m.zs=(zF*b+zR*a)/v.L;
  const hcg=v.h+m.zs, hra=lk1(T[0],T[0].rch,-zF)*v.wf+lk1(T[1],T[1].rch,-zR)*(1-v.wf), ycg=-(hcg-hra)*ph;
  const WF=v.M*G*(v.wf-hcg*th/v.L), WR=v.M*G-WF;
  for(let i=0;i<4;i++){
    const ax=i<2?0:1, g=P.ax[ax].g, s=P.ax[ax].s, Tx=T[ax], side=i%2===0?-1:1;
    const Wn=v.M*G*(ax===0?v.wf:1-v.wf)/2, W=(ax===0?WF:WR)*(0.5+side*ycg/(2*(ax===0?yF:yR)));
    const st=(Wn-W)/g.kt-zt[i];                                 // wheel travel at the target, allowing for the tire's deflection change
    m.W[i]=Wn; m.Ws[i]=W; m.d0[i]=(Wn+v.mu*G)/g.kt; m.st[i]=st;
    m.Fpre[i]=W/lk2(Tx,Tx.MR,st,0)-s.k*(Tx.L0-lk2(Tx,Tx.L,st,0));
    m.FpreDesign[i]=Wn/Tx.MR0;
  }
  m.arbOff=[m.st[0]-m.st[1],m.st[2]-m.st[3]];
  return m;
}
function newState(){return {t:0,z:0,zd:0,th:0,thd:0,ph:0,phd:0,zw:[0,0,0,0],zwd:[0,0,0,0],ev:[],out:[{},{},{},{}],hrc:[0,0],hp:0};}

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

/* One time step. inp: {ay, ax in g; Fp N at (xp, yp) m from the CG; rack m, + = toward the car's right}. */
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
    Fw[i]=F; const o=out[i]; o.s=s[i]; o.sa=sa[i]; o.vd=vd; o.Fs=Fs;
  }
  for(let ax=0;ax<2;ax++){
    const k=P.ax[ax].s.arb, iL=ax*2, iR=iL+1, dif=(sa[iL]-sa[iR])-m.arbOff[ax];
    Fw[iL]+=k*dif; Fw[iR]-=k*dif;
  }
  const ay=inp.ay*G, axl=inp.ax*G;
  const hrcF=lk1(T[0],T[0].rch,(sa[0]+sa[1])/2), hrcR=lk1(T[1],T[1].rch,(sa[2]+sa[3])/2);
  st.hrc[0]=hrcF; st.hrc[1]=hrcR;
  const hra=hrcF+(hrcR-hrcF)*m.a/v.L, hcg=v.h+st.z, hp=hcg-hra;   // CG height follows the body; hp = CG above the roll axis
  st.hp=hp;
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
    const o=out[i]; o.Ft=Ft; o.Fw=Fw[i]; o.zg=gr[0];
  }
  st.zd+=Fz/v.M*dt; st.thd+=Mth/v.Iyy*dt; st.phd+=Mph/(v.Ixx+v.M*hp*hp)*dt;   // the body rolls about the roll axis (parallel-axis term)
  if(extraDamp){const f=1-extraDamp; st.zd*=f; st.thd*=f; st.phd*=f; for(let i=0;i<4;i++) st.zwd[i]*=f;}
  st.z+=st.zd*dt; st.th+=st.thd*dt; st.ph+=st.phd*dt;
  for(let i=0;i<4;i++) st.zw[i]+=st.zwd[i]*dt;
  st.t+=dt;
  if(st.ev.length&&st.ev.every(e=>st.t>e.t0+e.dur)) st.ev=[];
}
function settle(m,st,inp,sec){const n=Math.round(sec/DT); for(let k=0;k<n;k++) step(m,st,inp,DT,0.002);}
function finite(st){return Number.isFinite(st.z+st.th+st.ph+st.zd+st.thd+st.phd+st.zw[0]+st.zw[1]+st.zw[2]+st.zw[3]+st.zwd[0]+st.zwd[1]+st.zwd[2]+st.zwd[3]);}

/* Road-wheel angles (deg, + = right), Ackermann and the low-speed turn for a rack position and the front wheel travels. */
function steerInfo(m,rack,sL,sR){
  const T=m.T[0], v=m.P.veh;
  const dL=-lk2(T,T.steer,sL,-rack), dR=lk2(T,T.steer,sR,rack), dm=(dL+dR)/2*D2R;
  const kra=Math.tan(dm)/v.L, right=dm>=0, di=Math.abs(right?dR:dL), dout=Math.abs(right?dL:dR);
  let ack=NaN;
  if(di>2){const tk=2*T.kp[1], ideal=Math.atan(1/(1/Math.tan(di*D2R)+tk/v.L))/D2R; ack=(di-dout)/(di-ideal)*100;}
  const kay=kra/(1+m.b*m.b*kra*kra);                              // lateral acceleration at the CG = v^2 * kay
  const turn=Math.abs(kra)>1e-6, Rr=turn?1/Math.abs(kra):Infinity;   // radius of the rear axle's centre
  return {dL,dR,di,dout,ack,kra,kay,R:turn?Math.hypot(Rr,m.b):Infinity,Ro:turn?Math.hypot(Rr+T.tHalf,v.L):Infinity};   // R at the CG, Ro at the outer front tire
}

/* Derived setup numbers at the target ride heights (linearised about the static position). */
function sheet(m){
  const P=m.P, v=P.veh, r={ax:[]}, hs=v.h+m.zs; let Kr=0, Kth=0, Kz=0, Kzx=0;
  for(let ax=0;ax<2;ax++){
    const T=m.T[ax], s=P.ax[ax].s, g=P.ax[ax].g, t=2*T.tHalf, ms=m.W[ax*2]/G, i=ax*2, st=(m.st[i]+m.st[i+1])/2, e=0.002;
    const Fw=x=>Math.max(0,m.Fpre[i]+s.k*(T.L0-lk2(T,T.L,x,0)))*lk2(T,T.MR,x,0);
    const MR=lk2(T,T.MR,st,0), kw=(Fw(m.st[i]+e)-Fw(m.st[i]-e))/(2*e);          // tangent wheel rate: k*MR^2 plus the motion-ratio change term
    const kr=kw*g.kt/(kw+g.kt), fr=Math.sqrt(kr/ms)/(2*Math.PI), cc=2*Math.sqrt(kw*ms);
    const Ks=(kw/2+s.arb)*t*t, Kt=g.kt*t*t/2, Kax=1/(1/Ks+1/Kt), rch=lk1(T,T.rch,st);
    const Mg=v.M*(ax===0?v.wf:1-v.wf)*rch+2*v.mu*g.R;                             // link + unsprung load-transfer moment per unit lateral acceleration
    Kr+=Kax; Kth+=2*kr*m.xs[i]*m.xs[i]; Kz+=2*kr; Kzx+=2*kr*m.xs[i];
    r.ax.push({MR,kw,kr,fr,zb:s.cbl*MR*MR/cc,zr:s.crl*MR*MR/cc,rch,t,Kax,Kt,Mg,cam:lk2(T,T.cam,st,0),toe:-lk2(T,T.steer,st,0),
      camGain:(lk2(T,T.cam,st+e,0)-lk2(T,T.cam,st-e,0))/(2*e)*0.01, bumpSteer:-(lk2(T,T.steer,st+e,0)-lk2(T,T.steer,st-e,0))/(2*e)*0.01,
      kpi:T.kpi,caster:g.caster,scrub:T.scrub,trail:T.trail});
  }
  const A=r.ax, hra=A[0].rch*v.wf+A[1].rch*(1-v.wf), hp=hs-hra, MgH=v.M*G*hp, MgHs=v.M*G*hs;
  Kth-=Kzx*Kzx/Kz;                                               // the body is free to heave, which softens pitch slightly
  r.hra=hra; r.hs=hs; r.hp=hp; r.Kr=Kr; r.Kth=Kth;
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
