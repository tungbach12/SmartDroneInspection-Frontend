import * as THREE from 'three';

export type PetModelId =
  | 'aero-shiba'
  | 'cyber-cat'
  | 'spot-rover'
  | 'drone-buddy'
  | 'sky-owl';

export interface PetModelSpec {
  id: PetModelId;
  num: string;
  name: string;
  category: 'Animal' | 'Hybrid Robot' | 'Robot' | 'Drone Mascot';
  subtitle: string;
  description: string;
  accentColor: string;
  parts: readonly string[];
  build: () => THREE.Group;
}

function enableShadows(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

function makeMat(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial(params);
}

function makePhysicalMat(
  params: THREE.MeshPhysicalMaterialParameters,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial(params);
}

/**
 * 01 — Aero Shiba (Animal)
 * Warm stylized Shiba Inu / Corgi companion with inspection collar & tag.
 */
export function buildAeroShibaModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'pet-aero-shiba';

  const furPrimary = makeMat({ color: '#D97706', roughness: 0.72, metalness: 0.04 });
  const furLight = makeMat({ color: '#FEF3C7', roughness: 0.78, metalness: 0.02 });
  const furInnerEar = makeMat({ color: '#FCA5A5', roughness: 0.8, metalness: 0.02 });
  const noseMat = makeMat({ color: '#18181B', roughness: 0.25, metalness: 0.1 });
  const eyeMat = makePhysicalMat({
    color: '#09090B',
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  const catchlightMat = makeMat({
    color: '#FFFFFF',
    emissive: '#FFFFFF',
    emissiveIntensity: 0.7,
    roughness: 0.2,
  });
  const collarMat = makeMat({ color: '#087E8B', roughness: 0.45, metalness: 0.15 });
  const tagMat = makeMat({
    color: '#38BDF8',
    emissive: '#0284C7',
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.7,
  });

  // Torso / Body
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'body';
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.68, 16, 28), furPrimary);
  torso.rotation.x = Math.PI / 2;
  torso.position.set(0, 0.72, 0);
  torso.scale.set(1.02, 1.0, 0.96);
  bodyGroup.add(torso);

  // Cream belly & chest fluff
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.39, 24, 24), furLight);
  chest.position.set(0, 0.74, 0.36);
  chest.scale.set(0.92, 0.96, 0.72);
  bodyGroup.add(chest);

  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.56, 12, 20), furLight);
  belly.rotation.x = Math.PI / 2;
  belly.position.set(0, 0.52, 0.02);
  bodyGroup.add(belly);

  // Collar + inspection tag
  const collarGroup = new THREE.Group();
  collarGroup.name = 'collar';
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.055, 14, 32), collarMat);
  collar.rotation.x = Math.PI / 2 - 0.35;
  collar.position.set(0, 0.96, 0.38);
  collarGroup.add(collar);

  const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 18), tagMat);
  tag.rotation.x = Math.PI / 2;
  tag.position.set(0, 0.78, 0.72);
  collarGroup.add(tag);
  bodyGroup.add(collarGroup);

  root.add(bodyGroup);

  // Head
  const headGroup = new THREE.Group();
  headGroup.name = 'head';
  headGroup.position.set(0, 1.24, 0.52);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.43, 28, 28), furPrimary);
  cranium.scale.set(1.06, 0.96, 1.02);
  headGroup.add(cranium);

  // Cheek fluff
  [-1, 1].forEach((side) => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 20), furLight);
    cheek.position.set(side * 0.24, -0.1, 0.14);
    cheek.scale.set(1.1, 0.88, 0.95);
    headGroup.add(cheek);
  });

  // Snout
  const muzzle = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.14, 12, 20), furLight);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, -0.1, 0.42);
  muzzle.scale.set(1.18, 1, 0.85);
  headGroup.add(muzzle);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), noseMat);
  nose.position.set(0, -0.04, 0.57);
  nose.scale.set(1.15, 0.82, 0.85);
  headGroup.add(nose);

  // Eyes + Eyebrow cream dots
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 18, 18), eyeMat);
    eye.position.set(side * 0.18, 0.06, 0.37);
    headGroup.add(eye);

    const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 10), catchlightMat);
    catchlight.position.set(side * 0.18 + 0.02, 0.085, 0.425);
    headGroup.add(catchlight);

    const browDot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), furLight);
    browDot.position.set(side * 0.16, 0.19, 0.35);
    browDot.scale.set(1.1, 0.75, 0.6);
    headGroup.add(browDot);
  });

  // Pointed Ears
  [-1, 1].forEach((side) => {
    const earGroup = new THREE.Group();
    earGroup.name = side < 0 ? 'leftEar' : 'rightEar';
    earGroup.position.set(side * 0.27, 0.34, -0.02);
    earGroup.rotation.z = -side * 0.28;
    earGroup.rotation.x = 0.14;

    const outerEar = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 16), furPrimary);
    outerEar.position.y = 0.14;
    outerEar.scale.set(1, 1, 0.65);
    earGroup.add(outerEar);

    const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.24, 14), furInnerEar);
    innerEar.position.set(0, 0.11, 0.045);
    innerEar.scale.set(1, 1, 0.5);
    earGroup.add(innerEar);

    headGroup.add(earGroup);
  });

  root.add(headGroup);

  // 4 Legs with cream socks
  const legSpecs: Array<{ name: string; x: number; z: number }> = [
    { name: 'frontLeftLeg', x: -0.22, z: 0.34 },
    { name: 'frontRightLeg', x: 0.22, z: 0.34 },
    { name: 'backLeftLeg', x: -0.23, z: -0.34 },
    { name: 'backRightLeg', x: 0.23, z: -0.34 },
  ];

  for (const spec of legSpecs) {
    const legGroup = new THREE.Group();
    legGroup.name = spec.name;
    legGroup.position.set(spec.x, 0.56, spec.z);

    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 12, 16), furPrimary);
    upper.position.y = -0.2;
    legGroup.add(upper);

    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), furLight);
    paw.position.set(0, -0.46, 0.04);
    paw.scale.set(1, 0.68, 1.25);
    legGroup.add(paw);

    root.add(legGroup);
  }

  // Curled Shiba Tail
  const tailGroup = new THREE.Group();
  tailGroup.name = 'tail';
  tailGroup.position.set(0, 0.92, -0.52);

  const tailCurve = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.1, 14, 24, Math.PI * 1.35),
    furPrimary,
  );
  tailCurve.rotation.y = Math.PI / 2;
  tailCurve.rotation.z = -0.35;
  tailCurve.position.set(0, 0.16, -0.05);
  tailGroup.add(tailCurve);

  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 16), furLight);
  tailTip.position.set(0, 0.35, 0.08);
  tailGroup.add(tailTip);

  root.add(tailGroup);
  enableShadows(root);
  return root;
}

/**
 * 02 — Cyber Cat (Hybrid Robot Animal)
 * Sleek ceramic-white & obsidian visor kitty with glowing cyan optics & segmented tail.
 */
export function buildCyberCatModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'pet-cyber-cat';

  const shellWhite = makePhysicalMat({
    color: '#F8FAFC',
    roughness: 0.22,
    metalness: 0.12,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });
  const innerCarbon = makeMat({ color: '#1E293B', roughness: 0.45, metalness: 0.65 });
  const visorMat = makePhysicalMat({
    color: '#09090B',
    roughness: 0.06,
    metalness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
  });
  const cyanGlow = makeMat({
    color: '#38BDF8',
    emissive: '#0EA5E9',
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  const accentBlue = makeMat({ color: '#3758F9', roughness: 0.32, metalness: 0.45 });

  // Seated sleek chassis
  const chassis = new THREE.Group();
  chassis.name = 'chassis';

  const bodyCore = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.52, 16, 28), shellWhite);
  bodyCore.position.set(0, 0.56, -0.04);
  bodyCore.rotation.x = -0.22;
  chassis.add(bodyCore);

  const chestPanel = new THREE.Mesh(new THREE.SphereGeometry(0.28, 22, 22), innerCarbon);
  chestPanel.position.set(0, 0.66, 0.16);
  chestPanel.scale.set(0.95, 1.05, 0.65);
  chassis.add(chestPanel);

  const coreHeart = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 12, 24), cyanGlow);
  coreHeart.name = 'coreHeart';
  coreHeart.position.set(0, 0.68, 0.34);
  chassis.add(coreHeart);

  const neckRing = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.12, 24), innerCarbon);
  neckRing.position.set(0, 0.96, 0.06);
  chassis.add(neckRing);

  root.add(chassis);

  // Head + Visor
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 1.32, 0.12);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 28), shellWhite);
  helmet.scale.set(1.14, 0.94, 1.02);
  head.add(helmet);

  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.38, 26, 26), visorMat);
  visor.position.set(0, -0.02, 0.12);
  visor.scale.set(1.06, 0.78, 0.85);
  head.add(visor);

  // Expressive LED cyber eyes + cheek whiskers
  [-1, 1].forEach((side) => {
    const eyeArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.072, 0.022, 10, 20, Math.PI * 0.95),
      cyanGlow,
    );
    eyeArc.name = side < 0 ? 'leftEyeArc' : 'rightEyeArc';
    eyeArc.position.set(side * 0.15, 0.02, 0.43);
    eyeArc.rotation.z = 0.08;
    head.add(eyeArc);

    const whisker = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.018, 0.018), cyanGlow);
    whisker.position.set(side * 0.28, -0.09, 0.36);
    whisker.rotation.z = side * 0.15;
    head.add(whisker);

    // Cat Ears
    const earGroup = new THREE.Group();
    earGroup.name = side < 0 ? 'leftEar' : 'rightEar';
    earGroup.position.set(side * 0.28, 0.32, -0.02);
    earGroup.rotation.z = -side * 0.34;

    const earShell = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.32, 4), shellWhite);
    earShell.rotation.y = Math.PI / 4;
    earShell.position.y = 0.12;
    earGroup.add(earShell);

    const earGlow = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 4), cyanGlow);
    earGlow.rotation.y = Math.PI / 4;
    earGlow.position.set(0, 0.1, 0.05);
    earGroup.add(earGlow);

    head.add(earGroup);
  });

  // Small blue chin/nose LED dot
  const noseDot = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.04, 3), accentBlue);
  noseDot.rotation.x = Math.PI;
  noseDot.position.set(0, -0.06, 0.45);
  head.add(noseDot);

  root.add(head);

  // Front legs + Rear folded haunches
  [-1, 1].forEach((side) => {
    const frontLeg = new THREE.Group();
    frontLeg.name = side < 0 ? 'frontLeftLeg' : 'frontRightLeg';
    frontLeg.position.set(side * 0.18, 0.46, 0.22);

    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.34, 12, 16), shellWhite);
    limb.position.y = -0.22;
    frontLeg.add(limb);

    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 16), innerCarbon);
    paw.position.set(0, -0.4, 0.03);
    paw.scale.set(1.05, 0.6, 1.25);
    frontLeg.add(paw);

    root.add(frontLeg);

    const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 18), shellWhite);
    haunch.position.set(side * 0.26, 0.25, -0.14);
    haunch.scale.set(0.85, 1.1, 1.25);
    root.add(haunch);

    const backFoot = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.16, 10, 14), innerCarbon);
    backFoot.rotation.x = Math.PI / 2;
    backFoot.position.set(side * 0.26, 0.08, 0.02);
    root.add(backFoot);
  });

  // Segmented articulated robotic tail
  const tailGroup = new THREE.Group();
  tailGroup.name = 'tail';
  tailGroup.position.set(0, 0.22, -0.34);

  const segments = [
    { y: 0.08, z: -0.14, rx: 0.55 },
    { y: 0.22, z: -0.28, rx: 0.2 },
    { y: 0.4, z: -0.34, rx: -0.15 },
    { y: 0.58, z: -0.31, rx: -0.35 },
  ];
  segments.forEach((seg, idx) => {
    const joint = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.055 - idx * 0.004, 0.14, 10, 14),
      idx % 2 === 0 ? innerCarbon : shellWhite,
    );
    joint.position.set(0, seg.y, seg.z);
    joint.rotation.x = seg.rx;
    tailGroup.add(joint);
  });

  const tailTipOrb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), cyanGlow);
  tailTipOrb.name = 'tailTipOrb';
  tailTipOrb.position.set(0, 0.72, -0.25);
  tailGroup.add(tailTipOrb);

  root.add(tailGroup);
  enableShadows(root);
  return root;
}

/**
 * 03 — Spot Rover (Quadruped Inspection Robot)
 * Industrial safety-amber & graphite quadruped robot with LiDAR turret.
 */
export function buildSpotRoverModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'pet-spot-rover';

  const armorAmber = makeMat({ color: '#F59E0B', roughness: 0.35, metalness: 0.35 });
  const chassisDark = makeMat({ color: '#1F2937', roughness: 0.5, metalness: 0.65 });
  const steelMat = makeMat({ color: '#CBD5E1', roughness: 0.25, metalness: 0.85 });
  const opticGlow = makeMat({
    color: '#22D3EE',
    emissive: '#0891B2',
    emissiveIntensity: 1.2,
    roughness: 0.15,
  });

  // Main Torso
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'torso';
  torsoGroup.position.set(0, 0.78, 0);

  const mainFrame = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.26, 1.08), chassisDark);
  torsoGroup.add(mainFrame);

  const topShell = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.96), armorAmber);
  topShell.position.y = 0.14;
  torsoGroup.add(topShell);

  // Side armored rails
  [-1, 1].forEach((side) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 1.02), armorAmber);
    rail.position.set(side * 0.29, 0.02, 0);
    torsoGroup.add(rail);
  });

  // Top LiDAR sensor puck + antenna
  const lidarGroup = new THREE.Group();
  lidarGroup.name = 'lidarDome';
  lidarGroup.position.set(0, 0.28, -0.14);

  const lidarBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 24), chassisDark);
  lidarGroup.add(lidarBase);
  const lidarRing = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 24), opticGlow);
  lidarRing.position.y = 0.06;
  lidarGroup.add(lidarRing);
  const lidarCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.03, 24), steelMat);
  lidarCap.position.y = 0.095;
  lidarGroup.add(lidarCap);
  torsoGroup.add(lidarGroup);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.34, 10), steelMat);
  antenna.name = 'antenna';
  antenna.position.set(-0.18, 0.36, -0.4);
  torsoGroup.add(antenna);

  // Front stereo depth-camera head bar
  const headModule = new THREE.Group();
  headModule.name = 'headModule';
  headModule.position.set(0, 0.04, 0.6);

  const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.16), chassisDark);
  headModule.add(headBox);

  [-0.1, 0.1].forEach((lx) => {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 18), opticGlow);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(lx, 0, 0.08);
    headModule.add(lens);
  });

  const centerSensor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), armorAmber);
  centerSensor.position.set(0, 0, 0.08);
  headModule.add(centerSensor);
  torsoGroup.add(headModule);

  root.add(torsoGroup);

  // 4 Articulated Robotic Legs
  const roverLegs: Array<{ name: string; x: number; z: number }> = [
    { name: 'frontLeftLeg', x: -0.34, z: 0.38 },
    { name: 'frontRightLeg', x: 0.34, z: 0.38 },
    { name: 'backLeftLeg', x: -0.34, z: -0.38 },
    { name: 'backRightLeg', x: 0.34, z: -0.38 },
  ];

  for (const legSpec of roverLegs) {
    const legGroup = new THREE.Group();
    legGroup.name = legSpec.name;
    legGroup.position.set(legSpec.x, 0.74, legSpec.z);

    const hip = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 18), steelMat);
    hip.rotation.z = Math.PI / 2;
    legGroup.add(hip);

    const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.38, 0.11), armorAmber);
    upperLeg.position.set(0, -0.17, -0.05);
    upperLeg.rotation.x = -0.28;
    legGroup.add(upperLeg);

    const knee = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.11, 16), steelMat);
    knee.rotation.z = Math.PI / 2;
    knee.position.set(0, -0.35, -0.1);
    legGroup.add(knee);

    const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.4, 14), chassisDark);
    lowerLeg.position.set(0, -0.53, -0.02);
    lowerLeg.rotation.x = 0.36;
    legGroup.add(lowerLeg);

    const footPad = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 14), steelMat);
    footPad.position.set(0, -0.7, 0.05);
    legGroup.add(footPad);

    root.add(legGroup);
  }

  enableShadows(root);
  return root;
}

/**
 * 04 — Drone Buddy (Cute Kawaii Chibi Sky-Drone Companion)
 * Pastel periwinkle-lavender & sky-blue floating buddy with honey-cream & mint accents,
 * sparkling OLED face, rosy pink cheeks & chibi wing-rotors.
 */
export function buildDroneBuddyModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'pet-drone-buddy';

  const pastelLavender = makePhysicalMat({
    color: '#A5B4FC',
    roughness: 0.24,
    metalness: 0.14,
    clearcoat: 0.88,
    clearcoatRoughness: 0.1,
  });
  const pastelSky = makePhysicalMat({
    color: '#60A5FA',
    roughness: 0.26,
    metalness: 0.16,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });
  const pastelMint = makePhysicalMat({
    color: '#5EEAD4',
    roughness: 0.26,
    metalness: 0.12,
    clearcoat: 0.82,
  });
  const pastelButter = makePhysicalMat({
    color: '#FDE68A',
    roughness: 0.26,
    metalness: 0.18,
    clearcoat: 0.78,
  });
  const visorGlass = makePhysicalMat({
    color: '#0F172A',
    roughness: 0.06,
    metalness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
  });
  const eyeAqua = makeMat({
    color: '#67E8F9',
    emissive: '#38BDF8',
    emissiveIntensity: 1.5,
    roughness: 0.12,
  });
  const sparkleGlow = makeMat({
    color: '#FEF9C3',
    emissive: '#FEF08A',
    emissiveIntensity: 1.75,
    roughness: 0.1,
  });
  const blushPink = makeMat({
    color: '#FDA4AF',
    emissive: '#FB7185',
    emissiveIntensity: 0.9,
    roughness: 0.24,
  });
  const ledMint = makeMat({
    color: '#99F6E4',
    emissive: '#2DD4BF',
    emissiveIntensity: 1.3,
    roughness: 0.16,
  });

  // Floating chubby capsule core
  const coreGroup = new THREE.Group();
  coreGroup.name = 'core';
  coreGroup.position.set(0, 0.98, 0);

  // Chubby sky-blue lower belly
  const lowerHull = new THREE.Mesh(new THREE.SphereGeometry(0.44, 32, 24), pastelSky);
  lowerHull.scale.set(1.12, 0.88, 1.02);
  lowerHull.position.y = -0.05;
  coreGroup.add(lowerHull);

  // Pastel periwinkle-lavender top helmet dome
  const upperFairing = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.56),
    pastelLavender,
  );
  upperFairing.scale.set(1.12, 0.86, 1.03);
  upperFairing.position.y = 0.02;
  coreGroup.add(upperFairing);

  // Soft pastel mint trim collar ring
  const equatorBand = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.024, 12, 40), pastelMint);
  equatorBand.rotation.x = Math.PI / 2;
  equatorBand.scale.set(1.09, 1.01, 1);
  equatorBand.position.y = 0.01;
  coreGroup.add(equatorBand);

  // Cute round buttercream mini bubble backpack on the back
  const backpack = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 22, 20),
    pastelMint,
  );
  backpack.position.set(0, -0.01, -0.36);
  backpack.scale.set(1.15, 0.92, 0.7);
  coreGroup.add(backpack);

  const backpackCharm = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 16), blushPink);
  backpackCharm.position.set(0, 0.02, -0.5);
  backpackCharm.scale.set(1.2, 0.9, 0.5);
  coreGroup.add(backpackCharm);

  // Smooth rounded dark-indigo OLED face visor
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.425, 32, 26), visorGlass);
  visor.position.set(0, 0.03, 0.165);
  visor.scale.set(0.95, 0.65, 0.82);
  coreGroup.add(visor);

  // Big sparkling kawaii eyes + rosy blush cheeks + cute smile arc
  [-1, 1].forEach((side) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.145, 0.05, 0.495);
    eyeGroup.rotation.y = side * 0.2;

    const irisDisc = new THREE.Mesh(new THREE.SphereGeometry(0.068, 18, 18), eyeAqua);
    irisDisc.scale.set(0.95, 1.18, 0.4);
    eyeGroup.add(irisDisc);

    // Big bright kawaii catchlight dot + tiny sparkle dot
    const catchlightMain = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 12), sparkleGlow);
    catchlightMain.position.set(0.018, 0.028, 0.025);
    catchlightMain.scale.set(1, 1, 0.45);
    eyeGroup.add(catchlightMain);

    const catchlightMini = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 10), sparkleGlow);
    catchlightMini.position.set(-0.02, -0.022, 0.025);
    catchlightMini.scale.set(1, 1, 0.45);
    eyeGroup.add(catchlightMini);

    coreGroup.add(eyeGroup);

    // Rosy coral-pink blush oval under each eye
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.044, 14, 12), blushPink);
    blush.position.set(side * 0.215, -0.045, 0.465);
    blush.rotation.y = side * 0.34;
    blush.scale.set(1.25, 0.68, 0.35);
    coreGroup.add(blush);

    // Cute Chibi Pastel Ear-Wing Ducted Thruster Pods
    const wingGroup = new THREE.Group();
    wingGroup.name = side < 0 ? 'leftWing' : 'rightWing';
    wingGroup.position.set(side * 0.51, 0.04, -0.02);

    const stubbyArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.1, 10, 14), pastelLavender);
    stubbyArm.rotation.z = Math.PI / 2;
    stubbyArm.position.x = side * 0.04;
    wingGroup.add(stubbyArm);

    const ductGroup = new THREE.Group();
    ductGroup.position.set(side * 0.21, 0.04, 0);
    ductGroup.rotation.z = -side * 0.14;

    const ductShroud = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.038, 16, 28), pastelSky);
    ductShroud.rotation.x = Math.PI / 2;
    ductGroup.add(ductShroud);

    const ductLedRim = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.012, 10, 28), ledMint);
    ductLedRim.rotation.x = Math.PI / 2;
    ductLedRim.position.y = -0.016;
    ductGroup.add(ductLedRim);

    const motorCap = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 14), pastelButter);
    ductGroup.add(motorCap);

    const microProp = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.2, 8, 12), pastelMint);
    microProp.name = side < 0 ? 'leftRotorBlade' : 'rightRotorBlade';
    microProp.rotation.z = Math.PI / 2;
    microProp.position.y = 0.02;
    ductGroup.add(microProp);

    wingGroup.add(ductGroup);
    coreGroup.add(wingGroup);
  });

  // Cute tiny happy smile pixel arc in the middle
  const smileArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.048, 0.011, 8, 18, Math.PI * 0.8),
    eyeAqua,
  );
  smileArc.position.set(0, -0.035, 0.505);
  smileArc.rotation.z = Math.PI * 1.1;
  coreGroup.add(smileArc);

  // Cute little underbelly buttercream & mint gem charm
  const gimbalGroup = new THREE.Group();
  gimbalGroup.name = 'gimbalCamera';
  gimbalGroup.position.set(0, -0.4, 0.12);

  const charmCollar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 10, 20), pastelButter);
  charmCollar.rotation.x = Math.PI / 2;
  gimbalGroup.add(charmCollar);

  const charmOrb = new THREE.Mesh(new THREE.SphereGeometry(0.068, 18, 18), pastelMint);
  charmOrb.position.y = -0.045;
  gimbalGroup.add(charmOrb);

  coreGroup.add(gimbalGroup);

  // Cute Beanie Crown Rotor + Pastel Halo Ring
  const rotorGroup = new THREE.Group();
  rotorGroup.name = 'topRotor';
  rotorGroup.position.set(0, 0.42, 0);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.055, 0.1, 16), pastelButter);
  rotorGroup.add(mast);

  const beanieCap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 16), pastelLavender);
  beanieCap.position.y = 0.085;
  beanieCap.scale.set(1, 0.8, 1);
  rotorGroup.add(beanieCap);

  const bladeA = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.54, 8, 14), pastelButter);
  bladeA.rotation.z = Math.PI / 2;
  bladeA.position.y = 0.075;
  bladeA.rotation.y = 0.35;
  rotorGroup.add(bladeA);

  const bladeB = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.54, 8, 14), pastelMint);
  bladeB.rotation.z = Math.PI / 2;
  bladeB.position.y = 0.075;
  bladeB.rotation.y = Math.PI / 2 + 0.35;
  rotorGroup.add(bladeB);

  const crownHalo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.013, 12, 36), ledMint);
  crownHalo.rotation.x = Math.PI / 2;
  crownHalo.position.y = 0.075;
  rotorGroup.add(crownHalo);

  coreGroup.add(rotorGroup);
  root.add(coreGroup);

  // Soft pastel floating levitation ring below
  const padGroup = new THREE.Group();
  padGroup.name = 'haloRing';
  const repulsorOuter = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.014, 10, 32), pastelLavender);
  repulsorOuter.rotation.x = Math.PI / 2;
  repulsorOuter.position.y = 0.12;
  padGroup.add(repulsorOuter);
  const repulsorCore = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.011, 10, 28), ledMint);
  repulsorCore.rotation.x = Math.PI / 2;
  repulsorCore.position.y = 0.14;
  padGroup.add(repulsorCore);
  root.add(padGroup);

  enableShadows(root);
  return root;
}

/**
 * 05 — Sky Owl (Animal + Aviator Goggles)
 * Stylized Snowy / Barn Owl with layered plumage, golden eyes & brass aviator goggles.
 */
export function buildSkyOwlModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'pet-sky-owl';

  const plumageSlate = makeMat({ color: '#475569', roughness: 0.78, metalness: 0.05 });
  const plumageCream = makeMat({ color: '#F8FAFC', roughness: 0.82, metalness: 0.02 });
  const beakGold = makeMat({ color: '#D97706', roughness: 0.4, metalness: 0.25 });
  const brassMat = makeMat({ color: '#B45309', roughness: 0.3, metalness: 0.75 });
  const goggleLens = makePhysicalMat({
    color: '#0EA5E9',
    emissive: '#0284C7',
    emissiveIntensity: 0.35,
    roughness: 0.08,
    metalness: 0.2,
    clearcoat: 1,
  });
  const eyeAmber = makePhysicalMat({
    color: '#F59E0B',
    emissive: '#B45309',
    emissiveIntensity: 0.25,
    roughness: 0.1,
    clearcoat: 1,
  });
  const pupilMat = makeMat({ color: '#09090B', roughness: 0.1 });

  // Plump Owl Body
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'body';
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.54, 18, 28), plumageSlate);
  torso.position.set(0, 0.74, 0);
  torso.scale.set(1.04, 1, 0.94);
  bodyGroup.add(torso);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 24), plumageCream);
  belly.position.set(0, 0.68, 0.19);
  belly.scale.set(0.92, 1.15, 0.72);
  bodyGroup.add(belly);
  root.add(bodyGroup);

  // Folded Wings
  [-1, 1].forEach((side) => {
    const wingGroup = new THREE.Group();
    wingGroup.name = side < 0 ? 'leftWing' : 'rightWing';
    wingGroup.position.set(side * 0.42, 0.76, -0.02);
    wingGroup.rotation.z = side * 0.14;

    const wingMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.44, 14, 20), plumageSlate);
    wingMesh.scale.set(0.58, 1.08, 1.15);
    wingGroup.add(wingMesh);

    const wingAccent = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 10, 14), plumageCream);
    wingAccent.position.set(side * 0.04, -0.06, 0.06);
    wingAccent.scale.set(0.45, 0.9, 0.85);
    wingGroup.add(wingAccent);

    root.add(wingGroup);
  });

  // Tail Fan
  const tailFan = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.36, 6), plumageSlate);
  tailFan.name = 'tailFan';
  tailFan.position.set(0, 0.42, -0.4);
  tailFan.rotation.x = 0.82;
  tailFan.scale.set(1.2, 1, 0.3);
  root.add(tailFan);

  // Owl Head + Facial Disc + Aviator Goggles
  const headGroup = new THREE.Group();
  headGroup.name = 'head';
  headGroup.position.set(0, 1.32, 0.06);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.4, 28, 28), plumageSlate);
  cranium.scale.set(1.12, 0.92, 0.98);
  headGroup.add(cranium);

  // Ear tufts
  [-1, 1].forEach((side) => {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 12), plumageSlate);
    tuft.position.set(side * 0.28, 0.3, -0.02);
    tuft.rotation.z = -side * 0.45;
    headGroup.add(tuft);

    // Cream facial disc circles
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 22), plumageCream);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(side * 0.15, -0.01, 0.32);
    headGroup.add(disc);

    // Golden Eyes
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 18), eyeAmber);
    iris.position.set(side * 0.15, 0, 0.35);
    iris.scale.set(1, 1, 0.65);
    headGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.048, 14, 14), pupilMat);
    pupil.position.set(side * 0.15, 0, 0.39);
    headGroup.add(pupil);
  });

  // Curved Beak
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.16, 12), beakGold);
  beak.rotation.x = Math.PI / 2 + 0.35;
  beak.position.set(0, -0.08, 0.42);
  headGroup.add(beak);

  // Brass Aviator Goggles perched on forehead
  const gogglesGroup = new THREE.Group();
  gogglesGroup.name = 'goggles';
  gogglesGroup.position.set(0, 0.22, 0.3);
  gogglesGroup.rotation.x = -0.35;

  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.024, 10, 32), brassMat);
  strap.rotation.x = Math.PI / 2;
  strap.position.set(0, -0.04, -0.28);
  gogglesGroup.add(strap);

  [-1, 1].forEach((side) => {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.025, 12, 24), brassMat);
    rim.position.set(side * 0.16, 0, 0.04);
    gogglesGroup.add(rim);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 20), goggleLens);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(side * 0.16, 0, 0.04);
    gogglesGroup.add(lens);
  });

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.03), brassMat);
  bridge.position.set(0, 0, 0.05);
  gogglesGroup.add(bridge);
  headGroup.add(gogglesGroup);

  root.add(headGroup);

  // Perched Talons
  [-1, 1].forEach((side) => {
    const footGroup = new THREE.Group();
    footGroup.name = side < 0 ? 'leftTalon' : 'rightTalon';
    footGroup.position.set(side * 0.18, 0.14, 0.08);

    const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.16, 12), beakGold);
    footGroup.add(ankle);

    [-0.045, 0, 0.045].forEach((tx) => {
      const toe = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.11, 8, 10), beakGold);
      toe.rotation.x = Math.PI / 2;
      toe.position.set(tx, -0.09, 0.06);
      footGroup.add(toe);
    });

    root.add(footGroup);
  });

  enableShadows(root);
  return root;
}

export const PET_MODEL_CATALOG: readonly PetModelSpec[] = [
  {
    id: 'aero-shiba',
    num: '01',
    name: 'Aero Shiba',
    category: 'Animal',
    subtitle: 'Chú chó Shiba Inu đeo vòng cổ kiểm định',
    description: 'Thân thiện, dễ nhận diện; có khớp đầu, tai, 4 chân và đuôi tách rời sẵn sàng cho animation.',
    accentColor: '#D97706',
    parts: ['body', 'head', 'leftEar', 'rightEar', 'collar', 'tail', '4 legs'],
    build: buildAeroShibaModel,
  },
  {
    id: 'cyber-cat',
    num: '02',
    name: 'Cyber Kitty',
    category: 'Hybrid Robot',
    subtitle: 'Mèo robot mặt kính OLED & đuôi đốt phát sáng',
    description: 'Kết hợp dáng mèo ngồi dễ thương với vật liệu gốm trắng + kính đen + mắt LED cyan.',
    accentColor: '#0EA5E9',
    parts: ['chassis', 'head', 'visor', 'leftEar', 'rightEar', 'tail', 'legs'],
    build: buildCyberCatModel,
  },
  {
    id: 'spot-rover',
    num: '03',
    name: 'Spot Rover',
    category: 'Robot',
    subtitle: 'Chó robot tuần tra công nghiệp gắn LiDAR',
    description: 'Phong cách kỹ thuật công nghiệp (Boston Dynamics Spot) với khớp gối kim loại & camera stereo.',
    accentColor: '#F59E0B',
    parts: ['torso', 'headModule', 'lidarDome', 'antenna', '4 articulated legs'],
    build: buildSpotRoverModel,
  },
  {
    id: 'drone-buddy',
    num: '04',
    name: 'Drone Buddy',
    category: 'Drone Mascot',
    subtitle: 'Robot cầu bay linh vật SmartDrone',
    description: 'Linh vật gắn trực tiếp với thương hiệu SmartDroneInspection: thân cầu Indigo, cánh ổn định & rotor đỉnh.',
    accentColor: '#3758F9',
    parts: ['core', 'visor', 'leftWing', 'rightWing', 'topRotor', 'haloRing'],
    build: buildDroneBuddyModel,
  },
  {
    id: 'sky-owl',
    num: '05',
    name: 'Sky Owl',
    category: 'Animal',
    subtitle: 'Cú mèo trinh sát đội kính phi công',
    description: 'Tạo hình chim cú bay kiểm định với mắt hổ phách, cánh xếp lớp và kính phi công đồng.',
    accentColor: '#4F46E5',
    parts: ['body', 'head', 'goggles', 'leftWing', 'rightWing', 'tailFan', 'talons'],
    build: buildSkyOwlModel,
  },
] as const;

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
}
