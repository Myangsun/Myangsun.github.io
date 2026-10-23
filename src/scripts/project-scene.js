import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, MeshBasicMaterial,
  PlaneGeometry, TextureLoader, SRGBColorSpace, MathUtils, Vector2, DoubleSide,
} from 'three';

/** A gently curved, frameless artwork. Navigation stays in ordinary HTML. */
export async function createProjectScene(container, sources) {
  let renderer;
  try { renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { return undefined; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 640 ? 1.25 : 1.75));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.append(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, .1, 60);
  const card = new Group();
  scene.add(card);
  const plane = new PlaneGeometry(8.6, 5.733, 48, 32);
  const mainMaterial = new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, side: DoubleSide });
  const nextMaterial = mainMaterial.clone();
  nextMaterial.opacity = 0;
  const uniforms = { uTime: { value: 0 }, uImpulse: { value: 0 }, uPointer: { value: new Vector2() } };
  for (const material of [mainMaterial, nextMaterial]) {
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `
        #include <common>
        uniform float uTime;
        uniform float uImpulse;
        uniform vec2 uPointer;
      `).replace('#include <begin_vertex>', `
        #include <begin_vertex>
        transformed.z += (cos(position.x * .48 + uPointer.x * .6) - 1.0) * .16;
        transformed.z += sin(position.y * .7 + uTime * .8) * .03;
        float distanceFromPress = length(position.xy - uPointer * vec2(4.3, 2.866));
        transformed.z += sin(distanceFromPress * 3.4 - uTime * 10.0)
          * exp(-distanceFromPress * .23) * uImpulse * .38;
      `);
    };
    material.customProgramCacheKey = () => 'portfolio-artwork-wave';
  }
  const artwork = new Mesh(plane, mainMaterial);
  const incoming = new Mesh(plane, nextMaterial);
  incoming.position.z = .004;
  card.add(artwork, incoming);

  let disposed = false;
  let running = false;
  let frame = 0;
  let elapsed = 0;
  let previous = performance.now();
  let selected = 0;
  let requested = 0;
  let blending = false;
  let impulse = 0;
  const pointer = { x: 0, y: 0 };
  const pointerGoal = new Vector2();
  const loader = new TextureLoader();
  const textures = new Map();

  function texture(index) {
    if (!textures.has(index)) textures.set(index, loader.loadAsync(sources[index]).then(image => {
      if (disposed) { image.dispose(); return null; }
      image.colorSpace = SRGBColorSpace;
      const aspect = image.image.width / image.image.height;
      if (aspect > 1.5) { image.repeat.x = 1.5 / aspect; image.offset.x = (1 - image.repeat.x) / 2; }
      else { image.repeat.y = aspect / 1.5; image.offset.y = (1 - image.repeat.y) / 2; }
      return image;
    }).catch(() => null));
    return textures.get(index);
  }

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height || disposed) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = Math.max(7.2, 9.8 / camera.aspect) / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)));
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  function draw(now) {
    if (!running || disposed) return;
    const delta = Math.min((now - previous) / 1000, .05);
    previous = now; elapsed += delta;
    const ease = 1 - Math.exp(-delta * 7);
    impulse = MathUtils.lerp(impulse, 0, 1 - Math.exp(-delta * 2.8));
    card.rotation.x = MathUtils.lerp(card.rotation.x, -.035 - pointer.y * .14, ease);
    card.rotation.y = MathUtils.lerp(card.rotation.y, -.055 + pointer.x * .22, ease);
    card.rotation.z = MathUtils.lerp(card.rotation.z, -.015 + pointer.x * .015, ease);
    card.position.x = MathUtils.lerp(card.position.x, pointer.x * .13, ease);
    card.position.y = Math.sin(elapsed * .7) * .04 - pointer.y * .08;
    card.position.z = impulse * .38;
    uniforms.uTime.value = elapsed;
    uniforms.uImpulse.value = impulse;
    uniforms.uPointer.value.lerp(pointerGoal, ease);
    if (blending) {
      nextMaterial.opacity = MathUtils.lerp(nextMaterial.opacity, 1, 1 - Math.exp(-delta * 11));
      if (nextMaterial.opacity > .995) {
        mainMaterial.map = nextMaterial.map; mainMaterial.needsUpdate = true;
        nextMaterial.opacity = 0; blending = false;
        container.dataset.renderedIndex = String(selected);
      }
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }

  function visible(value) {
    if (disposed) return;
    running = value; cancelAnimationFrame(frame);
    if (value) { previous = performance.now(); frame = requestAnimationFrame(draw); }
  }

  function dispose() {
    if (disposed) return;
    disposed = true; running = false; cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    plane.dispose(); mainMaterial.dispose(); nextMaterial.dispose();
    textures.forEach(promise => promise.then(image => image?.dispose()));
    renderer.dispose(); renderer.domElement.remove();
    container.classList.remove('is-webgl'); delete container.dataset.renderedIndex;
  }
  function contextLost(event) { event.preventDefault(); dispose(); }
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const first = await texture(0);
  if (!first) { dispose(); return undefined; }
  mainMaterial.map = first; mainMaterial.needsUpdate = true;
  resize(); container.classList.add('is-webgl'); container.dataset.renderedIndex = '0';
  sources.forEach((_, index) => { if (index) void texture(index); });

  return {
    select(index) {
      if (index === selected || disposed) return;
      selected = index;
      const token = ++requested;
      void texture(index).then(image => {
        if (disposed || token !== requested) return;
        if (!image) { container.classList.remove('is-webgl'); return; }
        if (blending && nextMaterial.opacity > .5) mainMaterial.map = nextMaterial.map;
        mainMaterial.needsUpdate = true;
        nextMaterial.map = image; nextMaterial.opacity = 0; nextMaterial.needsUpdate = true;
        blending = true; impulse = Math.max(impulse, .2);
        container.classList.add('is-webgl');
      });
    },
    point(x, y) {
      pointer.x = MathUtils.clamp(x, -1, 1); pointer.y = MathUtils.clamp(y, -1, 1);
      pointerGoal.set(pointer.x, -pointer.y);
    },
    pulse() { if (!disposed) impulse = 1; },
    visible, dispose,
  };
}
