import * as THREE from 'three';
import type { PetModelId } from './petModels';

export type PetAnimationMode = 'idle' | 'action' | 'happy' | 'paused';

export interface PointerNDC {
  x: number;
  y: number;
}

interface RestTransform {
  obj: THREE.Object3D;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/**
 * Stateful procedural animation controller for all 5 Three.js 3D pet models.
 */
export class PetAnimationController {
  private readonly petId: PetModelId;
  private readonly root: THREE.Group;
  private readonly restMap = new Map<string, RestTransform>();
  private readonly baseRootPos: THREE.Vector3;
  private readonly baseRootRot: THREE.Euler;
  private elapsed = 0;
  private happyRemaining = 0;
  private happyElapsed = 0;
  private headYaw = 0;
  private headPitch = 0;

  constructor(petId: PetModelId, root: THREE.Group) {
    this.petId = petId;
    this.root = root;
    this.baseRootPos = root.position.clone();
    this.baseRootRot = root.rotation.clone();

    root.traverse((obj) => {
      if (obj.name) {
        this.restMap.set(obj.name, {
          obj,
          position: obj.position.clone(),
          rotation: obj.rotation.clone(),
          scale: obj.scale.clone(),
        });
      }
    });
  }

  public triggerHappy(durationSeconds = 1.6): void {
    this.happyRemaining = durationSeconds;
    this.happyElapsed = 0;
  }

  public isHappyActive(): boolean {
    return this.happyRemaining > 0;
  }

  public resetToRestPose(): void {
    this.root.position.copy(this.baseRootPos);
    this.root.rotation.copy(this.baseRootRot);
    this.headYaw = 0;
    this.headPitch = 0;
    for (const entry of this.restMap.values()) {
      entry.obj.position.copy(entry.position);
      entry.obj.rotation.copy(entry.rotation);
      entry.obj.scale.copy(entry.scale);
    }
  }

  private getRest(name: string): RestTransform | undefined {
    return this.restMap.get(name);
  }

  public update(
    deltaSeconds: number,
    baseMode: PetAnimationMode,
    pointerNDC?: PointerNDC | null,
  ): void {
    const dt = clamp(deltaSeconds, 0, 0.05);
    if (baseMode === 'paused') {
      return;
    }

    this.elapsed += dt;
    if (this.happyRemaining > 0) {
      this.happyRemaining = Math.max(0, this.happyRemaining - dt);
      this.happyElapsed += dt;
    }

    const effectiveMode: PetAnimationMode =
      this.happyRemaining > 0 ? 'happy' : baseMode;

    const targetYaw = pointerNDC ? clamp(pointerNDC.x * 0.42, -0.42, 0.42) : 0;
    const targetPitch = pointerNDC ? clamp(-pointerNDC.y * 0.26, -0.26, 0.26) : 0;
    this.headYaw = damp(this.headYaw, targetYaw, 7, dt);
    this.headPitch = damp(this.headPitch, targetPitch, 7, dt);

    switch (this.petId) {
      case 'aero-shiba':
        this.animateAeroShiba(effectiveMode);
        break;
      case 'cyber-cat':
        this.animateCyberCat(effectiveMode);
        break;
      case 'spot-rover':
        this.animateSpotRover(effectiveMode, pointerNDC);
        break;
      case 'drone-buddy':
        this.animateDroneBuddy(effectiveMode, dt);
        break;
      case 'sky-owl':
        this.animateSkyOwl(effectiveMode, pointerNDC);
        break;
    }
  }

  private animateAeroShiba(mode: PetAnimationMode): void {
    const t = this.elapsed;
    const body = this.getRest('body');
    const head = this.getRest('head');
    const leftEar = this.getRest('leftEar');
    const rightEar = this.getRest('rightEar');
    const tail = this.getRest('tail');
    const fl = this.getRest('frontLeftLeg');
    const fr = this.getRest('frontRightLeg');
    const bl = this.getRest('backLeftLeg');
    const br = this.getRest('backRightLeg');

    const isAction = mode === 'action';
    const isHappy = mode === 'happy';

    // Reset legs smoothly
    if (fl && fr && bl && br) {
      if (isAction) {
        const stride = Math.sin(t * 9.5) * 0.42;
        fl.obj.rotation.x = fl.rotation.x + stride;
        br.obj.rotation.x = br.rotation.x + stride;
        fr.obj.rotation.x = fr.rotation.x - stride;
        bl.obj.rotation.x = bl.rotation.x - stride;
      } else if (isHappy) {
        const hop = Math.abs(Math.sin(this.happyElapsed * Math.PI * 2.5));
        fl.obj.rotation.x = fl.rotation.x - hop * 0.25;
        fr.obj.rotation.x = fr.rotation.x - hop * 0.25;
        bl.obj.rotation.x = bl.rotation.x + hop * 0.15;
        br.obj.rotation.x = br.rotation.x + hop * 0.15;
      } else {
        fl.obj.rotation.x = fl.rotation.x;
        fr.obj.rotation.x = fr.rotation.x;
        bl.obj.rotation.x = bl.rotation.x;
        br.obj.rotation.x = br.rotation.x;
      }
    }

    const hopOffset = isHappy
      ? Math.abs(Math.sin(this.happyElapsed * Math.PI * 2.5)) * 0.18
      : isAction
        ? Math.abs(Math.sin(t * 9.5)) * 0.045
        : 0;

    this.root.position.y = this.baseRootPos.y + hopOffset;

    if (body) {
      const breath = 1 + Math.sin(t * 2.6) * 0.02;
      body.obj.scale.set(body.scale.x * breath, body.scale.y * breath, body.scale.z);
    }

    if (tail) {
      const wagSpeed = isHappy ? 15 : isAction ? 10 : 5.5;
      const wagAmp = isHappy ? 0.45 : isAction ? 0.34 : 0.22;
      tail.obj.rotation.z = tail.rotation.z + Math.sin(t * wagSpeed) * wagAmp;
      tail.obj.rotation.y = tail.rotation.y + Math.cos(t * wagSpeed) * 0.12;
    }

    if (head) {
      const nod = isAction ? Math.sin(t * 9.5) * 0.06 : Math.sin(t * 2.6) * 0.025;
      const tilt = isHappy
        ? Math.sin(this.happyElapsed * 7) * 0.22
        : Math.sin(t * 1.1) * 0.04;
      head.obj.rotation.y = head.rotation.y + this.headYaw;
      head.obj.rotation.x = head.rotation.x + this.headPitch + nod;
      head.obj.rotation.z = head.rotation.z + tilt;
    }

    // Periodic playful ear twitch
    const twitchWindow = t % 4.2;
    const earTwitch = twitchWindow < 0.28 ? Math.sin((twitchWindow / 0.28) * Math.PI) * 0.18 : 0;
    if (rightEar) {
      rightEar.obj.rotation.z = rightEar.rotation.z - earTwitch;
    }
    if (leftEar) {
      leftEar.obj.rotation.z = leftEar.rotation.z + (isHappy ? Math.sin(t * 10) * 0.12 : 0);
    }
  }

  private animateCyberCat(mode: PetAnimationMode): void {
    const t = this.elapsed;
    const chassis = this.getRest('chassis');
    const head = this.getRest('head');
    const leftEar = this.getRest('leftEar');
    const rightEar = this.getRest('rightEar');
    const tail = this.getRest('tail');
    const fl = this.getRest('frontLeftLeg');
    const fr = this.getRest('frontRightLeg');
    const lEye = this.getRest('leftEyeArc');
    const rEye = this.getRest('rightEyeArc');
    const coreHeart = this.getRest('coreHeart');

    const isAction = mode === 'action';
    const isHappy = mode === 'happy';

    const hop = isHappy ? Math.abs(Math.sin(this.happyElapsed * Math.PI * 2)) * 0.12 : 0;
    this.root.position.y = this.baseRootPos.y + hop;

    if (chassis) {
      const pulse = 1 + Math.sin(t * 2.4) * 0.018;
      chassis.obj.scale.set(chassis.scale.x * pulse, chassis.scale.y, chassis.scale.z * pulse);
      chassis.obj.rotation.x = isAction ? 0.12 : isHappy ? -0.06 : 0;
    }

    if (coreHeart) {
      const heartScale = 1 + Math.sin(t * (isHappy ? 9 : 3.2)) * 0.12;
      coreHeart.obj.scale.setScalar(heartScale);
    }

    // Periodic LED eye blink
    const blinkPhase = t % 3.6;
    const eyeScaleY =
      blinkPhase > 3.42
        ? Math.max(0.12, Math.abs(Math.cos(((blinkPhase - 3.42) / 0.18) * Math.PI)))
        : 1;
    if (lEye && rEye) {
      lEye.obj.scale.y = lEye.scale.y * eyeScaleY;
      rEye.obj.scale.y = rEye.scale.y * eyeScaleY;
    }

    if (head) {
      const felineTilt = isHappy
        ? Math.sin(this.happyElapsed * 8) * 0.2
        : Math.sin(t * 1.4) * 0.08;
      head.obj.rotation.y = head.rotation.y + this.headYaw;
      head.obj.rotation.x = head.rotation.x + this.headPitch + Math.sin(t * 2.4) * 0.03;
      head.obj.rotation.z = head.rotation.z + felineTilt;
    }

    if (leftEar && rightEar) {
      const perk = isAction || isHappy ? Math.sin(t * 8) * 0.1 : Math.sin(t * 1.8) * 0.04;
      leftEar.obj.rotation.z = leftEar.rotation.z + perk;
      rightEar.obj.rotation.z = rightEar.rotation.z - perk;
    }

    if (tail) {
      const swaySpeed = isHappy ? 7.5 : isAction ? 4.8 : 2.2;
      tail.obj.rotation.z = tail.rotation.z + Math.sin(t * swaySpeed) * (isHappy ? 0.36 : 0.22);
      tail.obj.rotation.y = tail.rotation.y + Math.cos(t * swaySpeed * 0.7) * 0.16;
    }

    if (fl && fr) {
      if (isAction) {
        fl.obj.rotation.x = fl.rotation.x - Math.max(0, Math.sin(t * 6)) * 0.35;
        fr.obj.rotation.x = fr.rotation.x - Math.max(0, -Math.sin(t * 6)) * 0.35;
      } else if (isHappy) {
        fl.obj.rotation.x = fl.rotation.x - 0.25;
        fr.obj.rotation.x = fr.rotation.x - 0.25;
      } else {
        fl.obj.rotation.x = fl.rotation.x;
        fr.obj.rotation.x = fr.rotation.x;
      }
    }
  }

  private animateSpotRover(
    mode: PetAnimationMode,
    pointerNDC?: PointerNDC | null,
  ): void {
    const t = this.elapsed;
    const torso = this.getRest('torso');
    const lidar = this.getRest('lidarDome');
    const antenna = this.getRest('antenna');
    const head = this.getRest('headModule');
    const fl = this.getRest('frontLeftLeg');
    const fr = this.getRest('frontRightLeg');
    const bl = this.getRest('backLeftLeg');
    const br = this.getRest('backRightLeg');

    const isAction = mode === 'action';
    const isHappy = mode === 'happy';

    // Continuous 360° LiDAR turret rotation
    if (lidar) {
      lidar.obj.rotation.y = lidar.rotation.y + t * (isHappy ? 7 : 3.2);
    }

    if (antenna) {
      antenna.obj.rotation.z = antenna.rotation.z + Math.sin(t * 7.5) * 0.05;
      antenna.obj.rotation.x = antenna.rotation.x + Math.cos(t * 6.2) * 0.04;
    }

    if (torso) {
      const crouchOffset = isHappy
        ? -Math.sin(Math.min(1, this.happyElapsed / 1.6) * Math.PI) * 0.16
        : Math.sin(t * 2.5) * 0.015;
      torso.obj.position.y = torso.position.y + crouchOffset;
      torso.obj.rotation.x = isAction ? Math.sin(t * 8.5) * 0.04 : 0;
    }

    if (head) {
      const scanYaw = pointerNDC
        ? this.headYaw
        : Math.sin(t * (isHappy ? 4.5 : 1.3)) * 0.28;
      const scanPitch = pointerNDC
        ? this.headPitch
        : isHappy
          ? Math.sin(this.happyElapsed * 8) * 0.14
          : 0;
      head.obj.rotation.y = head.rotation.y + scanYaw;
      head.obj.rotation.x = head.rotation.x + scanPitch;
    }

    if (fl && fr && bl && br) {
      if (isAction) {
        const gait = Math.sin(t * 8.5) * 0.32;
        fl.obj.rotation.x = fl.rotation.x + gait;
        br.obj.rotation.x = br.rotation.x + gait;
        fr.obj.rotation.x = fr.rotation.x - gait;
        bl.obj.rotation.x = bl.rotation.x - gait;
      } else if (isHappy) {
        const splay = Math.sin(Math.min(1, this.happyElapsed / 1.6) * Math.PI) * 0.18;
        fl.obj.rotation.z = fl.rotation.z - splay;
        fr.obj.rotation.z = fr.rotation.z + splay;
        bl.obj.rotation.z = bl.rotation.z - splay;
        br.obj.rotation.z = br.rotation.z + splay;
      } else {
        fl.obj.rotation.set(fl.rotation.x, fl.rotation.y, fl.rotation.z);
        fr.obj.rotation.set(fr.rotation.x, fr.rotation.y, fr.rotation.z);
        bl.obj.rotation.set(bl.rotation.x, bl.rotation.y, bl.rotation.z);
        br.obj.rotation.set(br.rotation.x, br.rotation.y, br.rotation.z);
      }
    }
  }

  private animateDroneBuddy(mode: PetAnimationMode, _dt: number): void {
    const t = this.elapsed;
    const core = this.getRest('core');
    const rotor = this.getRest('topRotor');
    const leftWing = this.getRest('leftWing');
    const rightWing = this.getRest('rightWing');
    const halo = this.getRest('haloRing');

    const isAction = mode === 'action';
    const isHappy = mode === 'happy';

    if (rotor) {
      rotor.obj.rotation.y = rotor.rotation.y + t * (isHappy ? 22 : isAction ? 17 : 13);
    }

    if (core) {
      const hoverY = Math.sin(t * 2.3) * 0.085;
      const patrolX = isAction ? Math.sin(t * 1.4) * 0.18 : 0;
      const patrolZ = isAction ? Math.sin(t * 2.8) * 0.09 : 0;
      const happyLift = isHappy ? Math.sin(Math.min(1, this.happyElapsed / 1.6) * Math.PI) * 0.24 : 0;
      const happySpin = isHappy
        ? Math.min(1, this.happyElapsed / 1.2) * Math.PI * 2
        : 0;

      core.obj.position.set(
        core.position.x + patrolX,
        core.position.y + hoverY + happyLift,
        core.position.z + patrolZ,
      );
      core.obj.rotation.y = core.rotation.y + this.headYaw + happySpin;
      core.obj.rotation.x = core.rotation.x + this.headPitch + (isAction ? 0.08 : 0);
      core.obj.rotation.z =
        core.rotation.z + (isAction ? -Math.cos(t * 1.4) * 0.16 : Math.sin(t * 1.6) * 0.04);
    }

    if (leftWing && rightWing) {
      const flap = isHappy
        ? Math.sin(this.happyElapsed * 14) * 0.24
        : Math.sin(t * 2.3) * 0.07;
      leftWing.obj.rotation.z = leftWing.rotation.z + flap;
      rightWing.obj.rotation.z = rightWing.rotation.z - flap;
    }

    if (halo) {
      const padPulse = 1 + Math.sin(t * 2.3) * 0.03;
      halo.obj.scale.set(padPulse, halo.scale.y, padPulse);
    }
  }

  private animateSkyOwl(
    mode: PetAnimationMode,
    pointerNDC?: PointerNDC | null,
  ): void {
    const t = this.elapsed;
    const body = this.getRest('body');
    const head = this.getRest('head');
    const leftWing = this.getRest('leftWing');
    const rightWing = this.getRest('rightWing');
    const tailFan = this.getRest('tailFan');

    const isAction = mode === 'action';
    const isHappy = mode === 'happy';

    const lift = isAction
      ? Math.max(0, Math.sin(t * 7)) * 0.12
      : isHappy
        ? Math.abs(Math.sin(this.happyElapsed * Math.PI * 2)) * 0.14
        : 0;
    this.root.position.y = this.baseRootPos.y + lift;

    if (body) {
      const breath = 1 + Math.sin(t * 2.2) * 0.02;
      body.obj.scale.set(body.scale.x * breath, body.scale.y, body.scale.z * breath);
    }

    if (head) {
      // Characteristic owl stepped head glances when cursor tracking isn't overriding
      const glanceStep = Math.floor(t / 2.6) % 3;
      const autoYaw = glanceStep === 0 ? 0 : glanceStep === 1 ? 0.34 : -0.32;
      const curYaw = pointerNDC ? this.headYaw : damp(head.obj.rotation.y, autoYaw, 6, 0.016);
      const tilt = isHappy
        ? Math.sin(this.happyElapsed * 9) * 0.26
        : glanceStep === 1
          ? 0.11
          : glanceStep === 2
            ? -0.11
            : 0;
      head.obj.rotation.y = pointerNDC ? head.rotation.y + curYaw : curYaw;
      head.obj.rotation.x = head.rotation.x + this.headPitch;
      head.obj.rotation.z = head.rotation.z + tilt;
    }

    if (leftWing && rightWing) {
      const flapAngle = isAction
        ? 0.42 + Math.sin(t * 7) * 0.38
        : isHappy
          ? 0.35 + Math.sin(this.happyElapsed * 14) * 0.3
          : Math.sin(t * 2.2) * 0.025;
      leftWing.obj.rotation.z = leftWing.rotation.z - flapAngle;
      rightWing.obj.rotation.z = rightWing.rotation.z + flapAngle;
    }

    if (tailFan) {
      const fanSway = isAction || isHappy ? Math.sin(t * 7) * 0.15 : Math.sin(t * 1.8) * 0.04;
      tailFan.obj.rotation.x = tailFan.rotation.x + fanSway;
    }
  }
}
