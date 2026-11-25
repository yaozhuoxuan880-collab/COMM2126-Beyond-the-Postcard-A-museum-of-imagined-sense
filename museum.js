/*
 * BEYOND THE POSTCARD · A MUSEUM OF IMAGINED SENSES
 * Rebuild of the user's original dependency-free WebGL Museum of Missing Senses.
 * Five gallery rooms / eight stages each / local-only reflection / print receipt.
 */
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const clone=x=>JSON.parse(JSON.stringify(x));
const GALLERIES={
  greece:{id:'greece',country:'GREECE',number:'01',title:'The Sound of Paradise',name:'Oia · Santorini',focus:'SOUND',description:'What sounds can a silent picture make us imagine?',color:'#af8467',promo:'assets/greece_promo.jpg',visitor:'assets/greece_visitor.jpg',location:[-15.1,0],yaw:-Math.PI/2,artPosition:[-19.67,2.58,0],normal:[1,0,0],right:[0,0,-1]},
  china:{id:'china',country:'CHINA',number:'02',title:'The Invisible Effort',name:'The Great Wall · China',focus:'BODY MOVEMENT',description:'What happens when a beautiful view becomes a bodily journey?',color:'#aa7a51',promo:'assets/china_promo.jpg',visitor:'assets/china_visitor.jpg',location:[15.1,0],yaw:Math.PI/2,artPosition:[19.67,2.58,0],normal:[-1,0,0],right:[0,0,1]},
  iceland:{id:'iceland',country:'ICELAND',number:'03',title:'The Temperature of Luxury',name:'Blue Lagoon · Iceland',focus:'TOUCH & TEMPERATURE',description:'Can an image promise comfort to a body it cannot touch?',color:'#5e9ea3',promo:'assets/iceland_promo.jpg',visitor:'assets/iceland_visitor.jpg',location:[1.85,-14],yaw:Math.PI/2,artPosition:[6.72,2.58,-14],normal:[-1,0,0],right:[0,0,1]},
  uk:{id:'uk',country:'UNITED KINGDOM',number:'04',title:'The Weather Outside the Frame',name:'The Lake District · UK',focus:'WEATHER & TIME',description:'Can one beautiful moment represent changing sensations?',color:'#879678',promo:'assets/uk_promo.jpg',visitor:'assets/uk_visitor.jpg',location:[0,15],yaw:Math.PI,artPosition:[0,2.58,19.67],normal:[0,0,-1],right:[-1,0,0]},
  spain:{id:'spain',country:'SPAIN',number:'05',title:'Whose Space Is It?',name:'Park Güell · Barcelona',focus:'SPACE & DISTANCE',description:'Who decides what is included or excluded from a place?',color:'#ba916b',promo:'assets/spain_promo.jpg',visitor:'assets/spain_visitor.jpg',location:[0,-27],yaw:0,artPosition:[0,2.58,-32.67],normal:[0,0,1],right:[1,0,0]}
};
// Chrome treats file:// photographs as an opaque origin for WebGL texture upload.
// Switch the gallery photos to locally embedded data URIs for direct double-click
// access; keep lightweight relative JPEG paths on HTTP/GitHub Pages.
const useEmbeddedImages = location.protocol === 'file:' || new URLSearchParams(location.search).has('test-embedded');
if (useEmbeddedImages && window.BTP_EMBEDDED_ASSETS) {
  for (const gallery of Object.values(GALLERIES)) {
    gallery.promo = window.BTP_EMBEDDED_ASSETS[gallery.promo] || gallery.promo;
    gallery.visitor = window.BTP_EMBEDDED_ASSETS[gallery.visitor] || gallery.visitor;
  }
}
const ORDER=['greece','china','iceland','uk','spain'];
const ARTWORKS=ORDER.map(id=>{let g=GALLERIES[id];return {...g,id:g.id,gallery:id,main:true,number:g.number,title:g.title,location:g.name,image:g.promo,artPosition:g.artPosition,normal:g.normal,right:g.right}});
const SOUND_TYPES=[['waves','Ocean waves','≈'],['wind','Wind','〰'],['voices','People talking','◌'],['steps','Footsteps','↟'],['shutters','Camera shutters','▣'],['music','Music','♫'],['own','My own sound','✳']];
const BODY_KEYS=[['legs','Effort in my legs'],['breath','Change in breathing'],['balance','Attention to my footing'],['rest','Need to pause']];
const THERMAL_ZONE=['Head & face','Shoulders & arms','Torso','Legs'];
const FEELS=[['warm','Warmth'],['cool','Coolness'],['pressure','Water surrounding my skin'],['damp','Steam or dampness'],['texture','Texture'],['other','My own sensation']];
const WEATHER_SENSES=[['sun','Sunlight on my skin'],['wind','Wind against my face'],['damp','Dampness on my clothes'],['ground','Wet or uneven ground'],['cool','Cool air'],['unknown','Cannot tell']];
const TIMES=[['arrival','Arrival'],['stay','After a while'],['leaving','Leaving']];
const STAGE_TITLES=['First Impressions','Place Yourself','Create an Imagined Experience','Memory & Expectations','Flip the Postcard','Reimagine & Reconsider','Question the Frame','Your Sensory Postcard'];
const STORE='beyond-the-postcard-v3';
function initialSide(){return {focus:'',focusPoint:null,position:{x:48,y:62},sounds:{},ownSound:'',journey:[],body:{legs:2,breath:2,balance:2,rest:2},depth:'chest',thermal:{},thermalZone:'Shoulders & arms',senses:[],weather:{arrival:[],stay:[],leaving:[]},weatherPhase:'arrival',space:3,spaceActivity:'observe',freedom:3,sharing:3,weatherComfort:3,comfort:3,appeal:3,confidence:3,desire:3,sources:[],details:[],note:''};}
function newRecord(){return {step:0,completed:false,flipped:false,first:initialSide(),second:null,critique:{},lastNote:''};}
const emptyState=()=>({introConfidence:3,introDone:false,galleries:Object.fromEntries(ORDER.map(k=>[k,newRecord()])),curator:{place:'greece',view:'promo',caption:'',outside:'',complete:false},endConfidence:3,finalThought:''});
let state=emptyState();
try{const r=JSON.parse(localStorage.getItem(STORE)||'null');if(r&&r.galleries){state={...emptyState(),...r,galleries:Object.fromEntries(ORDER.map(k=>[k,{...newRecord(),...r.galleries[k]}]))};}}catch(e){/* private-browsing storage may be blocked */}
function save(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch(e){}updateNav();}
let gl,world,meshes={},signTex={},photoTex={},camera={x:0,y:1.67,z:2.7,yaw:0,pitch:-.015};
let entered=false,panelOpen=false,helpOpen=false,mapOpen=false,walking=true,active=null,lastTime=0,lastProx='',toastTimer;
const canvas=$('museum'),modal=$('modal'),content=$('modal-content');
const keys=new Set(),touchDirs=new Set();let isDragging=false,dragX=0,dragY=0,pointerLocked=false;
let viewMode='gallery';
const count=()=>ORDER.filter(k=>state.galleries[k].completed).length;
const ref=k=>GALLERIES[k];
function pathGet(obj,path){return path.split('.').reduce((o,k)=>o?.[k],obj)}
function pathSet(obj,path,val){const a=path.split('.');let o=obj;for(let i=0;i<a.length-1;i++){o[a[i]]??={};o=o[a[i]];}o[a[a.length-1]]=val;}
function currentSide(){let r=state.galleries[active];return r.step===5?'second':'first';}
function rec(){return state.galleries[active];}
function side(){return rec()[currentSide()];}
const VERT=`attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor; attribute vec2 aUV;
uniform mat4 uViewProj; varying vec3 vNormal; varying vec3 vColor; varying vec2 vUV;
void main(){ gl_Position=uViewProj*vec4(aPosition,1.0); vNormal=aNormal; vColor=aColor; vUV=aUV; }`;
const FRAG=`precision mediump float; varying vec3 vNormal; varying vec3 vColor; varying vec2 vUV;
uniform sampler2D uTexture; uniform float uTextured; uniform float uGlow;
void main(){ float light=0.77+0.23*max(0.0,dot(normalize(vNormal),normalize(vec3(0.42,0.8,0.35))));
 vec3 col=mix(vColor,texture2D(uTexture,vUV).rgb*vColor,uTextured);
 gl_FragColor=vec4(col*mix(light,1.0,uGlow),1.0); }`;
const rgb=hex=>{const c=hex.replace('#','');return [parseInt(c.slice(0,2),16)/255,parseInt(c.slice(2,4),16)/255,parseInt(c.slice(4,6),16)/255]};
const vadd=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const vscale=(v,s)=>[v[0]*s,v[1]*s,v[2]*s];
function quadPoints(center,right,up,w,h){let r=vscale(right,w/2),u=vscale(up,h/2);return [vadd(vadd(center,vscale(r,-1)),vscale(u,-1)),vadd(vadd(center,r),vscale(u,-1)),vadd(vadd(center,r),u),vadd(vadd(center,vscale(r,-1)),u)];}
class MeshBuilder{
  constructor(){this.data=[]}
  quad(a,b,c,d,hex,normal=[0,1,0]){
    const color=typeof hex==='string'?rgb(hex):hex;
    const coords=[[a,0,0],[b,1,0],[c,1,1],[a,0,0],[c,1,1],[d,0,1]];
    for(const [p,u,v] of coords)this.data.push(p[0],p[1],p[2],normal[0],normal[1],normal[2],...color,u,v);
  }
  box(x,y,z,w,h,d,col){let x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;
    this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],col,[0,0,1]);
    this.quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],col,[0,0,-1]);
    this.quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],col,[1,0,0]);
    this.quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],col,[-1,0,0]);
    this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],col,[0,1,0]);
    this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],col,[0,-1,0]);
  }
  surface(center,right,up,w,h,col){let pts=quadPoints(center,right,up,w,h);let n=[right[1]*up[2]-right[2]*up[1],right[2]*up[0]-right[0]*up[2],right[0]*up[1]-right[1]*up[0]];this.quad(...pts,col,n)}
  tile(x,z,size,col){let y=0.018,s=size/2;this.quad([x-s,y,z+s],[x+s,y,z+s],[x+s,y,z-s],[x-s,y,z-s],col,[0,1,0])}
  ring(cx,cy,cz,major,thick,col,axis='z'){let C=rgb(col),count=48;
    for(let i=0;i<count;i++){const a=2*Math.PI*i/count,b=2*Math.PI*(i+1)/count;
      const p=(ang,r)=> axis==='z'?[cx+Math.cos(ang)*r,cy+Math.sin(ang)*r,cz]:[cx,cy+Math.sin(ang)*r,cz+Math.cos(ang)*r];
      let pts=[p(a,major-thick),p(b,major-thick),p(b,major+thick),p(a,major+thick)];this.quad(...pts,C,[0,0,1]);
    }
  }
}
function compileShader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
function makeProgram(){const p=gl.createProgram();gl.attachShader(p,compileShader(gl.VERTEX_SHADER,VERT));gl.attachShader(p,compileShader(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
function buildMesh(builder){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(builder.data),gl.STATIC_DRAW);return {buffer,count:builder.data.length/11}}
function matPerspective(fovy,aspect,near,far){let f=1/Math.tan(fovy/2);let m=new Float32Array(16);m[0]=f/aspect;m[5]=f;m[10]=(far+near)/(near-far);m[11]=-1;m[14]=2*far*near/(near-far);return m}
function matLookAt(eye,target,up=[0,1,0]){let z=[eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]];let len=Math.hypot(...z);z=z.map(v=>v/len);let x=[up[1]*z[2]-up[2]*z[1],up[2]*z[0]-up[0]*z[2],up[0]*z[1]-up[1]*z[0]];len=Math.hypot(...x);x=x.map(v=>v/len);let y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1]);}
function matMul(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function textureFrom(source){let t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
function flatTexture(){const x=new Uint8Array([255,255,255,255]);let t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,x);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
function addRoomFloor(builder,x0,x1,z0,z1,base){builder.box((x0+x1)/2,-.065,(z0+z1)/2,x1-x0,.13,z1-z0,base);
  const tile=1.55,gap=.018;let n=0;for(let x=x0;x<x1-.01;x+=tile)for(let z=z0;z<z1-.01;z+=tile){let cx=x+Math.min(tile,x1-x)/2,cz=z+Math.min(tile,z1-z)/2;let szx=Math.min(tile,x1-x)-gap,szz=Math.min(tile,z1-z)-gap;
    let varColors=(n++%7===0)?['#d8d1c5','#e2dbcf','#e6dfd4']:['#e6e0d5','#e9e3d8','#e4ded2'];let c=varColors[(Math.floor(x*2+z*3)&2)?1:0];
    builder.quad([cx-szx/2,.018,cz+szz/2],[cx+szx/2,.018,cz+szz/2],[cx+szx/2,.018,cz-szz/2],[cx-szx/2,.018,cz-szz/2],c,[0,1,0]);
  }
}
function wallX(b,x,z0,z1,col){b.box(x,2.63,(z0+z1)/2,.3,5.26,z1-z0,col);b.box(x>0?x-.18:x+.18,.13,(z0+z1)/2,.07,.26,z1-z0,'#b5a595');b.box(x>0?x-.18:x+.18,4.93,(z0+z1)/2,.06,.1,z1-z0,'#cfc1af')}
function wallZ(b,z,x0,x1,col){b.box((x0+x1)/2,2.63,z,x1-x0,5.26,.3,col);b.box((x0+x1)/2,.13,z>0?z-.18:z+.18,x1-x0,.26,.07,'#b5a595');b.box((x0+x1)/2,4.93,z>0?z-.18:z+.18,x1-x0,.1,.06,'#cfc1af')}
function ceilingLight(b,x,z,w=2){b.box(x,5.1,z,w,.09,.32,'#d9c8a6');b.box(x,5.05,z,w-.13,.032,.20,'#fff1d1');b.box(x,5.17,z,w+.15,.06,.4,'#aeaa9d')}
function doorDetail(b,axis,at,mat){const gold='#ac896b',shadow='#7b756b';if(axis==='x'){
 for(let z of [-1.9,1.9]){b.box(at,2.25,z,.46,4.5,.22,gold);b.box(at,2.25,z,.53,4.5,.055,shadow)}
 b.box(at,4.56,0,.46,.62,3.9,gold);b.box(at,4.26,0,.53,.035,3.9,'#d4b38c');
 }else{for(let x of [-1.9,1.9]){b.box(x,2.25,at,.22,4.5,.46,gold);b.box(x,2.25,at,.055,4.5,.53,shadow)}
 b.box(0,4.56,at,3.9,.62,.46,gold);b.box(0,4.26,at,3.9,.035,.53,'#d4b38c');}}
function addExhibitFrame(b,a){
  const pos=a.artPosition,normal=a.normal,right=a.right,up=[0,1,0];
  a.frameBasis={normal,right,up};
  b.surface(vadd(pos,vscale(normal,-.13)),right,up,3.74,4.62,'#aba18e');
  b.surface(vadd(pos,vscale(normal,-.06)),right,up,3.66,4.54,'#594c42');
  b.surface(vadd(pos,vscale(normal,.005)),right,up,3.52,4.40,'#c4a179');
  b.surface(vadd(pos,vscale(normal,.018)),right,up,3.34,4.22,'#202829');
  b.surface(vadd(pos,vscale(normal,.035)),right,up,3.19,4.07,'#171e20');
  // Every object has an independent lower-right wall label.
  const labelCenter=vadd(vadd(pos,vscale(right,2.53)),vscale(up,-1.48));
  b.surface(vadd(labelCenter,vscale(normal,.07)),right,up,1.69,1.50,'#b6a590');
  b.surface(vadd(labelCenter,vscale(normal,.082)),right,up,1.61,1.42,'#f3ecdf');
  // Spotlights above each framed photograph.
  b.box(pos[0]+normal[0]*.7,4.94,pos[2]+normal[2]*.7,normal[0]!==0?.75:2.9,.11,normal[2]!==0?.75:2.9,'#a0927c');
  let artCenter=vadd(pos,vscale(normal,.058));let art=new MeshBuilder();art.surface(artCenter,right,up,3.09,3.97,'#ffffff');meshes[a.id+'Art']=art;
}
function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight,maxLines=4){
 const words=text.split(/\s+/);let line='',row=0;
 for(let i=0;i<words.length;i++){
  const next=line?line+' '+words[i]:words[i];
  if(ctx.measureText(next).width>maxWidth && line){
   ctx.fillText(line,x,y+row*lineHeight);row++;if(row>=maxLines)return;
   line=words[i];
  }else line=next;
 }
 if(line&&row<maxLines)ctx.fillText(line,x,y+row*lineHeight);
}
function makeSignCanvas(label,number){
 let c=document.createElement('canvas');c.width=1024;c.height=235;
 let ctx=c.getContext('2d');ctx.fillStyle='#e9dfce';ctx.fillRect(0,0,1024,235);
 ctx.fillStyle='#353f39';ctx.fillRect(12,12,1000,211);ctx.strokeStyle='#bc9f78';ctx.lineWidth=3;ctx.strokeRect(23,23,978,190);
 ctx.fillStyle='#c1a37c';ctx.font='bold 27px Arial';ctx.fillText('GALLERY '+number,62,98);
 ctx.fillStyle='#f1e8d9';ctx.font='bold 74px Georgia, serif';ctx.fillText(label,62,181);
 return c;
}
function makePlaqueCanvas(a){
 let c=document.createElement('canvas');c.width=800;c.height=640;let ctx=c.getContext('2d');
 ctx.fillStyle='#f0e9db';ctx.fillRect(0,0,800,640);
 ctx.fillStyle='#ab9071';ctx.fillRect(42,36,88,5);
 ctx.fillStyle='#9d795a';ctx.font='bold 21px Arial';ctx.fillText('BEYOND THE POSTCARD  ·  '+a.number,42,88);
 ctx.fillStyle='#283735';ctx.font='bold 40px Georgia';wrapCanvasText(ctx,a.title,42,160,708,47,2);
 ctx.fillStyle='#8a806e';ctx.font='25px Arial';wrapCanvasText(ctx,a.location,42,253,708,30,2);
 ctx.strokeStyle='#bdb19d';ctx.beginPath();ctx.moveTo(42,333);ctx.lineTo(752,333);ctx.stroke();
 ctx.fillStyle='#4f5b55';ctx.font='26px Arial';wrapCanvasText(ctx,a.description,42,388,706,37,5);
 ctx.fillStyle='#9c7b5c';ctx.font='bold 22px Arial';ctx.fillText('PRESS E · ENTER SENSORY EXPERIENCE',42,594);
 return c;
}
function makeDeskSign(){let c=document.createElement('canvas');c.width=1200;c.height=260;const ctx=c.getContext('2d');ctx.fillStyle='#2e4540';ctx.fillRect(0,0,1200,260);ctx.strokeStyle='#b59b77';ctx.lineWidth=7;ctx.strokeRect(17,17,1166,226);ctx.textAlign='center';ctx.fillStyle='#ddc7a1';ctx.font='bold 42px Arial';ctx.fillText('RECEPTION',600,107);ctx.fillStyle='#fff6e6';ctx.font='bold 49px Georgia';ctx.fillText('SENSORY RECEIPTS  ↗',600,187);return c;}
// Five genuinely walkable rooms, with the fifth gallery beyond the north hall.
// The south-facing reception is part of the entrance hall, NOT a replacement for a gallery.
function makeWorld(){const b=new MeshBuilder();
 const rooms=[[-7,7,-7,7,'#ded5c8'],[-20,-7,-7,7,'#e6d9d0'],[7,20,-7,7,'#e1e3e6'],[-7,7,-20,-7,'#dee8e5'],[-7,7,7,20,'#e4e4d8'],[-7,7,-33,-20,'#eee0d5']];
 for(const [x0,x1,z0,z1,c] of rooms)addRoomFloor(b,x0,x1,z0,z1,c);
 // Lobby exterior and openings into west / east / north / south.
 wallX(b,-7,-7,-1.9,'#e9e1d6');wallX(b,-7,1.9,7,'#e9e1d6');
 wallX(b,7,-7,-1.9,'#e9e1d6');wallX(b,7,1.9,7,'#e9e1d6');
 wallZ(b,-7,-7,-1.9,'#e9e1d6');wallZ(b,-7,1.9,7,'#e9e1d6');
 wallZ(b,7,-7,-1.9,'#e9e1d6');wallZ(b,7,1.9,7,'#e9e1d6');
 wallX(b,-20,-7,7,'#efe0d8');wallZ(b,-7,-20,-7,'#efe0d8');wallZ(b,7,-20,-7,'#efe0d8');
 wallX(b,20,-7,7,'#e5e9f0');wallZ(b,-7,7,20,'#e5e9f0');wallZ(b,7,7,20,'#e5e9f0');
 wallX(b,-7,-20,-7,'#dbe5e2');wallX(b,7,-20,-7,'#dbe5e2');
 wallZ(b,-20,-7,-1.9,'#dbe5e2');wallZ(b,-20,1.9,7,'#dbe5e2');
 wallX(b,-7,7,20,'#e8e9dd');wallX(b,7,7,20,'#e8e9dd');wallZ(b,20,-7,7,'#e8e9dd');
 wallX(b,-7,-33,-20,'#ecdfd7');wallX(b,7,-33,-20,'#ecdfd7');wallZ(b,-33,-7,7,'#ecdfd7');
 for(const axis of [['x',-7],['x',7],['z',-7],['z',7],['z',-20]])doorDetail(b,axis[0],axis[1]);
 for(const [x0,x1,z0,z1,col] of rooms){b.box((x0+x1)/2,5.26,(z0+z1)/2,x1-x0,.14,z1-z0,col);for(let z=z0+2.8;z<z1-1;z+=5.1)for(let x=x0+2.8;x<x1-1;x+=5.4)ceilingLight(b,x,z,2.2);}
 // Original museum's ornamental entrance and reception.
 b.ring(0,3.55,0,.86,.032,'#ac8a62','z');b.ring(0,3.55,0,.78,.027,'#b9986f','x');b.box(0,4.68,0,.03,1.05,.03,'#bca17b');
 b.box(4.4,.68,4.6,1.55,1.35,1.05,'#415452');b.box(4.4,1.4,4.6,1.85,.1,1.3,'#d7bd95');b.box(4.4,1.55,4.6,.9,.22,.7,'#d9d1c2');
 // Decorative wall material in the entrance hall.
 for(let z of [-5.5,5.5]){b.box(-6.79,2.35,z,.06,3.5,.82,'#ded2c2');b.box(6.79,2.35,z,.06,3.5,.82,'#ded2c2');}
 for(const a of ARTWORKS)addExhibitFrame(b,a);
 meshes.world=buildMesh(b);
 for(const a of ARTWORKS)meshes[a.id+'Art']=buildMesh(meshes[a.id+'Art']);
 const signDefs=[
  {id:'greece',label:'GREECE',number:'01',pos:[-6.73,3.65,0],right:[0,0,-1]},
  {id:'china',label:'CHINA',number:'02',pos:[6.73,3.65,0],right:[0,0,1]},
  {id:'iceland',label:'ICELAND',number:'03',pos:[0,3.65,-6.73],right:[1,0,0]},
  {id:'uk',label:'UNITED KINGDOM',number:'04',pos:[0,3.65,6.73],right:[-1,0,0]},
  {id:'spain',label:'SPAIN',number:'05',pos:[0,3.65,-19.73],right:[1,0,0]}
 ];
 for(const s of signDefs){let m=new MeshBuilder();m.surface(s.pos,s.right,[0,1,0],3.2,.73,'#ffffff');meshes[s.id+'Sign']=buildMesh(m);signTex[s.id+'Sign']=textureFrom(makeSignCanvas(s.label,s.number));}
 for(const a of ARTWORKS){let center=vadd(vadd(a.artPosition,vscale(a.frameBasis.right,2.53)),vscale([0,1,0],-1.48));center=vadd(center,vscale(a.frameBasis.normal,.09));let plaque=new MeshBuilder();plaque.surface(center,a.frameBasis.right,[0,1,0],1.6,1.41,'#ffffff');meshes[a.id+'Plaque']=buildMesh(plaque);signTex[a.id+'Plaque']=textureFrom(makePlaqueCanvas(a));}
 let m=document.createElement('canvas');m.width=1024;m.height=410;let c=m.getContext('2d');c.fillStyle='#e8e1d5';c.fillRect(0,0,m.width,m.height);c.fillStyle='#a78f6b';c.fillRect(68,55,200,4);c.fillStyle='#414c42';c.font='30px Georgia';c.fillText('A MUSEUM OF IMAGINED SENSES',65,128);c.fillStyle='#354240';c.font='80px Georgia';c.fillText('BEYOND THE',64,225);c.fillText('POSTCARD',64,316);
 // Museum title belongs to the solid north lobby wall ABOVE THE RECEPTION DESK.
 // Keep its entire width on the x=1.9..7 wall panel, clear of the UK doorway at x=-1.9..1.9.
 let name=new MeshBuilder();name.surface([4.4,3.67,6.82],[-1,0,0],[0,1,0],3.25,1.30,'#ffffff');meshes.wallTitle=buildMesh(name);signTex.wallTitle=textureFrom(m);
 let desk=new MeshBuilder();desk.surface([4.4,2.36,6.79],[-1,0,0],[0,1,0],3.1,.65,'#ffffff');meshes.receiptSign=buildMesh(desk);signTex.receiptSign=textureFrom(makeDeskSign());
}
function initWebGL(){
 gl=canvas.getContext('webgl',{antialias:true,alpha:false})||canvas.getContext('experimental-webgl');if(!gl)throw Error('Your browser does not support WebGL. Use the Galleries menu to explore each experience without walking.');
 world=makeProgram();gl.useProgram(world);
 world.pos=gl.getAttribLocation(world,'aPosition');world.norm=gl.getAttribLocation(world,'aNormal');world.color=gl.getAttribLocation(world,'aColor');world.uv=gl.getAttribLocation(world,'aUV');world.matrix=gl.getUniformLocation(world,'uViewProj');world.texture=gl.getUniformLocation(world,'uTexture');world.textured=gl.getUniformLocation(world,'uTextured');world.glow=gl.getUniformLocation(world,'uGlow');
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.2,.25,.26,1);meshes.whiteTexture=flatTexture();makeWorld();
 for(const g of Object.values(GALLERIES)){
  let img=new Image();img.onload=()=>{photoTex[g.id+'promo']=textureFrom(img)};img.onerror=()=>console.warn('Unable to load promotional photograph:',g.id);img.src=g.promo;
  let visitor=new Image();visitor.onload=()=>{photoTex[g.id+'visitor']=textureFrom(visitor)};visitor.onerror=()=>console.warn('Unable to load visitor photograph:',g.id);visitor.src=g.visitor;
 }
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('WebGL paused. Please refresh to restore the museum view.');});
 requestAnimationFrame(renderLoop);
}
function useMesh(m,t,vp,glow=0){if(!m)return;gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);gl.enableVertexAttribArray(world.pos);gl.vertexAttribPointer(world.pos,3,gl.FLOAT,false,44,0);gl.enableVertexAttribArray(world.norm);gl.vertexAttribPointer(world.norm,3,gl.FLOAT,false,44,12);gl.enableVertexAttribArray(world.color);gl.vertexAttribPointer(world.color,3,gl.FLOAT,false,44,24);gl.enableVertexAttribArray(world.uv);gl.vertexAttribPointer(world.uv,2,gl.FLOAT,false,44,36);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,t||meshes.whiteTexture);gl.uniform1i(world.texture,0);gl.uniform1f(world.textured,t&&t!==meshes.whiteTexture?1:0);gl.uniform1f(world.glow,glow);gl.uniformMatrix4fv(world.matrix,false,vp);gl.drawArrays(gl.TRIANGLES,0,m.count);}
function renderLoop(ms){requestAnimationFrame(renderLoop);if(!gl)return;let dt=Math.min((ms-lastTime)/1000||0,.06);lastTime=ms;
 if(entered&&!panelOpen&&!helpOpen&&!mapOpen&&walking)moveCamera(dt);
 let w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),dpr=Math.min(window.devicePixelRatio||1,1.6);
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
 gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 let view=matLookAt([camera.x,camera.y,camera.z],[camera.x+Math.sin(camera.yaw)*Math.cos(camera.pitch),camera.y+Math.sin(camera.pitch),camera.z-Math.cos(camera.yaw)*Math.cos(camera.pitch)]);
 let vp=matMul(matPerspective(Math.PI/3,canvas.width/canvas.height,.05,115),view);
 gl.useProgram(world);useMesh(meshes.world,meshes.whiteTexture,vp);
 for(const g of Object.values(GALLERIES)){
  let t=photoTex[g.id+(state.galleries[g.id].flipped?'visitor':'promo')]||photoTex[g.id+'promo']||meshes.whiteTexture;
  useMesh(meshes[g.id+'Art'],t,vp,1);useMesh(meshes[g.id+'Plaque'],signTex[g.id+'Plaque'],vp,1);useMesh(meshes[g.id+'Sign'],signTex[g.id+'Sign'],vp,.95);
 }
 useMesh(meshes.wallTitle,signTex.wallTitle,vp,1);useMesh(meshes.receiptSign,signTex.receiptSign,vp,1);
 if(entered&&!panelOpen&&!helpOpen&&!mapOpen)updateProximity();
 if(entered){let id=whichRoom();let label=id==='lobby'?'The Entrance Hall':(GALLERIES[id]?.title||'The Entrance Hall');if($('room-label').textContent!==label)$('room-label').textContent=label;}
}
function canStand(x,z){const inside=(x0,x1,z0,z1)=>x>x0&&x<x1&&z>z0&&z<z1;
 return inside(-6.57,6.57,-6.57,6.57)||inside(-19.5,-7.24,-6.54,6.54)||inside(7.24,19.5,-6.54,6.54)||inside(-6.54,6.54,-19.5,-7.24)||inside(-6.54,6.54,7.24,19.5)||inside(-6.54,6.54,-32.5,-20.24)||
 inside(-7.45,-6.51,-1.62,1.62)||inside(6.51,7.45,-1.62,1.62)||inside(-1.62,1.62,-7.45,-6.51)||inside(-1.62,1.62,6.51,7.45)||inside(-1.62,1.62,-20.45,-19.51);
}
function moveCamera(dt){let f=(keys.has('w')||keys.has('arrowup')||touchDirs.has('forward')?1:0)-(keys.has('s')||keys.has('arrowdown')||touchDirs.has('backward')?1:0);let r=(keys.has('d')||touchDirs.has('right')?1:0)-(keys.has('a')||touchDirs.has('left')?1:0);
 if(keys.has('arrowleft'))camera.yaw-=1.5*dt;if(keys.has('arrowright'))camera.yaw+=1.5*dt;
 if(f||r){let len=Math.hypot(f,r);f/=len;r/=len;let speed=dt*(keys.has('shift')?5.5:3.3);let nx=camera.x+(Math.sin(camera.yaw)*f+Math.cos(camera.yaw)*r)*speed;let nz=camera.z+(-Math.cos(camera.yaw)*f+Math.sin(camera.yaw)*r)*speed;if(canStand(nx,camera.z))camera.x=nx;if(canStand(camera.x,nz))camera.z=nz;}
}
function whichRoom(){if(camera.x<-7.1)return'greece';if(camera.x>7.1)return'china';if(camera.z<-20.1)return'spain';if(camera.z<-7.1)return'iceland';if(camera.z>7.1)return'uk';return'lobby';}
function lookingAt(x,z){let dx=x-camera.x,dz=z-camera.z,len=Math.hypot(dx,dz);return (Math.sin(camera.yaw)*dx-Math.cos(camera.yaw)*dz)/Math.max(.001,len);}
// Inside any gallery, E opens that room's artwork. Do not rely on a narrow
// distance/looking-angle gate: it made gallery interactions appear missing.
function proximate(){let room=whichRoom(),a=[];if(GALLERIES[room]){let g=GALLERIES[room],p=g.artPosition,d=Math.hypot(camera.x-p[0],camera.z-p[2]);a.push({type:'gallery',key:room,d});}
 let d=Math.hypot(camera.x-4.4,camera.z-4.6);if(room==='lobby'&&d<3.8&&lookingAt(4.4,4.6)>.08)a.push({type:'receipt',d});return a.sort((x,y)=>x.d-y.d)[0]||null;}
function updateProximity(){const p=proximate(),key=p?.key||p?.type||'';if(lastProx===key)return;lastProx=key;let n=$('interaction-tip');n.classList.toggle('hidden',!p);if(p){$('tip-label').textContent=p.type==='receipt'?(count()===5?'Collect your final sensory receipt':'Explore five galleries to unlock the receipt'):'Press E to explore '+GALLERIES[p.key].title;}}
function toast(s){let n=$('toast');n.textContent=s;n.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.add('hidden'),3800);}
function teleport(k){if(k==='lobby'){camera={x:0,y:1.67,z:2.7,yaw:0,pitch:-.015};}else{let g=GALLERIES[k];if(!g)return;camera={x:g.location[0],y:1.67,z:g.location[1],yaw:g.yaw,pitch:-.045};}hideNav();toast(k==='lobby'?'Welcome to the entrance hall.':'Welcome to '+GALLERIES[k].title+'. Press E near the artwork, or open it from Galleries.');}
function engage(){if(!entered||panelOpen||helpOpen||mapOpen)return;let p=proximate();if(!p){toast('Enter a gallery, then press E to explore its exhibit. You can also use GALLERIES above.');return;}if(p.type==='gallery')beginGallery(p.key);else if(count()===5)openReceipt();else toast('The final sensory receipt unlocks after five galleries.');}
function updateNav(){if(!$('visit-count'))return;$('visit-count').textContent=String(count()).padStart(2,'0')+' / 05 EXPLORED';$('nav-finale').classList.toggle('available',count()===5);}
function hideNav(){$('gallery-nav').classList.add('hidden');mapOpen=false;}
function toggleNav(){if(!entered)return;$('gallery-nav').innerHTML=navMarkup();mapOpen=!mapOpen;$('gallery-nav').classList.toggle('hidden',!mapOpen);if(mapOpen&&document.pointerLockElement===canvas)document.exitPointerLock();}
function navMarkup(){return `<div class="nav-kicker">A FIVE-PART SENSORY EXHIBITION</div>${ORDER.map(k=>{let g=ref(k),r=state.galleries[k];return `<button type="button" class="gallery-link" data-go="${k}"><span class="nav-index">${g.number}</span><span><strong>${esc(g.country)}</strong><small>${esc(g.title)}</small></span><b>${r.completed?'✓':'↗'}</b></button>`}).join('')}<button type="button" class="gallery-link" data-go="lobby"><span class="nav-index">⌂</span><span><strong>ENTRANCE HALL</strong><small>Return to reception</small></span><b>↗</b></button>`;}
// ----------------------------- Interface helpers ------------------------------------
function popup(html,type='gallery'){
 viewMode=type;panelOpen=true;walking=false;hideNav();if(document.pointerLockElement===canvas)document.exitPointerLock();modal.classList.remove('hidden');content.innerHTML=html;content.scrollTop=0;initAfterRender();
}
function closePopup(){panelOpen=false;walking=true;modal.classList.add('hidden');content.innerHTML='';active=null;}
function button(label,action,extra=''){return `<button type="button" class="button-primary" data-action="${action}" ${extra}>${label}<span aria-hidden="true">↗</span></button>`;}
function textInput(label,path,placeholder='',help=''){const val=pathGet(rec(),path)||'';return `<label class="field-block"><span class="field-label">${esc(label)}</span><textarea rows="2" data-field="${esc(path)}" placeholder="${esc(placeholder)}">${esc(val)}</textarea>${help?`<small>${esc(help)}</small>`:''}</label>`;}
function inputText(label,path,placeholder=''){const val=pathGet(rec(),path)||'';return `<label class="field-block"><span class="field-label">${esc(label)}</span><input type="text" data-field="${esc(path)}" value="${esc(val)}" placeholder="${esc(placeholder)}"></label>`;}
function range(label,path,a=1,b=5,lo='Not at all',hi='Very much'){let v=pathGet(rec(),path);v=v===undefined?3:v;return `<label class="range-block"><span class="range-head"><strong>${esc(label)}</strong><b>${esc(v)} / ${b}</b></span><input type="range" data-field="${esc(path)}" data-number="true" min="${a}" max="${b}" step="1" value="${esc(v)}"><span class="range-limits"><span>${esc(lo)}</span><span>${esc(hi)}</span></span></label>`;}
function radios(label,path,arr){let selected=pathGet(rec(),path)||'';return `<fieldset class="option-group"><legend class="field-label">${esc(label)}</legend>${arr.map(([v,l])=>`<label class="choice ${selected===v?'chosen':''}"><input type="radio" data-field="${esc(path)}" name="${esc(path)}" value="${esc(v)}" ${selected===v?'checked':''}><span>${esc(l)}</span></label>`).join('')}</fieldset>`;}
function checks(label,path,arr,desc=''){const selected=pathGet(rec(),path)||[];return `<fieldset class="option-group"><legend class="field-label">${esc(label)}</legend>${desc?`<p class="field-caption">${esc(desc)}</p>`:''}${arr.map(([v,l])=>`<label class="choice ${selected.includes(v)?'chosen':''}"><input type="checkbox" data-array="${esc(path)}" value="${esc(v)}" ${selected.includes(v)?'checked':''}><span>${esc(l)}</span></label>`).join('')}</fieldset>`;}
function photo(src,caption,cls=''){return `<figure class="art-photo ${cls}"><img src="${esc(src)}" alt="${esc(caption)}"><figcaption>${esc(caption)}</figcaption></figure>`;}
function stageHeader(g,r){return `<div class="panel-top"><span class="eyebrow">GALLERY ${g.number} / 05 &nbsp;·&nbsp; ${esc(g.country)}</span><button class="plain-close" type="button" data-action="close" aria-label="Return to the 3D museum">×</button></div><div class="stage-progress">${Array.from({length:8},(_,i)=>`<span class="${i===r.step?'current':i<r.step?'passed':''}"></span>`).join('')}</div><div class="gallery-heading"><span class="gallery-focus">${esc(g.focus)}</span><h2 id="modal-title">${esc(g.title)}</h2><p>${esc(g.name)} <span class="step-meta">STAGE ${r.step+1} / 08 · ${esc(STAGE_TITLES[r.step])}</span></p></div>`;}
function stageFoot(r){return `<div class="step-foot"><button type="button" class="button-muted" data-action="${r.step===0?'close':'back'}">${r.step===0?'← RETURN TO MUSEUM':'← PREVIOUS STAGE'}</button><span class="foot-note">Your responses stay on this device.</span>${button(r.step===7?'COLLECT THIS POSTCARD':r.step===4?'RECONSIDER':'CONTINUE', 'next')}</div>`;}
function photoStage(g,r){if(r.step===4)return '';let isVisitor=r.step>=5;let c=isVisitor?'VISITOR’S VIEW · A DIFFERENT PHOTOGRAPH':'PROMISED VIEW · PROMOTIONAL PHOTOGRAPH';return `<div class="photo-inset">${photo(isVisitor?g.visitor:g.promo,c)}</div>`;}
function beginGallery(k){active=k;const r=state.galleries[k];r.step=r.completed?7:clamp(r.step||0,0,7);renderGallery();}
function renderGallery(preserve=false){const g=ref(active),r=rec();if(!g)return;const scroll=preserve?content.scrollTop:0;const body=stageBody(g,r);popup(`${stageHeader(g,r)}<div class="stage-layout"><div class="stage-main">${body}</div><aside class="stage-side">${photoStage(g,r)}<div class="side-note"><span class="eyebrow">A NOTE ON EVIDENCE</span><p>${r.step>=4?'This second view is another photograph, not the full sensory experience. Different viewpoints and conditions may affect your answers.':'Your first impression is an imagination prompted by a photograph—not a measured or recorded sensation.'}</p></div></aside></div>${stageFoot(r)}`,'gallery');if(preserve)content.scrollTop=scroll;}
function prompt(eyebrow,title,copy){return `<p class="stage-eyebrow">${eyebrow}</p><h3 class="stage-title">${title}</h3>${copy?`<p class="stage-copy">${copy}</p>`:''}`;}
function miniAdvice(s){return `<div class="concept-note"><span>✳</span><p>${s}</p></div>`;}
function pointSelector(g,path,caption){let p=pathGet(rec(),path)||{x:49,y:55};return `<div class="photo-picker" data-pin-path="${esc(path)}" title="Choose a position by clicking the picture"><img src="${esc(g.promo)}" alt="Choose an imagined position in this promotional photograph"><span class="position-pin" style="left:${clamp(p.x,0,100)}%;top:${clamp(p.y,0,100)}%">YOU</span><span class="picker-tip">CLICK THE PHOTOGRAPH TO PLACE YOURSELF</span></div><p class="field-caption">${esc(caption)}</p>`;}
function stageBody(g,r){const id=g.id,st=r.step;
 if(st===0){return `${prompt('01 · OBSERVE',g.id==='uk'?'A Perfect Moment':g.id==='spain'?'The Perfect View':g.id==='iceland'?'The Promise of Comfort':g.id==='china'?'The View from Afar':'Enter the Sound of Paradise',{
 greece:'You have never heard this place. But perhaps you already imagine what it sounds like.',china:'You can see the Great Wall from afar. But what might it feel like to move through it?',iceland:'A photograph can make a place look inviting. But what does comfort actually feel like?',uk:'A photograph preserves a moment. Can it preserve what being there would feel like?',spain:'A beautiful place, framed for you. But how much space does the photograph show?'}[id])}
 ${photo(g.promo,'PROMOTIONAL PHOTOGRAPH · YOUR FIRST VIEW','large')}
 ${radios(id==='greece'?'What attracts your attention first?':id==='china'?'What catches your attention first?':id==='iceland'?'What makes this photograph look inviting, if anything?':id==='uk'?'What do you notice first about the atmosphere?':'What first attracts your attention?', 'first.focus',{
 greece:[['sunset','Sunset and colour'],['buildings','White buildings and windmills'],['water','The sea'],['people','People and activity'],['other','Something else / nothing in particular']],
 china:[['view','The surrounding landscape'],['wall','The wall and watchtowers'],['path','The route and its shape'],['people','People in the scene'],['other','Something else']],
 iceland:[['aurora','The Northern Lights'],['water','The colour of the water'],['rocks','The rocky landscape'],['night','The nighttime atmosphere'],['other','Something else / nothing in particular']],
 uk:[['colours','Colours of the hillside'],['farm','Farmhouse and green landscape'],['sky','The sky and clouds'],['ground','Visible ground and vegetation'],['other','Something else']],
 spain:[['architecture','Colourful architecture'],['city','View of the city'],['space','The open-looking space'],['people','People and activity'],['other','Something else']] }[id])}
 ${miniAdvice('Notice what is visible before you decide what this place would feel like. Other people may attend to very different parts of the photograph.')}`;}
 if(st===1){return renderStageTwo(g,'first');}
 if(st===2){return `${prompt('03 · CREATE','Make the unseen visible', {greece:'The photograph is silent. Construct the sounds you imagine.',china:'Turn your journey into a picture of bodily effort and movement.',iceland:'A colour cannot touch you. Map the sensations you imagine in different parts of your body.',uk:'A photograph freezes a moment. Imagine a longer, changing visit.',spain:'Your body would occupy a place in this shared space. Map your personal-space expectations.'}[id])}${creativeCore(g,'first')}`;}
 if(st===3){return `${prompt('04 · CONSIDER','Where did that imagination come from?','Your imagined sensations can be shaped by images, memories and expectations. They are not measurements of the place.')}
 ${checks('Which factors influenced your imagination?','first.sources',[
 ['picture','Details visible in this photograph'],['memory','My previous bodily or sensory experiences'],['media','Travel photos or videos I have seen'],['preference','My own preferences and hopes'],['uncertain','I am not sure'],['other','Something else']])}
 ${id==='iceland'?`${range('Imagined physical comfort','first.comfort',1,5,'Uncomfortable','Comfortable')}${range('How appealing is that imagined feeling?','first.appeal',1,5,'Not appealing','Very appealing')}`:''}
 ${id==='uk'?range('Imagined physical comfort during this visit','first.weatherComfort',1,5,'Uncomfortable','Comfortable'):''}
 ${id==='spain'?`${range('How freely could you move?','first.freedom',1,5,'Restricted','Very freely')}${range('How comfortable sharing this space?','first.sharing',1,5,'Not comfortable','Very comfortable')}`:''}
 ${range('How confident are you about the sensations you imagined?','first.confidence',1,5,'Not confident','Very confident')}
 ${range('How much would you like to visit, based on what you saw and imagined?','first.desire',1,5,'Not at all','Very much')}`;}
 if(st===4){return `${prompt('05 · DISRUPT','Flip the Postcard','You have imagined a place through a promotional photograph. Now examine a photograph from a visitor’s perspective.')}
 <div class="flip-stage"><div class="flip-card ${r.flipped?'is-flipped':''}"><div class="flip-face flip-front">${photo(g.promo,'THE PROMISED VIEW')}</div><div class="flip-face flip-back">${photo(g.visitor,'THE VISITOR’S VIEW')}</div></div></div>
 <div class="flip-actions"><button class="button-outline" type="button" data-action="flip">${r.flipped?'↶ SEE THE PROMOTIONAL VIEW':'↻ FLIP TO THE VISITOR’S VIEW'}</button></div>
 ${r.flipped?miniAdvice('The visitor photograph gives you different visual clues, not direct access to the sounds, textures, weather, bodily effort or space at this location. Your first response has been preserved.'):'<p class="small-prompt">Flip the card to continue. No answer is presumed to be correct.</p>'}`;}
 if(st===5){return `${prompt('06 · RECONSTRUCT','Reimagine what you felt','Keep, remove or revise your earlier creation. What changes when you see another visual perspective?')}
 <div class="before-summary"><span>YOUR FIRST IMPRESSION IS SAVED</span><p>${esc(summarize(g.id,r.first))}</p></div>
 ${renderStageTwo(g,'second',true)}
 ${creativeCore(g,'second')}
 ${checks('Which details, if any, influenced your reconsideration?','second.details',detailOptions(id))}
 ${id==='iceland'?`${range('Revised physical comfort','second.comfort',1,5,'Uncomfortable','Comfortable')}${range('Revised appeal of the imagined feeling','second.appeal',1,5,'Not appealing','Very appealing')}`:''}
 ${id==='uk'?range('Revised imagined physical comfort','second.weatherComfort',1,5,'Uncomfortable','Comfortable'):''}
 ${id==='spain'?`${range('Revised freedom of movement','second.freedom',1,5,'Restricted','Very freely')}${range('Revised comfort sharing the space','second.sharing',1,5,'Not comfortable','Very comfortable')}`:''}
 ${range('How confident are you now?','second.confidence',1,5,'Not confident','Very confident')}
 ${range('How much would you like to visit now?','second.desire',1,5,'Not at all','Very much')}
 ${textInput('Why did your imagination change—or stay the same?','second.note','One sentence is enough. This is optional.')}`;}
 if(st===6)return criticalStage(g);
 if(st===7)return postcardStage(g);
 return '<p>Something went wrong.</p>';
}
function detailOptions(id){return {
 greece:[['people','People in the scene'],['water','The sea'],['building','Buildings and streets'],['light','The photographic lighting'],['none','No new visual clue'],['other','Other']],
 china:[['steps','Stairs or surface texture'],['slope','Slope or pathway'],['people','People walking or resting'],['distance','Photography distance'],['none','No new visual clue'],['other','Other']],
 iceland:[['body','A person immersed in the water'],['steam','Steam or mist'],['sky','Sky and lighting conditions'],['access','Edges, bridges or built surroundings'],['none','No new visual clue'],['other','Other']],
 uk:[['cloud','Clouds and fog'],['water','Lake surface'],['mountain','The visible hillside'],['lighting','Different lighting or time'],['none','No new visual clue'],['other','Other']],
 spain:[['visitors','Other visitors in the space'],['paths','Stairs, paths and walkways'],['building','Architectural details'],['viewpoint','A different photographic vantage point'],['none','No new visual clue'],['other','Other']]
 }[id];}
function renderStageTwo(g,path,compact=false){const id=g.id;if(id==='greece')return `${compact?'<h4 class="section-title">Reposition yourself, if you wish</h4>':prompt('02 · POSITION','Place Yourself in the Photograph','Imagine standing within the view. Where would you imagine yourself listening from?')}${pointSelector(path==='second'?{...g,promo:g.visitor}:g,`${path}.position`,'Your marker indicates an imagined standpoint—not a mapped, physically accessible location.')}`;
 if(id==='china')return `${compact?'<h4 class="section-title">Revise your imagined journey</h4>':prompt('02 · MOVE','Imagine Your Journey','Build an imagined sequence. The distant image does not provide a measured route or verified gradient.')}${journeyBuilder(path)}`;
 if(id==='iceland')return `${compact?'<h4 class="section-title">Would you change your imagined immersion?</h4>':prompt('02 · CONTACT','Step Into the Water','What part of your body do you imagine immersed? You are choosing a mental image, not controlling real water.')}${immersion(path)}`;
 if(id==='uk')return `${compact?'<h4 class="section-title">New sensations in the second view</h4>':prompt('02 · ATMOSPHERE','Feel the Atmosphere','Which sensations do you imagine here, and which can you actually verify from a still photograph?')}${checks('What would you imagine feeling? ',`${path}.senses`,WEATHER_SENSES)}${miniAdvice('Fog is not proof of rain, and a sunny-looking picture is not a temperature reading. You may keep the unknown option.')}`;
 return `${compact?'<h4 class="section-title">Choose a position in the visitor view</h4>':prompt('02 · POSITION','Find Your Place','Where would you choose to pause? Click the photograph to place your imaginary position.')}${pointSelector(path==='second'?{...g,promo:g.visitor}:g,`${path}.position`,'The two photographs show different parts of Park Güell. A marker does not identify a matching real-world coordinate.')}${radios('What would you like to do here?',`${path}.spaceActivity`,[['observe','Stand and admire the view'],['photos','Take photographs'],['rest','Sit or pause'],['walk','Move around'],['unknown','Cannot tell / other']])}`;
}
function journeyBuilder(path){const steps=pathGet(rec(),`${path}.journey`)||[];return `<div class="journey-actions">${[['move','↟','MOVE'],['observe','◉','OBSERVE'],['rest','Ⅱ','REST']].map(([id,ico,l])=>`<button type="button" class="journey-add" data-action="journeyAdd" data-kind="${id}" data-side="${path}"><b>${ico}</b>${l} +</button>`).join('')}</div><div class="journey-track">${steps.length?steps.map((s,i)=>`<div class="journey-node"><span class="journey-node-icon">${s==='move'?'↟':s==='rest'?'Ⅱ':'◉'}</span><strong>${esc(s)}</strong><button type="button" data-action="journeyRemove" data-index="${i}" data-side="${path}" aria-label="Remove ${s}">×</button></div>`).join('<span class="journey-arrow">→</span>'):'<p class="empty-track">Add movement, pauses and moments of observation.</p>'}</div><p class="field-caption">This sequence is your own imagined journey, not an actual walking itinerary or a measurement of physical effort.</p>`;}
function creativeCore(g,path){if(g.id==='greece')return soundBuilder(path);if(g.id==='china')return bodyBuilder(path);if(g.id==='iceland')return thermalBuilder(path);if(g.id==='uk')return weatherBuilder(path);return spaceBuilder(path);}
function soundBuilder(path){let data=pathGet(rec(),`${path}.sounds`)||{},val=pathGet(rec(),`${path}.ownSound`)||'';return `<div class="module-header"><strong>YOUR IMAGINED SOUNDSCAPE</strong><small>Add or remove sounds, then adjust their intensity.</small></div><div class="sound-palette">${SOUND_TYPES.map(([k,label,icon])=>`<button type="button" class="sound-token ${data[k]!==undefined?'selected':''}" data-action="toggleSound" data-side="${path}" data-kind="${k}"><b>${icon}</b><span>${label}</span></button>`).join('')}</div>
 ${data.own!==undefined?inputText('Describe your own imagined sound',`${path}.ownSound`,'A sound we did not include'):''}
 ${Object.entries(data).map(([k,v])=>`<div class="mini-range"><div><span>${esc(SOUND_TYPES.find(x=>x[0]===k)?.[1]||k)} ${k==='own'&&val?`— ${esc(val)}`:''}</span><b>${v}/5</b></div><input type="range" min="1" max="5" data-field="${path}.sounds.${k}" data-number="true" value="${v}"></div>`).join('')}
 <div class="sound-map" aria-label="Imagined soundscape visualization">${Object.entries(data).length?Object.entries(data).map(([k,v],i)=>`<span class="sound-orbit" style="--intensity:${v};--i:${i};"><b>${esc(k==='own'?(val||'Own sound'):SOUND_TYPES.find(x=>x[0]===k)?.[1]||k)}</b></span>`).join(''):'<p>Choose a sound to build your visual soundscape.</p>'}</div>
 ${miniAdvice('This is a picture of the sounds you imagine—not an acoustic recording of Santorini.')}`;}
function bodyBuilder(path){return `<div class="module-header"><strong>YOUR IMAGINED BODY PROFILE</strong><small>How might walking, pausing and footing affect your body?</small></div><div class="body-meter">${BODY_KEYS.map(([k,l])=>range(l,`${path}.body.${k}`,1,5,'Barely','Strongly')).join('')}</div>${miniAdvice('Your scores are subjective expectations; a photograph cannot measure exertion, accessibility or how a particular visitor would feel.')}`;}
function immersion(path){let depth=pathGet(rec(),`${path}.depth`)||'chest';return `<div class="immersion-box"><div class="water-figure" data-depth="${depth}"><svg viewBox="0 0 280 168" aria-label="Illustration of an imagined body entering water"><rect width="280" height="168" rx="10" fill="#edf4f2"/><circle cx="140" cy="35" r="17" fill="#c9ad98"/><path d="M129 55 Q108 62 110 86 L115 125 L128 122 L128 88 L131 112 L129 164 L140 164 L143 117 L146 164 L157 164 L159 111 L159 88 L167 122 L179 125 L175 86 Q171 63 151 55Z" fill="#c9ad98"/><rect x="0" y="${depth==='waist'?120:depth==='chest'?88:58}" width="280" height="170" fill="#5bb5c4" opacity=".6"/><path d="M0 ${depth==='waist'?120:depth==='chest'?88:58} Q20 ${depth==='waist'?112:depth==='chest'?80:50} 40 ${depth==='waist'?120:depth==='chest'?88:58} T80 ${depth==='waist'?120:depth==='chest'?88:58} T120 ${depth==='waist'?120:depth==='chest'?88:58} T160 ${depth==='waist'?120:depth==='chest'?88:58} T200 ${depth==='waist'?120:depth==='chest'?88:58} T240 ${depth==='waist'?120:depth==='chest'?88:58} T280 ${depth==='waist'?120:depth==='chest'?88:58}" stroke="#23889b" stroke-width="3" fill="none"/></svg></div><div class="choice-pills">${[['waist','To my waist'],['chest','To my chest'],['shoulders','To my shoulders']].map(([v,l])=>`<button type="button" data-action="depth" data-side="${path}" data-kind="${v}" class="${depth===v?'selected':''}">${l}</button>`).join('')}</div></div>`;}
function thermalBuilder(path){let zone=pathGet(rec(),`${path}.thermalZone`)||'Shoulders & arms',thermal=pathGet(rec(),`${path}.thermal`)||{};let item=thermal[zone];return `<div class="module-header"><strong>IMAGINED THERMAL & TACTILE MAP</strong><small>Select a body region and give it a sensation.</small></div><div class="thermal-layout"><div class="thermal-body"><svg viewBox="0 0 190 250" aria-label="Body regions for imagined tactile sensations"><circle cx="95" cy="31" r="22" fill="${thermal['Head & face']?'#f1b776':'#d2b6a7'}" stroke="#997f79" stroke-width="1.5"/><path d="M74 55 Q53 61 50 85 L39 152 L56 159 L74 108 L75 177 L76 239 L92 239 L95 174 L98 239 L115 239 L118 177 L116 108 L134 159 L151 152 L140 85 Q137 61 116 55Z" fill="#d2b6a7" stroke="#997f79" stroke-width="1.5"/><path d="M53 87 L63 149 M137 87 L127 149" stroke="${thermal['Shoulders & arms']?'#3d95a2':'#a5897f'}" stroke-width="12" stroke-linecap="round"/><path d="M77 84 L114 84 L115 146 L76 146 Z" fill="${thermal.Torso?'#e5a669':'#d2b6a7'}"/><path d="M78 158 L92 158 L88 234 L77 234Z M99 158 L113 158 L114 234 L103 234 Z" fill="${thermal.Legs?'#e5a669':'#d2b6a7'}"/><text x="95" y="249" font-size="9" text-anchor="middle" fill="#5a6964">IMAGINED, NOT MEASURED</text></svg></div><div class="thermal-editor"><label class="field-label" for="zone-select">CHOOSE BODY REGION</label><select id="zone-select" data-field="${path}.thermalZone">${THERMAL_ZONE.map(z=>`<option ${zone===z?'selected':''}>${esc(z)}</option>`).join('')}</select><div class="thermal-palette">${FEELS.map(([k,l])=>`<button type="button" class="${item?.type===k?'selected':''}" data-action="thermalSet" data-side="${path}" data-kind="${k}">${esc(l)}</button>`).join('')}</div>${item?range(`How noticeable would ${FEELS.find(x=>x[0]===item.type)?.[1]||'this sensation'} be?`,`${path}.thermal.${zone}.intensity`,1,5,'Faint','Strong'):''}<button type="button" data-action="thermalRemove" data-side="${path}" class="button-text">Clear this body region</button></div></div>${inputText('An extra sensation we did not include (optional)',`${path}.ownSound`,'Describe it in your own words')}${miniAdvice('Temperature, skin contact and comfort cannot be directly transmitted through this picture. Your map records imagined bodily sensations.')}`;}
function weatherBuilder(path){let phase=pathGet(rec(),`${path}.weatherPhase`)||'arrival',weather=pathGet(rec(),`${path}.weather`)||{};return `<div class="module-header"><strong>YOUR SENSORY WEATHER TIMELINE</strong><small>Imagine three moments during one visit. This is not a factual local weather forecast.</small></div><div class="phase-tabs">${TIMES.map(([k,l])=>`<button type="button" class="${phase===k?'selected':''}" data-action="weatherPhase" data-side="${path}" data-kind="${k}">${l}</button>`).join('')}</div>${checks('Which sensations might you notice at this imagined moment?',`${path}.weather.${phase}`,WEATHER_SENSES)}<div class="timeline-rail">${TIMES.map(([k,l],i)=>`<div class="timeline-moment"><span class="timeline-dot">${i+1}</span><strong>${l}</strong><p>${(weather[k]||[]).map(v=>WEATHER_SENSES.find(x=>x[0]===v)?.[1]).filter(Boolean).map(esc).join(' · ')||'No prediction made'}</p></div>`).join('')}</div>${miniAdvice('These three moments express your imagined experience. The two photographs do not show a continuous or verified weather sequence.')}`;}
function spaceBuilder(path){let s=pathGet(rec(),`${path}.space`)||3,activity=pathGet(rec(),`${path}.spaceActivity`)||'observe';return `<div class="module-header"><strong>YOUR IMAGINED PERSONAL SPACE</strong><small>The circle is your preference, not a measured real-world radius.</small></div><div class="personal-space"><svg viewBox="0 0 320 188" aria-label="Illustration of personal space preference"><rect width="320" height="188" rx="10" fill="#eee8dd"/><path d="M0 48 Q80 10 160 46 T320 38" fill="none" stroke="#bb9870" stroke-width="14"/><path d="M0 63 Q60 30 145 58 T320 60" fill="none" stroke="#7ca59a" stroke-width="5" stroke-dasharray="8 8"/><g fill="#9a887c"><circle cx="52" cy="100" r="8"/><rect x="44" y="110" width="16" height="23" rx="6"/><circle cx="275" cy="96" r="8"/><rect x="267" y="106" width="16" height="25" rx="6"/></g><circle cx="160" cy="112" r="${12+s*12}" fill="#4197a7" fill-opacity=".14" stroke="#4197a7" stroke-width="2" stroke-dasharray="5 4"/><circle cx="160" cy="112" r="10" fill="#338999"/><text x="160" y="146" font-size="14" fill="#285960" text-anchor="middle" font-weight="bold">YOU</text></svg></div>${range('How much space would you prefer?',`${path}.space`,1,5,'Close to others','More space')}${radios('What would you like to do?',`${path}.spaceActivity`,[['observe','Admire the view'],['photos','Take photographs'],['rest','Sit or rest'],['walk','Walk around'],['unknown','I am unsure']])}${miniAdvice('Your imagined space and the number of people visible in a crop are not reliable measurements of crowd density or accessibility.')}`;}
function summarize(id,s){if(!s)return 'No record yet';const end=`Confidence ${s.confidence}/5 · Travel desire ${s.desire}/5`;
 if(id==='greece')return `${Object.keys(s.sounds||{}).map(k=>SOUND_TYPES.find(x=>x[0]===k)?.[1]).join(' · ')||'No sounds selected'} · ${end}`;
 if(id==='china')return `${s.journey.map(x=>x.toUpperCase()).join(' → ')||'No journey markers'} · ${end}`;
 if(id==='iceland')return `${s.depth} immersion · ${Object.keys(s.thermal||{}).length} body regions mapped · ${end}`;
 if(id==='uk')return `${Object.values(s.weather||{}).reduce((n,a)=>n+a.length,0)} imagined weather sensations · ${end}`;
 return `Personal space ${s.space}/5 · ${s.spaceActivity} · ${end}`;
}
function criticalStage(g){const id=g.id;const r=rec();const common=`<div class="compare-mini"><div><small>PROMOTIONAL VIEW</small>${photo(g.promo,'Promotional photograph')}<p>${esc(summarize(id,r.first))}</p></div><div><small>VISITOR’S VIEW</small>${photo(g.visitor,'Visitor photograph')}<p>${esc(summarize(id,r.second||r.first))}</p></div></div>`;
 if(id==='greece')return `${prompt('07 · CRITIQUE','The Silence Test','Two photographs can invite two imagined soundscapes. But neither photograph lets you hear this place.')}${common}
 ${radios('What might help you understand the soundscape more fully?','critique.evidence', [['recording','A recording from this exact location'],['times','Recordings at different times'],['walking','An in-person soundwalk'],['accounts','Visitor or resident descriptions'],['none','None of these would tell me everything']])}
 <div class="insight-card"><strong>What every form of evidence can—and cannot—do</strong><p>${esc(({recording:'A recording offers actual sound from one position and moment, not a complete soundscape.',times:'Recordings over time reveal variation, but only at the sampled times and positions.',walking:'Walking would add bodily movement and direct listening, but only for a particular visitor and visit.',accounts:'People may describe different experiences, but their accounts are selective and shaped by memory.',none:'You noticed an important limit: no single representation can capture every possible listening experience.'})[r.critique.evidence]||'Choose a form of evidence above to think about what it could reveal and what it might still miss.')}</p></div>
 ${checks('Which parts of your imagined soundscape still lack direct evidence?','critique.missing', [['timing','When particular sounds occurred'],['loudness','Actual loudness'],['distance','Where sound sources were located'],['memory','Which sounds came from my own memories'],['other','Something else']])}
 ${textInput('What is the difference between imagining a sound and hearing it?','critique.note','Your interpretation, not a test with a correct answer.')}`;
 if(id==='china')return `${prompt('07 · CRITIQUE','The Unseen Body','A dramatic landscape cannot show how everyone could or would move through it.')}${common}
 ${radios('How could a different way of moving change the experience?','critique.route',[['steady','Walking a longer section steadily'],['slow','Moving slowly and pausing more often'],['assisted','Choosing shorter routes and available transport assistance'],['unknown','I would need information about the actual route first']])}
 <div class="insight-card"><strong>More than one journey</strong><p>${esc(({steady:'A longer route may offer changing perspectives and sustained movement. Terrain and physical experience still require evidence.',slow:'A slower rhythm may change what a person notices. Pausing does not mean the place is less meaningful.',assisted:'Alternative transport may assist part of a visit, but does not guarantee every historic path is accessible.',unknown:'Recognising missing route information is a valid form of critical interpretation.'})[r.critique.route]||'Consider which route information a photograph leaves invisible.')}</p></div>
 ${checks('What can neither photograph fully tell you?','critique.missing',[['steps','Actual slope and conditions of steps'],['rest','Places to rest'],['routes','Routes and transport assistance'],['access','Accessibility for different visitors'],['voices','How different visitors describe the experience'],['other','Something else']])}
 ${textInput('Who might experience this beautiful view differently, and why?','critique.note','Avoid assuming all bodies have the same needs or sensations.')}
 ${miniAdvice('The screen does not simulate physical fatigue or disability. The questions are about the limits of visual information and the diversity of bodies.')}`;
 if(id==='iceland')return `${prompt('07 · CRITIQUE','The Comfort Paradox','A photograph can make water look relaxing. A temperature figure provides additional evidence, but neither decides what your body will feel.')}
 ${common}<div class="fact-card"><span>REPORTED TYPICAL LAGOON WATER TEMPERATURE</span><strong>37–40°C</strong><small>Approximate range described in Blue Lagoon visitor information, not a reading from the time of these photographs.</small></div>
 ${radios('Does knowing this temperature tell you whether you would feel comfortable?','critique.temp',[['yes','Yes, it is enough for my judgement'],['partly','It helps, but does not determine my comfort'],['no','No, I need different or more information'],['unsure','I am unsure']])}
 ${checks('What contributes to comfort for you?','critique.comfort',[['warm','Feeling warm'],['space','Personal space'],['movement','Freedom to move'],['calm','Calmness'],['contrast','Contrasting hot and cool sensations'],['texture','Texture or water contact'],['other','Something we have not listed']])}
 ${textInput('What does comfort mean to you beyond the categories above?','critique.note','Optional — your own description matters.')}
 ${miniAdvice('Water temperature is a physical quantity; bodily comfort depends on personal context and cannot be inferred from a photograph or a single measurement.')}`;
 if(id==='uk')return `${prompt('07 · CRITIQUE','The Missing Moments','One promotional photograph and one visitor photograph record two selected moments—not a continuous visit.')}
 ${common}${checks('What could neither photograph fully tell you?','critique.missing', [['change','How conditions change during a visit'],['wind','How wind would feel'],['surface','How the ground would feel underfoot'],['enjoy','Whether I would enjoy those conditions'],['memory','How memories shape my experience'],['other','Something else']])}
 ${radios('What additional evidence would you seek?','critique.evidence',[['weather','Contemporaneous weather observations'],['accounts','Accounts from visitors at different times'],['paths','Ground and path condition information'],['visit','My own visit at a particular time'],['other','Another form of evidence']])}
 <div class="insight-card"><strong>Different information, different limits</strong><p>${esc(({weather:'Measurements can describe weather conditions, but not everyone’s bodily experience.',accounts:'Visitor accounts contain lived perspectives, but no individual account represents every possible moment.',paths:'Path data may help plan movement, but does not substitute for the sensations of standing in that place.',visit:'A personal visit allows direct sensory experience, but only from a particular body, location and time.',other:'Additional information can complement the photographs without turning any one version into the complete truth.'})[r.critique.evidence]||'Choose one kind of information to examine what it adds and what it leaves out.')}</p></div>
 ${radios('Could uncomfortable weather still be enjoyable?','critique.rain',[['yes','Yes'],['no','No, not for me'],['depends','It depends on the circumstances'],['unknown','I cannot tell']])}
 ${textInput('Which moment or sensation would you still want to know about?','critique.note','Your answer can go beyond the choices provided.')}`;
 return `${prompt('07 · CRITIQUE','Control the Frame','You were the viewer. Now become the photographer: decide what a future viewer will see, then reflect on what disappears beyond your selected frame.')}
 <div class="crop-intro">The picture below is the full visitor photograph. Drag the image, change magnification, or adjust its position. Nothing is erased from the original: your new composition is a crop.</div>
 ${cropLab()}
 ${radios('What experience might your new frame encourage a viewer to imagine?','critique.intended', [['open','An open place for looking at architecture'],['busy','A busy space with people and movement'],['social','A lively shared space'],['quiet','A calmer-looking part of the scene'],['other','Something else / I cannot tell']])}
 ${textInput('What did you choose to leave outside the frame?','critique.outside','Describe what the crop no longer makes visible.')}
 <div class="fact-card fact-neutral"><span>BEYOND WHAT A PHOTOGRAPH SHOWS</span><p>Park Güell has visitor access and capacity management. A space that looks open in an image may still have entry conditions or different experiences for different bodies.</p></div>
 ${checks('What else would matter for understanding this shared space?','critique.missing',[['access','Rules on access and use'],['times','Crowding at different times'],['locals','The experience of local residents'],['mobility','Different movement and accessibility needs'],['other','Something else']])}`;
}
function cropLab(){const c=rec().critique.crop||{zoom:1.45,x:50,y:50};return `<div class="crop-lab"><div class="crop-viewport" id="crop-viewport" title="Drag the photograph to change its framing"><img id="crop-image" draggable="false" src="${esc(ref(active).visitor)}" alt="Visitor photograph being cropped" style="transform:translate(${(50-c.x)*.55}%,${(50-c.y)*.55}%) scale(${c.zoom});"><span class="crop-frame-label">YOUR CHOSEN FRAME · DRAG TO RECOMPOSE</span></div><div class="crop-controls"><label>Zoom <input type="range" data-crop="zoom" min="1" max="2.6" step="0.05" value="${c.zoom}"></label><label>Horizontal <input type="range" data-crop="x" min="0" max="100" step="1" value="${c.x}"></label><label>Vertical <input type="range" data-crop="y" min="0" max="100" step="1" value="${c.y}"></label></div><button type="button" class="button-text" data-action="resetCrop">Reset the crop</button><p class="field-caption">Your edit changes what is visible in a selected frame; it does not reveal the full spatial or social reality of the park.</p></div>`;}
function postcardStage(g){let r=rec();let a=r.first,b=r.second||r.first;return `${prompt('08 · KEEP A TRACE','Your Sensory Postcard','This is a trace of your changing—and possibly unchanged—imaginations, not a report of what the destination really felt like.')}
 <div class="postcard"><div class="postcard-cover">${photo(g.visitor,'A VISITOR’S VIEW')}<div class="postcard-overlay"><small>YOUR SENSORY POSTCARD · ${g.number}</small><strong>${esc(g.title)}</strong><span>${esc(g.name)}</span></div></div><div class="postcard-inside"><div><small>BEFORE</small><p>${esc(summarize(g.id,a))}</p></div><div><small>AFTER</small><p>${esc(summarize(g.id,b))}</p></div></div><div class="postcard-stats"><span>WILLINGNESS TO VISIT</span><strong>${a.desire}/5 → ${b.desire}/5</strong><span>CONFIDENCE IN IMAGINATION</span><strong>${a.confidence}/5 → ${b.confidence}/5</strong></div></div>
 ${textInput('What will you question about another travel photograph?','lastNote','One sentence about what remains beyond these two frames.')}
 ${miniAdvice('This postcard becomes part of your Sensory Collection after you collect it. It does not claim that a visitor photograph is completely objective.')}`;}
function comparisonDelta(r){return `<div class="metric-compare"><span>Willingness to visit: ${r.first.desire}/5 → ${r.second?.desire??r.first.desire}/5</span><span>Confidence: ${r.first.confidence}/5 → ${r.second?.confidence??r.first.confidence}/5</span></div>`;}
function collectionMarkup(){return `<div class="panel-top"><span class="eyebrow">THE PERSONAL COLLECTION · ${count()} / 05</span><button class="plain-close" data-action="close" aria-label="Close collection">×</button></div><div class="collection-title"><h2 id="modal-title">Your Sensory Collection</h2><p>Five kinds of imagined sensations. Every postcard records what you imagined before and after seeing another photographic perspective.</p></div><div class="collection-grid">${ORDER.map(k=>{let g=ref(k),r=state.galleries[k];return `<article class="collection-card ${r.completed?'is-complete':'is-locked'}"><div class="collection-photo"><img src="${esc(g.visitor)}" alt="${esc(g.name)}"><span>${r.completed?'COLLECTED':'NOT YET COLLECTED'}</span></div><div class="collection-copy"><small>GALLERY ${g.number} · ${esc(g.focus)}</small><h3>${esc(g.title)}</h3><p>${r.completed?esc(summarize(k,r.second||r.first)):'Explore this gallery to create and collect a sensory postcard.'}</p><button type="button" class="button-text" data-action="openFromCollection" data-key="${k}">${r.completed?'VIEW POSTCARD ↗':'EXPLORE GALLERY ↗'}</button></div></article>`}).join('')}</div><div class="collection-footer"><p><strong>Five galleries are not five correct answers.</strong> The differences between your sensory maps may tell you something about your own memories, preferences, and uncertainty.</p>${button('RETURN TO MUSEUM','close')}</div>`;}
function openCollection(){popup(collectionMarkup(),'collection');}
function finaleMarkup(){if(count()<5)return `<div class="panel-top"><span class="eyebrow">THE FINAL ROOM</span><button class="plain-close" data-action="close">×</button></div><h2 id="modal-title" class="free-title">The Curator's Room</h2><p>Collect all five sensory postcards to enter the final room. Your progress: ${count()} / 5.</p><div class="phase-tabs">${button('VIEW THE COLLECTION','collection')}</div>`;
 const c=state.curator,g=ref(c.place);return `<div class="panel-top"><span class="eyebrow">EPILOGUE · THE FINAL ROOM</span><button class="plain-close" data-action="close">×</button></div><div class="finale-head"><span class="eyebrow">BEYOND THE FRAME</span><h2 id="modal-title">Become the Curator.</h2><p>You have viewed five places and imagined five kinds of sensory experience. But every image you saw was selected, framed, and presented to you. Now make a selection of your own.</p></div>
 <div class="curator-main"><div><label class="field-label" for="curator-place">CHOOSE A DESTINATION</label><select id="curator-place">${ORDER.map(k=>`<option value="${k}" ${c.place===k?'selected':''}>${esc(ref(k).country)} · ${esc(ref(k).title)}</option>`).join('')}</select>
 <fieldset class="option-group"><legend class="field-label">Which version would you place in a travel display?</legend>${[['promo','Promotional photograph'],['visitor','Visitor photograph']].map(([v,l])=>`<label class="choice ${c.view===v?'chosen':''}"><input type="radio" name="curator-view" value="${v}" ${c.view===v?'checked':''}><span>${l}</span></label>`).join('')}</fieldset></div><div>${photo(g[c.view],`YOUR SELECTED IMAGE · ${c.view==='promo'?'PROMOTIONAL':'VISITOR'} VIEW`,'curator-preview')}</div></div>
 <label class="field-block"><span class="field-label">What sensory experience would your choice encourage someone else to imagine?</span><textarea id="curator-caption" rows="2" placeholder="I want a viewer to imagine…">${esc(c.caption)}</textarea></label>
 <label class="field-block"><span class="field-label">What might your chosen image leave outside the frame?</span><textarea id="curator-outside" rows="2" placeholder="A viewer might not see or know…">${esc(c.outside)}</textarea></label>
 <div class="reflection-divider"><span>RETURN TO YOUR FIRST QUESTION</span></div>
 <p class="stage-copy">At the entrance, you rated how confidently you could imagine a place's sensations from a photograph. Ask yourself the same question now. Change is not required, and a lower score is not automatically better.</p>
 <div class="epilogue-comparison"><div><span>AT THE ENTRANCE</span><strong>${state.introConfidence}/5</strong></div><div><span>AFTER YOUR VISIT</span><strong id="closing-confidence-val">${state.endConfidence}/5</strong></div></div><label class="range-block"><input type="range" id="closing-confidence" min="1" max="5" step="1" value="${state.endConfidence}"><span class="range-limits"><span>Not confident</span><span>Very confident</span></span></label>
 <label class="field-block"><span class="field-label">What will you question the next time you encounter a travel photograph?</span><textarea id="final-thought" rows="3" placeholder="Your final reflection (optional)">${esc(state.finalThought)}</textarea></label>
 ${miniAdvice('You too have chosen which photograph and accompanying words another viewer would receive. Your frame may encourage imagination—and may also leave experiences invisible.')}
 <div class="step-foot">${button('COMPLETE MY VISIT & GO TO RECEPTION','completeFinale')}</div>`;}
function openFinale(){popup(finaleMarkup(),'finale');}
function receiptMarkup(){let c=state.curator,coll=ORDER.map(k=>{let g=ref(k),r=state.galleries[k];return `<div class="receipt-destination"><span>${esc(g.number)} · ${esc(g.country)}</span><strong>${esc(g.focus)}</strong><small>${esc(summarize(k,r.second||r.first))}</small><small>Before/after visit desire: ${r.first.desire}/5 → ${r.second?.desire??r.first.desire}/5</small></div>`}).join('');
return `<div class="paper-receipt" id="print-receipt"><div class="receipt-top"><span class="receipt-mark">✳</span><small>BEYOND THE POSTCARD</small><h2>FINAL SENSORY<br>RECEIPT</h2><p>A souvenir of what you imagined</p></div><div class="receipt-dash"></div><div class="receipt-subtitle">FIVE IMAGINED JOURNEYS</div>${coll}<div class="receipt-dash"></div><div class="receipt-row"><span>INITIAL CONFIDENCE</span><strong>${state.introConfidence} / 5</strong></div><div class="receipt-row"><span>AFTER-VISIT CONFIDENCE</span><strong>${state.endConfidence} / 5</strong></div><div class="receipt-dash"></div><div class="receipt-subtitle">WHAT YOU CHOSE TO SHOW</div><p>${esc(ref(c.place).country)} · ${c.view==='promo'?'PROMOTIONAL':'VISITOR'} VIEW</p>${c.caption?`<p class="receipt-quote">“${esc(c.caption)}”</p>`:''}<div class="receipt-subtitle">WHAT REMAINS BEYOND THE FRAME?</div><p class="receipt-quote">${esc(c.outside||state.finalThought||'The photographs provided different views, but not direct access to their sounds, textures, weather, bodily effort or social space.')}</p><div class="receipt-dash"></div><p class="receipt-last">A photograph is a beginning,<br>not the whole experience.</p><small class="receipt-thanks">THANK YOU FOR VISITING · 2026</small></div>`;}
function openReceipt(){if(count()<5){toast('Complete all five galleries first.');return;}if(!state.curator.complete){openFinale();return;}popup(`<div class="panel-top"><span class="eyebrow">MUSEUM EXIT · RECEPTION DESK</span><button class="plain-close" data-action="close">×</button></div><div class="receipt-heading"><h2 id="modal-title">Your receipt is waiting.</h2><p>This is a souvenir of your sensory imaginations, not a statement about what these places actually feel like.</p></div>${receiptMarkup()}<div class="step-foot receipt-buttons"><button type="button" class="button-muted" data-action="close">CONTINUE EXPLORING</button>${button('PRINT / SAVE PDF','printReceipt')}</div>`,'receipt');}
// ----------------------------- Interaction state & events -----------------------------
function renderGuide(){popup(`<div class="panel-top"><span class="eyebrow">VISITOR GUIDE</span><button class="plain-close" data-action="close">×</button></div><div class="guide-head"><span>✳</span><h2 id="modal-title">A place to explore.</h2><p>Five rooms, five kinds of sensory imagination. Enter in any order. The visitor photograph challenges an expectation; it is not labelled as the one true reality.</p></div><div class="guide-rows"><div><b>01 · WALK</b><p>Use W A S D or arrow up/down to move, mouse movement / dragging to look, E to examine a nearby gallery artwork. Esc releases the pointer or closes an overlay.</p></div><div><b>02 · CREATE & RECONSIDER</b><p>Create an imagined soundscape, journey, tactile map, weather timeline or spatial map. Then flip from the promotional photograph to a visitor view and revise your creation.</p></div><div><b>03 · KEEP YOUR POSTCARDS</b><p>Collect your record after each gallery. The collection keeps your five sensory postcards on this device; the final curator room follows the fifth.</p></div><div><b>04 · THE ORIGINAL MUSEUM RECEIPT</b><p>When the five exhibits and the curator room are complete, return to reception for your personal Final Sensory Receipt. Print it or save as a PDF.</p></div></div><div class="guide-controls"><button class="button-muted" type="button" data-action="resetAll">RESET MY VISIT</button>${button('START EXPLORING','close')}</div><p class="field-caption">All answers stay in local browser storage. No accounts, external dependencies or data uploads. Use the navigation menu to jump to a room without walking.</p>`,'guide');}
function liveCrop(){let c=state.galleries.spain.critique.crop||{zoom:1.45,x:50,y:50};let img=$('crop-image');if(img)img.style.transform=`translate(${(50-c.x)*.55}%,${(50-c.y)*.55}%) scale(${c.zoom})`;}
function initAfterRender(){const v=$('crop-viewport');if(!v)return;let start=null;v.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY,c:{...(rec().critique.crop||{zoom:1.45,x:50,y:50})}};v.setPointerCapture(e.pointerId);});v.addEventListener('pointermove',e=>{if(!start)return;const dx=(e.clientX-start.x)/Math.max(1,v.clientWidth)*90,dy=(e.clientY-start.y)/Math.max(1,v.clientHeight)*90;let c=rec().critique.crop||{};c.x=clamp(start.c.x-dx,0,100);c.y=clamp(start.c.y-dy,0,100);rec().critique.crop=c;const xs=v.closest('.crop-lab').querySelector('[data-crop="x"]');const ys=v.closest('.crop-lab').querySelector('[data-crop="y"]');xs.value=c.x;ys.value=c.y;liveCrop();});v.addEventListener('pointerup',()=>{start=null;save();});v.addEventListener('pointercancel',()=>{start=null;save();});}
function advance(){let r=rec();if(r.step===4&&!r.flipped){toast('Flip the postcard to see the visitor photograph first.');return;}
 if(r.step===3){r.second=clone(r.first);}if(r.step===4&&!r.second)r.second=clone(r.first);
 if(r.step===7){const collected=ref(active).title;r.completed=true;r.step=7;save();closePopup();toast(`Collected: ${collected}`);if(count()===5){setTimeout(()=>{toast('Five postcards collected! The final curator room is open.');openFinale();},450);}return;}
 r.step=clamp(r.step+1,0,7);save();renderGallery();}
function retreat(){let r=rec();if(r.step<=0){closePopup();return;}r.step--;save();renderGallery();}
function resetAll(){if(!window.confirm('Erase all five gallery responses, the collection and the final receipt stored in this browser?'))return;state=emptyState();save();closePopup();teleport('lobby');toast('Visit reset. Return to the opening page by refreshing if you want to repeat the prologue.');}
function onAction(action,b){if(action==='close'){closePopup();return;}
 if(action==='next'){advance();return;}if(action==='back'){retreat();return;}if(action==='collection'){openCollection();return;}
 if(action==='resetAll'){resetAll();return;}
 if(action==='openFromCollection'){let k=b.dataset.key;beginGallery(k);return;}
 if(action==='flip'){rec().flipped=!rec().flipped;save();renderGallery(true);return;}
 if(action==='toggleSound'){let s=rec()[b.dataset.side],k=b.dataset.kind;if(s.sounds[k]===undefined)s.sounds[k]=3;else delete s.sounds[k];save();renderGallery(true);return;}
 if(action==='journeyAdd'){let j=rec()[b.dataset.side].journey;if(j.length<12)j.push(b.dataset.kind);else toast('Limit the journey to twelve markers for clarity.');save();renderGallery(true);return;}
 if(action==='journeyRemove'){rec()[b.dataset.side].journey.splice(+b.dataset.index,1);save();renderGallery(true);return;}
 if(action==='depth'){rec()[b.dataset.side].depth=b.dataset.kind;save();renderGallery(true);return;}
 if(action==='thermalSet'){let s=rec()[b.dataset.side],z=s.thermalZone;s.thermal[z]={type:b.dataset.kind,intensity:3};save();renderGallery(true);return;}
 if(action==='thermalRemove'){let s=rec()[b.dataset.side];delete s.thermal[s.thermalZone];save();renderGallery(true);return;}
 if(action==='weatherPhase'){rec()[b.dataset.side].weatherPhase=b.dataset.kind;save();renderGallery(true);return;}
 if(action==='resetCrop'){rec().critique.crop={zoom:1.45,x:50,y:50};save();renderGallery(true);return;}
 if(action==='completeFinale'){let c=state.curator;c.caption=$('curator-caption')?.value||c.caption;c.outside=$('curator-outside')?.value||c.outside;state.finalThought=$('final-thought')?.value||state.finalThought;c.complete=true;save();closePopup();teleport('lobby');toast('Your visit is complete. Collect your Final Sensory Receipt at reception, or open it from the Final Room button.');openReceipt();return;}
 if(action==='printReceipt'){window.print();return;}
}
function eventBind(){
 $('opening-confidence').value=state.introConfidence;$('opening-confidence-value').textContent=state.introConfidence+' / 5';$('opening-confidence').addEventListener('input',e=>{state.introConfidence=Number(e.target.value);$('opening-confidence-value').textContent=e.target.value+' / 5';save();});
 $('enter-museum').addEventListener('click',()=>{entered=true;state.introDone=true;save();$('intro').classList.add('hidden');renderGuide();});
 $('brand-home').addEventListener('click',()=>{if(!entered)return;if(panelOpen)closePopup();teleport('lobby');});
 $('nav-galleries').addEventListener('click',toggleNav);$('nav-help').addEventListener('click',renderGuide);$('nav-collection').addEventListener('click',openCollection);$('nav-finale').addEventListener('click',()=>{if(count()===5&&state.curator.complete)openReceipt();else openFinale();});
 $('touch-examine').addEventListener('click',engage);
 $('gallery-nav').innerHTML=navMarkup();$('gallery-nav').addEventListener('click',e=>{let link=e.target.closest('[data-go]');if(link){let dest=link.dataset.go;teleport(dest);if(dest!=='lobby')beginGallery(dest);}});
 modal.addEventListener('click',e=>{let b=e.target.closest('[data-action]');if(b){e.preventDefault();onAction(b.dataset.action,b);return;}
 const picker=e.target.closest('[data-pin-path]');if(picker&&active){const rect=picker.getBoundingClientRect();const x=clamp((e.clientX-rect.left)/rect.width*100,3,97),y=clamp((e.clientY-rect.top)/rect.height*100,3,97);pathSet(rec(),picker.dataset.pinPath,{x:Math.round(x),y:Math.round(y)});save();renderGallery(true);}
 });
 modal.addEventListener('input',e=>{
  let t=e.target;if(t.matches('[data-crop]')){let c=rec().critique.crop||{zoom:1.45,x:50,y:50};c[t.dataset.crop]=Number(t.value);rec().critique.crop=c;liveCrop();save();return;}
  if(t.id==='closing-confidence'){state.endConfidence=Number(t.value);$('closing-confidence-val').textContent=t.value+'/5';save();return;}
  if(t.matches('input[type="range"][data-field]')){pathSet(rec(),t.dataset.field,Number(t.value));let val=t.closest('.range-block, .mini-range')?.querySelector('.range-head b, .mini-range b');if(val)val.textContent=t.value+'/5';save();return;}
  if(t.matches('textarea[data-field],input[type="text"][data-field]')){pathSet(rec(),t.dataset.field,t.value);save();return;}
  if(t.id==='curator-caption'){state.curator.caption=t.value;save();return;}if(t.id==='curator-outside'){state.curator.outside=t.value;save();return;}if(t.id==='final-thought'){state.finalThought=t.value;save();return;}
 });
 modal.addEventListener('change',e=>{let t=e.target;
  if(t.dataset.field){let v=t.type==='range'?Number(t.value):t.value;pathSet(rec(),t.dataset.field,v);save();renderGallery(true);return;}
  if(t.dataset.array){let a=pathGet(rec(),t.dataset.array)||[];if(t.checked&&!a.includes(t.value))a.push(t.value);if(!t.checked)a=a.filter(x=>x!==t.value);pathSet(rec(),t.dataset.array,a);save();renderGallery(true);return;}
  if(t.id==='curator-place'){state.curator.place=t.value;save();openFinale();return;}
  if(t.name==='curator-view'){state.curator.view=t.value;save();openFinale();return;}
 });
 window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(panelOpen){closePopup();return;}if(mapOpen){hideNav();return;}if(pointerLocked&&document.pointerLockElement===canvas){document.exitPointerLock();return;}}
  if(!entered||panelOpen||mapOpen||!walking||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target?.tagName))return;
  let k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift','e'].includes(k)){e.preventDefault();keys.add(k);}
  if(k==='e'&&!e.repeat)engage();
 });
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();touchDirs.clear();});
 canvas.addEventListener('click',()=>{if(!entered||panelOpen||mapOpen||matchMedia('(pointer:coarse)').matches)return;if(canvas.requestPointerLock&&document.pointerLockElement!==canvas){let r=canvas.requestPointerLock();if(r?.catch)r.catch(()=>toast('Drag the scene to look around.'));}});
 document.addEventListener('pointerlockchange',()=>{pointerLocked=document.pointerLockElement===canvas;});
 document.addEventListener('mousemove',e=>{if(!entered||panelOpen||mapOpen)return;if(pointerLocked){camera.yaw+=e.movementX*.0022;camera.pitch=clamp(camera.pitch-e.movementY*.002,-.9,.85);}else if(isDragging){camera.yaw+=(e.clientX-dragX)*.005;camera.pitch=clamp(camera.pitch-(e.clientY-dragY)*.004,-.9,.85);dragX=e.clientX;dragY=e.clientY;}});
 canvas.addEventListener('pointerdown',e=>{if(panelOpen||mapOpen||!entered)return;if(e.pointerType==='touch'||e.button===0){isDragging=true;dragX=e.clientX;dragY=e.clientY;}});
 document.addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&isDragging&&entered&&!panelOpen&&!mapOpen){camera.yaw+=(e.clientX-dragX)*.005;camera.pitch=clamp(camera.pitch-(e.clientY-dragY)*.004,-.9,.85);dragX=e.clientX;dragY=e.clientY;}});
 window.addEventListener('pointerup',()=>{isDragging=false;});window.addEventListener('pointercancel',()=>{isDragging=false;});
 document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touchDirs.add(b.dataset.move);});b.addEventListener('pointerup',()=>touchDirs.delete(b.dataset.move));b.addEventListener('pointercancel',()=>touchDirs.delete(b.dataset.move));});
}
function boot(){try{eventBind();initWebGL();updateNav();if(state.introDone){entered=true;$('intro').classList.add('hidden');}}catch(e){console.error(e);const error=document.createElement('div');error.className='error-state';error.innerHTML=`<h2>The 3D view could not start.</h2><p>${esc(e.message)}</p><button class="button-primary" id="fallback-enter">OPEN THE GALLERY MENU</button>`;document.body.append(error);if(!entered)error.classList.add('hidden');$('fallback-enter').onclick=()=>{entered=true;$('intro').classList.add('hidden');error.remove();beginGallery('greece');};$('enter-museum').addEventListener('click',()=>{error.classList.remove('hidden');});}}
boot();
