import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildHouse, type HouseRefs } from "./build-house";

/**
 * house-scene.ts — Engine cảnh 3D cho bản thiết kế nhà.
 * Sử dụng skybox cubemap (ngày / đêm / u ám) lấy trực tiếp từ tài nguyên dự án
 * ArtCraft (frontend/apps/artcraft/app/public/resources/skybox).
 */

export type SkyMode = "day" | "night" | "gray";
export type CameraPreset = "overview" | "front" | "pool" | "aerial" | "entrance";

interface SkyConfig {
  path: string;
  files: [string, string, string, string, string, string]; // px nx py ny pz nz
  sunPos: THREE.Vector3;
  sunIntensity: number;
  sunColor: number;
  hemiIntensity: number;
  exposure: number;
  envIntensity: number;
  roomGlow: number;
  lamp: number;
  pool: number;
  sconce: number;
}

const SKY: Record<SkyMode, SkyConfig> = {
  day: {
    path: "/artcraft/skybox/day/",
    files: ["px.webp", "nx.webp", "py.webp", "ny.webp", "pz.webp", "nz.webp"],
    sunPos: new THREE.Vector3(14, 20, 9),
    sunIntensity: 2.7,
    sunColor: 0xfff1dc,
    hemiIntensity: 0.85,
    exposure: 1.05,
    envIntensity: 1.0,
    roomGlow: 0.0,
    lamp: 0,
    pool: 0,
    sconce: 0,
  },
  night: {
    path: "/artcraft/skybox/night/",
    files: [
      "Night_Moon_Burst_Cam_3_Right-X.webp",
      "Night_Moon_Burst_Cam_2_LeftX.webp",
      "Night_Moon_Burst_Cam_4_UpY.webp",
      "Night_Moon_Burst_Cam_5_Down-Y.webp",
      "Night_Moon_Burst_Cam_0_FrontZ.webp",
      "Night_Moon_Burst_Cam_1_Back-Z.webp",
    ],
    sunPos: new THREE.Vector3(-12, 16, -8),
    sunIntensity: 0.55,
    sunColor: 0x9db8e8,
    hemiIntensity: 0.3,
    exposure: 0.95,
    envIntensity: 0.3,
    roomGlow: 1.5,
    lamp: 2.4,
    pool: 2.2,
    sconce: 1.6,
  },
  gray: {
    path: "/artcraft/skybox/gray/",
    files: [
      "Sky_AllSky_Overcast4_Low_Cam_3_Right-X.webp",
      "Sky_AllSky_Overcast4_Low_Cam_2_LeftX.webp",
      "Sky_AllSky_Overcast4_Low_Cam_4_UpY.webp",
      "Sky_AllSky_Overcast4_Low_Cam_5_Down-Y.webp",
      "Sky_AllSky_Overcast4_Low_Cam_0_FrontZ.webp",
      "Sky_AllSky_Overcast4_Low_Cam_1_Back-Z.webp",
    ],
    sunPos: new THREE.Vector3(8, 19, 6),
    sunIntensity: 1.15,
    sunColor: 0xe8edf2,
    hemiIntensity: 0.95,
    exposure: 1.0,
    envIntensity: 0.65,
    roomGlow: 0.12,
    lamp: 0.2,
    pool: 0.15,
    sconce: 0.15,
  },
};

const PRESETS: Record<CameraPreset, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  overview: { pos: new THREE.Vector3(17, 10, 18), target: new THREE.Vector3(0.3, 2.4, 0.6) },
  front: { pos: new THREE.Vector3(2.5, 3.4, 17), target: new THREE.Vector3(0.2, 2.6, 0) },
  pool: { pos: new THREE.Vector3(13.5, 3.8, 12.5), target: new THREE.Vector3(6, 1.1, 4.6) },
  aerial: { pos: new THREE.Vector3(1.5, 24, 12), target: new THREE.Vector3(0.8, 0, 0.4) },
  entrance: { pos: new THREE.Vector3(3.2, 1.9, 8.6), target: new THREE.Vector3(1.2, 1.9, 2.4) },
};

interface LightTargets {
  sunIntensity: number;
  hemiIntensity: number;
  exposure: number;
  envIntensity: number;
  roomGlow: number;
  lamp: number;
  pool: number;
  sconce: number;
  sunPos: THREE.Vector3;
  sunColor: THREE.Color;
}

export class HouseScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private refs: HouseRefs;
  private grid: THREE.GridHelper;

  private skyTextures = new Map<SkyMode, THREE.CubeTexture>();
  private envTextures = new Map<SkyMode, THREE.Texture>();
  private pmrem: THREE.PMREMGenerator;
  private activeSky: SkyMode = "day";

  private cur: LightTargets;
  private tgt: LightTargets;

  private blueprint = false;
  private blueprintMat = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.95 });
  private camTween: { fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTgt: THREE.Vector3; toTgt: THREE.Vector3; t: number } | null = null;

  private clock = new THREE.Clock();
  private container: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;
  private disposed = false;

  private fpsFrames = 0;
  private fpsTime = 0;
  private qualityLevel = 0; // 0 = full, 1 = trung bình, 2 = nhẹ
  private renderInterval = 0; // ms tối thiểu giữa 2 lần render (0 = mỗi khung hình)
  private lastRenderAt = 0;
  private lite = false;
  private staticMode = false;
  private rotateIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    container: HTMLElement,
    onReady?: () => void,
    options?: { lite?: boolean; static?: boolean }
  ) {
    this.container = container;
    this.lite = options?.lite === true;
    this.staticMode = options?.static === true;

    const softwareGPU = HouseScene.probeSoftwareGPU();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !softwareGPU && !this.lite && !this.staticMode,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    if (softwareGPU || this.lite || this.staticMode) {
      this.qualityLevel = 2;
      this.renderer.setPixelRatio(0.58);
      this.renderer.shadowMap.enabled = false;
      this.renderInterval = 0;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
    }
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      45,
      Math.max(container.clientWidth / Math.max(container.clientHeight, 1), 0.1),
      0.1,
      220
    );
    this.camera.position.copy(PRESETS.overview.pos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(PRESETS.overview.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 52;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.autoRotate = !this.staticMode && !this.lite;
    this.controls.autoRotateSpeed = 0.55;

    this.hemi = new THREE.HemisphereLight(0xbcd8ff, 0x8a9a6a, 0.85);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff1dc, 2.7);
    this.sun.position.copy(SKY.day.sunPos);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -22;
    this.sun.shadow.camera.right = 22;
    this.sun.shadow.camera.top = 22;
    this.sun.shadow.camera.bottom = -22;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 70;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    const dayCfg = SKY.day;
    this.cur = {
      sunIntensity: dayCfg.sunIntensity,
      hemiIntensity: dayCfg.hemiIntensity,
      exposure: dayCfg.exposure,
      envIntensity: dayCfg.envIntensity,
      roomGlow: 0,
      lamp: 0,
      pool: 0,
      sconce: 0,
      sunPos: dayCfg.sunPos.clone(),
      sunColor: new THREE.Color(dayCfg.sunColor),
    };
    this.tgt = {
      sunIntensity: dayCfg.sunIntensity,
      hemiIntensity: dayCfg.hemiIntensity,
      exposure: dayCfg.exposure,
      envIntensity: dayCfg.envIntensity,
      roomGlow: 0,
      lamp: 0,
      pool: 0,
      sconce: 0,
      sunPos: dayCfg.sunPos.clone(),
      sunColor: new THREE.Color(dayCfg.sunColor),
    };

    this.refs = buildHouse();
    this.scene.add(this.refs.root);

    this.grid = new THREE.GridHelper(40, 40, 0x9fb2c4, 0xc4cfd8);
    this.grid.position.y = 0.01;
    this.grid.visible = false;
    this.scene.add(this.grid);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    this.resizeObserver = new ResizeObserver(() => {
      this.onResize();
      if (this.staticMode || this.lite) this.renderOnce();
    });
    this.resizeObserver.observe(container);

    void this.loadSkies().then(() => {
      if (this.disposed) return;
      this.applySky("day", true);
      if (this.staticMode || this.lite) {
        // Chế độ tiết kiệm: chỉ render theo yêu cầu — hợp trình duyệt headless / máy yếu
        this.controls.addEventListener("change", this.onControlsChange);
        this.renderOnce();
      } else {
        this.renderer.setAnimationLoop(() => this.tick());
      }
      onReady?.();
    });
  }

  private onControlsChange = (): void => {
    // Chỉ dùng cho chế độ render-on-demand (lite/static).
    // KHÔNG được gọi controls.update() ở đây — sẽ tạo vòng lặp đệ quy
    // change → update → change… gây tràn ngăn xếp.
    if ((!this.staticMode && !this.lite) || this.disposed) return;
    this.renderer.render(this.scene, this.camera);
  };

  private renderOnce(): void {
    if (this.disposed) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private static probeSoftwareGPU(): boolean {
    try {
      const probe = document.createElement("canvas");
      const gl = (probe.getContext("webgl2") ||
        probe.getContext("webgl")) as WebGLRenderingContext | null;
      if (!gl) return true;
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
    } catch {
      return true;
    }
  }

  private async loadSkies(): Promise<void> {
    // Chế độ tiết kiệm (lite/static): chỉ cần skybox ban ngày, bỏ PMREM
    // để tránh biên dịch shader cực nặng trên GPU phần mềm
    const loader0 = new THREE.CubeTextureLoader().setPath(SKY.day.path);
    const dayTex = await loader0.loadAsync(SKY.day.files);
    dayTex.colorSpace = THREE.SRGBColorSpace;
    this.skyTextures.set("day", dayTex);
    if (!this.staticMode && !this.lite) {
      this.envTextures.set("day", this.pmrem.fromCubemap(dayTex).texture);
    }

    if (this.staticMode) return;

    // Tải 2 skybox còn lại song song ở phía sau để vào cảnh nhanh hơn
    const modes: SkyMode[] = ["night", "gray"];
    void Promise.all(
      modes.map(async (mode) => {
        await this.loadSingleSky(mode);
      })
    );
  }

  private async loadSingleSky(mode: SkyMode): Promise<void> {
    const cfg = SKY[mode];
    const loader = new THREE.CubeTextureLoader().setPath(cfg.path);
    const tex = await loader.loadAsync(cfg.files);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.skyTextures.set(mode, tex);
    if (!this.staticMode && !this.lite) {
      this.envTextures.set(mode, this.pmrem.fromCubemap(tex).texture);
    }
  }

  /* ------------------------------ API public ------------------------------ */

  setSkyMode(mode: SkyMode): void {
    if (mode === this.activeSky || this.blueprint) return;
    if (this.lite || this.staticMode) {
      // Tải lười skybox nếu chưa có, sau đó áp dụng và render lại
      if (!this.skyTextures.has(mode)) {
        void this.loadSingleSky(mode).then(() => {
          if (this.disposed) return;
          this.applySky(mode, true);
          this.renderOnce();
        });
        return;
      }
      this.applySky(mode, true);
      this.renderOnce();
      return;
    }
    this.applySky(mode, false);
  }

  setCameraPreset(preset: CameraPreset): void {
    const p = PRESETS[preset];
    if (this.staticMode) {
      this.camera.position.copy(p.pos);
      this.controls.target.copy(p.target);
      this.renderOnce();
      return;
    }
    this.camTween = {
      fromPos: this.camera.position.clone(),
      toPos: p.pos.clone(),
      fromTgt: this.controls.target.clone(),
      toTgt: p.target.clone(),
      t: 0,
    };
  }

  setAutoRotate(on: boolean): void {
    this.controls.autoRotate = on;
    if (this.lite || this.staticMode) {
      // Không có vòng lặp render — tự dựng một vòng kinh tế khi người dùng bật xoay
      if (on && this.rotateIntervalId === null) {
        this.rotateIntervalId = setInterval(() => {
          if (this.disposed) return;
          this.controls.update();
          this.renderer.render(this.scene, this.camera);
        }, 240);
      } else if (!on && this.rotateIntervalId !== null) {
        clearInterval(this.rotateIntervalId);
        this.rotateIntervalId = null;
      }
    }
  }

  setBlueprint(on: boolean): void {
    if (on === this.blueprint) return;
    this.blueprint = on;

    for (const mesh of this.refs.allMeshes) {
      if (on) {
        if (!mesh.userData.origMat) mesh.userData.origMat = mesh.material;
        mesh.material = this.blueprintMat;
        mesh.castShadow = false;
      } else {
        if (mesh.userData.origMat) mesh.material = mesh.userData.origMat;
        mesh.castShadow = true;
      }
    }
    for (const line of this.refs.blueprintLines) line.visible = on;
    for (const s of this.refs.dimSprites) s.visible = on;
    this.grid.visible = on;
    this.sun.castShadow = !on;

    if (on) {
      this.scene.background = null;
      this.scene.environment = null;
      this.renderer.setClearColor(0xe9edf2, 1);
      this.tgt.envIntensity = 0;
      this.tgt.roomGlow = 0;
      this.tgt.lamp = 0;
      this.tgt.pool = 0;
      this.tgt.sconce = 0;
      this.tgt.sunIntensity = 1.6;
      this.tgt.hemiIntensity = 1.1;
      this.tgt.sunPos.set(10, 18, 8);
      this.tgt.sunColor.set(0xffffff);
      this.tgt.exposure = 1.0;
    } else {
      this.renderer.setClearColor(0x000000, 0);
      this.applySky(this.activeSky, false);
    }
    if (this.staticMode || this.lite) {
      // Không có vòng lặp nội suy — áp dụng ánh sáng mục tiêu ngay lập tức
      this.snapLightsToTargets();
      this.renderOnce();
    }
  }

  exportPNG(): string {
    this.renderOnce();
    return this.renderer.domElement.toDataURL("image/png");
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    if (this.rotateIntervalId !== null) {
      clearInterval(this.rotateIntervalId);
      this.rotateIntervalId = null;
    }
    this.controls.removeEventListener("change", this.onControlsChange);
    this.resizeObserver?.disconnect();
    this.controls.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m.dispose();
      }
    });
    for (const t of this.skyTextures.values()) t.dispose();
    for (const t of this.envTextures.values()) t.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  /* ------------------------------ Nội bộ ------------------------------ */

  private applySky(mode: SkyMode, immediate: boolean): void {
    this.activeSky = mode;
    const cfg = SKY[mode];
    const cube = this.skyTextures.get(mode);
    const env = this.envTextures.get(mode);
    if (cube) this.scene.background = cube;
    this.scene.environment = env ?? null;

    this.tgt.sunIntensity = cfg.sunIntensity;
    this.tgt.hemiIntensity = cfg.hemiIntensity;
    this.tgt.exposure = cfg.exposure;
    this.tgt.envIntensity = cfg.envIntensity;
    this.tgt.roomGlow = cfg.roomGlow;
    this.tgt.lamp = cfg.lamp;
    this.tgt.pool = cfg.pool;
    this.tgt.sconce = cfg.sconce;
    this.tgt.sunPos.copy(cfg.sunPos);
    this.tgt.sunColor.set(cfg.sunColor);

    if (immediate) {
      this.snapLightsToTargets();
    }
  }

  private snapLightsToTargets(): void {
    this.cur.sunIntensity = this.tgt.sunIntensity;
    this.cur.hemiIntensity = this.tgt.hemiIntensity;
    this.cur.exposure = this.tgt.exposure;
    this.cur.envIntensity = this.tgt.envIntensity;
    this.cur.roomGlow = this.tgt.roomGlow;
    this.cur.lamp = this.tgt.lamp;
    this.cur.pool = this.tgt.pool;
    this.cur.sconce = this.tgt.sconce;
    this.cur.sunPos.copy(this.tgt.sunPos);
    this.cur.sunColor.copy(this.tgt.sunColor);
    this.pushLights();
  }

  private pushLights(): void {
    this.sun.intensity = this.cur.sunIntensity;
    this.sun.position.copy(this.cur.sunPos);
    this.sun.color.copy(this.cur.sunColor);
    this.hemi.intensity = this.cur.hemiIntensity;
    this.renderer.toneMappingExposure = this.cur.exposure;
    this.scene.environmentIntensity = this.cur.envIntensity;
    for (const m of this.refs.roomGlowMats) m.emissiveIntensity = this.cur.roomGlow;
    for (const m of this.refs.bulbMats) m.emissiveIntensity = Math.max(this.cur.lamp, this.cur.sconce) * 0.5;
    this.refs.bulbMats[0].emissiveIntensity = this.cur.lamp;
    this.refs.bulbMats[1].emissiveIntensity = this.cur.sconce;
    this.refs.lampLight.intensity = this.cur.lamp;
    this.refs.poolLight.intensity = this.cur.pool;
    this.refs.sconceLight.intensity = this.cur.sconce;
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /**
   * Giảm dần chất lượng render khi FPS thấp (máy yếu / GPU phần mềm)
   * để luôn giữ trải nghiệm mượt cho người xem.
   */
  private adaptQuality(dt: number): void {
    if (this.qualityLevel >= 2) return;
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsFrames < 20) return;
    const fps = this.fpsFrames / this.fpsTime;
    this.fpsFrames = 0;
    this.fpsTime = 0;
    if (fps >= 24) return;

    this.qualityLevel++;
    if (this.qualityLevel === 1) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      this.sun.castShadow = false;
    } else {
      this.renderer.setPixelRatio(0.66);
      this.renderer.shadowMap.enabled = false;
      this.renderInterval = 70;
      this.scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m.needsUpdate = true;
        }
      });
    }
  }

  private tick(): void {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.elapsedTime;
    const k = 1 - Math.pow(0.0022, dt); // smoothing theo thời gian thực

    this.adaptQuality(dt);

    // Nội suy ánh sáng mượt mà giữa các chế độ trời
    this.cur.sunIntensity += (this.tgt.sunIntensity - this.cur.sunIntensity) * k;
    this.cur.hemiIntensity += (this.tgt.hemiIntensity - this.cur.hemiIntensity) * k;
    this.cur.exposure += (this.tgt.exposure - this.cur.exposure) * k;
    this.cur.envIntensity += (this.tgt.envIntensity - this.cur.envIntensity) * k;
    this.cur.roomGlow += (this.tgt.roomGlow - this.cur.roomGlow) * k;
    this.cur.lamp += (this.tgt.lamp - this.cur.lamp) * k;
    this.cur.pool += (this.tgt.pool - this.cur.pool) * k;
    this.cur.sconce += (this.tgt.sconce - this.cur.sconce) * k;
    this.cur.sunPos.lerp(this.tgt.sunPos, k);
    this.cur.sunColor.lerp(this.tgt.sunColor, k);
    this.pushLights();

    // Gợn sóng mặt hồ
    const pos = this.refs.water.geometry.attributes.position;
    const base = this.refs.waterBase;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      pos.setY(i, 0.035 * Math.sin(t * 1.9 + x * 2.3) + 0.025 * Math.cos(t * 1.4 + z * 3.1));
    }
    pos.needsUpdate = true;

    // Tween camera
    if (this.camTween) {
      this.camTween.t = Math.min(this.camTween.t + dt / 1.1, 1);
      const e = 1 - Math.pow(1 - this.camTween.t, 3);
      this.camera.position.lerpVectors(this.camTween.fromPos, this.camTween.toPos, e);
      this.controls.target.lerpVectors(this.camTween.fromTgt, this.camTween.toTgt, e);
      if (this.camTween.t >= 1) this.camTween = null;
    }

    this.controls.update();

    // Giới hạn tần suất render trên thiết bị yếu / GPU phần mềm
    const now = performance.now();
    if (this.renderInterval > 0 && now - this.lastRenderAt < this.renderInterval) return;
    this.lastRenderAt = now;

    this.renderer.render(this.scene, this.camera);
  }
}
