import { Renderer, Triangle, Program, Mesh, Texture } from 'ogl';

const vertex = `attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;
const fragment = `precision highp float; varying vec2 vUv;
uniform sampler2D tMap; uniform float uStrength; uniform float uHover; uniform vec2 uImgRatio; uniform vec2 uMouse;
void main(){
  vec2 vv = vUv;
  // cursor-tracked radial push
  vec2 d = vv - uMouse;
  float r = length(d);
  float ripple = uHover * 0.09 * exp(-r * 3.5);
  vv -= normalize(d + 0.0001) * ripple;
  // scroll-driven wave
  float sw = uStrength * 0.05;
  vv.x += sin(vv.y * 8.0 + uStrength * 6.2831) * sw;
  vv.y += cos(vv.x * 6.0) * sw * 0.6;
  // cover-fit
  vec2 uv = (vv - 0.5) * uImgRatio + 0.5;
  gl_FragColor = texture2D(tMap, clamp(uv, 0.0, 1.0));
}`;

export function mountWarp(canvas: HTMLCanvasElement, src: string): () => void {
  const renderer = new Renderer({ canvas, alpha: true, dpr: Math.min(window.devicePixelRatio, 2) });
  const gl = renderer.gl;
  const texture = new Texture(gl);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  let imgRatio: [number, number] = [1, 1];
  img.onload = () => {
    texture.image = img;
    fitCover();
  };

  // Measure the canvas's container, not the canvas itself: OGL's setSize writes
  // inline px width/height onto the canvas, which would otherwise freeze it at
  // whatever size it had on the first (possibly pre-layout) frame.
  function measure(): [number, number] {
    const host = (canvas.parentElement as HTMLElement) || canvas;
    return [host.clientWidth || 1, host.clientHeight || 1];
  }

  function fitCover() {
    const [cw, ch] = measure();
    const canvasAspect = cw / ch;
    const imgAspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
    // scale uv so image covers canvas without distortion
    if (canvasAspect > imgAspect) imgRatio = [1, imgAspect / canvasAspect];
    else imgRatio = [canvasAspect / imgAspect, 1];
    program.uniforms.uImgRatio.value = imgRatio;
  }

  const program = new Program(gl, { vertex, fragment, uniforms: {
    tMap: { value: texture }, uStrength: { value: 0 }, uHover: { value: 0 }, uImgRatio: { value: imgRatio }, uMouse: { value: [0.5, 0.5] },
  }});
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  function resize() {
    const [w, h] = measure();
    renderer.setSize(w, h);
    // OGL's setSize writes inline px width/height onto the canvas; override it
    // back to fluid sizing so the canvas always tracks its container.
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    fitCover();
  }
  resize();
  requestAnimationFrame(resize); // re-measure after layout is fully painted
  window.addEventListener('resize', resize);
  // The container can gain a definite height slightly after mount (fonts/images
  // settling the grid row); observe it so the canvas grows to match.
  const ro = new ResizeObserver(resize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);

  let hover = 0;
  let mouseX = 0.5, mouseY = 0.5;
  const onEnter = () => { hover = 1; };
  const onLeave = () => { hover = 0; };
  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) / rect.width;
    mouseY = 1.0 - (e.clientY - rect.top) / rect.height;
  };
  canvas.addEventListener('pointerenter', onEnter);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointermove', onMove);

  let raf = 0, lastY = window.scrollY, vel = 0;
  function loop() {
    const target = Math.min(Math.abs(window.scrollY - lastY) * 0.02, 1);
    vel += (target - vel) * 0.1;
    lastY = window.scrollY;
    program.uniforms.uStrength.value = vel;
    program.uniforms.uHover.value += (hover - program.uniforms.uHover.value) * 0.06;
    program.uniforms.uMouse.value = [mouseX, mouseY];
    renderer.render({ scene: mesh });
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerenter', onEnter);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('pointermove', onMove);
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  };
}
