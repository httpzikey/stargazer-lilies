
import * as THREE from
  "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";

const container = document.getElementById("flower-container");
const message = document.getElementById("message");
const replay = document.getElementById("replay");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera.position.set(0, 2.5, 19);
camera.lookAt(0, 1.5, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: false
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Render the 3D scene offscreen.
const renderCanvas = renderer.domElement;

// Visible ASCII canvas
const asciiCanvas = document.createElement("canvas");
const asciiCtx = asciiCanvas.getContext("2d", {
  alpha: false
});

container.appendChild(asciiCanvas);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 1.5));

const light1 = new THREE.DirectionalLight(0xffffff, 2.5);
light1.position.set(-4, 8, 10);
scene.add(light1);

const light2 = new THREE.DirectionalLight(0xff8dc0, 1.2);
light2.position.set(5, 3, -5);
scene.add(light2);

const bouquet = new THREE.Group();
scene.add(bouquet);

const flowerObjects = [];

const clamp = (v, a = 0, b = 1) =>
  Math.max(a, Math.min(b, v));

const ease = t => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};

// Materials
const stemMaterial = new THREE.MeshStandardMaterial({
  color: 0x3f783a,
  roughness: 0.8,
  side: THREE.DoubleSide
});

const leafMaterial = new THREE.MeshStandardMaterial({
  color: 0x528c47,
  roughness: 0.85,
  side: THREE.DoubleSide
});

const pollenMaterial = new THREE.MeshStandardMaterial({
  color: 0xc47a34,
  roughness: 0.9
});

// Create a curved tubular stem
function makeStem(start, end) {
  const mid = new THREE.Vector3(
    (start.x + end.x) / 2,
    (start.y + end.y) / 2 + 0.35,
    (start.z + end.z) / 2
  );

  const curve = new THREE.QuadraticBezierCurve3(
    start,
    mid,
    end
  );

  const geometry = new THREE.TubeGeometry(
    curve,
    32,
    0.045,
    7,
    false
  );

  return new THREE.Mesh(geometry, stemMaterial);
}

// Create a 3D leaf
function makeLeaf(length = 1) {
  const geometry = new THREE.BufferGeometry();

  const vertices = [];
  const indices = [];

  const segments = 16;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    const x = t * length;
    const width = Math.sin(Math.PI * t) * 0.22;

    vertices.push(x, width, Math.sin(t * Math.PI) * 0.08);
    vertices.push(x, -width, Math.sin(t * Math.PI) * 0.08);

    if (i < segments) {
      const n = i * 2;
      indices.push(n, n + 1, n + 2);
      indices.push(n + 1, n + 3, n + 2);
    }
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return new THREE.Mesh(geometry, leafMaterial);
}

// Stargazer petal geometry
function makePetalGeometry() {
  const geometry = new THREE.BufferGeometry();

  const vertices = [];
  const colors = [];
  const indices = [];

  const rows = 32;
  const columns = 16;

  const white = new THREE.Color("#fff4ef");
  const pale = new THREE.Color("#f7b5d0");
  const pink = new THREE.Color("#e66b9f");
  const magenta = new THREE.Color("#a92767");
  const speckle = new THREE.Color("#6c1b43");

  for (let i = 0; i <= rows; i++) {
    const u = i / rows;

    for (let j = 0; j <= columns; j++) {
      const v = j / columns * 2 - 1;

      const width =
        Math.pow(Math.sin(Math.PI * u), 0.75) * 0.42;

      const x = v * width;
      const y = u * 1.55;

      // Curved petal surface
      const z =
        Math.sin(Math.PI * u) * (1 - v * v) * 0.15 +
        Math.pow(u, 3) * 0.25;

      vertices.push(x, y, z);

      const edge = Math.abs(v);

      let color;

      if (edge > 0.83) {
        color = white.clone();
      } else if (edge > 0.62) {
        color = pale.clone();
      } else if (u < 0.65 && edge < 0.45) {
        color = magenta.clone();
      } else {
        color = pink.clone();
      }

      // Small dark spots on the petals
      const noise =
        Math.sin(i * 17.13 + j * 37.71) *
        Math.cos(i * 11.29 - j * 13.47);

      if (
        u > 0.2 &&
        u < 0.85 &&
        edge < 0.75 &&
        noise > 0.65
      ) {
        color = speckle.clone();
      }

      colors.push(color.r, color.g, color.b);
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      const a = i * (columns + 1) + j;
      const b = a + columns + 1;

      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3)
  );

  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

const petalGeometry = makePetalGeometry();

const petalMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  roughness: 0.85,
  metalness: 0
});

// Build a lily
function makeLily(position, size, delay, tilt) {
  const group = new THREE.Group();

  group.position.copy(position);
  group.scale.setScalar(size);

  const petals = [];

  for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = i * Math.PI / 3;

    const petal = new THREE.Mesh(
      petalGeometry,
      petalMaterial
    );

    pivot.add(petal);
    group.add(pivot);

    petals.push(pivot);
  }

  // Center of the flower
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xf2d6a0
    })
  );

  group.add(center);

  // Stamens
  const stamens = new THREE.Group();

  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;

    const start = new THREE.Vector3(0, 0, 0.08);
    const end = new THREE.Vector3(
      Math.cos(a) * 0.48,
      Math.sin(a) * 0.48,
      0.5
    );

    const curve = new THREE.LineCurve3(start, end);

    const filament = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 10, 0.012, 5),
      new THREE.MeshStandardMaterial({
        color: 0xe9cf9f
      })
    );

    const anther = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 8, 6),
      pollenMaterial
    );

    anther.position.copy(end);
    anther.scale.set(1.5, 0.7, 0.7);

    stamens.add(filament);
    stamens.add(anther);
  }

  group.add(stamens);

  // Orient flower toward camera
  group.rotation.x = -0.15;
  group.rotation.y = tilt;

  bouquet.add(group);

  flowerObjects.push({
    group,
    petals,
    stamens,
    delay,
    tilt,
    position: position.clone()
  });
}

// Bouquet arrangement
const positions = [
  [-0.1, 5.4, 0.0, 1.00, 0.0],
  [-2.0, 4.5, -0.5, 0.90, -0.4],
  [ 1.9, 4.5, -0.6, 0.95, 0.4],
  [-3.0, 3.2, -1.0, 0.85, -0.5],
  [ 3.0, 3.2, -1.0, 0.85, 0.5],
  [-1.1, 3.3, 0.6, 0.95, -0.2],
  [ 1.0, 3.2, 0.7, 0.95, 0.2],
  [-2.1, 2.1, 0.3, 0.82, -0.3],
  [ 2.0, 2.1, 0.3, 0.82, 0.3]
];

positions.forEach((p, i) => {
  const [x, y, z, size, tilt] = p;

  const position = new THREE.Vector3(x, y, z);

  makeLily(position, size, i * 0.75 + 1.5, tilt);

  const stem = makeStem(
    new THREE.Vector3(0, -2.1, 0),
    position
  );

  bouquet.add(stem);

  // Leaves along stems
  for (let j = 0; j < 2; j++) {
    const leaf = makeLeaf(0.9);

    leaf.position.set(
      x * (0.3 + j * 0.22),
      -2.1 + (y + 2.1) * (0.3 + j * 0.22),
      z * 0.5
    );

    leaf.rotation.z =
      (i + j) % 2 === 0 ? 0.5 : 2.5;

    bouquet.add(leaf);
  }
});

// ASCII rendering
const samplingCanvas = document.createElement("canvas");
const samplingCtx = samplingCanvas.getContext("2d", {
  willReadFrequently: true
});

const characters = "@%#*+=-:.";
const CELL = 5;

function renderASCII() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / (CELL * 1.5));

  samplingCanvas.width = cols;
  samplingCanvas.height = rows;

  samplingCtx.drawImage(
    renderCanvas,
    0, 0,
    cols, rows
  );

  const pixels = samplingCtx.getImageData(
    0, 0, cols, rows
  ).data;

  asciiCanvas.width = width * Math.min(devicePixelRatio, 2);
  asciiCanvas.height = height * Math.min(devicePixelRatio, 2);

  const dpr = Math.min(devicePixelRatio, 2);

  asciiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  asciiCtx.fillStyle = "#000";
  asciiCtx.fillRect(0, 0, width, height);

  asciiCtx.font = `${CELL * 1.7}px monospace`;
  asciiCtx.textAlign = "center";
  asciiCtx.textBaseline = "middle";

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const index = (y * cols + x) * 4;

      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];

      const brightness =
        (r * 0.299 + g * 0.587 + b * 0.114) / 255;

      if (brightness < 0.055) continue;

      const charIndex = Math.min(
        characters.length - 1,
        Math.floor((1 - brightness) * characters.length)
      );

      asciiCtx.fillStyle = `rgb(${r},${g},${b})`;

      asciiCtx.fillText(
        characters[charIndex],
        x * CELL + CELL / 2,
        y * CELL * 1.5 + CELL / 2
      );
    }
  }
}

let startTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const time = (now - startTime) / 1000;

  flowerObjects.forEach((flower, index) => {
    const bloom = ease(
      (time - flower.delay) / 2.8
    );

    // Petals open outward
    flower.petals.forEach((petal, i) => {
      petal.rotation.x =
        -1.25 + bloom * 1.05;

      petal.rotation.y =
        Math.sin(time * 0.6 + i) * 0.035 * bloom;
    });

    flower.stamens.scale.setScalar(
      Math.max(0.001, bloom)
    );

    // Gentle movement
    flower.group.rotation.y =
      flower.tilt +
      Math.sin(time * 0.45 + index) * 0.09;

    flower.group.rotation.z =
      Math.sin(time * 0.55 + index * 0.8) * 0.045;
  });

  bouquet.rotation.y = Math.sin(time * 0.2) * 0.10;
  bouquet.rotation.z = Math.sin(time * 0.35) * 0.025;

  renderer.render(scene, camera);
  renderASCII();

  if (time > 11) {
    message.classList.add("show");
    replay.classList.add("show");
  }
}

replay.addEventListener("click", () => {
  startTime = performance.now();

  message.classList.remove("show");
  replay.classList.remove("show");
});

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
});

requestAnimationFrame(animate);
