import './styles.css';
import * as THREE from 'three';

const container = document.getElementById('experience-canvas');
const shell = document.querySelector('.experience-shell');
const fallbackNote = document.getElementById('fallback-note');
const readButton = document.getElementById('read-story-button');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

function makeCoverMaterial(color, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.03,
  });
}

function createParticles(count = 170) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 9;
    positions[index * 3 + 1] = Math.random() * 4.8 - 0.3;
    positions[index * 3 + 2] = (Math.random() - 0.5) * 5.5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xf3c66a,
    size: 0.035,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

function createBook() {
  const book = new THREE.Group();

  const coverMaterial = makeCoverMaterial(0x3b2115);
  const pageMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2ddba,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const edgeMaterial = makeCoverMaterial(0xd49a35, 0.55);

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.14, 2.18), coverMaterial);
  base.position.y = 0.04;
  book.add(base);

  const goldEdge = new THREE.Mesh(new THREE.BoxGeometry(3.36, 0.03, 2.28), edgeMaterial);
  goldEdge.position.y = 0.13;
  book.add(goldEdge);

  const leftPivot = new THREE.Group();
  const rightPivot = new THREE.Group();
  leftPivot.position.set(-0.04, 0.2, 0);
  rightPivot.position.set(0.04, 0.21, 0);

  const leftPage = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.035, 2.02), pageMaterial);
  leftPage.position.x = -0.76;

  const rightPage = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.035, 2.02), pageMaterial);
  rightPage.position.x = 0.76;

  leftPivot.add(leftPage);
  rightPivot.add(rightPage);
  book.add(leftPivot, rightPivot);

  const bookmark = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.015, 1.65),
    new THREE.MeshStandardMaterial({ color: 0x8f1d18, roughness: 0.7 })
  );
  bookmark.position.set(0.1, 0.25, 0.1);
  book.add(bookmark);

  book.rotation.x = -0.08;
  book.rotation.z = 0.02;

  return { book, leftPivot, rightPivot };
}

function initExperience() {
  if (!container || !supportsWebGL()) {
    showFallback();
    return;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x140d09, 6, 14);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 2.2, 6.2);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.HemisphereLight(0xf9dfb6, 0x24100a, 1.9);
  scene.add(ambient);

  const spotlight = new THREE.SpotLight(0xffd08a, 4.2, 12, Math.PI / 6, 0.65, 1.1);
  spotlight.position.set(0, 4.8, 3.1);
  spotlight.castShadow = true;
  scene.add(spotlight);

  const fill = new THREE.PointLight(0xb35b24, 1.3, 7);
  fill.position.set(-2.5, 1.5, 2.2);
  scene.add(fill);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(4.7, 5.5, 0.32, 96),
    new THREE.MeshStandardMaterial({ color: 0x4c2a17, roughness: 0.88, metalness: 0.02 })
  );
  table.position.y = -0.22;
  table.receiveShadow = true;
  scene.add(table);

  const { book, leftPivot, rightPivot } = createBook();
  book.position.y = 0.08;
  book.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(book);

  const particles = createParticles();
  scene.add(particles);

  const clock = new THREE.Clock();

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.position.z = width < 720 ? 7.4 : 6.2;
    camera.position.y = width < 720 ? 2.6 : 2.2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener('resize', resize);
  resize();

  function animate() {
    const elapsed = clock.getElapsedTime();
    const openAmount = prefersReducedMotion ? 1 : Math.min(1, elapsed / 2.4);
    const ease = 1 - Math.pow(1 - openAmount, 3);

    leftPivot.rotation.z = THREE.MathUtils.lerp(0.02, 0.7, ease);
    rightPivot.rotation.z = THREE.MathUtils.lerp(-0.02, -0.7, ease);
    book.rotation.y = Math.sin(elapsed * 0.35) * 0.045;

    if (!prefersReducedMotion) {
      particles.rotation.y += 0.0009;
      particles.position.y = Math.sin(elapsed * 0.5) * 0.04;
    }

    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
  }

  animate();
}

readButton?.addEventListener('click', () => {
  shell.classList.toggle('is-expanded');
  readButton.textContent = shell.classList.contains('is-expanded') ? 'Return to the Stone' : 'Read the Story';
});

initExperience();
