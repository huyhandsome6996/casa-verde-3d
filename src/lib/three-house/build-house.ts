import * as THREE from "three";

/**
 * build-house.ts
 * Dựng mô hình nhà vườn hiện đại bằng kỹ thuật "kitbashing" các khối cơ bản —
 * đúng phong cách Scene Blocking / Kitbashing mà ArtCraft sử dụng.
 * Tài nguyên tham chiếu từ dự án ArtCraft (storytold/artcraft).
 */

export interface HouseRefs {
  root: THREE.Group;
  water: THREE.Mesh;
  waterBase: Float32Array;
  /** Vật liệu phát sáng ấm (cửa sổ, phòng) — tăng intensity lúc đêm */
  roomGlowMats: THREE.MeshStandardMaterial[];
  /** Vật liệu bóng đèn */
  bulbMats: THREE.MeshStandardMaterial[];
  lampLight: THREE.PointLight;
  poolLight: THREE.PointLight;
  sconceLight: THREE.PointLight;
  /** Đường viền cạnh dùng cho chế độ bản vẽ */
  blueprintLines: THREE.LineSegments[];
  /** Nhãn kích thước (sprite) chỉ hiện ở chế độ bản vẽ */
  dimSprites: THREE.Sprite[];
  allMeshes: THREE.Mesh[];
}

export function buildHouse(): HouseRefs {
  const root = new THREE.Group();
  const blueprintLines: THREE.LineSegments[] = [];
  const allMeshes: THREE.Mesh[] = [];
  const roomGlowMats: THREE.MeshStandardMaterial[] = [];
  const bulbMats: THREE.MeshStandardMaterial[] = [];

  const edgeMat = new THREE.LineBasicMaterial({ color: 0x33475e });

  /* ------------------------- Vật liệu ------------------------- */
  const M = {
    white: new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.92, metalness: 0.0 }),
    charcoal: new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.82, metalness: 0.05 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xa9713f, roughness: 0.68, metalness: 0.02 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x7c5230, roughness: 0.72 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xc7c4bc, roughness: 0.95 }),
    concreteDark: new THREE.MeshStandardMaterial({ color: 0x8f8d86, roughness: 0.95 }),
    roof: new THREE.MeshStandardMaterial({ color: 0xded9cf, roughness: 0.9 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.3, metalness: 0.85 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.4, metalness: 0.8 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xa8d4e6,
      roughness: 0.06,
      metalness: 0.1,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      envMapIntensity: 1.4,
    }),
    glassTint: new THREE.MeshPhysicalMaterial({
      color: 0x6fa8bd,
      roughness: 0.08,
      metalness: 0.15,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
    grass: new THREE.MeshStandardMaterial({ color: 0x77a35e, roughness: 1.0 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x5d8a4a, roughness: 0.95, flatShading: true }),
    foliage2: new THREE.MeshStandardMaterial({ color: 0x6f9e58, roughness: 0.95, flatShading: true }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }),
    water: new THREE.MeshStandardMaterial({
      color: 0x2fa3a8,
      roughness: 0.12,
      metalness: 0.45,
      transparent: true,
      opacity: 0.9,
      envMapIntensity: 1.4,
    }),
    basin: new THREE.MeshStandardMaterial({ color: 0x176273, roughness: 0.6 }),
    asphalt: new THREE.MeshStandardMaterial({ color: 0x43464b, roughness: 1.0 }),
    sidewalk: new THREE.MeshStandardMaterial({ color: 0xc9c6bf, roughness: 0.98 }),
    carBody: new THREE.MeshStandardMaterial({ color: 0xd4d7db, roughness: 0.35, metalness: 0.6 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xefe6d4, roughness: 0.8 }),
  };

  const roomGlow = new THREE.MeshStandardMaterial({
    color: 0xf3e7cf,
    emissive: 0xffc37e,
    emissiveIntensity: 0,
    roughness: 0.9,
  });
  roomGlowMats.push(roomGlow);

  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d6,
    emissive: 0xffd9a0,
    emissiveIntensity: 0,
  });
  bulbMats.push(bulbMat);

  const sconceMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d6,
    emissive: 0xffb46b,
    emissiveIntensity: 0,
  });
  bulbMats.push(sconceMat);

  /* ------------------------- Helper ------------------------- */
  function addBox(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    opts?: { edges?: boolean; shadow?: boolean }
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = opts?.shadow !== false;
    mesh.receiveShadow = true;
    parent.add(mesh);
    allMeshes.push(mesh);
    if (opts?.edges !== false) {
      const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), edgeMat);
      line.scale.setScalar(1.001);
      line.visible = false;
      mesh.add(line);
      blueprintLines.push(line);
    }
    return mesh;
  }

  function makeLabel(text: string): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 88;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "rgba(238,242,246,0.92)";
      ctx.beginPath();
      ctx.roundRect(6, 6, 308, 76, 14);
      ctx.fill();
      ctx.strokeStyle = "#33475e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(6, 6, 308, 76, 14);
      ctx.stroke();
      ctx.fillStyle = "#1f2937";
      ctx.font = "700 44px Inter, 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 160, 48);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
    );
    sprite.scale.set(2.4, 0.66, 1);
    sprite.visible = false;
    return sprite;
  }

  /* ------------------------- Đất nền & phố ------------------------- */
  const groundGeo = new THREE.PlaneGeometry(34, 26);
  const ground = new THREE.Mesh(groundGeo, M.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);
  allMeshes.push(ground);
  {
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(groundGeo, 28), edgeMat);
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.002;
    line.visible = false;
    ground.add(line);
    blueprintLines.push(line);
  }

  // Vỉa hè + mặt đường phía trước
  addBox(root, 36, 0.06, 1.6, M.sidewalk, 0, 0.03, 9.7, { edges: false });
  addBox(root, 36, 0.05, 3.2, M.asphalt, 0, 0.02, 11.9, { edges: false });

  // Đường lái xe vào garage
  addBox(root, 3.0, 0.07, 7.6, M.concrete, -7.1, 0.035, 8.1, { edges: false });

  // Lối đi từ cửa ra vỉa hè (các tấm đá rời)
  for (let i = 0; i < 6; i++) {
    addBox(root, 1.4, 0.05, 0.72, M.sidewalk, 1.4, 0.028, 3.25 + i * 0.92, { edges: false });
  }

  /* ------------------------- Khối nhà chính (A) ------------------------- */
  // Tầng 2 khối trắng — tâm (-2.2, 3.3, -1.2), 9 x 6.6 x 7
  addBox(root, 9, 6.6, 7, M.white, -2.2, 3.3, -1.2);

  // Mái đôn bằng + ống khói
  addBox(root, 9.7, 0.28, 7.7, M.roof, -2.2, 6.74, -1.2);
  addBox(root, 0.85, 2.0, 0.85, M.concrete, -5.2, 7.6, -2.6);
  addBox(root, 1.0, 0.16, 1.0, M.darkMetal, -5.2, 8.62, -2.6);

  // Khối kính mặt tiền tầng 1 (phòng khách mở rộng)
  addBox(root, 5.6, 3.5, 0.14, M.charcoal, -2.6, 1.78, 2.28, { edges: false });
  addBox(root, 5.3, 3.24, 0.06, M.glass, -2.6, 1.78, 2.36, { edges: false });
  // "Phòng" sáng ấm sau tấm kính
  addBox(root, 5.2, 3.1, 0.05, roomGlow, -2.6, 1.78, 2.2, { edges: false, shadow: false });
  // Cột chia khung kính
  addBox(root, 0.1, 3.5, 0.16, M.charcoal, -4.35, 1.78, 2.3, { edges: false });
  addBox(root, 0.1, 3.5, 0.16, M.charcoal, -2.6, 1.78, 2.3, { edges: false });
  addBox(root, 0.1, 3.5, 0.16, M.charcoal, -0.85, 1.78, 2.3, { edges: false });

  // Dải kính tầng 2
  addBox(root, 6.4, 0.14, 0.18, M.charcoal, -3.4, 4.3, 2.3, { edges: false });
  addBox(root, 6.1, 1.5, 0.06, M.glassTint, -3.4, 5.15, 2.32, { edges: false });

  // Cửa chính + tay nắm
  addBox(root, 1.15, 2.45, 0.14, M.woodDark, 1.4, 1.225, 2.3);
  addBox(root, 0.05, 0.5, 0.06, M.metal, 1.02, 1.25, 2.4, { edges: false });
  // Đèn tường cạnh cửa
  addBox(root, 0.16, 0.34, 0.12, sconceMat, 2.35, 2.1, 2.36, { edges: false, shadow: false });

  // Ướp gỗ dọc phần mặt tiền phải
  for (let i = 0; i < 12; i++) {
    addBox(root, 0.12, 3.5, 0.08, M.wood, 2.2 + i * 0.36, 1.78, 2.4, { edges: false });
  }

  // Lan can kính trên mái khối A
  addBox(root, 6.4, 0.9, 0.05, M.glass, -3.4, 7.33, 2.55, { edges: false });
  addBox(root, 0.06, 0.9, 2.4, M.glass, -6.58, 7.33, 1.4, { edges: false });

  /* ------------------------- Khối phụ (B) ------------------------- */
  // Khối than chì 1 tầng — tâm (4.6, 1.65, 0.6), 5.5 x 3.3 x 5.5
  addBox(root, 5.5, 3.3, 5.5, M.charcoal, 4.6, 1.65, 0.6);
  addBox(root, 6.3, 0.24, 6.3, M.roof, 4.6, 3.42, 0.6);

  // Kính lớn khối B
  addBox(root, 4.2, 0.12, 0.14, M.darkMetal, 4.4, 1.7, 3.42, { edges: false });
  addBox(root, 4.0, 2.1, 0.06, M.glass, 4.4, 1.68, 3.5, { edges: false });
  addBox(root, 3.9, 2.0, 0.05, roomGlow, 4.4, 1.68, 3.34, { edges: false, shadow: false });

  // Khe gỗ ngang trang trí trên khối B
  for (let i = 0; i < 3; i++) {
    addBox(root, 5.5, 0.1, 0.1, M.wood, 4.6, 2.6 + i * 0.28, 3.42, { edges: false });
  }

  // Mái che lối vào + cột thép mảnh
  addBox(root, 3.6, 0.14, 2.1, M.concreteDark, 1.4, 2.95, 3.45);
  addBox(root, 0.09, 2.95, 0.09, M.darkMetal, 0.05, 1.475, 4.35, { edges: false });
  addBox(root, 0.09, 2.95, 0.09, M.darkMetal, 2.75, 1.475, 4.35, { edges: false });

  /* ------------------------- Hồ bơi & sân gỗ ------------------------- */
  addBox(root, 9.6, 0.12, 4.6, M.wood, 7.4, 0.06, 5.2, { edges: true });

  // Khung viền hồ
  addBox(root, 6.7, 0.1, 0.28, M.concrete, 7.4, 0.14, 3.62, { edges: false });
  addBox(root, 6.7, 0.1, 0.28, M.concrete, 7.4, 0.14, 6.78, { edges: false });
  addBox(root, 0.28, 0.1, 3.2, M.concrete, 4.2, 0.14, 5.2, { edges: false });
  addBox(root, 0.28, 0.1, 3.2, M.concrete, 10.6, 0.14, 5.2, { edges: false });
  // Lòng hồ
  addBox(root, 6.1, 0.6, 2.9, M.basin, 7.4, -0.24, 5.2, { edges: false, shadow: false });

  // Mặt nước (hoạt hình gợn sóng)
  const waterGeo = new THREE.PlaneGeometry(6.0, 3.1, 48, 26);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, M.water);
  water.position.set(7.4, 0.13, 5.2);
  water.receiveShadow = true;
  root.add(water);
  allMeshes.push(water);
  const waterBase = Float32Array.from(waterGeo.attributes.position.array);

  // Thang hồ
  addBox(root, 0.05, 0.8, 0.05, M.metal, 10.2, 0.45, 4.7, { edges: false });
  addBox(root, 0.05, 0.8, 0.05, M.metal, 10.2, 0.45, 5.1, { edges: false });
  addBox(root, 0.05, 0.05, 0.44, M.metal, 10.2, 0.75, 4.9, { edges: false });
  addBox(root, 0.05, 0.05, 0.44, M.metal, 10.2, 0.35, 4.9, { edges: false });

  // Ghế tắm nắng
  function lounger(x: number, z: number, rot: number) {
    const g = new THREE.Group();
    g.position.set(x, 0.12, z);
    g.rotation.y = rot;
    addBox(g, 0.62, 0.09, 1.7, M.cream, 0, 0.28, 0, { edges: false });
    addBox(g, 0.62, 0.42, 0.55, M.cream, 0, 0.5, -0.62, { edges: false });
    addBox(g, 0.55, 0.1, 0.1, M.woodDark, 0, 0.1, 0.7, { edges: false });
    addBox(g, 0.55, 0.1, 0.1, M.woodDark, 0, 0.1, -0.5, { edges: false });
    root.add(g);
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        if (!allMeshes.includes(o)) allMeshes.push(o);
      }
    });
  }
  lounger(5.6, 6.95, Math.PI);
  lounger(9.2, 6.95, Math.PI);

  // Cây che (umbrella)
  addBox(root, 0.07, 2.5, 0.07, M.darkMetal, 7.4, 1.25, 7.0, { edges: false });
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.62, 10), M.cream);
  canopy.position.set(7.4, 2.62, 7.0);
  canopy.castShadow = true;
  root.add(canopy);
  allMeshes.push(canopy);

  /* ------------------------- Cây xanh & bụi ------------------------- */
  function tree(x: number, z: number, s: number) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.7, 7), M.trunk);
    trunk.position.y = 0.85;
    trunk.castShadow = true;
    g.add(trunk);
    const f1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), M.foliage);
    f1.position.y = 2.35;
    f1.castShadow = true;
    g.add(f1);
    const f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0), M.foliage2);
    f2.position.set(0.55, 1.85, 0.3);
    f2.castShadow = true;
    g.add(f2);
    root.add(g);
    allMeshes.push(trunk, f1, f2);
  }
  tree(-10.2, 4.6, 1.25);
  tree(-9.6, -3.8, 1.0);
  tree(12.2, -4.2, 1.35);
  tree(13.8, 3.2, 0.85);
  tree(-4.6, 7.6, 0.7);

  function bush(x: number, z: number) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), M.foliage2);
    b.position.set(x, 0.26, z);
    b.scale.y = 0.75;
    b.castShadow = true;
    root.add(b);
    allMeshes.push(b);
  }
  bush(-4.9, 2.75);
  bush(-3.95, 2.75);
  bush(-3.0, 2.75);
  bush(0.15, 2.85);
  bush(3.6, 3.95);
  bush(4.6, 3.95);

  // Chậu cây cạnh đường lái xe
  function planter(x: number, z: number) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.55, 9), M.concreteDark);
    pot.position.set(x, 0.275, z);
    pot.castShadow = true;
    root.add(pot);
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), M.foliage);
    ball.position.set(x, 0.75, z);
    ball.castShadow = true;
    root.add(ball);
    allMeshes.push(pot, ball);
  }
  planter(-5.35, 6.6);
  planter(-5.35, 8.6);
  planter(-8.85, 6.6);
  planter(-8.85, 8.6);

  /* ------------------------- Hàng rào ------------------------- */
  const slatGeo = new THREE.BoxGeometry(0.12, 0.95, 0.05);
  const slatCount = 150;
  const slats = new THREE.InstancedMesh(slatGeo, M.woodDark, slatCount);
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let x = -16.5; x <= 16.5 && idx < slatCount; x += 0.3) {
    dummy.position.set(x, 0.58, -12.4);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    slats.setMatrixAt(idx++, dummy.matrix);
  }
  for (let z = -12.1; z >= -8.6 && idx < slatCount - 1; z -= 0.3) {
    dummy.position.set(-16.5, 0.58, z);
    dummy.rotation.set(0, Math.PI / 2, 0);
    dummy.updateMatrix();
    slats.setMatrixAt(idx++, dummy.matrix);
    dummy.position.set(16.5, 0.58, z);
    dummy.updateMatrix();
    slats.setMatrixAt(idx++, dummy.matrix);
  }
  slats.count = idx;
  slats.castShadow = true;
  slats.receiveShadow = true;
  root.add(slats);
  allMeshes.push(slats);
  addBox(root, 33.4, 0.3, 0.22, M.concreteDark, 0, 0.15, -12.4, { edges: false });

  /* ------------------------- Đèn đường & hòm thư ------------------------- */
  addBox(root, 0.12, 2.7, 0.12, M.darkMetal, 3.4, 1.35, 9.55, { edges: false });
  addBox(root, 0.55, 0.12, 0.3, M.darkMetal, 3.15, 2.72, 9.55, { edges: false });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bulbMat);
  bulb.position.set(2.95, 2.62, 9.55);
  root.add(bulb);
  allMeshes.push(bulb);

  const lampLight = new THREE.PointLight(0xffc878, 0, 9, 1.6);
  lampLight.position.set(2.95, 2.5, 9.55);
  root.add(lampLight);

  const poolLight = new THREE.PointLight(0x35d0c5, 0, 7, 1.4);
  poolLight.position.set(7.4, 0.15, 5.2);
  root.add(poolLight);

  const sconceLight = new THREE.PointLight(0xffb46b, 0, 5, 1.6);
  sconceLight.position.set(2.35, 2.1, 3.0);
  root.add(sconceLight);

  // Hòm thư
  addBox(root, 0.09, 1.0, 0.09, M.woodDark, -5.2, 0.5, 8.75, { edges: false });
  addBox(root, 0.42, 0.3, 0.3, M.charcoal, -5.2, 1.12, 8.75);

  // Xe trong sân
  function car(x: number, z: number, rot: number) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    const body = addBox(g, 3.5, 0.55, 1.7, M.carBody, 0, 0.62, 0, { edges: false });
    addBox(g, 1.95, 0.52, 1.6, M.glassTint, -0.15, 1.15, 0, { edges: false });
    void body;
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 14);
    wheelGeo.rotateX(Math.PI / 2);
    const wheelMat = M.darkMetal;
    const positions: Array<[number, number, number]> = [
      [1.15, 0.32, 0.86],
      [-1.15, 0.32, 0.86],
      [1.15, 0.32, -0.86],
      [-1.15, 0.32, -0.86],
    ];
    for (const [wx, wy, wz] of positions) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(wx, wy, wz);
      w.castShadow = true;
      g.add(w);
      allMeshes.push(w);
    }
    root.add(g);
    g.traverse((o) => {
      if (o instanceof THREE.Mesh && o.geometry instanceof THREE.BoxGeometry) {
        o.castShadow = true;
        if (!allMeshes.includes(o)) allMeshes.push(o);
      }
    });
  }
  car(-7.1, 7.4, 0.06);

  /* ------------------------- Nhãn kích thước ------------------------- */
  const dimSprites: THREE.Sprite[] = [];
  const lblW = makeLabel("14.0 m");
  lblW.position.set(0.6, 0.5, 8.6);
  const lblD = makeLabel("7.0 m");
  lblD.position.set(9.6, 0.5, -1.2);
  const lblH = makeLabel("6.6 m");
  lblH.position.set(-7.8, 3.5, 2.5);
  dimSprites.push(lblW, lblD, lblH);
  for (const s of dimSprites) root.add(s);

  return {
    root,
    water,
    waterBase,
    roomGlowMats,
    bulbMats,
    lampLight,
    poolLight,
    sconceLight,
    blueprintLines,
    dimSprites,
    allMeshes,
  };
}
