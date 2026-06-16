import { Renderer, Triangle, Program, Mesh, Texture } from 'ogl';

const vertex = `attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;
const fragment = `precision highp float; varying vec2 vUv;
uniform sampler2D tMap; uniform float uStrength; uniform float uHover; uniform vec2 uImgRatio;
void main(){
  // cover-fit the texture to the canvas
  vec2 uv = (vUv - 0.5) * uImgRatio + 0.5;
  float amt = uStrength * 0.03 + uHover * 0.02;
  uv.x += sin(uv.y * 9.0 + uStrength * 6.2831) * amt;
  uv.y += cos(uv.x * 7.0) * amt * 0.5;
  gl_FragColor = texture2D(tMap, uv);
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

  function fitCover() {
    const cw = canvas.clientWidth || 1, ch = canvas.clientHeight || 1;
    const canvasAspect = cw / ch;
    const imgAspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
    // scale uv so image covers canvas without distortion
    if (canvasAspect > imgAspect) imgRatio = [1, imgAspect / canvasAspect];
    else imgRatio = [canvasAspect / imgAspect, 1];
    program.uniforms.uImgRatio.value = imgRatio;
  }

  const program = new Program(gl, { vertex, fragment, uniforms: {
    tMap: { value: texture }, uStrength: { value: 0 }, uHover: { value: 0 }, uImgRatio: { value: imgRatio },
  }});
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  function resize() { renderer.setSize(canvas.clientWidth, canvas.clientHeight); fitCover(); }
  resize();
  window.addEventListener('resize', resize);

  let hover = 0;
  const onEnter = () => { hover = 1; };
  const onLeave = () => { hover = 0; };
  canvas.addEventListener('pointerenter', onEnter);
  canvas.addEventListener('pointerleave', onLeave);

  let raf = 0, lastY = window.scrollY, vel = 0;
  function loop() {
    const target = Math.min(Math.abs(window.scrollY - lastY) * 0.02, 1);
    vel += (target - vel) * 0.1;
    lastY = window.scrollY;
    program.uniforms.uStrength.value = vel;
    program.uniforms.uHover.value += (hover - program.uniforms.uHover.value) * 0.08;
    renderer.render({ scene: mesh });
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerenter', onEnter);
    canvas.removeEventListener('pointerleave', onLeave);
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  };
}
