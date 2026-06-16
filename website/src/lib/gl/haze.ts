import { Renderer, Triangle, Program, Mesh, Vec2 } from 'ogl';

const vertex = `attribute vec2 uv; attribute vec2 position;
varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;

const fragment = `precision highp float;
varying vec2 vUv;
uniform float uTime; uniform vec2 uMouse; uniform vec2 uRes; uniform vec3 uTint;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }
void main(){
  vec2 uv = vUv;
  // aspect-correct so wisps aren't stretched
  vec2 p = uv; p.x *= uRes.x/uRes.y;
  float t = uTime*0.04;
  float n = fbm(p*2.2 + vec2(t, t*0.6));
  n = fbm(p*2.2 + n + vec2(-t*0.3, t*0.2)); // domain warp for smoky curl
  // concentrate into wisps: bias toward 0, soft highlights
  float wisp = smoothstep(0.45, 0.95, n);
  // gentle lift near cursor (scent parting)
  float m = distance(uv, uMouse);
  wisp += 0.12 * smoothstep(0.35, 0.0, m) * n;
  float alpha = clamp(wisp*0.55, 0.0, 0.85);
  gl_FragColor = vec4(uTint * (0.6 + 0.4*wisp), alpha);
}`;

export function mountHaze(canvas: HTMLCanvasElement): () => void {
  const renderer = new Renderer({ canvas, alpha: true, dpr: Math.min(window.devicePixelRatio, 2) });
  const gl = renderer.gl;
  const mouse = new Vec2(0.5, 0.5);
  const res = new Vec2(1, 1);
  const program = new Program(gl, {
    vertex, fragment, transparent: true,
    uniforms: {
      uTime: { value: 0 }, uMouse: { value: mouse }, uRes: { value: res },
      uTint: { value: [0.82, 0.74, 0.60] }, // brand sand
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h); res.set(w, h);
  }
  function onMove(e: PointerEvent) {
    mouse.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
  }
  let raf = 0;
  function loop(t: number) {
    program.uniforms.uTime.value = t * 0.001;
    renderer.render({ scene: mesh });
    raf = requestAnimationFrame(loop);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove);
  resize();
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onMove);
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  };
}
