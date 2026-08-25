#!/usr/bin/env node
// Six OnQ logo directions, rendered for comparison. Zero dependencies.
import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";

const crcT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xffffffff;for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&0xff]^(c>>>8);return (c^0xffffffff)>>>0;};
const chunk=(ty,d)=>{const t=Buffer.from(ty,"ascii"),l=Buffer.alloc(4),c=Buffer.alloc(4);l.writeUInt32BE(d.length,0);c.writeUInt32BE(crc32(Buffer.concat([t,d])),0);return Buffer.concat([l,t,d,c]);};
function png(w,h,px){const s=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;
 const st=w*4,raw=Buffer.alloc((st+1)*h);for(let y=0;y<h;y++){raw[y*(st+1)]=0;px.copy(raw,y*(st+1)+1,y*st,y*st+st);}
 return Buffer.concat([s,chunk("IHDR",ih),chunk("IDAT",zlib.deflateSync(raw,{level:9})),chunk("IEND",Buffer.alloc(0))]);}

const W=[255,255,255], SOFT=[255,255,255,0.42];
const TOP=[107,144,181], BOT=[71,104,141];
const ACC=[240,190,110]; // warm accent for "your turn"

const TAU=Math.PI*2;
const disc=(u,v,cx,cy,r)=>Math.hypot(u-cx,v-cy)<=r;
const ring=(u,v,cx,cy,ro,ri)=>{const d=Math.hypot(u-cx,v-cy);return d<=ro&&d>=ri;};
// angle measured clockwise from 12 o'clock, 0..1
const turn=(u,v,cx,cy)=>{let a=Math.atan2(u-cx,-(v-cy));if(a<0)a+=TAU;return a/TAU;};
function capsule(u,v,x1,y1,x2,y2,r){const dx=x2-x1,dy=y2-y1,L2=dx*dx+dy*dy;let t=L2?((u-x1)*dx+(v-y1)*dy)/L2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(u-(x1+dx*t),v-(y1+dy*t))<=r;}

// --- the six directions ---
const OPTIONS = {
  // A: progress ring — how far through the queue you are
  A(u,v){ const cx=.5,cy=.47,ro=.34,ri=.215;
    if(ring(u,v,cx,cy,ro,ri)){ const t=turn(u,v,cx,cy); return t<=.72?W:SOFT; }
    if(disc(u,v,.735,.735,.085)) return W;
    return null; },

  // B: queue of people curving into a Q
  B(u,v){ const cx=.47,cy=.45,r=.27;
    for(let i=0;i<9;i++){ const a=(i/12)*TAU - TAU*0.06; const x=cx+Math.sin(a)*r, y=cy-Math.cos(a)*r;
      if(disc(u,v,x,y,.072)) return W; }
    const tail=[[.70,.70,.062],[.80,.80,.048],[.885,.885,.036]];
    for(const [x,y,rr] of tail) if(disc(u,v,x,y,rr)) return ACC;
    return null; },

  // C: clock Q — time you get back
  C(u,v){ const cx=.47,cy=.45,ro=.315,ri=.225;
    if(ring(u,v,cx,cy,ro,ri)){ const t=turn(u,v,cx,cy); return (t>.60&&t<.66)?null:W; }
    if(capsule(u,v,cx,cy,cx,cy-.145,.028)) return W;         // minute hand
    if(capsule(u,v,cx,cy,cx+.115,cy+.045,.028)) return ACC;  // hour hand
    if(disc(u,v,.775,.775,.072)) return W;
    return null; },

  // D: map pin whose head is a Q
  D(u,v){ const cx=.5,cy=.40,ro=.30,ri=.155;
    if(v>cy && Math.abs(u-cx) <= (0.30*(1-(v-cy)/0.52)) && v<.92) { // tapered point
      const inner=0.155*(1-(v-cy)/0.52); if(Math.abs(u-cx)>inner||v>cy+.18) return W; }
    if(ring(u,v,cx,cy,ro,ri)) return W;
    if(disc(u,v,cx,cy,ri*0.62)) return SOFT;
    return null; },

  // E: bold monogram Q with a confident cut tail
  E(u,v){ const cx=.47,cy=.45,ro=.33,ri=.175;
    if(ring(u,v,cx,cy,ro,ri)) return W;
    if(capsule(u,v,.62,.60,.86,.84,.075)) return W;
    return null; },

  // F: barber chair inside the Q
  F(u,v){ const cx=.5,cy=.46,ro=.335,ri=.245;
    if(ring(u,v,cx,cy,ro,ri)){ const t=turn(u,v,cx,cy); return (t>.60&&t<.67)?null:W; }
    if(u>.40&&u<.455&&v>.30&&v<.55) return W;                  // chair back
    if(u>.395&&u<.62&&v>.52&&v<.575) return W;                 // seat
    if(capsule(u,v,.505,.575,.505,.66,.022)) return W;         // pedestal
    if(u>.43&&u<.58&&v>.655&&v<.69) return W;                  // base
    if(disc(u,v,.775,.775,.062)) return ACC;
    return null; },
};

function render(key,size,{bg=true}={}){
  const S=size*3, buf=Buffer.alloc(S*S*4), fn=OPTIONS[key];
  for(let y=0;y<S;y++){ const t=y/(S-1);
    const bgc=[Math.round(TOP[0]+(BOT[0]-TOP[0])*t),Math.round(TOP[1]+(BOT[1]-TOP[1])*t),Math.round(TOP[2]+(BOT[2]-TOP[2])*t)];
    for(let x=0;x<S;x++){ const i=(y*S+x)*4;
      if(bg){buf[i]=bgc[0];buf[i+1]=bgc[1];buf[i+2]=bgc[2];buf[i+3]=255;}
      const u=(x+.5)/S,v=(y+.5)/S, c=fn(u,v);
      if(c){ const a=c.length>3?c[3]:1;
        buf[i]=Math.round(buf[i]*(1-a)+c[0]*a); buf[i+1]=Math.round(buf[i+1]*(1-a)+c[1]*a);
        buf[i+2]=Math.round(buf[i+2]*(1-a)+c[2]*a); buf[i+3]=255; } } }
  const out=Buffer.alloc(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const o=(y*size+x)*4;
    for(let c=0;c<4;c++){let s=0;for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)s+=buf[((3*y+dy)*S+3*x+dx)*4+c];out[o+c]=Math.round(s/9);}}
  return {png:png(size,size,out),raw:out};
}

// contact sheet: 3 x 2, big tiles + a small tile beside each (icon-size preview)
const TILE=380, GAP=26, COLS=3, ROWS=2, SMALL=96;
const CW=TILE+GAP+SMALL, SW=GAP+COLS*(CW+GAP), SH=GAP+ROWS*(TILE+GAP);
const sheet=Buffer.alloc(SW*SH*4);
for(let i=0;i<SW*SH;i++){sheet[i*4]=243;sheet[i*4+1]=244;sheet[i*4+2]=246;sheet[i*4+3]=255;}
const keys=Object.keys(OPTIONS);
keys.forEach((k,idx)=>{
  const col=idx%COLS, row=Math.floor(idx/COLS);
  const ox=GAP+col*(CW+GAP), oy=GAP+row*(TILE+GAP);
  const big=render(k,TILE).raw, small=render(k,SMALL).raw;
  for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){const s=(y*TILE+x)*4,d=((oy+y)*SW+ox+x)*4;for(let c=0;c<4;c++)sheet[d+c]=big[s+c];}
  const sy=oy+Math.round((TILE-SMALL)/2), sx=ox+TILE+GAP;
  for(let y=0;y<SMALL;y++)for(let x=0;x<SMALL;x++){const s=(y*SMALL+x)*4,d=((sy+y)*SW+sx+x)*4;for(let c=0;c<4;c++)sheet[d+c]=small[s+c];}
  fs.writeFileSync(path.resolve(`/tmp/onq-logo-${k}.png`), render(k,512).png);
});
fs.writeFileSync("/tmp/onq-logo-options.png", png(SW,SH,sheet));
console.log("sheet: /tmp/onq-logo-options.png");
console.log("individual: " + keys.map(k=>`/tmp/onq-logo-${k}.png`).join(" "));
