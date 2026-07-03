import './styles.css';
import * as THREE from 'three';

const container = document.getElementById('experience-canvas');
const shell = document.querySelector('.experience-shell');
const fallbackNote = document.getElementById('fallback-note');
const actionButton = document.getElementById('experience-action');
const modeLinks = Array.from(document.querySelectorAll('[data-mode-link]'));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const copy = {
  story: {
    label: 'Story Book',
    eyebrow: 'SlateArt Story Mode',
    title: "Grandma's Story",
    subtitle: 'A memory opened from a SlateArt Smart Stone',
    body: 'A warm book opens on the table and reveals the story behind the stone: the places, dates, photographs and little details that make a life feel close again.',
    button: 'Open the Story',
    afterClick: 'The story is ready to read below the magic layer.',
  },
  voice: {
    label: 'Voice Stone',
    eyebrow: 'Voice From The Stone',
    title: 'Hear Their Voice',
    subtitle: 'A voice message waits inside the Smart Stone',
    body: 'The stone glows gently until someone taps to listen. Voice never autoplays; the moment begins only when the visitor chooses to hear it.',
    button: 'Tap to Listen',
    afterClick: 'Voice playback would begin now. Audio always requires this tap.',
  },
  secret: {
    label: 'Secret Capsule',
    eyebrow: 'SlateArt Time Capsule',
    title: 'A Message For The Day That Matters',
    subtitle: 'Sealed until the chosen future date',
    body: 'The capsule stays closed until its unlock day. It can hold a private message for an anniversary, an 18th birthday, a memorial day or a family milestone.',
    button: 'Check the Capsule',
    afterClick: 'Still sealed. The message opens only on the selected date.',
  },
  collection: {
    label: 'Family Shelf',
    eyebrow: 'Family Stone Collection',
    title: 'One Stone. One Story. A Family Legacy.',
    subtitle: 'A connected archive of family memories',
    body: 'Each stone can open its own story, while the collection keeps grandparents, pets, weddings, homes, farms and journeys connected in one warm family archive.',
    button: 'Explore Collection',
    afterClick: 'The family shelf opens into connected Smart Stone memories.',
  },
};

function currentMode() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || 'story';
  return copy[mode] ? mode : 'story';
}

const mode = currentMode();
const content = copy[mode];

function updateContent() {
  shell.dataset.mode = mode;
  document.title = `SlateArt Experience | ${content.label}`;
  document.getElementById('experience-eyebrow').textContent = content.eyebrow;
  document.getElementById('experience-title').textContent = content.title;
  document.getElementById('experience-subtitle').textContent = content.subtitle;
  document.getElementById('experience-copy').textContent = content.body;
  actionButton.textContent = content.button;

  modeLinks.forEach((link) => {
    const active = link.dataset.modeLink === mode;
    link.classList.toggle('is-active', active);
    link.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (error) {
    return false;
  }
}

function showFallback() {
  shell.classList.add('is-fallback');
  if (fallbackNote) fallbackNote.hidden = false;
}

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.78,
    metalness: options.metalness ?? 0.04,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
}

function createParticles(count = 210) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 9.8;
    positions[index * 3 + 1] = Math.random() * 5.2 - 0.55;
    positions[index * 3 + 2] = (Math.random() - 0.5) * 6.2;
    scales[index] = Math.random();
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  const particleMaterial = new THREE.PointsMaterial({
    color: 0xf3c66a,
    size: 0.034,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });

  return new THREE.Points(geometry, particleMaterial);
}

function createMagicRibbon() {
  const ribbon = new THREE.Group();
  const ringMaterial = material(0xd7a64a, {
    roughness: 0.42,
    metalness: 0.24,
    transparent: true,
    opacity: 0.48,
    emissive: 0xb87922,
    emissiveIntensity: 0.18,
  });

  [1.5, 2.15, 2.85].forEach((radius, index) => {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 8, 120), ringMaterial);
    torus.rotation.x = Math.PI / 2 + index * 0.07;
    torus.rotation.z = index * 0.8;
    torus.position.y = 0.52 + index * 0.03;
    ribbon.add(torus);
  });

  return ribbon;
}

function createTable() {
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(4.7, 5.5, 0.32, 96),
    material(0x4c2a17, { roughness: 0.88, metalness: 0.02 })
  );
  table.position.y = -0.24;
  table.receiveShadow = true;
  return table;
}

function createBook() {
  const group = new THREE.Group();
  const cover = material(0x311a12, { roughness: 0.82 });
  const page = material(0xf2ddba, { roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  const gold = material(0xd49a35, { roughness: 0.48, metalness: 0.22 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.14, 2.18), cover);
  base.position.y = 0.04;
  group.add(base);

  const border = new THREE.Mesh(new THREE.BoxGeometry(3.38, 0.035, 2.3), gold);
  border.position.y = 0.13;
  group.add(border);

  const leftPivot = new THREE.Group();
  const rightPivot = new THREE.Group();
  leftPivot.position.set(-0.04, 0.22, 0);
  rightPivot.position.set(0.04, 0.23, 0);

  const leftPage = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.035, 2.02), page);
  leftPage.position.x = -0.76;

  const rightPage = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.035, 2.02), page);
  rightPage.position.x = 0.76;

  leftPivot.add(leftPage);
  rightPivot.add(rightPage);
  group.add(leftPivot, rightPivot);

  const bookmark = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.015, 1.65),
    material(0x8f1d18, { roughness: 0.68 })
  );
  bookmark.position.set(0.1, 0.27, 0.1);
  group.add(bookmark);

  group.rotation.x = -0.08;
  group.rotation.z = 0.02;
  return { group, animate: (elapsed, ease) => {
    leftPivot.rotation.z = THREE.MathUtils.lerp(0.02, 0.73, ease);
    rightPivot.rotation.z = THREE.MathUtils.lerp(-0.02, -0.73, ease);
    group.rotation.y = Math.sin(elapsed * 0.35) * 0.05;
  } };
}

function createVoiceStone() {
  const group = new THREE.Group();
  const stone = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.25, 2),
    material(0x1e2526, {
      roughness: 0.86,
      metalness: 0.1,
      emissive: 0x102b2a,
      emissiveIntensity: 0.22,
    })
  );
  stone.scale.set(1.1, 0.72, 0.84);
  stone.position.y = 0.55;
  group.add(stone);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 48, 32),
    material(0x70f0d0, {
      roughness: 0.18,
      metalness: 0.02,
      transparent: true,
      opacity: 0.72,
      emissive: 0x2bd9ba,
      emissiveIntensity: 1.2,
    })
  );
  core.position.set(0, 0.58, 0.75);
  group.add(core);

  const rings = new THREE.Group();
  const ringMaterial = material(0x8cefdc, {
    roughness: 0.34,
    metalness: 0.18,
    transparent: true,
    opacity: 0.42,
    emissive: 0x32c9b5,
    emissiveIntensity: 0.35,
  });

  [1.45, 1.95, 2.45].forEach((radius, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.01, 8, 120), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.58 + index * 0.05;
    rings.add(ring);
  });
  group.add(rings);

  return { group, animate: (elapsed) => {
    stone.rotation.y = elapsed * 0.22;
    stone.rotation.x = Math.sin(elapsed * 0.7) * 0.08;
    core.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.08);
    rings.rotation.z += prefersReducedMotion ? 0 : 0.006;
  } };
}

function createSecretCapsule() {
  const group = new THREE.Group();
  const boxMat = material(0x281a2d, { roughness: 0.72, metalness: 0.06 });
  const gold = material(0xd6a24a, {
    roughness: 0.38,
    metalness: 0.28,
    emissive: 0x8a5416,
    emissiveIntensity: 0.08,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.18, 1.92), boxMat);
  base.position.y = 0.48;
  group.add(base);

  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 1.1, -0.92);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.28, 2.05), boxMat);
  lid.position.z = 0.92;
  lidPivot.add(lid);
  group.add(lidPivot);

  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.12), gold);
  lock.position.set(0, 0.48, 1.03);
  group.add(lock);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 48, 32),
    material(0xffcf73, {
      transparent: true,
      opacity: 0.22,
      emissive: 0xffb342,
      emissiveIntensity: 1.4,
    })
  );
  glow.position.set(0, 1.02, 0.08);
  group.add(glow);

  return { group, animate: (elapsed, ease) => {
    const sealedOpen = Math.min(0.34, ease * 0.34);
    lidPivot.rotation.x = -sealedOpen;
    group.rotation.y = Math.sin(elapsed * 0.25) * 0.04;
    glow.scale.setScalar(1 + Math.sin(elapsed * 1.7) * 0.12);
  } };
}

function createCollectionShelf() {
  const group = new THREE.Group();
  const wood = material(0x4c2a17, { roughness: 0.82 });
  const gold = material(0xd6a24a, { roughness: 0.45, metalness: 0.24 });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.18, 1.0), wood);
  shelf.position.y = 0.1;
  group.add(shelf);

  const colors = [0x432318, 0x1f3b38, 0x502239, 0x61411d, 0x24314d];
  colors.forEach((color, index) => {
    const item = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 1.38 + (index % 2) * 0.22, 0.72),
      material(color, { roughness: 0.76, metalness: 0.05 })
    );
    item.position.set(-1.4 + index * 0.7, 0.86 + (index % 2) * 0.1, 0);
    item.rotation.z = (index - 2) * 0.025;
    group.add(item);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.055, 0.75), gold);
    stripe.position.set(item.position.x, item.position.y + 0.35, 0.37);
    stripe.rotation.z = item.rotation.z;
    group.add(stripe);
  });

  const smallStone = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.38, 1),
    material(0x232323, { roughness: 0.88, metalness: 0.08 })
  );
  smallStone.position.set(2, 0.52, 0.2);
  smallStone.scale.set(1.12, 0.66, 0.82);
  group.add(smallStone);

  return { group, animate: (elapsed) => {
    group.rotation.y = Math.sin(elapsed * 0.28) * 0.055;
  } };
}

function createModeObject(selectedMode) {
  if (selectedMode === 'voice') return createVoiceStone();
  if (selectedMode === 'secret') return createSecretCapsule();
  if (selectedMode === 'collection') return createCollectionShelf();
  return createBook();
}

function initExperience() {
  if (!container || !supportsWebGL()) {
    showFallback();
    return;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x110c0a, 6, 14);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 2.25, 6.2);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xf9dfb6, 0x1b1210, 1.65));

  const spotlight = new THREE.SpotLight(0xffd08a, 4.4, 12, Math.PI / 6, 0.65, 1.08);
  spotlight.position.set(0, 4.8, 3.1);
  spotlight.castShadow = true;
  scene.add(spotlight);

  const tealFill = new THREE.PointLight(mode === 'voice' ? 0x52e6d0 : 0x6c9fa0, mode === 'voice' ? 1.9 : 0.9, 7);
  tealFill.position.set(-2.8, 1.7, 2.4);
  scene.add(tealFill);

  const emberFill = new THREE.PointLight(mode === 'secret' ? 0xff9e43 : 0xb35b24, 1.25, 7);
  emberFill.position.set(2.6, 1.3, 2.1);
  scene.add(emberFill);

  const table = createTable();
  scene.add(table);

  const modeObject = createModeObject(mode);
  modeObject.group.position.y = 0.08;
  modeObject.group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(modeObject.group);

  const ribbon = createMagicRibbon();
  scene.add(ribbon);

  const particles = createParticles(mode === 'collection' ? 260 : 210);
  scene.add(particles);

  const clock = new THREE.Clock();

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.position.z = width < 720 ? 7.5 : 6.2;
    camera.position.y = width < 720 ? 2.72 : 2.25;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener('resize', resize);
  resize();

  function animate() {
    const elapsed = clock.getElapsedTime();
    const openAmount = prefersReducedMotion ? 1 : Math.min(1, elapsed / 2.25);
    const ease = 1 - Math.pow(1 - openAmount, 3);

    modeObject.animate(elapsed, ease);

    if (!prefersReducedMotion) {
      particles.rotation.y += mode === 'voice' ? 0.0015 : 0.001;
      particles.position.y = Math.sin(elapsed * 0.5) * 0.045;
      ribbon.rotation.z += mode === 'secret' ? 0.002 : 0.003;
      ribbon.rotation.y = Math.sin(elapsed * 0.3) * 0.08;
    }

    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
  }

  animate();
}

actionButton?.addEventListener('click', () => {
  shell.classList.toggle('is-expanded');
  const expanded = shell.classList.contains('is-expanded');
  actionButton.textContent = expanded ? 'Return to the Stone' : content.button;
  document.getElementById('experience-status').textContent = expanded ? content.afterClick : '';
});

updateContent();
initExperience();
