/**
 * FESTA SEM NOME — scenes.js
 * Três posters 3D generativos, feitos em shader (three.js).
 * Nenhum modelo externo, nenhuma textura: só geometria + GLSL.
 *
 *   rawmorphic   → massa metálica em morph contínuo (violeta/azul)
 *   analogic     → dois carretéis de fita com grão, varredura e aberração (âmbar)
 *   vinyl        → sulco de vinil girando com reflexo radial (lavanda)
 *
 * Uso:
 *   const poster = new Poster(canvas);
 *   poster.setScene('rawmorphic');
 *   // loop é interno
 */

import * as THREE from 'three';

/* ───────────────────────────────────────────── noise compartilhado */

const NOISE = /* glsl */ `
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}
`;

/* ───────────────────────────────────────────── cena 1 · rawmorphic */

function buildRawmorphic(accent) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 4.0);

  const uniforms = {
    uTime: { value: 0 },
    uA: { value: new THREE.Color('#0a0820') },
    uB: { value: new THREE.Color(accent) },
    uC: { value: new THREE.Color('#e6ddff') }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorld;
      varying float vDisp;
      ${NOISE}
      void main() {
        vec3 p = position;
        vec3 n = normalize(normal);
        float d = fbm(p * 1.45 + vec3(0.0, uTime * 0.18, uTime * 0.1));
        float d2 = fbm(p * 3.1 - vec3(uTime * 0.12));
        float disp = (d - 0.5) * 0.55 + (d2 - 0.5) * 0.16;
        vec3 displaced = p + n * disp;
        vDisp = disp;
        vWorld = (modelMatrix * vec4(displaced, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uA;
      uniform vec3 uB;
      uniform vec3 uC;
      varying vec3 vWorld;
      varying float vDisp;

      void main() {
        vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 L = normalize(vec3(0.55, 0.85, 0.75));
        vec3 H = normalize(L + V);

        float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);
        float diff = clamp(dot(N, L), 0.0, 1.0);
        float spec = pow(clamp(dot(N, H), 0.0, 1.0), 64.0);

        vec3 col = mix(uA, uB, smoothstep(0.0, 1.0, diff * 0.9 + vDisp * 1.6));
        col = mix(col, uC, fres * 0.85);
        col += spec * 1.1;

        // linhas de "leitura" — dá textura de impressão
        float line = smoothstep(0.46, 0.5, fract(vWorld.y * 26.0 + uTime * 0.06));
        col *= 0.88 + line * 0.26;

        // leve vinheta
        col *= 1.0 - 0.25 * smoothstep(0.9, 2.4, length(vWorld.xy));

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const geo = new THREE.IcosahedronGeometry(1.12, 5);
  const blob = new THREE.Mesh(geo, mat);
  scene.add(blob);

  // malha de arame por fora, quase invisível
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.19, 2),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(accent),
      wireframe: true,
      transparent: true,
      opacity: 0.1
    })
  );
  scene.add(wire);

  scene.background = new THREE.Color('#0a0810');

  return {
    scene,
    camera,
    update(t) {
      uniforms.uTime.value = t;
      blob.rotation.y = t * 0.12;
      blob.rotation.x = Math.sin(t * 0.19) * 0.16;
      wire.rotation.y = -t * 0.07;
      wire.rotation.z = t * 0.04;
    }
  };
}

/* ───────────────────────────────────────────── cena 2 · analogic */

function buildAnalogic() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform vec2 uRes;
      varying vec2 vUv;

      float rand(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      // valor de "fita" para um carretel: sulcos + raios girando
      float reel(vec2 uv, vec2 c, float radius, float phase) {
        vec2 d = uv - c;
        float r = length(d);
        float ang = atan(d.y, d.x);

        // sulcos concêntricos
        float grooves = sin(r * 190.0 + phase * 8.0) * 0.5 + 0.5;
        grooves = smoothstep(0.35, 1.0, grooves) * 0.55;

        // três raios girando
        float spokes = sin(ang * 3.0 + phase * 2.2);
        spokes = smoothstep(0.93, 1.0, spokes) * 0.9;

        // aro externo
        float rim = smoothstep(radius, radius - 0.006, r) - smoothstep(radius - 0.018, radius - 0.024, r);

        // miolo
        float hub = smoothstep(radius * 0.16, radius * 0.14, r);

        float v = grooves * 0.5 + spokes * 0.8 + rim * 1.1 + hub * 0.75;
        // fora do disco, nada
        v *= smoothstep(radius + 0.004, radius - 0.004, r);
        return v;
      }

      void main() {
        vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
        float t = uTime;

        vec2 c1 = vec2(-0.30, 0.0);
        vec2 c2 = vec2(0.30, 0.0);

        // aberração cromática: mesma cena, três raios ligeiramente diferentes
        float rL = reel(uv, c1, 0.285, t * 0.55) + reel(uv, c2, 0.285, -t * 0.5);
        float rG = reel(uv * 1.004, c1, 0.285, t * 0.55) + reel(uv * 1.004, c2, 0.285, -t * 0.5);
        float rB = reel(uv * 1.009, c1, 0.285, t * 0.55) + reel(uv * 1.009, c2, 0.285, -t * 0.5);

        vec3 amber = vec3(1.0, 0.46, 0.16);
        vec3 rose  = vec3(1.0, 0.20, 0.42);
        vec3 base  = vec3(0.035, 0.028, 0.045);

        vec3 col = base;
        col += amber * vec3(rL, rG, rB) * 1.05;
        col += rose * pow(rG, 2.0) * 0.45;

        // varredura horizontal
        float scan = sin(vUv.y * 900.0 + t * 6.0) * 0.5 + 0.5;
        col *= 0.94 + scan * 0.06;

        // banda de rolagem lenta (como fita passando)
        float band = smoothstep(0.02, 0.0, abs(fract(t * 0.055) - vUv.y));
        col += vec3(0.09, 0.05, 0.02) * band;

        // grão
        float g = rand(vUv * uRes + t * 60.0);
        col += (g - 0.5) * 0.075;

        // vinheta
        col *= 1.0 - 0.55 * smoothstep(0.35, 1.05, length(uv));

        gl_FragColor = vec4(max(col, 0.0), 1.0);
      }
    `
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  scene.add(quad);
  scene.background = new THREE.Color('#0a0810');

  return {
    scene,
    camera,
    update(t, w, h) {
      uniforms.uTime.value = t;
      uniforms.uRes.value.set(w / h, 1);
    }
  };
}

/* ───────────────────────────────────────────── cena 3 · vinyl */

function buildVinyl() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 1.35, 2.85);
  camera.lookAt(0, 0, 0);

  const uniforms = { uTime: { value: 0 } };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      varying vec3 vWorld;
      void main() {
        vLocal = position;
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vLocal;
      varying vec3 vWorld;

      void main() {
        // o disco é um cilindro achatado: usamos xz como raio
        float r = length(vLocal.xz) / 1.12;
        float ang = atan(vLocal.z, vLocal.x);

        // sulcos finos (micrométricos) + macro-modulação por faixas
        float fine = sin(r * 980.0) * 0.5 + 0.5;
        float macro = sin(r * 34.0) * 0.5 + 0.5;
        // atenua o moiré dos sulcos finos onde eles "batem" com o pixel
        float grooves = mix(fine, 0.5, 0.25) * (0.55 + macro * 0.45);
        grooves = pow(grooves, 2.0) * 0.32 + 0.06;

        // reflexo radial que gira
        float streak = pow(max(0.0, cos(ang - uTime * 0.55)), 26.0);
        float streak2 = pow(max(0.0, cos(ang + uTime * 0.31 + 2.1)), 60.0) * 0.6;

        vec3 deep = vec3(0.045, 0.035, 0.075);
        vec3 lila = vec3(0.72, 0.62, 0.98);
        vec3 blue = vec3(0.24, 0.31, 0.98);

        vec3 col = deep;
        col += lila * grooves * (0.55 + streak * 2.2);
        col += blue * streak2 * 0.55;

        // faixa de entrada/saída (lead-in / lead-out)
        float leadIn = smoothstep(0.965, 0.985, r) * smoothstep(1.0, 0.985, r);
        col = mix(col, vec3(0.30, 0.26, 0.42), leadIn * 0.5);

        // etiqueta central de papel: cor sólida + aro + textura fina
        float labelMask = smoothstep(0.29, 0.283, r);
        float labelRing = smoothstep(0.283, 0.277, r) - smoothstep(0.268, 0.262, r);
        vec3 labelCol = vec3(0.46, 0.38, 0.74);
        float labelTex = (sin(r * 620.0) * 0.5 + 0.5) * 0.06 + 0.94;
        col = mix(col, labelCol * labelTex, labelMask * 0.88);
        col += vec3(0.85, 0.8, 1.0) * labelRing * 0.25;

        // furo do eixo
        float hole = smoothstep(0.048, 0.042, r);
        col = mix(col, vec3(0.015), hole);

        // borda luminosa
        float edge = smoothstep(0.975, 1.0, r) * smoothstep(1.02, 1.0, r);
        col += vec3(0.45, 0.38, 0.9) * edge * 0.7;

        // vinheta
        col *= 1.0 - 0.3 * smoothstep(0.6, 1.15, r);

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.055, 160, 1), mat);
  disc.rotation.x = -Math.PI / 2;
  scene.add(disc);

  // (o braço do toca-discos foi removido: em render ele lia como linha/artefato)

  scene.background = new THREE.Color('#0a0810');

  return {
    scene,
    camera,
    update(t) {
      uniforms.uTime.value = t;
      disc.rotation.y = t * 0.35;
    }
  };
}

/* ───────────────────────────────────────────── cena 4 · poster con profundidad */

/**
 * Poster 2.5D: la imagen generada (ComfyUI) se mueve de verdad.
 * El mapa de profundidad desplaza los vértices → parallax real al mover el
 * mouse, más grano, scanlines, deriva lenta y barrido de luz.
 */
function buildImagePoster(colorUrl, depthUrl, accent) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 2.6);

  const uniforms = {
    uTime: { value: 0 },
    uColor: { value: null },
    uDepth: { value: null },
    uAmp: { value: 0.42 },
    uTint: { value: new THREE.Color(accent) },
    uHasDepth: { value: 0 }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform sampler2D uDepth;
      uniform float uAmp;
      uniform float uHasDepth;
      varying vec2 vUv;
      varying float vD;

      void main() {
        vUv = uv;
        float d = uHasDepth > 0.5 ? texture2D(uDepth, uv).r : 0.5;
        vD = d;
        vec3 p = position;
        // desplazamiento en Z: lo cercano crece, lo lejano se hunde
        p.z += (d - 0.5) * uAmp;
        // y una leve expansión hacia la cámara para reforzar el parallax
        p.xy *= 1.0 + (d - 0.5) * 0.06;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uColor;
      uniform float uTime;
      uniform vec3 uTint;
      varying vec2 vUv;
      varying float vD;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      void main() {
        // deriva lenta: el poster "respira"
        vec2 drift = vec2(sin(uTime * 0.09) * 0.005, cos(uTime * 0.07) * 0.004);
        // aberración cromática proporcional a la profundidad (bajita: sin flecos)
        float ca = 0.0009 + abs(vD - 0.5) * 0.0022;
        // clamp: nunca muestrear fuera de la imagen (evita franjas de color en los bordes)
        vec2 uv = clamp(vUv + drift, vec2(0.003), vec2(0.997));

        float r = texture2D(uColor, clamp(uv + vec2(ca, 0.0), vec2(0.003), vec2(0.997))).r;
        float g = texture2D(uColor, uv).g;
        float b = texture2D(uColor, clamp(uv - vec2(ca, 0.0), vec2(0.003), vec2(0.997))).b;
        vec3 col = vec3(r, g, b);

        // barrido de luz
        float sweep = smoothstep(0.30, 0.0, abs(fract(uTime * 0.06 + 0.2) - uv.y));
        col += uTint * sweep * 0.05;

        // scanlines
        float scan = sin(uv.y * 1100.0) * 0.5 + 0.5;
        col *= 0.96 + scan * 0.04;

        // grano
        float gr = hash(uv * vec2(1920.0, 2400.0) + uTime * 40.0);
        col += (gr - 0.5) * 0.055;

        // viñeta
        vec2 c = vUv - 0.5;
        col *= 1.0 - 0.42 * smoothstep(0.28, 0.86, length(c));

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  // plano del tamaño del frustum para que cubra el marco entero
  const segX = 160, segY = 200;
  const geo = new THREE.PlaneGeometry(1, 1, segX, segY);
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  scene.background = new THREE.Color('#0a0810');

  const loader = new THREE.TextureLoader();
  loader.load(colorUrl, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    uniforms.uColor.value = tex;
  });
  if (depthUrl) {
    loader.load(depthUrl, (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      uniforms.uDepth.value = tex;
      uniforms.uHasDepth.value = 1;
    });
  }

  function fit(w, h) {
    const aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const vw = vh * aspect;
    // un poco más grande que el frustum para que el desplazamiento no deje bordes
    mesh.scale.set(vw * 1.06, vh * 1.06, 1);
  }

  return {
    scene,
    camera,
    isPoster: true,
    update(t, w, h) {
      uniforms.uTime.value = t;
      if (w && h) fit(w, h);
      // micro-oscilación del propio plano
      mesh.rotation.z = Math.sin(t * 0.05) * 0.004;
    }
  };
}

/* ───────────────────────────────────────────── poster */

export class Poster {
  constructor(canvas) {
    this.canvas = canvas;
    this.key = null;
    this.built = {};
    this.time = 0;
    this.clock = new THREE.Clock();
    this.drag = { x: 0, y: 0, active: false, lx: 0, ly: 0 };
    this.parallax = { x: 0, y: 0 };

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x0a0810, 1);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._bindDrag();

    this.raf = requestAnimationFrame(() => this._loop());
  }

  _bindDrag() {
    const c = this.canvas;
    const down = (e) => {
      this.drag.active = true;
      const p = e.touches ? e.touches[0] : e;
      this.drag.lx = p.clientX;
      this.drag.ly = p.clientY;
    };
    const move = (e) => {
      const p = e.touches ? e.touches[0] : e;
      // parallax suave sempre
      const r = c.getBoundingClientRect();
      this.parallax.x = ((p.clientX - r.left) / r.width - 0.5) * 2;
      this.parallax.y = ((p.clientY - r.top) / r.height - 0.5) * 2;
      if (!this.drag.active) return;
      this.drag.y += (p.clientX - this.drag.lx) * 0.006;
      this.drag.x += (p.clientY - this.drag.ly) * 0.004;
      this.drag.x = Math.max(-0.7, Math.min(0.7, this.drag.x));
      this.drag.lx = p.clientX;
      this.drag.ly = p.clientY;
    };
    const up = () => { this.drag.active = false; };

    c.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    c.addEventListener('touchstart', down, { passive: true });
    c.addEventListener('touchmove', move, { passive: true });
    c.addEventListener('touchend', up);
    c.addEventListener('mouseleave', () => { this.drag.active = false; });
  }

  setScene(key, accent = '#7b5cff', poster = null) {
    if (key === this.key) return;
    this.key = key;
    if (!this.built[key]) {
      if (poster && poster.color) this.built[key] = buildImagePoster(poster.color, poster.depth, accent);
      else if (key === 'analogic') this.built[key] = buildAnalogic();
      else if (key === 'vinyl') this.built[key] = buildVinyl();
      else this.built[key] = buildRawmorphic(accent);
      if (!this.current) {
        this.current = this.built[key];
        this.resize();
      }
    }
    this.current = this.built[key];
    this.basePos = null;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(w, h, false);
    if (this.current) {
      const cam = this.current.camera;
      if (cam.isPerspectiveCamera) {
        cam.aspect = w / h;
        cam.updateProjectionMatrix();
      }
    }
    this.size = { w, h };
  }

  _loop() {
    this.raf = requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;

    if (!this.current) return;

    const t = this.time;
    this.current.update(t, this.size?.w || 1, this.size?.h || 1);

    // arrasto + parallax movem a CÂMERA em órbita, não o objeto:
    // assim cada cena continua girando no próprio eixo
    const cam = this.current.camera;
    if (cam && cam.isPerspectiveCamera) {
      if (!this.basePos) this.basePos = cam.position.clone();
      const ang = this.drag.y + this.parallax.x * 0.09;
      const pos = this.basePos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
      pos.y += this.drag.x * 0.9 + this.parallax.y * 0.06;
      cam.position.lerp(pos, 0.12);
      cam.lookAt(0, 0, 0);
    }

    this.renderer.render(this.current.scene, this.current.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
  }
}
