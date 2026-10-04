/* ===== UI ===== */
const $=id=>document.getElementById(id);
const KEY="dws.setup.nb4", SKEY="dws.session.nb4", CN=["FL","FR","RL","RR"];
function merge(def,src){
  if(Array.isArray(def)) return def.map((d,i)=>merge(d,src&&src[i]));
  if(def&&typeof def==="object"){const o={}; for(const k in def) o[k]=merge(def[k],src&&src[k]); return o;}
  return (typeof src==="number"&&Number.isFinite(src))?src:def;
}
/* What the 3D view draws for a setup's look (0: the stock car, 1: Coen's): a body shell and a rim, both from body-model.js. The shells' heights
   are measured from the hub line of the stock car at stock height, which is HUB0 above the ground in body coordinates. */
const LOOKS=[{body:"rs",rim:"rs"},{body:"gv",rim:"gl"}], HUB0=stockCar().ax[0].g.R;
/* A stored or imported setup laid over the defaults. One saved before version 41 has a free camber field; fromOldCamber turns it into the adjuster. */
let camNote="";
function fromSaved(j){const p=merge(defaults(),j), cut=fromOldCamber(p,j); if(!LOOKS[p.look]) p.look=0; camNote=cut.length?" Its "+cut.join(" and ")+" camber was more than the adjuster allows and is held at the adjuster's limit; shorten the upper arm for more.":""; return p;}
function loadSaved(){try{const t=localStorage.getItem(KEY); if(!t) return null; const p=fromSaved(JSON.parse(t)); makeModel(p); return p;}catch(e){return null;}}
const CAR={stock:["Stock","stock"],coen:["Coen's","coens"],session:["Session","session"]};      // [name shown, name in file names]
const stamp=(d,time)=>{const p2=n=>String(n).padStart(2,"0"); return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate())+(time?" "+p2(d.getHours())+":"+p2(d.getMinutes()):"");};
let presetName=null, presetLock=false; try{presetName=localStorage.getItem("dws.preset")||null;}catch(e){}      // which car button is lit; any edit clears it
function save(){try{const t=JSON.stringify(P); localStorage.setItem(KEY,t); if(!presetLock){presetName="session"; localStorage.setItem("dws.preset","session"); localStorage.setItem(SKEY,t);}}catch(e){} markPreset();}   // an edit makes the current setup the session setup
function markPreset(){const h=document.getElementById("preset"); if(h) h.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x.dataset.p===presetName));}
let P=PRESETS[presetName]?PRESETS[presetName]():loadSaved(); const restored=!!P; if(!P){P=defaults(); presetName="stock";}      // a lit Stock or Coen's button means that car as defined now, not a copy an older page saved
P.steer.link=0;                                                        // Drive is a mode, not part of a setup: every load starts with it off (floor still)
let model=makeModel(P), S=newState();
const inp={ay:0,ax:0,Fp:0,xp:1.1,yp:-0.6,rack:0,U:0};      // U > 0: the car is driven and the tires set the lateral g
let running=true, speed=1, editAxle=0, viewAxle=0, linkMode="pair", swDeg=0, ayManual=0, stepAcc=0;
/* Where the car is on the ground while it is driven (Drive): heading psi (+ = turned right) and position, wrapped to the floor grid's
   coarsest spacing. The 3D view keeps the car still and moves the floor the opposite way. d is the distance covered in the last drawn frame.
   roll is how far the wheels have rolled. It gains at most ROLL_MAX a frame, so at speed the spokes turn steadily forward instead of seeming
   to stand still or run backwards. */
const GND={psi:0,x:0,y:0,d:0,roll:0}, GWRAP=4, ROLL_MAX=0.08;
let bodyOn=false; try{bodyOn=localStorage.getItem("dws.body")==="car";}catch(e){}      // 3D view: the plain chassis box (the start-up view), or the car body
/* Colors and fonts come from the OL! tokens in style.css. The palette is closed (black, grays, midnight, ice),
   so parts and data series differ by lightness, line weight and dash, never by hue. */
let COL={};
function readColors(){
  const cs=getComputedStyle(document.documentElement), g=n=>cs.getPropertyValue(n).trim();
  COL={vinyl:g("--vinyl"),dim:g("--vinyl-dim"),ghost:g("--vinyl-ghost"),edge:g("--edge"),hairline:g("--hairline"),gunmetal:g("--gunmetal"),glass:g("--glass"),
       midnight:g("--midnight"),void:g("--void"),ice:g("--ice"),armL:g("--arm-lower"),armU:g("--arm-upper"),osd:g("--font-osd")};
}
readColors();
const OSD=px=>px+"px "+COL.osd, DASH=[7,5];      // canvas text is set in the read-out face; the right wheel's line is dashed
function setStatus(t,err){const s=$("status"); s.textContent=(err?"ERR: ":"")+t; s.classList.toggle("err",!!err);}
const unitTxt=u=>u?(u==="°"?"°":" "+u):"";
const sgnTxt=(v,d)=>{const t=Math.abs(v).toFixed(d); return (+t===0?"":v>=0?"+":"−")+t;};
const num=(v,d)=>{const t=v.toFixed(d); return (+t===0?Math.abs(+t).toFixed(d):t).replace("-","−");};

/* ---- forms ---- */
function fmtIn(v,sc){return String(+(v/sc).toFixed(4));}
function buildFields(host,groups,getObj,prefix,who,titleOf,mode){      // mode: the fields are not part of a setup, so an edit is not saved as one
  host.textContent="";
  for(const [title,fs] of groups){
    const fsEl=document.createElement("fieldset"), lg=document.createElement("legend");
    lg.textContent=titleOf?titleOf(title):title; fsEl.appendChild(lg); fsEl.dataset.g=title;
    for(const [k,lab,u,sc,stp,mn,mx,kind] of fs){
      const id=prefix+"-"+k, row=document.createElement("div"), slider=kind==="slider"; row.className=slider?"sl":"f";
      row.innerHTML=slider?`<label for="${id}">${lab}</label><output id="${id}O"></output><input id="${id}" type="range" step="${stp}" min="${mn}" max="${mx}">`
        :`<label for="${id}">${lab}</label><input id="${id}" type="number" step="${stp}" min="${mn}" max="${mx}"><span class="u">${u}</span>`;
      const el=row.querySelector("input"), show=()=>{if(slider) row.querySelector("output").textContent=sgnTxt(+el.value,2)+unitTxt(u);}; el.value=fmtIn(getObj()[k],sc); show();
      if(slider) el.addEventListener("input",show);      // the read-out follows the thumb; the car is re-solved when it is let go
      el.addEventListener("change",()=>{
        const x=parseFloat(el.value);
        if(!Number.isFinite(x)||x<mn||x>mx){setStatus(who+lab+" must be between "+mn+" and "+mx+(u?" "+u:"")+". Value not changed.",true); el.value=fmtIn(getObj()[k],sc); return;}
        const old=getObj()[k], tire=k==="R"&&Math.abs(x*sc-old)>1e-9;
        if(!applyEdit(()=>{getObj()[k]=x*sc; if(tire) tireMoved(editAxle,x*sc-old);},tire?tireMsg(editAxle,x*sc-old):null,mode)){el.value=fmtIn(getObj()[k],sc); show();}
        else if(tire) renderForms();
      });
      fsEl.appendChild(row);
    }
    host.appendChild(fsEl);
  }
}
/* Which field groups each tab shows. The rear has no tie rod (its lower arm has two outer pivots, field "ee"); the front has no second outer pivot. */
const GEO_TABS={geo:["Wishbones","Chassis pivots","Pivots fore-aft / 3D only","Upright","Alignment"],whl:["Wheel","TIRE","GRIP"],spr:["Coilover","Travel limits"]};
const geoFor=(a,names)=>GEO.filter(([t])=>names.includes(t)).map(([t,fs])=>[t,fs.filter(f=>a||f[0]!=="ee")]);
const TIRE_KINDS=[["street","Street"],["sport","Sporty street"],["semi","Semi-slick"]];
function renderForms(){
  const who=editAxle?"Rear: ":"Front: ", gObj=()=>P.ax[editAxle].g;
  buildFields($("geoFields"),geoFor(editAxle,GEO_TABS.geo),gObj,"g",who);
  {const al=$("geoFields").querySelector('fieldset[data-g="Alignment"]'), p=document.createElement("p"); p.className="hint"; p.id="camNow"; al.insertBefore(p,al.children[2]);}      // filled by refreshStatic
  buildFields($("whlFields"),geoFor(editAxle,GEO_TABS.whl),gObj,"g",who,t=>t==="TIRE"?"Tire":t==="GRIP"?"Tire grip / typical, not measured":t);
  {const tf=$("whlFields").querySelector('fieldset[data-g="TIRE"]'), r2=document.createElement("div"), t=tireFromSize(P,editAxle);
   r2.className="rowbtns"; r2.innerHTML='<button class="btn" id="fitTire">Estimate from size</button>'; tf.appendChild(r2);
   const h2=document.createElement("p"); h2.className="hint";
   h2.textContent="Free radius "+(t.free*1000).toFixed(0)+" mm from the size. The button sets the rate from Rhyne's empirical formula and the loaded radius as free radius − static load ÷ rate. An estimate.";
   tf.appendChild(h2); $("fitTire").onclick=fitTire;}
  {const gf=$("whlFields").querySelector('fieldset[data-g="GRIP"]'), g=gObj(), row=document.createElement("div");
   const cur=TIRE_KINDS.find(([k])=>Object.keys(TIRE_PRESETS[k]).every(q=>Math.abs(TIRE_PRESETS[k][q]-g[q])<1e-9));
   row.className="f"; row.innerHTML='<label for="tireKind">Kind of tire</label><select id="tireKind" class="wide">'+(cur?"":'<option value="">Custom</option>')+TIRE_KINDS.map(([k,n])=>`<option value="${k}"${cur&&cur[0]===k?" selected":""}>${n}</option>`).join("")+'</select>';
   gf.insertBefore(row,gf.children[1]);
   const h3=document.createElement("p"); h3.className="hint";
   h3.textContent="Picking a kind fills the five numbers with typical values. Tire makers do not publish these, so the size of a result is a guess; the direction of a change is more reliable.";
   gf.appendChild(h3);
   $("tireKind").onchange=()=>{const k=$("tireKind").value; if(k&&applyEdit(()=>{Object.assign(P.ax[editAxle].g,TIRE_PRESETS[k]);},"Tire grip set to typical "+TIRE_KINDS.find(q=>q[0]===k)[1].toLowerCase()+" values.")) renderForms();};}
  buildFields($("sprFields"),SPR,()=>P.ax[editAxle].s,"s",who);
  buildFields($("sprGeoFields"),geoFor(editAxle,GEO_TABS.spr),gObj,"g",who,t=>t==="Coilover"?"Coilover mount":t);
  buildFields($("vehFields"),VEH,()=>P.veh,"v","");
  buildFields($("strFields"),[STEER[0],STEER[2]],()=>P.steer,"st","");
  const cf=$("strFields").querySelector('fieldset[data-g="Cut knuckles"]'), cc=document.createElement("label");
  cc.className="chk"; cc.innerHTML='<input type="checkbox" id="cut"> Cut knuckles'; cf.insertBefore(cc,cf.children[1]);
  const ch=document.createElement("p"); ch.className="hint";
  ch.textContent="Shortens the front steering arm: the tie rod's outer joint moves toward the kingpin axis by this much, and the tie rod is re-set so static toe holds. The wheels turn further for the same rack travel.";
  cf.appendChild(ch);
  $("cut").checked=!!P.steer.cut;
  $("cut").onchange=()=>{const on=$("cut").checked; if(!applyEdit(()=>{P.steer.cut=on?1:0;},on?"Cut knuckles on.":"Cut knuckles off.")) $("cut").checked=!!P.steer.cut;};
  buildFields($("tieFields"),GEO.filter(([t])=>t==="TIE"),()=>P.ax[0].g,"g","Front: ",()=>"Tie rod / to rack");
  {const tie=$("tieFields").querySelector("fieldset"), row=document.createElement("div");
   row.className="rowbtns"; row.innerHTML='<button class="btn" id="fitTie">Least bump steer</button>'; tie.appendChild(row);
   const th=document.createElement("p"); th.className="hint"; th.textContent="The outer joint moves with the upright; the inner joint sits on the rack. The button moves the inner joint to the height with the least toe change over the travel range."; tie.appendChild(th);
   $("fitTie").onclick=fitTie;}
  buildFields($("linkFields"),[STEER[1]],()=>P.steer,"st","",()=>"*Drive",true);      // on the Forces tab, under the lateral slider that Drive takes over
  const lf=$("linkFields").querySelector("fieldset"), hint=document.createElement("p"); hint.className="hint";
  hint.textContent="Turns off the lateral slider above. Calculates reactions from steering and speed. Grip driving only: there is no throttle, so it cannot hold a drift."; lf.insertBefore(hint,lf.children[1]);
  buildHeights(); camNow();
}
function camNow(cam){if($("camNow")) $("camNow").textContent="Camber at ride height now: "+num(cam===undefined?sheet(model).ax[editAxle].cam:cam,2)+"°. The wheel is fixed on the knuckle, so the arms set the camber: a shorter upper arm adds negative camber and kingpin angle. The adjuster adds up to +1° or −3° on top.";}
function syncLink(){
  const on=!!P.steer.link; $("ay").disabled=on; inp.U=on?P.steer.speed:0; if(!on) $("ay").value=ayManual;
  $("driveOn").setAttribute("aria-pressed",on);                     // the header button lights up
  const tb=$("tab-load"); tb.textContent=on?"*Forces":"Forces"; tb.classList.toggle("new",on);      // the star points at the tab that holds the Drive controls
  $("ayRow").classList.toggle("off",on); $("drvBox").hidden=!on;    // the lateral slider goes dark and the Drive controls appear under it
  $("ssGo").disabled=$("ssA").disabled=!on;
  readLoads();
}
$("driveOn").onclick=()=>{P.steer.link=P.steer.link?0:1; syncLink(); setStatus(P.steer.link?"Drive on: the tires make the lateral g. Speed and steering are on the Forces tab.":"Drive off.",false);};
/* A different loaded radius raises or lowers the car on that axle and leaves the suspension where it was, as a tire change does:
   the height targets move by the change. The travel limits move the other way, because the bump and droop stops stay with the dampers. */
function tireMoved(ax,dR){const g=P.ax[ax].g, lim=v=>Math.min(0.2,Math.max(0.01,v)); P.dh[ax*2]+=dR; P.dh[ax*2+1]+=dR; g.bump=lim(g.bump-dR); g.droop=lim(g.droop+dR);}
const tireMsg=(ax,dR)=>"Loaded radius changed by "+sgnTxt(dR*1000,1)+" mm: the "+(ax?"rear":"front")+" of the car sits "+Math.abs(dR*1000).toFixed(1)+" mm "+(dR<0?"lower":"higher")+". Travel limits moved with it.";
function applyEdit(fn,msg,mode){
  const backup=JSON.stringify(P);
  try{fn(); model=makeModel(P); if(!mode) save(); setStatus(msg||"Solved. Spring perches hold the target heights.",false); refreshStatic(); return true;}
  catch(e){P=JSON.parse(backup); setStatus(e.message+" Change reverted.",true); return false;}
}
function fitTire(){
  const t=tireFromSize(P,editAxle), kt=Math.round(t.kt/100)*100, R=Math.round(t.R*1e4)/1e4;
  const dR=R-P.ax[editAxle].g.R;
  if(applyEdit(()=>{const g=P.ax[editAxle].g; g.kt=kt; g.R=R; tireMoved(editAxle,dR);},"Tire set from its size: rate "+(kt/1000).toFixed(1)+" N/mm, loaded radius "+(R*1000).toFixed(1)+" mm. "+(Math.abs(dR)>1e-9?tireMsg(editAxle,dR):""))) renderForms();
}
function fitTie(){
  let z;
  try{z=Math.round(bestTieHeight(frontG(P),"Front")*1e4)/1e4;}catch(e){setStatus(e.message,true); return;}
  if(applyEdit(()=>{P.ax[0].g.zti=z;},"Inner joint moved to "+(z*1000).toFixed(1)+" mm above ground. Check the toe curve.")) $("g-zti").value=fmtIn(z,1e-3);
}

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.setAttribute("aria-selected",x===b));
  ["geo","whl","spr","str","load","veh"].forEach(t=>$("p-"+t).hidden=(t!==b.dataset.t));
}));
document.querySelectorAll(".axleSel").forEach(sg=>sg.addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return; editAxle=+b.dataset.a;
  document.querySelectorAll(".axleSel button").forEach(x=>x.setAttribute("aria-pressed",+x.dataset.a===editAxle));
  $("copyGeo").textContent=$("copySpr").textContent="Copy to "+(editAxle?"front":"rear");
  renderForms(); refreshStatic();
}));
const TIE_KEYS=GEO.find(([t])=>t==="TIE")[1].map(f=>f[0]);      // the front tie rod's six numbers stay with the front
$("copyGeo").onclick=()=>{if(applyEdit(()=>{const src=P.ax[editAxle].g, dst=P.ax[1-editAxle].g, dR=src.R-dst.R; for(const k in src) if(!TIE_KEYS.includes(k)) dst[k]=src[k]; P.dh[(1-editAxle)*2]+=dR; P.dh[(1-editAxle)*2+1]+=dR;},"Geometry copied to the "+(editAxle?"front":"rear")+" axle.")) buildHeights();};
$("copySpr").onclick=()=>applyEdit(()=>{P.ax[1-editAxle].s=JSON.parse(JSON.stringify(P.ax[editAxle].s));},"Springs and dampers copied to the "+(editAxle?"front":"rear")+" axle.");
$("speed").addEventListener("click",e=>{const b=e.target.closest("button"); if(!b) return; speed=+b.dataset.v;
  $("speed").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b)); $("oSpeed").textContent=b.textContent;});
$("play").onclick=()=>{running=!running; $("play").textContent=running?"Pause":"Run";};
/* Space bar runs and pauses from anywhere on the page, whatever has the focus (so it never presses a focused button or ticks a box). */
{const sp=e=>(e.code==="Space"||e.key===" ")&&!e.ctrlKey&&!e.metaKey&&!e.altKey;
 document.addEventListener("keydown",e=>{if(!sp(e)) return; e.preventDefault(); if(!e.repeat) $("play").click();},true);
 document.addEventListener("keyup",e=>{if(sp(e)) e.preventDefault();},true);}
function resettle(sec){S=newState(); settle(model,S,inp,sec); S.t=0; histClear(); GND.psi=GND.x=GND.y=0;}
$("reset").onclick=()=>resettle(4);
function loadPreset(name,q0){
  const label=CAR[name][0];
  try{
    let q;
    if(q0) q=q0;                                                         // a setup read from a file
    else if(name==="session"){
      let t=null; try{t=localStorage.getItem(SKEY);}catch(e){}
      if(!t) q=defaults();                                               // no session saved yet: it starts as the start-up car
      else q=fromSaved(JSON.parse(t));
    } else q=PRESETS[name]();
    makeModel(q); q.steer.link=0; q.steer.speed=P.steer.speed; P=q;      // Drive and its speed are a mode, not part of a car
  }catch(e){setStatus(e.message,true); return;}
  model=makeModel(P); presetLock=true; presetName=name; save(); presetLock=false; try{localStorage.setItem("dws.preset",name);}catch(e){} markPreset();
  ["ay","ax","fp"].forEach(id=>$(id).value=0); swDeg=0; inp.rack=0; $("sw").value=0; ayManual=0;
  renderForms(); refreshStatic(); syncLink(); resettle(3); setStatus((name==="session"?"Session setup loaded.":label+" car loaded.")+(name==="session"&&!q0?camNote:""),false);
}
$("preset").addEventListener("click",e=>{const b=e.target.closest("button"); if(b) loadPreset(b.dataset.p);});
markPreset();
$("viewAxle").addEventListener("click",e=>{const b=e.target.closest("button"); if(!b) return; viewAxle=+b.dataset.a;
  $("viewAxle").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b)); curveStatic();});

{const sel=$("bodySel"), sync=()=>sel.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",(x.dataset.b==="car")===bodyOn));
 if(!window.CAR_MODELS){bodyOn=false; sel.hidden=true;}
 sel.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b) return; bodyOn=b.dataset.b==="car"; try{localStorage.setItem("dws.body",bodyOn?"car":"box");}catch(e2){} sync();});
 sync();}

/* ---- loads ---- */
function readLoads(){
  if(!P.steer.link){ayManual=+$("ay").value; inp.ay=ayManual;}
  inp.ax=+$("ax").value; inp.Fp=+$("fp").value; inp.xp=+$("xp").value/1000; inp.yp=+$("yp").value/1000;
  $("ayO").textContent=sgnTxt(inp.ay,2)+" g"; $("axO").textContent=sgnTxt(inp.ax,2)+" g";
  $("fpO").textContent=inp.Fp.toFixed(0)+" N"; $("xpO").textContent=(inp.xp*1000).toFixed(0)+" mm"; $("ypO").textContent=(inp.yp*1000).toFixed(0)+" mm";
}
["ay","ax","fp","xp","yp"].forEach(id=>$(id).addEventListener("input",readLoads));
$("zeroLoads").onclick=()=>{["ay","ax","fp"].forEach(id=>$(id).value=0); readLoads();};
function bumpParams(){
  const cl=(id,lo,hi,d)=>{const x=parseFloat($(id).value); return Number.isFinite(x)?Math.min(hi,Math.max(lo,x)):d;};
  return {h:cl("bh",0,150,40)/1000,len:cl("bl",50,5000,300)/1000,v:cl("bv",1,250,30)/3.6,side:$("bs").value};
}
$("drive").onclick=()=>{
  const b=bumpParams(), dur=b.len/b.v, t0=S.t+0.05, tr=t0+P.veh.L/b.v;
  if(b.side!=="right") S.ev.push({i:0,t0,dur,h:b.h},{i:2,t0:tr,dur,h:b.h});
  if(b.side!=="left") S.ev.push({i:1,t0,dur,h:b.h},{i:3,t0:tr,dur,h:b.h});
};
document.querySelectorAll("[data-hit]").forEach(btn=>btn.onclick=()=>{const b=bumpParams(); S.ev.push({i:+btn.dataset.hit,t0:S.t+0.05,dur:b.len/b.v,h:b.h});});

/* ---- steering ---- */
function swMax(){return Math.floor(P.steer.rmax/P.steer.c*360);}
function setSw(d){const mx=swMax(); swDeg=Math.max(-mx,Math.min(mx,d)); $("sw").value=$("sw2").value=swDeg; $("swO").textContent=$("sw2O").textContent=sgnTxt(swDeg,0)+"°";}      // sw2: the same slider again among the Drive controls
$("sw").addEventListener("input",()=>setSw(+$("sw").value)); $("sw2").addEventListener("input",()=>setSw(+$("sw2").value));
$("swC").onclick=()=>setSw(0); $("swL").onclick=()=>setSw(-swMax()); $("swR").onclick=()=>setSw(swMax());
const rackTarget=()=>Math.max(-P.steer.rmax,Math.min(P.steer.rmax,model.T[0].sgn*swDeg/360*P.steer.c));
const swNow=()=>inp.rack/(model.T[0].sgn*P.steer.c)*360;
$("ssGo").onclick=()=>{
  const a=parseFloat($("ssA").value); if(!Number.isFinite(a)){setStatus("Step steer needs an angle in degrees.",true); return;}
  if(!P.steer.link) return;
  setSw(0); inp.rack=0; inp.U=P.steer.speed; resettle(1.5); setSw(a);
  setStatus("Step steer to "+sgnTxt(swDeg,0)+"° at "+(P.steer.speed*3.6).toFixed(0)+" km/h. The History panel shows the response.",false);
};

/* ---- heights ---- */
function buildHeights(){
  const host=$("htFields"); host.textContent="";
  for(let i=0;i<4;i++){
    const g=P.ax[i<2?0:1].g, lo=-Math.floor((g.bump-0.005)*1000), hi=Math.floor((g.droop-0.005)*1000), d=document.createElement("div");
    d.className="sl";
    d.innerHTML=`<label for="h${i}">${CN[i]} height change</label><output id="h${i}O"></output><input type="range" id="h${i}" min="${lo}" max="${hi}" step="1" value="${Math.round(P.dh[i]*1000)}">`;
    host.appendChild(d);
    const el=d.querySelector("input");
    el.addEventListener("input",()=>{
      const set=linkMode==="all"?[0,1,2,3]:linkMode==="pair"?(i<2?[0,1]:[2,3]):[i];
      for(const j of set){const e2=$("h"+j), v=Math.max(+e2.min,Math.min(+e2.max,+el.value)); P.dh[j]=v/1000; e2.value=v;}
      applyEdit(()=>{}); htLabels();
    });
  }
  htLabels();
}
function htLabels(){for(let i=0;i<4;i++) $("h"+i+"O").textContent=sgnTxt(P.dh[i]*1000,0)+" mm";}
$("htLink").addEventListener("click",e=>{const b=e.target.closest("button"); if(!b) return; linkMode=b.dataset.v;
  $("htLink").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b));});
$("zeroHt").onclick=()=>{P.dh=[0,0,0,0]; applyEdit(()=>{}); buildHeights();};

/* ---- static tables ---- */
function refreshStatic(){
  const r=sheet(model), A=r.ax, mm=v=>(v*1000);
  const row=(lab,f,u)=>`<tr><td>${lab}</td><td>${f(A[0])}</td><td>${f(A[1])}</td><td class="u">${u}</td></tr>`;
  const one=(lab,val,u)=>`<tr><td>${lab}</td><td colspan="2">${val}</td><td class="u">${u}</td></tr>`;
  const fin=(v,d)=>Number.isFinite(v)?num(v,d):"unstable";
  const grp=t=>`<tr class="grp"><th colspan="4">${t}</th></tr>`;
  const inch=v=>{const t=(v/0.0254).toFixed(1); return t.endsWith(".0")?t.slice(0,-2):t;};
  const G_=a=>P.ax[A.indexOf(a)].g, S_=a=>P.ax[A.indexOf(a)].s, ht=a=>{const k=A.indexOf(a)*2; return (P.dh[k]+P.dh[k+1])/2;};
  /* everyday setup numbers first (alignment, wheels, heights, springs), then how the car behaves, then the geometry detail */
  $("sheet").innerHTML=`<tr><th></th><th>Front</th><th>Rear</th><th></th></tr>`+
    grp("Alignment at ride height")+
    row("Camber",a=>num(a.cam,2),"°")+
    row("Toe-in per wheel",a=>num(a.toe,2),"°")+
    row("Caster",a=>num(a.caster,2),"°")+
    grp("Wheels and ride height")+
    row("Wheel",a=>inch(G_(a).rimD)+"×"+inch(G_(a).rimW)+" ET"+num(mm(G_(a).et),0),"in, mm")+
    row("Tire",a=>(G_(a).tw*1000).toFixed(0)+"/"+(G_(a).ar*100).toFixed(0)+"R"+inch(G_(a).rimD),"")+
    row("Wheel spacer",a=>mm(G_(a).sp).toFixed(0),"mm")+
    row("Track",a=>mm(a.t).toFixed(0),"mm")+
    row("Ride height from design height",a=>num(mm(ht(a)),0),"mm")+
    grp("Springs and dampers")+
    row("Spring rate",a=>(S_(a).k/1000).toFixed(1),"N/mm")+
    row("Anti-roll bar rate at wheel",a=>(S_(a).arb/1000).toFixed(1),"N/mm")+
    row("Wheel rate",a=>(a.kw/1000).toFixed(1),"N/mm")+
    row("Ride frequency",a=>a.fr.toFixed(2),"Hz")+
    row("Damping ratio, bump LS",a=>a.zb.toFixed(2),"ζ")+
    row("Damping ratio, rebound LS",a=>a.zr.toFixed(2),"ζ")+
    grp("Roll, pitch and grip")+
    one("Roll gradient",fin(r.rollGrad,2),"°/g")+
    one("Pitch gradient",fin(r.pitchGrad,2),"°/g")+
    one("Front lateral load transfer",(r.lltd*100).toFixed(1),"%")+
    `<tr><td>Cornering limit, front / rear tires</td><td colspan="2" id="balLim">…</td><td class="u">g</td></tr>`+
    `<tr><td>Runs out of grip first</td><td colspan="2" id="balEnd">…</td><td class="u"></td></tr>`+
    `<tr><td>Understeer gradient, 0.2 to 0.4 g</td><td colspan="2" id="balK">…</td><td class="u">°/g</td></tr>`+
    one("Roll frequency",Number.isFinite(r.rollFreq)?r.rollFreq.toFixed(2):"unstable","Hz")+
    grp("Steering")+
    one("Steering wheel, lock to lock",(2*r.swMax/360).toFixed(2),"turns")+
    one("Full lock, inner / outer wheel",r.lock.di.toFixed(1)+" / "+r.lock.dout.toFixed(1),"°")+
    one("Turn radius at full lock, at the CG",Number.isFinite(r.lock.R)?r.lock.R.toFixed(2):"–","m")+
    one("Turn radius at full lock, outer front tire",Number.isFinite(r.lock.Ro)?r.lock.Ro.toFixed(2):"–","m")+
    one("Steering ratio on center",r.ratio.toFixed(1),": 1")+
    one("Ackermann at full lock",Number.isFinite(r.lock.ack)?r.lock.ack.toFixed(0):"–","%")+
    grp("Geometry detail")+
    row("Roll center height",a=>num(mm(a.rch),0),"mm")+
    one("CG above roll axis",mm(r.hp).toFixed(0),"mm")+
    row("Camber gain in bump",a=>num(a.camGain,3),"°/10 mm")+
    row("Bump steer (toe-in)",a=>num(a.bumpSteer,3),"°/10 mm")+
    row("Motion ratio",a=>a.MR.toFixed(3),"")+
    row("Kingpin inclination",a=>num(a.kpi,2),"°")+
    row("Scrub radius",a=>num(mm(a.scrub),1),"mm")+
    row("Mechanical trail",a=>num(mm(a.trail),1),"mm");
  $("zeta").innerHTML=`<span>ζ bump LS, front <b>${A[0].zb.toFixed(2)}</b></span><span>rear <b>${A[1].zb.toFixed(2)}</b></span><span>ζ rebound LS, front <b>${A[0].zr.toFixed(2)}</b></span><span>rear <b>${A[1].zr.toFixed(2)}</b></span><span style="grid-column:1/-1">ζ = c·MR² ⁄ 2√(wheel rate · corner mass)</span>`;
  let ph=`<tr><th>Corner</th><th>Perch vs design</th><th>Spring force at design length</th></tr>`;
  for(let i=0;i<4;i++){
    const k=P.ax[i<2?0:1].s.k, dp=(model.Fpre[i]-model.FpreDesign[i])/k*1000;
    ph+=`<tr><td>${CN[i]}</td><td>${sgnTxt(dp,1)} mm</td><td>${num(model.Fpre[i],0)} N${model.Fpre[i]<0?" / LOOSE":""}</td></tr>`;
  }
  $("perch").innerHTML=ph;
  const T=model.T[editAxle], p=T.P0, f=v=>num(v*1000,1);
  const pr=(lab,v)=>`<tr><td>${lab}</td><td>${f(v[0])}</td><td>${f(v[1])}</td><td>${f(v[2])}</td></tr>`;
  $("pts").innerHTML=`<tr><th>mm</th><th>Ahead</th><th>From center</th><th>Height</th></tr>`+pr("Lower ball joint",p.LBJ)+pr("Upper ball joint",p.UBJ)+pr("Wheel center",p.WC)+pr("Contact patch",p.CP)+
    pr("Kingpin axis at ground",[T.kp[0],T.kp[1],0])+`<tr><td>Tie rod length</td><td colspan="3">${f(T.D.Lt)}</td></tr><tr><td>Steering arm length</td><td colspan="3">${f(T.D.arm)}</td></tr>`;
  camNow(A[editAxle].cam);
  const mx=swMax(); for(const sw of [$("sw"),$("sw2")]){sw.min=-mx; sw.max=mx;} setSw(swDeg);
  scheduleBalance();
  curveStatic();
}
/* Steady cornering sweep (core: balance). It takes a few tens of milliseconds, so it runs a moment after the last edit. */
let BAL=null, balKey="", balTimer=0;
function fillBalance(){
  if(!$("balLim")) return;
  if(!BAL){$("balLim").textContent=$("balEnd").textContent=$("balK").textContent="…"; return;}
  const top=BAL.ay[BAL.ay.length-1], f=v=>Number.isFinite(v)?v.toFixed(2):"over "+top.toFixed(2), F=BAL.limF, R=BAL.limR;
  $("balLim").textContent=f(F)+" / "+f(R);
  $("balEnd").textContent=!Number.isFinite(F)&&!Number.isFinite(R)?"Neither, up to "+top.toFixed(2)+" g":
    (Number.isFinite(F)&&(!Number.isFinite(R)||F<=R))?"Front: understeer"+(Number.isFinite(R)?", by "+(R-F).toFixed(2)+" g":""):"Rear: oversteer"+(Number.isFinite(F)?", by "+(F-R).toFixed(2)+" g":"");
  $("balK").textContent=Number.isFinite(BAL.K)?sgnTxt(BAL.K,2)+(BAL.K>0.005?" (understeer)":BAL.K<-0.005?" (oversteer)":" (neutral)"):"–";
}
function scheduleBalance(){
  const key=JSON.stringify([P.ax,P.veh,P.dh,P.steer.cut,P.steer.cutL,P.steer.rmax]);
  if(key===balKey&&BAL){fillBalance(); return;}
  BAL=null; fillBalance(); clearTimeout(balTimer);
  balTimer=setTimeout(()=>{try{BAL=balance(model); balKey=key;}catch(e){BAL=null;} fillBalance(); if($("curveQ").value==="grip") curveStatic();},180);
}

/* ---- per-frame derived values shared by the views ---- */
const FR={p:[null,null,null,null],cam:[0,0,0,0],steer:[0,0,0,0],si:null};
function computeFrame(){
  for(let i=0;i<4;i++){
    const ax=i<2?0:1, g=P.ax[ax].g, T=model.T[ax], side=i%2===0?-1:1, s=S.out[i].s||0, r=ax===0?side*inp.rack:0;
    const p=pose(g,T.D,lk2(T,T.al,s,r),r)||T.P0;
    FR.p[i]=p; FR.steer[i]=side*p.steer/D2R;
    FR.cam[i]=Math.asin(Math.max(-1,Math.min(1,-(p.av[2]+S.ph*side*p.av[1]+S.th*p.av[0]))))/D2R;      // camber to the road: body camber plus roll and pitch
  }
  FR.si=steerInfo(model,inp.rack,S.out[0].s||0,S.out[1].s||0);
}

/* ===== 3D ===== */
const view=$("view");
function init3D(){
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  view.insertBefore(renderer.domElement,view.firstChild);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(38,1,0.05,100);
  camera.position.set(3.7,1.9,3.5);
  const controls=new THREE.OrbitControls(camera,renderer.domElement);
  controls.target.set(0.15,0.35,0); controls.enableDamping=true; controls.update();
  scene.add(new THREE.HemisphereLight(0xffffff,0x445566,0.75));
  const sun=new THREE.DirectionalLight(0xffffff,0.8); sun.position.set(3,6,4); scene.add(sun);
  const std=o=>new THREE.MeshStandardMaterial(o);
  const M={lower:std({metalness:0.1,roughness:0.6}),upper:std({metalness:0.1,roughness:0.6}),upright:std({metalness:0.1,roughness:0.6}),coil:std({metalness:0.1,roughness:0.6}),
    tie:std({metalness:0.1,roughness:0.6}),rackH:std({metalness:0.1,roughness:0.6}),tire:std({roughness:0.9,flatShading:true}),rim:std({metalness:0.2,roughness:0.5,flatShading:true,side:THREE.DoubleSide}),body:std({transparent:true,opacity:0.30,depthWrite:false}),cg:std({}),bumpm:std({roughness:0.8}),
    car:std({transparent:true,opacity:0.09,depthWrite:false,flatShading:true,side:THREE.DoubleSide,metalness:0,roughness:0.8})};
  const LM={edge:new THREE.LineBasicMaterial({transparent:true,opacity:0.9}),coil:new THREE.LineBasicMaterial({}),axis:new THREE.LineDashedMaterial({dashSize:0.06,gapSize:0.04}),car:new THREE.LineBasicMaterial({transparent:true,opacity:0.55})};
  let grid=null, gridLv=[], chassis=null, chassisEdge=null, chKey="";
  const pivot=new THREE.Group(), bodyG=new THREE.Group(); pivot.add(bodyG); scene.add(pivot);
  const UP=new THREE.Vector3(0,1,0), ZA=new THREE.Vector3(0,0,1), tmp=new THREE.Vector3(), nv=new THREE.Vector3();
  const rod=(mat,r)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,12),mat); bodyG.add(m); return m;};
  const place=(m,a,b)=>{tmp.subVectors(b,a); const len=Math.max(1e-4,tmp.length()); m.position.copy(a).addScaledVector(tmp,0.5); m.scale.set(1,len,1); m.quaternion.setFromUnitVectors(UP,tmp.normalize());};
  const V=(x0,v,side)=>new THREE.Vector3(x0+v[0],v[2],side*v[1]);
  function buildChassis(){
    if(chassis){bodyG.remove(chassis); bodyG.remove(chassisEdge); chassis.geometry.dispose(); chassisEdge.geometry.dispose();}
    const len=model.a+model.b+0.7, w=2*Math.min(P.ax[0].g.yli,P.ax[1].g.yli)+0.1, geo=new THREE.BoxGeometry(len,0.46,Math.max(0.2,w));
    chassis=new THREE.Mesh(geo,M.body); chassis.position.set((model.a-model.b)/2,0.38,0);
    chassisEdge=new THREE.LineSegments(new THREE.EdgesGeometry(geo),LM.edge); chassisEdge.position.copy(chassis.position);
    bodyG.add(chassis); bodyG.add(chassisEdge);
  }
  const cgMesh=new THREE.Mesh(new THREE.SphereGeometry(0.035,16,12),M.cg); bodyG.add(cgMesh);
  const axisGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]), axisLine=new THREE.Line(axisGeo,LM.axis); bodyG.add(axisLine);
  /* Meshes from body-model.js (optional: without the file the view shows the box and plain rim discs). */
  const MD=window.CAR_MODELS||null, bytes=t=>Uint8Array.from(atob(t),ch=>ch.charCodeAt(0));
  const unpack=m=>{const q=new Uint16Array(bytes(m.pos).buffer), pos=new Float32Array(q.length);      // 16-bit coordinates back to meters
    for(let i=0;i<q.length;i++) pos[i]=m.min[i%3]+q[i]/65535*m.size[i%3];
    return {pos,idx:new Uint16Array(bytes(m.idx).buffer)};};
  const meshGeo=(pos,idx)=>{const geo=new THREE.BufferGeometry(); geo.setAttribute("position",new THREE.BufferAttribute(pos,3)); geo.setIndex(new THREE.BufferAttribute(idx,1)); return geo;};
  /* Car body: a see-through shell with lit edges that rides on the sprung mass. Each one is built the first time its car is shown. */
  const shells={};
  function shell(name){
    if(!shells[name]){
      const m=MD.body[name], u=unpack(m), geo=meshGeo(u.pos,u.idx), s=new THREE.Group();
      s.add(new THREE.Mesh(geo,M.car)); s.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,m.edge),LM.car)); bodyG.add(s); shells[name]=s;
    }
    return shells[name];
  }
  /* Wheels, built per axle from its numbers and rebuilt when one of them changes. The wheel's frame has z along the spin axis.
     Tire: a section turned about the axis. It starts on the bead seat, is widest (the section width) at half height and reaches the loaded
     radius at the tread, so it touches the ground. Rim: the look's rim mesh with its lip scaled to the rim diameter and its width to the rim
     width. Its center is then set along the axis so the mounting face sits at the wheel offset, and the spokes lean to follow; the center
     keeps its own depth unless the outer lip is nearer than that, so a high offset flattens the face and a low one leaves a dish. */
  const FLANGE=0.0175, LIPW=0.0127;      // a rim's lip stands this far above the bead seat and this far outside the nominal width, each side (m)
  const rims={}, wheels=[{key:""},{key:""}];
  function tireGeo(g){
    const rb=Math.min(g.rimD/2,g.R-0.01), hb=g.rimW/2, H=g.R-rb, h=g.tw/2;      // bead radius (held under the tread if the rim entered is larger than the tire), bead and section half widths, section height
    const half=[[hb,rb],[hb+(h-hb)*0.75,rb+0.25*H],[h,rb+0.5*H],[0.985*h,rb+0.72*H],[0.9*h,rb+0.9*H],[0.78*h,rb+0.975*H],[0.4*h,g.R-0.002],[0,g.R]];      // [along the axis, radius]: bead to crown
    const pts=half.map(([a,r])=>[-a,r]).concat(half.slice(0,-1).reverse()).map(([a,r])=>new THREE.Vector2(r,a));      // inboard bead, crown, outboard bead: in this order the faces point outward
    return new THREE.LatheGeometry(pts,48).rotateX(Math.PI/2);
  }
  function rimGeo(name,g){
    const lip=g.rimD/2+FLANGE, half=g.rimW/2+LIPW;
    if(!MD) return new THREE.CylinderGeometry(lip,lip,2*half,24).rotateX(Math.PI/2);
    const m=MD.rim[name], b=rims[name]||(rims[name]=unpack(m)), pos=new Float32Array(b.pos.length), sr=lip/m.lip, sa=half/m.half;
    const k=Math.max(0.25*sa,Math.min(sa,(half-0.002-g.et)/(m.face-m.pad)));      // depth scale of the center: its own, or less to stay inside the lip
    for(let i=0;i<pos.length;i+=3){
      const x=b.pos[i], y=b.pos[i+1], a=b.pos[i+2], t=Math.min(1,Math.max(0,(m.barrel-Math.hypot(x,y))/(m.barrel-m.hub)));      // 1 at the hub, 0 at the barrel
      pos[i]=x*sr; pos[i+1]=y*sr; pos[i+2]=a*sa+t*t*(3-2*t)*(g.et+(a-m.pad)*k-a*sa);
    }
    return meshGeo(pos,b.idx);
  }
  const corners=[];
  for(let i=0;i<4;i++){
    const c={lf:rod(M.lower,0.012),lr:rod(M.lower,0.012),uf:rod(M.upper,0.011),ur:rod(M.upper,0.011),up:rod(M.upright,0.018),sp:rod(M.upright,0.015),
             sarm:rod(M.tie,0.011),tie:rod(M.tie,0.009),dmp:rod(M.coil,0.014)};
    c.wheel=new THREE.Group(); bodyG.add(c.wheel); c.roll=new THREE.Group(); c.wheel.add(c.roll);      // wheel: where the spin axis points; roll: the turn about it
    c.tire=new THREE.Mesh(undefined,M.tire); c.roll.add(c.tire); c.rim=new THREE.Mesh(undefined,M.rim); c.roll.add(c.rim);
    if(i%2===0) c.rim.rotation.y=Math.PI;      // the wheel group's z axis points to the car's right, so a left wheel's rim is turned to face outboard
    const hg=new THREE.BufferGeometry(); hg.setAttribute("position",new THREE.BufferAttribute(new Float32Array(3*160),3));
    c.helix=new THREE.Line(hg,LM.coil); c.helix.frustumCulled=false; bodyG.add(c.helix);
    c.arrow=new THREE.ArrowHelper(UP,new THREE.Vector3(),0.3,0x00ff00,0.06,0.04);
    c.arrow.line.material.depthTest=false; c.arrow.cone.material.depthTest=false; c.arrow.renderOrder=10; scene.add(c.arrow);
    c.bump=new THREE.Mesh(new THREE.BoxGeometry(0.3,1,0.3),M.bumpm); scene.add(c.bump);
    corners.push(c);
  }
  /* Steering rack: the housing is fixed to the chassis; the rack bar slides through it and carries the two inner tie-rod joints, which
     therefore move sideways together; each tie rod (per corner, above) keeps its length. */
  const rackH=rod(M.rackH,0.024), rack=rod(M.tie,0.013), col=rod(M.tie,0.008), swG=new THREE.Group(); bodyG.add(swG);
  const rackJ=[0,1].map(()=>{const j=new THREE.Mesh(new THREE.SphereGeometry(0.018,14,10),M.tie); bodyG.add(j); return j;});
  swG.add(new THREE.Mesh(new THREE.TorusGeometry(0.17,0.012,8,36),M.tie));
  const spk=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.022,0.012),M.tie); swG.add(spk);
  const spk2=new THREE.Mesh(new THREE.BoxGeometry(0.022,0.17,0.012),M.tie); spk2.position.y=-0.085; swG.add(spk2);
  const hub=new THREE.Vector3(), pin=new THREE.Vector3(), axV=new THREE.Vector3(), padV=new THREE.Vector3(), q1=new THREE.Quaternion(), q2=new THREE.Quaternion();
  const hv=new THREE.Vector3(), e1=new THREE.Vector3(), e2=new THREE.Vector3(), hx=new THREE.Vector3();
  function helix(line,a,b){
    const pos=line.geometry.attributes.position.array, n=pos.length/3;
    tmp.subVectors(b,a); const len=tmp.length(); hx.copy(tmp).normalize();
    e1.set(1,0,0); if(Math.abs(hx.x)>0.9) e1.set(0,0,1); e1.crossVectors(hx,e1).normalize(); e2.crossVectors(hx,e1);
    const coils=7, r=0.042, s0=0.15*len, s1=0.85*len;
    for(let k=0;k<n;k++){const f=k/(n-1), th=f*coils*2*Math.PI, sx=s0+(s1-s0)*f;
      hv.copy(a).addScaledVector(hx,sx).addScaledVector(e1,r*Math.cos(th)).addScaledVector(e2,r*Math.sin(th));
      pos[3*k]=hv.x; pos[3*k+1]=hv.y; pos[3*k+2]=hv.z;}
    line.geometry.attributes.position.needsUpdate=true;
  }
  function theme(){
    const c=n=>new THREE.Color(COL[n]);
    scene.background=c("midnight");                                   // the brand field: white vinyl on dark blue
    M.lower.color=c("armL").multiplyScalar(0.3); M.upper.color=c("armU").multiplyScalar(0.3); M.upright.color=c("dim");
    M.lower.emissive=c("armL"); M.lower.emissiveIntensity=0.9; M.upper.emissive=c("armU"); M.upper.emissiveIntensity=0.8;   // the arms glow in their own color instead of washing out under the lights
    M.coil.color=c("ice"); M.tie.color=c("ice"); M.rackH.color=c("edge");
    M.tire.color=c("gunmetal"); M.rim.color=c("edge"); M.body.color=c("gunmetal"); M.cg.color=c("vinyl"); M.bumpm.color=c("edge");
    LM.edge.color=c("edge"); LM.coil.color=c("vinyl"); LM.axis.color=c("dim"); M.car.color=c("armU"); LM.car.color=c("armU");
    corners.forEach(k=>k.arrow.setColor(c("vinyl")));
    /* Floor: three line spacings (0.25, 1 and 4 m). A spacing fades out when the floor moves too far per frame for its lines to read as motion. */
    if(grid){scene.remove(grid); gridLv.forEach(l=>{l.seg.geometry.dispose(); l.seg.material.dispose();});}
    grid=new THREE.Group(); gridLv=[];
    const half=8, lv=[[0.25,1,"gunmetal"],[1,GWRAP,"gunmetal"],[GWRAP,0,"edge"]];
    for(const [sp,skip,col] of lv){
      const pts=[], n=Math.round(half/sp);
      for(let i=-n;i<=n;i++){const q=i*sp; if(skip&&Math.abs(q/skip-Math.round(q/skip))<1e-6) continue; pts.push(-half,0,q,half,0,q,q,0,-half,q,0,half);}
      const geo=new THREE.BufferGeometry(); geo.setAttribute("position",new THREE.Float32BufferAttribute(pts,3));
      const seg=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:c(col),transparent:true}));
      grid.add(seg); gridLv.push({sp,seg});
    }
    scene.add(grid);
  }
  function resize(){
    const w=view.clientWidth, h=view.clientHeight; renderer.setSize(w,h,false);
    renderer.domElement.style.width=w+"px"; renderer.domElement.style.height=h+"px";
    camera.aspect=w/Math.max(1,h); camera.updateProjectionMatrix();
  }
  function update(){
    const v=P.veh, key=[model.a,model.b,P.ax[0].g.yli,P.ax[1].g.yli].join();
    if(key!==chKey){buildChassis(); chKey=key;}
    const lk=LOOKS[P.look], showCar=!!MD&&bodyOn; chassis.visible=chassisEdge.visible=!showCar;
    for(const k in shells) shells[k].visible=false;
    if(showCar){const bm=MD.body[lk.body], s=shell(lk.body); s.visible=true; s.position.set((model.a-model.b)/2,HUB0+bm.lift,0); s.scale.setScalar(v.L/bm.wheelbase);}   // wheel arches follow the wheelbase
    for(let ax=0;ax<2;ax++){
      const g=P.ax[ax].g, w=wheels[ax], wk=[lk.rim,g.rimD,g.rimW,g.et,g.R,g.tw].join();
      if(wk===w.key) continue;
      if(w.tire){w.tire.dispose(); w.rim.dispose();}
      w.key=wk; w.tire=tireGeo(g); w.rim=rimGeo(lk.rim,g);
      for(const c of corners.slice(2*ax,2*ax+2)){c.tire.geometry=w.tire; c.rim.geometry=w.rim;}
    }
    pivot.position.set(0,v.h+S.z,0); pivot.rotation.set(-S.ph,0,S.th); bodyG.position.set(0,-v.h,0); cgMesh.position.set(0,v.h,0);
    for(let i=0;i<4;i++){
      const c=corners[i], side=i%2===0?-1:1, g=P.ax[i<2?0:1].g, x0=model.xs[i], p=FR.p[i];
      const L=V(x0,p.LBJ,side), U=V(x0,p.UBJ,side), Wc=V(x0,p.WC,side), TO=V(x0,p.TRO,side);
      const rearAx=i>=2;      // rear lower arm: front leg to the ball joint, rear leg to the second outer pivot (TO); no tie rod
      place(c.lf,V(x0,[g.xlf,g.yli,g.zli],side),L); place(c.lr,V(x0,[g.xlr,g.yli,g.zli],side),rearAx?TO:L); c.tie.visible=!rearAx;
      place(c.uf,V(x0,[g.xuf,g.yui,g.zui],side),U); place(c.ur,V(x0,[g.xur,g.yui,g.zui],side),U);
      c.wheel.position.copy(Wc); nv.set(side*p.av[0],side*p.av[2],p.av[1]).normalize(); c.wheel.quaternion.setFromUnitVectors(ZA,nv); c.roll.rotation.z=-GND.roll/g.R;
      place(c.up,L,U); place(c.sp,V(x0,p.S,side),padV.copy(Wc).addScaledVector(nv,side*g.et));      // the spindle ends at the wheel's mounting face, the offset outboard of the wheel center
      place(c.sarm,V(x0,vadd(p.LBJ,vscale(p.ax,vdot(vsub(p.TRO,p.LBJ),p.ax))),side),TO); if(!rearAx) place(c.tie,TO,V(x0,p.TRI,side));
      const Dm=V(x0,p.dm,side), Tm=V(x0,[0,g.ydm,g.zdm],side); place(c.dmp,Dm,Tm); helix(c.helix,Dm,Tm);
      const zg=S.out[i].zg||0, Ft=S.out[i].Ft||0;
      c.arrow.position.set(x0+p.CP[0],zg+0.002,side*(p.CP[1]+g.tw/2+0.07));
      c.arrow.visible=Ft>5; if(Ft>5) c.arrow.setLength(Math.max(0.08,Ft/8000),0.06,0.04);
      c.bump.visible=zg>0.0005; c.bump.position.set(x0,zg/2,side*p.CP[1]); c.bump.scale.set(1,Math.max(zg,1e-4),1);
    }
    const g0=P.ax[0].g, xr=model.a+g0.xti, hh=Math.max(0.05,g0.yti-P.steer.rmax-0.03);      // housing half length: an inner joint at full lock stays 30 mm clear of it
    place(rackH,new THREE.Vector3(xr,g0.zti,-hh),new THREE.Vector3(xr,g0.zti,hh));
    rackJ[0].position.set(xr,g0.zti,inp.rack-g0.yti); rackJ[1].position.set(xr,g0.zti,inp.rack+g0.yti);
    place(rack,rackJ[0].position,rackJ[1].position);
    pin.set(xr,g0.zti,-Math.min(0.2,0.8*hh));      // the pinion, where the column meets the housing
    hub.set(model.a-1.0,0.76,-0.33).sub(pin).multiplyScalar(0.95);                           // steering wheel: column 5 % shorter,
    hub.setLength(hub.length()+0.06).add(pin); hub.y-=0.1076; hub.x-=0.04;                  // then 60 mm further out along the column, 108 mm down, 40 mm straight back
    place(col,pin,hub);
    axV.subVectors(hub,pin).normalize(); swG.position.copy(hub); q1.setFromUnitVectors(ZA,axV); q2.setFromAxisAngle(ZA,-swNow()*D2R); swG.quaternion.copy(q1).multiply(q2);
    const sF=((S.out[0].s||0)+(S.out[1].s||0))/2, sR=((S.out[2].s||0)+(S.out[3].s||0))/2, pa=axisGeo.attributes.position.array;
    pa[0]=model.a; pa[1]=S.hrc[0]+sF; pa[2]=0; pa[3]=-model.b; pa[4]=S.hrc[1]+sR; pa[5]=0;
    axisGeo.attributes.position.needsUpdate=true; axisLine.computeLineDistances();
    {const cs=Math.cos(GND.psi), sn=Math.sin(GND.psi);            // the floor seen from the car: the world turned back by the heading and shifted back by the position
     grid.rotation.y=GND.psi; grid.position.set(-GND.x*cs-GND.y*sn,0,GND.x*sn-GND.y*cs);
     for(const l of gridLv){const a=Math.max(0,Math.min(1,(0.45-GND.d/l.sp)/0.25)); l.seg.material.opacity=a; l.seg.visible=a>0.01;}}
    controls.update(); renderer.render(scene,camera);
  }
  return {update,resize,theme};
}
let R3=null;
try{R3=init3D();}catch(e){
  const d=document.createElement("div"); d.className="nogl";
  const noLib=typeof THREE==="undefined"||!THREE.OrbitControls;      // the library files are missing, as opposed to the browser lacking WebGL
  d.textContent=(noLib?"The 3D library did not load. Check that three.min.js and OrbitControls.js sit next to index.html.":"The 3D view needs WebGL, which is not available here.")+" The rear view and read-outs below still work.";
  view.insertBefore(d,view.firstChild); console.error(e);
}

/* ===== 2D panels ===== */
const cvs={rear:$("rear"),curve:$("curve"),hist:$("hist")};
function sizeCanvases(){for(const k in cvs){const c=cvs[k], r=c.getBoundingClientRect(), d=Math.min(2,window.devicePixelRatio||1); const w=Math.max(1,Math.round(r.width*d)), h=Math.max(1,Math.round(r.height*d)); if(c.width!==w||c.height!==h){c.width=w; c.height=h;} c._d=d;}}
function ctx2(c){const x=c.getContext("2d"); x.setTransform(c._d||1,0,0,c._d||1,0,0); return x;}
const Wd=c=>c.width/(c._d||1), Hd=c=>c.height/(c._d||1);
function hoverable(cv){
  const h={x:null};
  const at=e=>{const r=cv.getBoundingClientRect(); h.x=e.clientX-r.left;};
  cv.addEventListener("pointermove",at); cv.addEventListener("pointerdown",at);
  cv.addEventListener("pointerleave",()=>{if(document.activeElement!==cv) h.x=null;});
  cv.tabIndex=0;
  cv.addEventListener("focus",()=>{if(h.x===null) h.x=cv.clientWidth/2;});
  cv.addEventListener("blur",()=>{h.x=null;});
  cv.addEventListener("keydown",e=>{
    if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight") return; e.preventDefault();
    const w=cv.clientWidth; h.x=Math.max(0,Math.min(w,(h.x===null?w/2:h.x)+(e.key==="ArrowLeft"?-1:1)*(e.shiftKey?40:8)));
  });
  return h;
}
const hovCurve=hoverable(cvs.curve), hovHist=hoverable(cvs.hist);
function setTip(el,sig,title,rows,x,w){
  if(sig===null){if(!el.hidden) el.hidden=true; el._sig=null; return;}
  if(el._sig!==sig){
    el._sig=sig; el.textContent="";
    const t=document.createElement("div"); t.className="tt"; t.textContent=title; el.appendChild(t);
    for(const [k,lab,val] of rows){
      const r=document.createElement("div"); r.className="tr";
      const i=document.createElement("i"); if(k) i.className=k; const b=document.createElement("b"); b.textContent=val; const s=document.createElement("span"); s.textContent=lab;
      r.appendChild(i); r.appendChild(b); r.appendChild(s); el.appendChild(r);
    }
  }
  el.hidden=false;
  const tw=el.offsetWidth; el.style.left=Math.max(0,Math.min(w-tw,x+12+tw>w?x-12-tw:x+12))+"px";
}
function hull(pts){
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]), lo=[], up=[];
  for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p);}
  for(let i=pts.length-1;i>=0;i--){const p=pts[i]; while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0) up.pop(); up.push(p);}
  lo.pop(); up.pop(); return lo.concat(up);
}
function niceTicks(lo,hi,n){const span=hi-lo||1, raw=span/n, p=Math.pow(10,Math.floor(Math.log10(raw))), m=raw/p, st=(m<1.5?1:m<3?2:m<7?5:10)*p, t=[]; for(let v=Math.ceil(lo/st-1e-9)*st; v<=hi+1e-9; v+=st) t.push(+v.toFixed(10)); t.step=st; return t;}
const tickTxt=(v,st)=>num(v,Math.max(0,Math.min(4,-Math.floor(Math.log10(st)+1e-9))));

/* ---- rear view: world frame, ground level ---- */
function drawRear(){
  const c=cvs.rear, x=ctx2(c), w=Wd(c), h=Hd(c); x.clearRect(0,0,w,h);
  const ax=viewAxle, g=P.ax[ax].g, T=model.T[ax], hh=P.veh.h, cph=Math.cos(S.ph), sph=Math.sin(S.ph), zoff=S.z+model.xs[ax*2]*S.th;
  const span=2*(T.tHalf+0.2), sc=Math.min(w/span,(h-36)/0.86), cx=w/2, base=h-16;
  const PX=(Y,Z)=>[cx+(Y*cph-(Z-hh)*sph)*sc, base-(hh+zoff+Y*sph+(Z-hh)*cph)*sc];     // car frame (Y right, Z up) to screen
  x.font=OSD(18); x.lineCap="butt"; x.lineJoin="miter";
  const seg=(a,b,cl,wd,dash)=>{x.strokeStyle=cl; x.lineWidth=wd; x.setLineDash(dash||[]); x.beginPath(); x.moveTo(a[0],a[1]); x.lineTo(b[0],b[1]); x.stroke(); x.setLineDash([]);};
  seg([0,base],[w,base],COL.edge,1);
  seg(PX(0,0.02),PX(0,0.84),COL.gunmetal,1,[2,4]);
  const con={}, tri={};
  for(const side of [1,-1]){
    const i=ax*2+(side===-1?0:1), p=FR.p[i], a=p.av, zg=S.out[i].zg||0;
    const Q=v=>PX(side*v[1],v[2]);
    if(zg>0.0005){const b=PX(side*p.CP[1],0); x.fillStyle=COL.edge; x.fillRect(b[0]-0.15*sc,base-zg*sc,0.3*sc,zg*sc);}
    const n1=Math.hypot(a[0],a[1])||1, f1=[a[1]/n1,-a[0]/n1,0], f2=vcross(a,f1), pts=[];
    for(const o of [-g.tw/2,g.tw/2]) for(let k=0;k<18;k++){const t=k/18*2*Math.PI, ct=Math.cos(t)*g.R, st=Math.sin(t)*g.R;
      pts.push(Q([p.WC[0]+o*a[0]+ct*f1[0]+st*f2[0],p.WC[1]+o*a[1]+ct*f1[1]+st*f2[1],p.WC[2]+o*a[2]+ct*f1[2]+st*f2[2]]));}
    const hl=hull(pts); x.beginPath(); hl.forEach((q,k)=>k?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])); x.closePath();
    x.globalAlpha=0.55; x.fillStyle=COL.gunmetal; x.fill(); x.globalAlpha=1; x.strokeStyle=COL.edge; x.lineWidth=1; x.stroke();
    const ic=icOf(g,p.k), C=[side*p.CP[1],p.CP[2]]; let dir;
    if(ic){dir=[side*ic[0]-C[0],ic[1]-C[1]]; if(Math.hypot(ic[0],ic[1])<30){const I=PX(side*ic[0],ic[1]); seg(Q(p.LBJ),I,COL.ghost,1,[4,4]); seg(Q(p.UBJ),I,COL.ghost,1,[4,4]);}}
    else dir=[side*(p.k.uy-g.yui),p.k.uz-g.zui];
    con[side]={C,dir}; tri[side]=Q(p.TRI);
    seg(Q(p.dm),PX(side*g.ydm,g.zdm),COL.ice,5); if(ax===0) seg(Q(p.TRO),tri[side],COL.ice,2);
    seg(Q(p.LBJ),Q(p.UBJ),COL.dim,4); seg(Q(p.S),Q(p.WC),COL.dim,2);
    seg(PX(side*g.yli,g.zli),Q(p.LBJ),COL.armL,3); seg(PX(side*g.yui,g.zui),Q(p.UBJ),COL.armU,3);
    x.fillStyle=COL.vinyl; for(const q of [PX(side*g.yli,g.zli),PX(side*g.yui,g.zui),PX(side*g.ydm,g.zdm)]){x.fillRect(q[0]-3,q[1]-3,6,6);}
    const lab=num(FR.cam[i],2)+"°", top=Q([p.WC[0],p.WC[1],p.WC[2]+g.R]);
    x.fillStyle=COL.vinyl; x.textAlign="center"; x.fillText(lab,Math.max(30,Math.min(w-30,top[0])),Math.max(40,top[1]-8));
  }
  if(ax===0) seg(tri[1],tri[-1],COL.ice,3);
  const a=con[1], b=con[-1], rc=lineInt(a.C,[a.C[0]+a.dir[0],a.C[1]+a.dir[1]],b.C,[b.C[0]+b.dir[0],b.C[1]+b.dir[1]]), near=rc&&Math.hypot(rc[0],rc[1])<5;
  for(const q of [a,b]){const e=near?rc:[q.C[0]+q.dir[0]*3,q.C[1]+q.dir[1]*3]; seg(PX(q.C[0],q.C[1]),PX(e[0],e[1]),COL.dim,1.2);}
  const cgp=PX(0,hh); x.fillStyle=COL.dim; x.beginPath(); x.arc(cgp[0],cgp[1],4,0,7); x.fill(); x.textAlign="left"; x.fillText("CG",cgp[0]+8,cgp[1]+6);
  x.fillStyle=COL.vinyl; x.textAlign="left";
  if(near){
    const r=PX(rc[0],rc[1]); x.fillStyle=COL.vinyl; x.strokeStyle=COL.glass; x.lineWidth=2; x.beginPath(); x.arc(r[0],r[1],5,0,7); x.fill(); x.stroke();
    const dy=b.C[0]-a.C[0], dz=b.C[1]-a.C[1], hgt=-(dy*(rc[1]-a.C[1])-dz*(rc[0]-a.C[0]))/Math.hypot(dy,dz), off=Math.abs(rc[0]*1000);
    x.fillStyle=COL.vinyl; x.fillText("ROLL CENTER "+num(hgt*1000,0)+" mm / "+(off<0.5?"ON CENTER":off.toFixed(0)+" mm "+(rc[0]>0?"RIGHT":"LEFT")),0,16);
  } else x.fillText("ROLL CENTER FAR / ARM LINES NEAR PARALLEL",0,16);
}

/* ---- kinematic curves ---- */
const CURVES={
  cam:{x:"s",name:"Camber",unit:"°",dec:2,note:"Camber is relative to the body here.",f:(T,s)=>lk2(T,T.cam,s,0)},
  toe:{x:"s",name:"Toe",unit:"°",dec:3,note:"+ = toe-in.",f:(T,s)=>-lk2(T,T.steer,s,0)},
  dtr:{x:"s",name:"Track change",unit:"mm",dec:1,note:"+ = contact patch moves outboard.",f:(T,s)=>lk1(T,T.dtr,s)*1000},
  MR:{x:"s",name:"Motion ratio",unit:"",dec:3,note:"Coilover travel per unit of wheel travel.",f:(T,s)=>lk2(T,T.MR,s,0)},
  rch:{x:"s",name:"Roll center height",unit:"mm",dec:0,note:"For equal travel on both sides.",f:(T,s)=>lk1(T,T.rch,s)*1000},
  rw:{x:"sw",name:"Road-wheel angle",unit:"°",dec:1,note:"+ = steered right.",f:(T,st,r,side)=>side*lk2(T,T.steer,st,side*r)},
  camS:{x:"sw",name:"Camber",unit:"°",dec:2,note:"Camber is relative to the body here.",f:(T,st,r,side)=>lk2(T,T.cam,st,side*r)},
  lift:{x:"sw",name:"Body lift",unit:"mm",dec:1,note:"+ = steering pushes that corner of the body up (caster and kingpin inclination).",f:(T,st,r,side)=>(lk2(T,T.sa,st,side*r)-st)*1000},
  grip:{x:"ay",name:"Grip in use",unit:"%",dec:0,note:"The axle whose line reaches 100 % first sets the limit. Front first is understeer, rear first is oversteer. Tire grip numbers are typical values."}
};
const SERIES={sw:["Left wheel","Right wheel","L ","R "],ay:["Front axle","Rear axle","F ","R "]};
const ayNow=()=>Math.abs(P.steer.link?S.ay:inp.ay);
function balAt(arr,ay){if(!BAL||!BAL.ay.length) return 0; const n=BAL.ay.length, x=Math.max(0,Math.min(n-1,ay/0.05)), i=Math.min(n-2,Math.floor(x)); return n<2?arr[0]:arr[i]+(arr[i+1]-arr[i])*(x-i);}
function curveEval(C,xv,side){   // xv: travel in mm, steering-wheel angle in degrees, or lateral g; side: -1 left (or front axle), +1 right (or rear axle)
  if(C.x==="s") return C.f(model.T[viewAxle],xv/1000);
  if(C.x==="ay") return BAL?balAt(side===-1?BAL.uF:BAL.uR,xv)*100:0;
  const T=model.T[0]; return C.f(T,model.st[side===-1?0:1],T.sgn*xv/360*P.steer.c,side);
}
function curveDomain(C){
  if(C.x==="s"){const g=P.ax[viewAxle].g; return [-g.droop*1000,g.bump*1000];}
  if(C.x==="ay") return [0,BAL&&BAL.ay.length>1?BAL.ay[BAL.ay.length-1]:1];
  const mx=P.steer.rmax/P.steer.c*360; return [-mx,mx];
}
function curveStatic(){
  const C=CURVES[$("curveQ").value], kind=C.x, two=kind!=="s", d=curveDomain(C), v=(xv,side)=>num(curveEval(C,xv,side),C.dec)+unitTxt(C.unit);
  $("curveLg").innerHTML=two?'<span><i class="k1"></i>'+SERIES[kind][0]+'</span><span><i class="k2"></i>'+SERIES[kind][1]+'</span>'
    :'<span><i></i>'+(viewAxle?"Rear":"Front")+' axle, both sides</span><span><i class="m1"></i>Left wheel now</span><span><i class="m2"></i>Right wheel now</span>';
  const xl=x=>kind==="sw"?sgnTxt(x,0)+"°":sgnTxt(x,0)+" mm";
  let pos;
  if(kind==="sw") pos=[["Full left ("+xl(d[0])+")",d[0]],["Center",0],["Full right ("+xl(d[1])+")",d[1]]];
  else if(kind==="ay"){const lim=BAL?Math.min(Number.isFinite(BAL.limF)?BAL.limF:9,Number.isFinite(BAL.limR)?BAL.limR:9):9;
    pos=[["At 0.30 g",0.3],["At 0.60 g",0.6]].filter(q=>q[1]<=d[1]); if(lim<9) pos.push(["At the limit, "+lim.toFixed(2)+" g",lim]);}
  else pos=[["Full droop ("+xl(d[0])+")",d[0]],["Design height",0],["Full bump ("+xl(d[1])+")",d[1]]];
  let t=two?`<tr><th>${C.name}</th><th>${SERIES[kind][0]}</th><th>${SERIES[kind][1]}</th></tr>`:`<tr><th>${C.name}</th><th>${viewAxle?"Rear":"Front"} axle</th></tr>`;
  if(kind==="ay"&&!BAL) t+=`<tr><td>Working it out</td><td>…</td><td>…</td></tr>`;
  else for(const [lab,xv] of pos) t+=two?`<tr><td>${lab}</td><td>${v(xv,-1)}</td><td>${v(xv,1)}</td></tr>`:`<tr><td>${lab}</td><td>${v(xv,1)}</td></tr>`;
  $("curveTbl").innerHTML=t;
  $("curveHint").textContent=(kind==="sw"?"Front axle at its static ride height. The markers show the current steering angle. ":kind==="ay"?"The car is settled at each lateral g and each axle's side force is compared with the most its tires can make. The markers show the lateral g now. ":"Same axle as the rear view. Travel is measured at the contact patch. The markers show where each wheel is now. ")+C.note;
}
$("curveQ").addEventListener("change",curveStatic);
function drawCurve(){
  const c=cvs.curve, x=ctx2(c), w=Wd(c), h=Hd(c); x.clearRect(0,0,w,h);
  const C=CURVES[$("curveQ").value], kind=C.x, two=kind!=="s", d=curveDomain(C), N=96, sides=two?[-1,1]:[1], ys=sides.map(()=>[]);
  let lo=Infinity, hi=-Infinity;
  for(let k=0;k<=N;k++){const xv=d[0]+(d[1]-d[0])*k/N; sides.forEach((sd,j)=>{const y=curveEval(C,xv,sd); ys[j].push(y); if(y<lo)lo=y; if(y>hi)hi=y;});}
  const minSpan=Math.pow(10,-C.dec)*4; if(hi-lo<minSpan){const m=(hi+lo)/2; lo=m-minSpan/2; hi=m+minSpan/2;}
  const pad=(hi-lo)*0.12; lo-=pad; hi+=pad;
  const Lm=60, Rm=14, Tm=28, Bm=46, X=v=>Lm+(v-d[0])/(d[1]-d[0])*(w-Lm-Rm), Y=v=>Tm+(hi-v)/(hi-lo)*(h-Tm-Bm);
  x.font=OSD(18); x.lineWidth=1; x.lineJoin="miter"; x.lineCap="butt";
  const ty=niceTicks(lo,hi,5), tx=niceTicks(d[0],d[1],w<420?4:6);
  x.strokeStyle=COL.hairline; x.fillStyle=COL.dim; x.textAlign="right";
  for(const t of ty){x.beginPath(); x.moveTo(Lm,Y(t)); x.lineTo(w-Rm,Y(t)); x.stroke(); x.fillText(tickTxt(t,ty.step),Lm-6,Y(t)+6);}
  x.textAlign="center";
  for(const t of tx){x.beginPath(); x.moveTo(X(t),Tm); x.lineTo(X(t),h-Bm); x.stroke(); x.fillText(tickTxt(t,tx.step),X(t),h-Bm+18);}
  x.textAlign="left"; x.fillText(kind==="sw"?"STEERING WHEEL ° / + RIGHT":kind==="ay"?"LATERAL g":"WHEEL TRAVEL mm / + BUMP",Lm,h-6);
  x.fillText(C.name.toUpperCase()+(C.unit?" "+C.unit:""),0,16);                    // the y-axis title sits above the plot, flush left
  x.strokeStyle=COL.edge; x.beginPath(); x.moveTo(X(0),Tm); x.lineTo(X(0),h-Bm); x.stroke();
  if(kind==="ay"&&hi>100){x.setLineDash([3,4]); x.beginPath(); x.moveTo(Lm,Y(100)); x.lineTo(w-Rm,Y(100)); x.stroke(); x.setLineDash([]); x.fillStyle=COL.dim; x.textAlign="right"; x.fillText("LIMIT",w-Rm-2,Y(100)-5); x.textAlign="left";}
  const cols=two?[COL.vinyl,COL.ice]:[COL.vinyl];
  ys.forEach((arr,j)=>{x.strokeStyle=cols[j]; x.lineWidth=2; x.setLineDash(j?DASH:[]); x.beginPath(); arr.forEach((v,k)=>{const px=X(d[0]+(d[1]-d[0])*k/N), py=Y(v); k?x.lineTo(px,py):x.moveTo(px,py);}); x.stroke(); x.setLineDash([]);});
  // where each wheel is now: a disc for the left wheel, a square for the right
  const dots=[-1,1].map((sd,j)=>{
    const xv=kind==="sw"?swNow():kind==="ay"?ayNow():Math.max(d[0],Math.min(d[1],(S.out[viewAxle*2+j].s||0)*1000)), cx=Math.max(d[0],Math.min(d[1],xv));
    return {px:X(cx),py:Y(curveEval(C,cx,sd)),v:curveEval(C,cx,sd),col:j?COL.ice:COL.vinyl,tag:two?SERIES[kind][2+j]:(j?"R ":"L ")};
  });
  dots.forEach((q,j)=>{x.fillStyle=q.col; x.strokeStyle=COL.glass; x.lineWidth=2; x.beginPath(); if(j) x.rect(q.px-5,q.py-5,10,10); else x.arc(q.px,q.py,5.5,0,7); x.fill(); x.stroke();});
  x.fillStyle=COL.vinyl;
  dots.forEach((q,j)=>{
    const txt=q.tag+num(q.v,C.dec), tw=x.measureText(txt).width; let tx2, ty2=j?q.py+22:q.py-10;
    if(j){tx2=q.px+9; if(tx2+tw>w-Rm) tx2=q.px-9-tw;} else {tx2=q.px-9-tw; if(tx2<Lm+2) tx2=q.px+9;}
    ty2=Math.max(Tm+14,Math.min(h-Bm-4,ty2)); x.textAlign="left"; x.fillText(txt,tx2,ty2);
  });
  // hover read-out
  const hx=hovCurve.x;
  if(hx!==null&&hx>=Lm-6&&hx<=w-Rm+6){
    const k=Math.max(0,Math.min(N,Math.round((hx-Lm)/(w-Lm-Rm)*N))), xv=d[0]+(d[1]-d[0])*k/N, px=X(xv);
    x.strokeStyle=COL.dim; x.lineWidth=1; x.beginPath(); x.moveTo(px,Tm); x.lineTo(px,h-Bm); x.stroke();
    ys.forEach((arr,j)=>{x.fillStyle=cols[j]; x.strokeStyle=COL.glass; x.lineWidth=2; x.beginPath(); x.arc(px,Y(arr[k]),4,0,7); x.fill(); x.stroke();});
    const u=unitTxt(C.unit), rows=two?[["k1",SERIES[kind][0],num(ys[0][k],C.dec)+u],["k2",SERIES[kind][1],num(ys[1][k],C.dec)+u]]:[["",C.name,num(ys[0][k],C.dec)+u]];
    const title=kind==="sw"?"Steering "+sgnTxt(xv,0)+"°":kind==="ay"?"Lateral "+xv.toFixed(2)+" g":"Travel "+sgnTxt(xv,1)+" mm";
    setTip($("curveTip"),title+"|"+rows.map(r=>r[2]).join("|"),title,rows,px,w);
  } else setTip($("curveTip"),null);
}

/* ---- history: the last 10 s of simulated time, sampled at 100 Hz, and a recording of up to 60 s that can be exported ----
   Columns: time, roll, pitch, heave, four tire loads, lateral g, yaw rate, steering wheel angle. */
const HS=11, HWIN=10, HN=HWIN*100, hist=new Float32Array(HN*HS); let hCount=0, hHead=0, hAcc=0;
/* The recording has its own buffer and its own clock (0 at the start). REC.on: recording now. REC.n > 0 with REC.on false: a finished
   recording, shown in place of the live history until it is discarded. */
const RMAX=60, REC={on:false,n:0,buf:new Float32Array(RMAX*100*HS),meta:null};
function histClear(){hCount=0; hHead=0; hAcc=0; if(REC.on) REC.n=0;}      // a restart of the simulation (Settle, Step steer, a car loaded) restarts a recording in progress
function histSample(a,o,t){
  a[o]=t; a[o+1]=S.ph/D2R; a[o+2]=S.th/D2R; a[o+3]=S.z*1000;
  for(let i=0;i<4;i++) a[o+4+i]=S.out[i].Ft||0;
  a[o+8]=S.ay; a[o+9]=S.r/D2R; a[o+10]=swNow();
}
function histPush(){
  histSample(hist,hHead*HS,S.t); hHead=(hHead+1)%HN; if(hCount<HN) hCount++;
  if(REC.on){histSample(REC.buf,REC.n*HS,REC.n*0.01); if(++REC.n>=RMAX*100) recStop("Recording stopped at "+RMAX+" s, the longest it can be. Export it or discard it.");}
}
const hIdx=j=>((hHead-hCount+j+HN)%HN)*HS;
const recHeld=()=>!REC.on&&REC.n>0, recDur=()=>Math.max(0,(REC.n-1)*0.01);
/* What the panel shows: the finished recording from 0 to its end, or else the live window ending now. */
function histView(){
  if(recHeld()) return {rec:true,arr:REC.buf,idx:j=>j*HS,j0:0,n:REC.n,t0:0,t1:Math.max(0.5,recDur())};
  const t1=S.t, t0=t1-HWIN; let j0=0; while(j0<hCount&&hist[hIdx(j0)]<t0) j0++;
  return {rec:false,arr:hist,idx:hIdx,j0,n:hCount,t0,t1};
}
const HROWS=[{name:"Lat g",unit:"g",cols:[8],sym:true,min:0.05,dec:2},{name:"Yaw rate",unit:"°/s",cols:[9],sym:true,min:1,dec:1},{name:"Roll",unit:"°",cols:[1],sym:true,min:0.05,dec:2},{name:"Pitch",unit:"°",cols:[2],sym:true,min:0.05,dec:2},{name:"Heave",unit:"mm",cols:[3],sym:true,min:1,dec:1},
             {name:"Front load",unit:"N",cols:[4,5],min:200,dec:0},{name:"Rear load",unit:"N",cols:[6,7],min:200,dec:0}];
/* Draws the rows of a view into a w x h area of any 2D context (the panel, or the picture that Export graph saves).
   hx: pointer x for the read-out line, or null. Returns the index of the sample under the pointer, or -1. */
function plotHist(x,w,h,V,hx){
  const Lm=100, Rm=8, Bm=24, rh=(h-Bm-4)/HROWS.length, span=V.t1-V.t0, X=t=>Lm+(t-V.t0)/span*(w-Lm-Rm), a=V.arr;
  x.font=OSD(18); x.lineJoin="miter"; x.lineCap="butt"; x.setLineDash([]);
  x.strokeStyle=COL.hairline; x.fillStyle=COL.dim; x.lineWidth=1; x.textAlign="center";
  const tick=(t,lab)=>{const px=X(t); x.beginPath(); x.moveTo(px,2); x.lineTo(px,h-Bm); x.stroke(); x.fillText(lab,Math.max(Lm+14,Math.min(w-Rm-14,px)),h-6);};
  if(V.rec){const tk=niceTicks(0,V.t1,w<420?4:6); for(const t of tk) tick(t,tickTxt(t,tk.step)+" s");}
  else for(let s=0;s<=HWIN;s+=2) tick(V.t1-s,s?"−"+s+" s":"NOW");
  let hk=-1;
  if(hx!==null&&hx>=Lm-6&&V.n-V.j0>0){const th=V.t0+(Math.min(w-Rm,Math.max(Lm,hx))-Lm)/(w-Lm-Rm)*span; let best=1e9; for(let j=V.j0;j<V.n;j++){const dd=Math.abs(a[V.idx(j)]-th); if(dd<best){best=dd;hk=j;}}}
  const stp=Math.max(1,Math.ceil((V.n-V.j0)/2400));      // a long recording is drawn with every 2nd or 3rd sample
  HROWS.forEach((R,ri)=>{
    const y0=2+ri*rh; let lo=Infinity, hi=-Infinity;
    for(let j=V.j0;j<V.n;j++){const o=V.idx(j); for(const cI of R.cols){const v=a[o+cI]; if(v<lo)lo=v; if(v>hi)hi=v;}}
    if(!(hi>=lo)){lo=0;hi=0;}
    if(R.sym){const m=Math.max(R.min,Math.abs(lo),Math.abs(hi)); lo=-m; hi=m;} else if(hi-lo<R.min){const m=(hi+lo)/2; lo=m-R.min/2; hi=m+R.min/2;}
    const Y=v=>y0+rh-7-(v-lo)/(hi-lo)*(rh-14);
    x.strokeStyle=COL.hairline; x.lineWidth=1;
    if(R.sym){x.beginPath(); x.moveTo(Lm,Y(0)); x.lineTo(w-Rm,Y(0)); x.stroke();}
    if(ri){x.strokeStyle=COL.gunmetal; x.beginPath(); x.moveTo(0,y0); x.lineTo(w,y0); x.stroke();}
    x.fillStyle=COL.vinyl; x.textAlign="left"; x.fillText(R.name.toUpperCase(),0,y0+rh/2-2);
    x.fillStyle=COL.dim; x.fillText(R.sym?"±"+hi.toFixed(R.dec)+" "+R.unit:lo.toFixed(0)+"–"+hi.toFixed(0)+" "+R.unit,0,y0+rh/2+16);
    R.cols.forEach((cI,si)=>{
      x.strokeStyle=si?COL.ice:COL.vinyl; x.lineWidth=2; x.setLineDash(si?DASH:[]); x.beginPath();
      for(let j=V.j0;j<V.n;j+=stp){const o=V.idx(j), px=X(a[o]), py=Y(a[o+cI]); j===V.j0?x.moveTo(px,py):x.lineTo(px,py);}
      x.stroke(); x.setLineDash([]);
      if(hk>=0){const o=V.idx(hk); x.fillStyle=x.strokeStyle; x.beginPath(); x.arc(X(a[o]),Y(a[o+cI]),3,0,7); x.fill();}
    });
  });
  if(hk>=0){const px=X(a[V.idx(hk)]); x.strokeStyle=COL.dim; x.lineWidth=1; x.beginPath(); x.moveTo(px,2); x.lineTo(px,h-Bm); x.stroke();}
  return hk;
}
function drawHist(){
  const c=cvs.hist, x=ctx2(c), w=Wd(c), h=Hd(c); x.clearRect(0,0,w,h);
  const V=histView(), hk=plotHist(x,w,h,V,hovHist.x);
  if(REC.on) $("recO").textContent="REC "+recDur().toFixed(1)+" s";
  if(hk>=0){
    const a=V.arr, o=V.idx(hk), px=100+(a[o]-V.t0)/(V.t1-V.t0)*(w-108);
    const title=V.rec?a[o].toFixed(2)+" s":(V.t1-a[o]<0.005?"Now":"−"+(V.t1-a[o]).toFixed(2)+" s");
    const rows=[["","Lat g",num(a[o+8],2)+" g"],["","Yaw rate",num(a[o+9],1)+"°/s"],["","Roll",num(a[o+1],2)+"°"],["","Pitch",num(a[o+2],2)+"°"],["","Heave",num(a[o+3],1)+" mm"],["k1","FL load",a[o+4].toFixed(0)+" N"],["k2","FR load",a[o+5].toFixed(0)+" N"],["k1","RL load",a[o+6].toFixed(0)+" N"],["k2","RR load",a[o+7].toFixed(0)+" N"]];
    setTip($("histTip"),title+"|"+rows.map(r=>r[2]).join("|"),title,rows,px,w);
  } else setTip($("histTip"),null);
}
function histTable(){
  const col=[8,9,1,2,3,4,5,6,7], lab=["Lateral g","Yaw rate","Roll","Pitch","Heave","FL tire load","FR tire load","RL tire load","RR tire load"], un=["g","°/s","°","°","mm","N","N","N","N"], dec=[2,1,2,2,1,0,0,0,0], n=col.length;
  const V=histView(), lo=new Array(n).fill(Infinity), hi=new Array(n).fill(-Infinity);
  for(let j=V.j0;j<V.n;j++){const o=V.idx(j); for(let k=0;k<n;k++){const v=V.arr[o+col[k]]; if(v<lo[k])lo[k]=v; if(v>hi[k])hi[k]=v;}}
  let t=`<tr><th>${V.rec?"Over the recording, "+recDur().toFixed(1)+" s":"Over the last "+HWIN+" s"}</th><th>Min</th><th>Max</th><th></th></tr>`;
  for(let k=0;k<n;k++) t+=`<tr><td>${lab[k]}</td><td>${hi[k]>=lo[k]?num(lo[k],dec[k]):"–"}</td><td>${hi[k]>=lo[k]?num(hi[k],dec[k]):"–"}</td><td class="u">${un[k]}</td></tr>`;
  $("histTbl").innerHTML=t;
}

/* ---- recording: Record starts it, Stop ends it; the panel then shows it and it can be exported as a picture or as numbers ---- */
function recSync(){
  const held=recHeld(), b=$("recBtn");
  b.textContent=REC.on?"Stop":"Record"; b.setAttribute("aria-pressed",REC.on);
  b.title=REC.on?"Stop recording":held?"Start a new recording (this one is dropped)":"Record the history from now, for up to "+RMAX+" s";
  $("recPng").hidden=$("recCsv").hidden=$("recX").hidden=!held;
  $("histT").textContent=held?"Recording "+recDur().toFixed(1)+" s":HWIN+" s";
  $("recO").textContent=REC.on?"REC 0.0 s":"";
}
function recStart(){REC.on=true; REC.n=0; REC.meta=null; recSync(); setStatus(running?"Recording. Press Stop to review and export it; it stops itself at "+RMAX+" s.":"Recording starts when the simulation runs (it is paused).",false);}
function recStop(msg){
  if(!REC.on) return; REC.on=false;
  REC.meta={car:presetName in CAR?presetName:"session",drive:P.steer.link?"Drive "+(P.steer.speed*3.6).toFixed(0)+" km/h":"Drive off",when:new Date()};
  recSync(); histTable();
  setStatus(REC.n>0?(msg||"Recorded "+recDur().toFixed(1)+" s. Export it as a graph or as numbers, or discard it."):"Nothing was recorded: the simulation was paused.",false);
}
$("recBtn").onclick=()=>REC.on?recStop():recStart();
$("recX").onclick=()=>{REC.n=0; REC.meta=null; recSync(); histTable(); setStatus("Recording discarded. History is live again.",false);};
const recName=ext=>"dws-recording-"+CAR[REC.meta.car][1]+"-"+stamp(REC.meta.when,true).replace(" ","-").replace(":","")+"."+ext;
/* The graph: the same rows as the panel, on the panel's ground, with a title line that says which car, the Drive speed, how long and when. */
$("recPng").onclick=()=>{
  if(!recHeld()) return;
  const W=1000, H=760, pad=24, top=84, sc=2, c=document.createElement("canvas"); c.width=W*sc; c.height=H*sc;
  const x=c.getContext("2d"), m=REC.meta; x.scale(sc,sc);
  x.fillStyle=COL.glass; x.fillRect(0,0,W,H);
  x.textAlign="left"; x.fillStyle=COL.vinyl; x.font=OSD(30); x.fillText("DOUBLE WISHBONE SIMULATOR / HISTORY",pad,pad+22);
  x.fillStyle=COL.dim; x.font=OSD(20);
  x.fillText((CAR[m.car][0]+" / "+m.drive+" / "+recDur().toFixed(1)+" s / "+stamp(m.when,true)).toUpperCase(),pad,pad+48);
  const lx=W-pad-250, ly=pad+16;      // key: solid = left wheel, dashed = right wheel
  x.lineWidth=2; x.strokeStyle=COL.vinyl; x.beginPath(); x.moveTo(lx,ly); x.lineTo(lx+24,ly); x.stroke(); x.fillText("LEFT WHEEL",lx+32,ly+6);
  x.strokeStyle=COL.ice; x.setLineDash(DASH); x.beginPath(); x.moveTo(lx,ly+24); x.lineTo(lx+24,ly+24); x.stroke(); x.setLineDash([]); x.fillText("RIGHT WHEEL",lx+32,ly+30);
  x.save(); x.translate(pad,top); plotHist(x,W-2*pad,H-top-pad,histView(),null); x.restore();
  c.toBlob(b=>{if(b) saveFile(recName("png"),b,"Graph"); else setStatus("Export failed: the picture could not be made.",true);},"image/png");
};
/* The numbers: one row per 0.01 s, one column per trace, plus the steering wheel angle. Opens in any spreadsheet. */
$("recCsv").onclick=()=>{
  if(!recHeld()) return;
  const a=REC.buf, col=[0,8,9,1,2,3,4,5,6,7,10], dec=[2,3,2,3,3,2,0,0,0,0,1];
  let t="time_s,lateral_g,yaw_rate_deg_s,roll_deg,pitch_deg,heave_mm,FL_load_N,FR_load_N,RL_load_N,RR_load_N,steering_wheel_deg\n";
  for(let j=0;j<REC.n;j++){const o=j*HS; t+=col.map((cI,k)=>a[o+cI].toFixed(dec[k])).join(",")+"\n";}
  saveFile(recName("csv"),new Blob([t],{type:"text/csv"}),"Numbers");
};
recSync();

/* ---- telemetry ---- */
function drawTele(){
  let t=`<tr><th>Corner</th><th>Body Δh</th><th>Travel</th><th>Tire load</th><th>Camber to road</th><th>Steer, + right</th><th>Slip angle</th><th>Grip in use</th><th>Damper</th></tr>`, tot=0; const F=[];
  const drive=!!P.steer.link, q=drive?null:gripNow(model,S,inp.ay);
  for(let i=0;i<4;i++){
    const o=S.out[i], zc=S.z+model.xs[i]*S.th+model.ys[i]*S.ph; F[i]=o.Ft||0; tot+=F[i];
    const slip=drive?(o.slip||0):q.tire[i].slip, used=drive?(o.used||0):q.tire[i].used;
    t+=`<tr><td>${CN[i]}</td><td>${num(zc*1000,1)} mm</td><td>${num((o.s||0)*1000,1)} mm</td><td>${F[i]<1?"LIFTED":F[i].toFixed(0)+" N"}</td><td>${num(FR.cam[i],2)}°</td><td>${num(FR.steer[i],2)}°</td><td>${num(slip,1)}°</td><td>${F[i]<1?"–":(used*100).toFixed(0)+" %"}</td><td>${num((o.vd||0)*1000,0)} mm/s</td></tr>`;
  }
  const si=FR.si, turning=Math.abs(si.kra)>1e-4;
  t+=`<tr><td colspan="3">Cross weight (FL + RR)</td><td>${tot>0?((F[0]+F[3])/tot*100).toFixed(1):"–"} %</td><td colspan="5">TOTAL ${tot.toFixed(0)} N</td></tr>`;
  let note=turning?"Steering "+(si.kra>0?"right":"left")+": inner wheel "+si.di.toFixed(1)+"°, outer "+si.dout.toFixed(1)+"°"+(Number.isFinite(si.ack)?", Ackermann "+si.ack.toFixed(0)+" %":"")+", low-speed turn radius "+si.R.toFixed(1)+" m.":"Steering straight ahead.";
  if(!drive){const over=["Front","Rear"].filter((n,k)=>q.ax[k].used>1); if(over.length) note+=" "+over.join(" and ")+" tires cannot make "+Math.abs(inp.ay).toFixed(2)+" g: past the grip limit.";
    else if(Math.abs(inp.ay)>0.005) note+=" Slip angle and grip in use are what the tires need to hold "+Math.abs(inp.ay).toFixed(2)+" g, steering centered.";}
  $("teleNote").textContent=note;
  $("tele").innerHTML=t;
  const U=P.steer.speed, ayK=U*U*si.kay/G, kmh=(U*3.6).toFixed(0);
  $("steerOut").innerHTML=`<tr><th>Front wheels now</th><th></th></tr><tr><td>Left wheel</td><td>${num(si.dL,2)}°</td></tr><tr><td>Right wheel</td><td>${num(si.dR,2)}°</td></tr>`+
    `<tr><td>Ackermann</td><td>${Number.isFinite(si.ack)?si.ack.toFixed(0)+" %":"–"}</td></tr><tr><td>Turn radius, low speed</td><td>${Number.isFinite(si.R)&&turning?si.R.toFixed(1)+" m":"–"}</td></tr>`+
    (drive?`<tr><td>Lateral g at ${kmh} km/h</td><td>${num(S.ay,2)} g</td></tr><tr><td>Yaw rate</td><td>${num(S.r/D2R,1)}°/s</td></tr><tr><td>Car's slide angle, + = nose into the turn</td><td>${num(-Math.sign(S.r||1)*Math.atan2(S.vy,U)/D2R,1)}°</td></tr><tr><td>Lateral g if the tires did not slip</td><td>${num(ayK,2)} g</td></tr>`
          :`<tr><td>Lateral g at ${kmh} km/h if the tires did not slip</td><td>${num(ayK,2)} g</td></tr>`);
  histTable();
}

/* ===== loop ===== */
function applyTheme(){readColors(); if(R3) R3.theme();}      // one look, night only: read the tokens once
const clock=t=>{const m=Math.floor(t/60); return String(m).padStart(2,"0")+":"+(t-60*m).toFixed(1).padStart(4,"0");};
function resize(){if(R3) R3.resize(); sizeCanvases();}
new ResizeObserver(resize).observe(view);
new ResizeObserver(sizeCanvases).observe(document.querySelector(".grid"));

let last=performance.now(), teleT=0;
function frame(now){
  const dtF=Math.min(0.25,Math.max(0,(now-last)/1000)); last=now;
  if(running){
    stepAcc+=dtF*speed/DT; const n=Math.min(1200,Math.floor(stepAcc)); stepAcc-=Math.floor(stepAcc);
    const tgt=rackTarget(), rr=900/360*P.steer.c*DT;
    inp.U=P.steer.link?P.steer.speed:0;
    let moved=0;
    for(let k=0;k<n;k++){
      const d=tgt-inp.rack; inp.rack+=d>rr?rr:(d<-rr?-rr:d);
      step(model,S,inp,DT,0);
      if(inp.U>0){                                               // the car's path over the ground, for the moving floor
        const cs=Math.cos(GND.psi), sn=Math.sin(GND.psi);
        GND.x+=(inp.U*cs-S.vy*sn)*DT; GND.y+=(inp.U*sn+S.vy*cs)*DT; GND.psi+=S.r*DT; moved+=Math.hypot(inp.U,S.vy)*DT;
      }
      if(++hAcc>=40){hAcc=0; histPush();}
    }
    GND.x-=GWRAP*Math.round(GND.x/GWRAP); GND.y-=GWRAP*Math.round(GND.y/GWRAP); GND.d+=(moved-GND.d)*0.3; GND.roll+=Math.min(moved,ROLL_MAX);
    if(S.spun||!finite(S)) recStop();                         // a recording keeps what led up to a spin; the reset below does not wipe it
    if(S.spun){setSw(0); inp.rack=0; resettle(2); setStatus("The car spun: it was sliding sideways faster than it was going forward. Steering centered.",true);}
    else if(!finite(S)){inp.rack=rackTarget(); resettle(2); setStatus("The simulation went unstable and was reset. Try less extreme values.",true);}
    if(P.steer.link) inp.ay=S.ay;
  } else GND.d*=0.7;
  computeFrame();
  $("hRoll").textContent=num(S.ph/D2R,2)+"°"; $("hPitch").textContent=num(S.th/D2R,2)+"°"; $("hHeave").textContent=num(S.z*1000,1)+" mm";
  $("hSteer").textContent=num(swNow(),0)+"°"; $("hAy").textContent=num(inp.ay,2)+" g"; $("hTime").textContent="Sim "+clock(S.t);
  $("oState").textContent=running?"▶ Run":"■ Hold";
  if(P.steer.link){$("ay").value=inp.ay; $("ayO").textContent=sgnTxt(inp.ay,2)+" g";}
  if(R3) R3.update();
  drawRear(); drawCurve(); drawHist();
  if(now-teleT>100){drawTele(); teleT=now;}
  requestAnimationFrame(frame);
}

/* ---- setup files: Export saves the car on screen as a .json file; Import loads such a file as the session setup ---- */
/* Hands a generated file to the person: inside a Claude artifact the viewer saves it, on the web it is a normal browser download. */
async function saveFile(file,data,what){
  let dl=null; try{if(window.claude&&window.claude.use) dl=await window.claude.use("downloads");}catch(e){}
  if(dl){
    try{await dl.save({filename:file,data}); setStatus(what+" exported as "+file+".",false);}
    catch(e){if(e&&e.code==="declined") setStatus("Export cancelled.",false); else setStatus("Export is not available in this view.",true);}
    return;
  }
  try{
    const a=document.createElement("a"), u=URL.createObjectURL(data instanceof Blob?data:new Blob([data]));
    a.href=u; a.download=file; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000);
    setStatus(what+" exported as "+file+".",false);
  }catch(e){setStatus("Export failed: "+e.message,true);}
}
function exportSetup(){
  const d=new Date(), name=(CAR[presetName]||CAR.session)[1], file="dws-"+name+"-"+stamp(d)+".json";
  saveFile(file,new Blob([JSON.stringify({app:"double-wishbone-simulator",format:1,name,saved:d.toISOString(),setup:P},null,1)],{type:"application/json"}),"Setup");
}
function importSetup(f){
  const rd=new FileReader();
  rd.onerror=()=>setStatus("Import failed: the file could not be read.",true);
  rd.onload=()=>{
    try{
      let j; try{j=JSON.parse(rd.result);}catch(e){throw new Error("the file is not a setup file.");}
      const src=j&&j.setup?j.setup:j;
      if(!src||typeof src!=="object"||!Array.isArray(src.ax)||!src.veh) throw new Error("the file is not a setup file.");
      const q=fromSaved(src), note=camNote; makeModel(q);                // throws if the geometry in the file cannot be built
      try{localStorage.setItem(SKEY,JSON.stringify(q));}catch(e){}
      loadPreset("session",q); setStatus("Setup imported from "+f.name+". It is now the session setup."+note,false);
    }catch(e){setStatus("Import failed: "+e.message,true);}
  };
  rd.readAsText(f);
}
$("expBtn").onclick=exportSetup;
$("impBtn").onclick=()=>$("impFile").click();
$("impFile").onchange=()=>{const f=$("impFile").files[0]; $("impFile").value=""; if(f) importSetup(f);};

/* ---- quick start: opens every time the page loads, and again from the Guide button ---- */
{const box=$("intro"), show=on=>{box.hidden=!on; if(on) $("introX").focus();};
 $("introX").onclick=()=>show(false); $("introBtn").onclick=()=>show(true);
 box.addEventListener("click",e=>{if(e.target===box) show(false);});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!box.hidden) show(false);});
 show(true);}

/* boot */
settle(model,S,inp,3); S.t=0;
renderForms(); readLoads(); refreshStatic(); syncLink(); applyTheme(); resize();
setStatus(restored?"Last setup restored from this browser."+camNote:"Solved.",false);
if(document.fonts&&document.fonts.load) document.fonts.load("18px VT323").catch(()=>{});      // the canvases draw their labels in the read-out face
requestAnimationFrame(frame);
/* If the host restored control values after an update, bring the model and the controls back in step. */
setTimeout(()=>{const a=document.activeElement; if(a&&(a.tagName==="INPUT"||a.tagName==="SELECT")) return; renderForms(); setSw(+$("sw").value||0); syncLink(); curveStatic();},1200);
