/* SHADER VAULT data — pure GLSL ES 1.0 fragment bodies.
   Each entry: { id, title, desc, tags, gameUse, defaults:{speed,intensity,hue}, frag }
   Injected header (don't repeat): precision, uniforms u_time u_res u_mouse u_speed u_intensity u_hue, hash/noise/fbm helpers.
   Keep loops const-bounded for WebGL1. */
const COMMON = `
precision highp float;
uniform float u_time; uniform vec2 u_res; uniform vec2 u_mouse;
uniform float u_speed; uniform float u_intensity; uniform float u_hue;
float hash21(vec2 p){ p=fract(p*vec2(234.34,435.345)); p+=dot(p,p+34.23); return fract(p.x*p.y); }
float noise2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise2(p); p*=2.03; a*=.5;} return v; }
vec3 pal(float t){ return .5+.5*cos(6.2831*(t+vec3(0.,.33,.67)+u_hue)); }
vec2 auv(vec2 f){ vec2 u=(2.*f-u_res)/u_res.y; return u; }
`;

const SHADERS = [
{ id:"gargantua", title:"GARGANTUA — black hole",
  desc:"Lensed accretion disk, doppler shift, photon ring. Skybox / warp-gate / death screen.",
  tags:["skybox","portal","space"], gameUse:"Use as fullscreen skybox or on a quad portal. u_intensity = disk brightness, u_speed = spin.",
  defaults:{speed:.35,intensity:1.0,hue:0.0},
  frag:`
void main(){
 vec2 uv=auv(gl_FragCoord.xy); uv.x+= (u_mouse.x-.5)*.3; uv.y+=(u_mouse.y-.5)*.2;
 float t=u_time*u_speed;
 // stars
 vec2 sp=uv*90.; vec2 cell=floor(sp); float h=hash21(cell);
 vec3 col=vec3(0.);
 float st=smoothstep(.997,1.,h)*(.4+.6*hash21(cell+7.));
 col+=vec3(.7,.85,1.)*st*exp(-.5*length(fract(sp)-.5)*4.);
 col+=vec3(.02,.03,.05)*(fbm(uv*3.+t*.05)*.5+.5);
 float R=.30, ring=.315;
 float r=length(uv*vec2(1.,1.15));
 // bend: light from behind appears above AND below hole
 float bend=.42*exp(-abs(uv.x)*1.6);
 float dyTop=uv.y-.16-bend*.55;   // halo arch over the top
 float dyBot=uv.y+.34+bend*.35;   // faint mirror below
 float ang=atan(uv.y,uv.x);
 float swirl=fbm(vec2(ang*2.2+t*.7, r*14.-t*1.4));
 float streak=fbm(vec2(ang*6.-t*1.2, r*22.));
 // disk profile: bright band, doppler (left hot/blue, right ember)
 float dop=mix(1.5,.45, smoothstep(-1.2,1.2,uv.x)); // left brighter
 float fade=smoothstep(1.8,1.1,r);
 float top=exp(-dyTop*dyTop*90.)*smoothstep(.15,.35,r)*fade;
 float bot=exp(-dyBot*dyBot*160.)*smoothstep(.25,.45,r)*fade*.7;
 float front=exp(-pow((uv.y+.10)*6.,2.))*fade*smoothstep(-.005,-.08,uv.y);
 float disk=(top+bot*.8+front*1.4);
 vec3 hot=mix(vec3(1.,.95,.88),vec3(1.,.55,.25),clamp(r*1.1-swirl*.5,0.,1.));
 hot=mix(hot,vec3(.65,.8,1.2),clamp((dop-1.)*.9,0.,1.)*.6);
 col+=hot*disk*dop*(.55+.9*swirl+.5*streak)*u_intensity*1.6;
 // photon ring
 col+=vec3(1.,.9,.75)*exp(-abs(r-ring)*160.)*2.2;
 // shadow
 col*=smoothstep(R-.06,R+.10,r);
 // foreground dust lane crossing the face
 float lane=exp(-pow((uv.y+.10+ (fbm(vec2(uv.x*4.,t*.3))-.5)*.12)*9.,2.))*step(abs(uv.x),1.4)*step(r,1.2);
 col=mix(col, vec3(.10,.045,.02)*(0.4+streak), lane*.85*smoothstep(.02,-.06,uv.y));
 // vignette + grade
 col*=1.-.45*dot(uv*.6,uv*.6);
 col=mix(col, col*vec3(1.05,.95,.9), .5);
 gl_FragColor=vec4(col,1.);
}`},
{ id:"mandelbulb", title:"MANDELBULB VOYAGE",
  desc:"Raymarched 3D fractal, power breathes 2↔12 while it folds inside-out. Endless boss arena / loading screen / warp tunnel.",
  tags:["fractal","raymarch","cave"], gameUse:"Raymarch is heavy — bake to skybox cubemap, or run at half-res + upscale. u_intensity = glow.",
  defaults:{speed:.5,intensity:1.0,hue:.55},
  frag:`
float mb(vec3 p, float pw, float fld, out float trap){
 vec3 z=p; float dr=1., r=0., trap2=1e9;
 for(int i=0;i<6;i++){
  r=length(z); if(r>2.5) break;
  float fi=float(i);
  float fw=fld*(.6+.4*sin(u_time*u_speed*.7+fi*.9));
  float cw=cos(fw),sw=sin(fw);
  z.xy=mat2(cw,-sw,sw,cw)*z.xy; // unfolding twist (rotation: DE-safe)
  z=abs(z)-fld*.22*(.5+.5*sin(fi*1.3+u_time*u_speed*.5)); // breathing fold (mirror: DE-safe)
  r=max(length(z),1e-3);
  float th=acos(clamp(z.z/r,-1.,1.))*pw;
  float ph=atan(z.y,z.x)*pw;
  dr=pow(r,pw-1.)*pw*dr+1.;
  float rn=pow(r,pw);
  z=rn*vec3(sin(th)*cos(ph),sin(th)*sin(ph),cos(th))+p;
  trap2=min(trap2, dot(z,z));
 }
 trap=trap2; return .5*log(r)*r/dr;
}
void main(){
 vec2 uv=auv(gl_FragCoord.xy);
 float t=u_time*u_speed;
 float pw=7.+5.*sin(t*.45); // power breathes 2..12: blobby <-> spiky
 float fld=.8+.8*sin(t*.3+1.7); // fold amount: unfolds out of itself
 vec3 ro=vec3(0.,0.,2.4-1.2*(.5+.5*sin(t*.35))); // slow dive in/out
 float a=t*.25+(u_mouse.x-.5)*2.;
 vec3 ta=vec3(0.);
 vec3 fw=normalize(ta-ro), rt=normalize(cross(fw,vec3(0,1,0))), up=cross(rt,fw);
 vec3 rd=normalize(uv.x*rt+uv.y*up+1.4*fw);
 // rotate world slowly
 float ca=cos(a),sa=sin(a);
 rd.xz=mat2(ca,-sa,sa,ca)*rd.xz; ro.xz=mat2(ca,-sa,sa,ca)*ro.xz;
 float d=0., trap=0.; vec3 p=ro; float m=-1.;
 for(int i=0;i<64;i++){
  p=ro+rd*d; float tr; float e=mb(p,pw,fld,tr);
  if(e<.002){ m=1.; trap=tr; break; }
  d+=e*.9; if(d>6.) break;
 }
 vec3 col=vec3(.01,.005,.03);
 if(m>0.){
  vec2 e=vec2(.003,0.);
  float tr; vec3 n=normalize(vec3(mb(p+e.xyy,pw,fld,tr)-mb(p-e.xyy,pw,fld,tr),mb(p+e.yxy,pw,fld,tr)-mb(p-e.yxy,pw,fld,tr),mb(p+e.yyx,pw,fld,tr)-mb(p-e.yyx,pw,fld,tr)));
  vec3 l=normalize(vec3(-.4,.6,.9));
  float dif=clamp(dot(n,l),0.,1.);
  float ao=clamp(1.-d*.18,0.,1.);
  vec3 base=mix(vec3(.9,.75,.3), pal(trap*2.+t*.4), .65);
  col=base*(.38+.9*dif+.25*abs(n.y))*ao;
  col+=vec3(.4,.7,1.)*pow(1.-abs(dot(n,-rd)),3.)*.8;
  col+=pal(trap*3.+.3+t*.25)*exp(-trap*8.)*u_intensity;
  col*=exp(-d*.15);
 } else {
  float g=fbm(rd.xy*3.+t*.1);
  col+=pal(g+t*.05)*g*.35*u_intensity;
  col+=vec3(.6,.7,1.)*pow(1.-abs(rd.y),8.)*.4;
 }
 col=mix(col, col*vec3(1.1,.9,1.2), .6);
 gl_FragColor=vec4(col,1.);
}`},
{ id:"citadel", title:"LATTICE CITADEL",
  desc:"Kaleido box-fold fractal — alien megastructure. Menu bg / discovered-city reveal.",
  tags:["fractal","structure","sci-fi"], gameUse:"Cheap-ish IFS (40 steps). Great as menu backdrop or hologram table. u_hue shifts metal tint.",
  defaults:{speed:.4,intensity:1.0,hue:.08},
  frag:`
float mapf(vec3 p){
 p.xz*=1.+ .1*sin(u_time*u_speed+p.y*2.);
 for(int i=0;i<4;i++){
  p=abs(p)-vec3(1.2,.9,1.2)*(.55+.1*sin(u_time*u_speed*.7+float(i)));
  if(p.x<p.y)p.xy=p.yx; if(p.y<p.z)p.yz=p.zy; if(p.x<p.z)p.xz=p.zx;
  p*=1.35; p+=vec3(.1,.3,.05);
 }
 float b=length(p)-.6;
 float pl=abs(p.y+1.4)-.05;
 return min(b,pl);
}
void main(){
 vec2 uv=auv(gl_FragCoord.xy);
 float t=u_time*u_speed;
 vec3 ro=vec3(2.4*sin(t*.5),1.1+(u_mouse.y-.5),2.4*cos(t*.5));
 vec3 ta=vec3(0.,.1,0.);
 vec3 fw=normalize(ta-ro),rt=normalize(cross(fw,vec3(0,1,0))),up=cross(rt,fw);
 vec3 rd=normalize(uv.x*rt+uv.y*up+1.2*fw);
 float d=0.; vec3 p; float m=-1.;
 for(int i=0;i<48;i++){ p=ro+rd*d; float e=mapf(p); if(e<.004){m=1.;break;} d+=e*.85; if(d>9.)break; }
 vec3 col=vec3(.02,.015,.04)+vec3(.1,.05,.2)*fbm(uv*2.+t*.2)*.4;
 if(m>0.){
  vec2 e=vec2(.005,0.);
  vec3 n=normalize(vec3(mapf(p+e.xyy)-mapf(p-e.xyy),mapf(p+e.yxy)-mapf(p-e.yxy),mapf(p+e.yyx)-mapf(p-e.yyx)));
  vec3 l=normalize(vec3(.5,.9,.3));
  float dif=clamp(dot(n,l),0.,1.);
  float spec=pow(clamp(dot(reflect(-l,n),-rd),0.,1.),24.);
  float grid=fract(p.x*4.)*fract(p.y*4.)*fract(p.z*4.);
  vec3 brass=mix(vec3(.45,.30,.14),vec3(1.,.8,.45),grid*3.);
  brass=mix(brass,pal(u_hue+fract(d)),.35);
  col=brass*(.3+.9*dif)+spec*vec3(1.,.95,.8);
  col+=vec3(.5,.2,.9)*exp(-d*1.2)*.6*u_intensity;
  col*=exp(-d*.18);
 } else {
  col+=pal(rd.x*.5+t*.1)*.12*u_intensity;
 }
 gl_FragColor=vec4(col,1.);
}`},
{ id:"biogoo", title:"BIO-GOO — abyssal bloom",
  desc:"Teal bioluminescence in copper flesh. Damage overlay / alien water / heal Zone.",
  tags:["organic","water","vfx"], gameUse:"Fullscreen damage/heal vignette or animated albedo for flesh. u_intensity = glow nodes.",
  defaults:{speed:.6,intensity:1.2,hue:.5},
  frag:`
void main(){
 vec2 uv=auv(gl_FragCoord.xy); uv.x+=(u_mouse.x-.5)*.4; uv.y+=(u_mouse.y-.5)*.4;
 float t=u_time*u_speed;
 vec2 w=uv*2.;
 w+=vec2(fbm(w*1.6+t*.5),fbm(w*1.6-t*.4))*1.4;
 float body=fbm(w*2.2-t*.25);
 float veins=abs(fbm(w*3.5+t*.3)-.5)*2.;
 float glow=smoothstep(.55,.95,fbm(w*2.8-t*.6+body*2.)) ;
 vec3 copper=mix(vec3(.08,.03,.01),vec3(.85,.45,.18),smoothstep(.2,.9,body));
 copper+=vec3(1.,.9,.7)*pow(1.-abs(veins-1.),6.)*.5;
 vec3 teal=vec3(.05,1.1,1.2)*pow(glow,2.5)*2.2*u_intensity;
 float sparkle=step(.9975,hash21(floor(uv*vec2(u_res.x/u_res.y,1.)*220.)+floor(t*3.)));
 teal+=vec3(.6,1.,1.)*sparkle*glow*3.;
 vec3 col=copper*.7+teal;
 // glossy membrane highlight
 col+=vec3(.9,.95,1.)*pow(smoothstep(.4,.9,fbm(w*5.-t)),8.)*.6;
 col*=1.-.5*dot(uv*.55,uv*.55);
 gl_FragColor=vec4(col,1.);
}`},
{ id:"nebula", title:"WARP NEBULA",
  desc:"FBM hyperspace — FTL travel / dream sequence / loading tunnel.",
  tags:["space","skybox","tunnel"], gameUse:"Skybox or travel overlay. Cheapest shader here — safe fullscreen on mobile.",
  defaults:{speed:.8,intensity:1.0,hue:.75},
  frag:`
void main(){
 vec2 uv=auv(gl_FragCoord.xy);
 float t=u_time*u_speed;
 vec2 p=uv; float z=1.+ .6*sin(t*.3)+(u_mouse.y)*.5;
 vec2 q=p/z + vec2(fbm(p*2.+t*.4)-.5, fbm(p*2.-t*.3)-.5);
 float tun=fbm(q*3.-vec2(t*.9,0.));
 float rays=fbm(vec2(atan(q.y,q.x)*3., length(q)*6.-t*2.));
 vec3 col=pal(tun+t*.08+u_hue*.2)*(.3+.9*tun*tun)*u_intensity;
 col+=pal(rays+.5)*pow(rays,3.)*.8;
 // star streaks
 vec2 sp=q*40.; vec2 id=floor(sp); float h=hash21(id);
 vec2 c=fract(sp)-.5; c.x*=1.+tun*6.;
 float s=smoothstep(.25,.0,length(c))*step(.93,h);
 col+=vec3(.9,.95,1.)*s*(.5+tun);
 col*=1.-.5*dot(uv*.6,uv*.6);
 gl_FragColor=vec4(col,1.);
}`},
{ id:"hexshield", title:"HEX SHIELD — forcefield",
  desc:"Hex-grid energy bubble with rim + scan sweep. Drop on ANY mesh as VFX.",
  tags:["vfx","shield","tech"], gameUse:"Alpha-style shield: bright = opaque. u_intensity = hit flash (tween to 3 on damage).",
  defaults:{speed:1.0,intensity:1.0,hue:.55},
  frag:`
vec2 hexUV(vec2 p){ p.x*=1.1547; p.y+=mod(floor(p.x),2.)*.5; return fract(p)-.5; }
void main(){
 vec2 uv=auv(gl_FragCoord.xy);
 float t=u_time*u_speed;
 vec2 c=uv; float r=length(c);
 vec2 hp=hexUV(c*9.);
 float hd=abs(hp.x)*.9+hp.y*1.2;
 float hex=smoothstep(.48,.42,hd);
 float pulse=.5+.5*sin(t*4.-r*14.);
 float hit=u_intensity;
 vec3 base=pal(.6+r*.5-t*.1);
 float rim=pow(smoothstep(.9,.1,abs(r-.75)),2.);
 float sweep=exp(-pow((uv.y-sin(t*1.5)*.8)*4.,2.))*1.2;
 float scan=.85+.15*sin(gl_FragCoord.y*1.5+t*8.);
 float a=(hex*.45*scan+rim*.9+pulse*.1+sweep*.25)*smoothstep(1.1,.6,r)*hit;
 vec3 col=(base*(hex*.7+rim*1.2)+vec3(.8,.95,1.)*(rim*.6+sweep*.2))*min(a,1.)*.85;
 // faint dome shading even where alpha low
 col+=base*.06*(1.-r);
 gl_FragColor=vec4(col, clamp(a+.08,0.,1.));
}`},
];
