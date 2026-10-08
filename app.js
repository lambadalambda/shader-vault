/* functional tiny renderer — one rAF drives all visible canvases */
const VERT = `attribute vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`;

const compile = (gl, type, src) => {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
};
const makeProg = (gl, frag) => {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, COMMON + frag));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
};
const makeRenderer = (canvas, frag) => {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return null;
  const prog = makeProg(gl, frag);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const u = { time: U("u_time"), res: U("u_res"), mouse: U("u_mouse"), speed: U("u_speed"), inten: U("u_intensity"), hue: U("u_hue") };
  return {
    draw(t, w, h, st) {
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.uniform1f(u.time, t); gl.uniform2f(u.res, w, h);
      gl.uniform2f(u.mouse, st.mx, st.my);
      gl.uniform1f(u.speed, st.speed); gl.uniform1f(u.inten, st.inten); gl.uniform1f(u.hue, st.hue);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  };
};

const stateOf = d => ({ speed: d.speed, inten: d.intensity, hue: d.hue, mx: .5, my: .5, t: 0, seed: Math.random() * 100 });
const cards = [];
let running = true;

const buildCards = () => {
  const vault = document.getElementById("vault");
  SHADERS.forEach(s => {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `<div class="thumb"><canvas></canvas>
      <div class="tags">${s.tags.map(t => `<span>#${t}</span>`).join("")}</div></div>
      <div class="meta"><h3>${s.title}</h3><p>${s.desc}</p>
      <div class="row"><button class="btn open">⚗ open lab</button>
      <button class="btn ghost copy">⧉ copy</button></div></div>`;
    vault.appendChild(el);
    const canvas = el.querySelector("canvas");
    let r = null;
    try { r = makeRenderer(canvas, s.frag); } catch (e) { el.querySelector(".thumb").textContent = "shader error: " + e.message; }
    const st = stateOf(s.defaults);
    const card = { s, el, canvas, r, st, visible: true };
    canvas.addEventListener("pointermove", e => {
      const b = canvas.getBoundingClientRect();
      st.mx = (e.clientX - b.left) / b.width; st.my = 1 - (e.clientY - b.top) / b.height;
    });
    el.querySelector(".open").onclick = () => openLab(s);
    el.querySelector(".copy").onclick = ev => { navigator.clipboard.writeText(COMMON + s.frag).catch(() => {}); ev.target.textContent = "✓ copied"; setTimeout(() => ev.target.textContent = "⧉ copy", 1200); };
    cards.push(card);
  });
  const obs = new IntersectionObserver(es => es.forEach(e => {
    const c = cards.find(c => c.el === e.target); if (c) c.visible = e.isIntersecting;
  }), { threshold: .05 });
  cards.forEach(c => obs.observe(c.el));
};

const loop = () => {
  requestAnimationFrame(loop);
  if (!running) return;
  cards.forEach(c => {
    if (!c.visible || !c.r) return;
    const w = c.canvas.clientWidth | 0, h = c.canvas.clientHeight | 0;
    if (!w || !h) return;
    c.st.t += .016 * c.st.speed;
    try { c.r.draw(c.st.seed + c.st.t * 4, Math.min(w, 480), Math.min(h, 300), c.st); } catch (e) {}
  });
  // hero bg reuses nebula
  if (heroR) { const c = heroCanvas; heroSt.t += .016 * heroSt.speed; heroR.draw(heroSt.seed + heroSt.t * 4, c.clientWidth || 800, c.clientHeight || 300, heroSt); }
  if (lab.open && lab.r) { lab.st.t += .016 * lab.st.speed; lab.r.draw(lab.st.seed + lab.st.t * 4, lab.canvas.clientWidth || 800, lab.canvas.clientHeight || 600, lab.st); }
};

let heroR = null, heroCanvas = null; const heroSt = { speed: .3, inten: 1, hue: 0, mx: .5, my: .5, t: 0, seed: 7.3 };

/* ---- fullscreen lab ---- */
const lab = { open: false, cache: {} };
function openLab(s) {
  lab.open = true; lab.s = s; lab.st = stateOf(s.defaults);
  document.getElementById("lab").classList.remove("hidden");
  document.getElementById("labTitle").textContent = s.title;
  document.getElementById("labDesc").textContent = s.desc;
  document.getElementById("labPort").textContent = "🎮 " + s.gameUse + " Godot: add as ColorRect shader (rename uniforms). Unity URP: paste body into fragment, replace auv() with i.uv. Shadertoy: wrap with void mainImage(out vec4 O, vec2 F){ gl_FragCoord=F; ... }";
  lab.canvas = document.getElementById("labCanvas");
  try { lab.r = lab.cache[s.id] || (lab.cache[s.id] = makeRenderer(lab.canvas, s.frag)); }
  catch (e) { lab.r = null; delete lab.cache[s.id]; document.getElementById("labCode").textContent = e.message; return; }
  const box = document.getElementById("labSliders"); box.innerHTML = "";
  [["speed", 0, 2], ["inten", 0, 3], ["hue", 0, 1]].forEach(([k, mn, mx]) => {
    const v = k === "speed" ? lab.st.speed : k === "inten" ? lab.st.inten : lab.st.hue;
    const l = document.createElement("label");
    l.innerHTML = `${k} <span>${v.toFixed(2)}</span>`;
    const i = document.createElement("input");
    i.type = "range"; i.min = mn; i.max = mx; i.step = .01; i.value = v;
    i.oninput = () => {
      const x = +i.value; l.querySelector("span").textContent = x.toFixed(2);
      if (k === "speed") lab.st.speed = x; if (k === "inten") lab.st.inten = x; if (k === "hue") lab.st.hue = x;
    };
    l.appendChild(i); box.appendChild(l);
  });
  document.getElementById("labCode").textContent = COMMON + s.frag;
  lab.canvas.onpointermove = e => {
    const b = lab.canvas.getBoundingClientRect();
    lab.st.mx = (e.clientX - b.left) / b.width; lab.st.my = 1 - (e.clientY - b.top) / b.height;
  };
}
document.getElementById("labClose").onclick = () => { lab.open = false; document.getElementById("lab").classList.add("hidden"); };
document.getElementById("copyGLSL").onclick = e => { if (!lab.s) return; navigator.clipboard.writeText(COMMON + lab.s.frag).catch(() => {}); e.target.textContent = "✓ copied!"; setTimeout(() => e.target.textContent = "⧉ copy GLSL", 1200); };
document.getElementById("copyToy").onclick = e => {
  if (!lab.s) return;
  const w = `void mainImage(out vec4 O, vec2 F){ gl_FragCoord = vec4(F,0.,1.); }\n// ^ Shadertoy: paste vault frag's main() body into mainImage, add: uniform float u_time→iTime etc. Full GLSL already on clipboard via Copy.`;
  navigator.clipboard.writeText(COMMON + lab.s.frag + "\n" + w).catch(() => {}); e.target.textContent = "✓ wrapped!"; setTimeout(() => e.target.textContent = "Shadertoy wrap", 1200);
};
document.getElementById("pauseAll").onclick = e => { running = !running; e.target.textContent = running ? "⏸ pause all" : "▶ resume"; };
addEventListener("keydown", e => { if (e.key === "Escape") { lab.open = false; document.getElementById("lab").classList.add("hidden"); } });

buildCards();
heroCanvas = document.getElementById("heroBg");
try { heroR = makeRenderer(heroCanvas, SHADERS[4].frag); } catch (e) {}
requestAnimationFrame(loop);
