# shadertest — Shader Vault for Games

Greenfield: single-file-ish static site, no build step. Vanilla WebGL1 + GLSL ES 1.0 so shaders copy-paste into Godot / Unity / GameMaker.

## Findings
- No repo, no deps. Keep zero-dependency static (index.html + app.js + shaders.js + style.css).
- Perf: one WebGL context per preview card is heavy. Use single shared renderer? Simpler: each card own context but tiny res (320px) + IntersectionObserver pause. 6 shaders = OK on desktop. Modal fullscreen uses its own context.
- Game-use: shaders use only `u_time,u_res,u_mouse,u_speed,u_intensity,u_hue` + hash/noise/fbm inlined. No textures, no extensions. Easy port to Shadertoy (add void mainImage wrapper) / Unity URP / Godot.
- Inspirations mapped: Gargantua (grav lens + disk) / Mandelbulb / Lattice Citadel (menger-ish kaleido) / Bio-Goo (teal+coper organic) + 2 game staples: Warp Nebula (skybox) + Hex Shield (forcefield).

## Log
- 2026-10-08: scaffold + 6 shaders + gallery + fullscreen lab (sliders, copy GLSL/HLSL-ish notes). Serve with `python3 -m http.server`.
