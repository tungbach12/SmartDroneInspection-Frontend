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
 * Stateful, phase-continuous procedural animation controller for all 5 Three.js 3D pet models.
 * Integrates phase accumulators incrementally and smoothly damps mode blends so switching between
 * idle, action, happy, and paused never pops or snaps.
 */
export class PetAnimationController {
  private readonly petId: PetModelId;
  private readonly root: THREE.Group;
  private readonly restMap = new Map<string, RestTransform>();
  private readonly baseRootPos: THREE.Vector3;
  private readonly baseRootRot: THREE.Euler;

  private elapsed = 0;
  private happyRemaining = 0;
  private happyDuration = 1.6;
  private happyElapsed = 0;
  private headYaw = 0;
  private headPitch = 0;

  // Smooth transition weights & continuous phase accumulators (prevents pops on mode switch)
  private actionBlend = 0;
  private happyBlend = 0;
  private tailPhase = 0;
  private gaitPhase = 0;
  private rotorAngle = 0;
  private bladeAngle = 0;
  private patrolPhase = 0;
  private lidarAngle = 0;
  private happySpinAngle = 0;
  private owlYaw = 0;
  private owlTilt = 0;

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
    this.happyDuration = Math.max(0.4, durationSeconds);
    this.happyRemaining = this.happyDuration;
    this.happyElapsed = 0;
    this.happySpinAngle = 0;
  }

  public isHappyActive(): boolean {
    return this.happyRemaining > 0;
  }

  public resetToRestPose(): void {
    this.root.position.copy(this.baseRootPos);
    this.root.rotation.copy(this.baseRootRot);
    this.headYaw = 0;
    this.headPitch = 0;
    this.actionBlend = 0;
    this.happyBlend = 0;
    this.happyRemaining = 0;
    this.happyElapsed = 0;
    this.happySpinAngle = 0;
    this.owlYaw = 0;
    this.owlTilt = 0;
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

    const isHappy = this.happyRemaining > 0;
    const isAction = !isHappy && baseMode === 'action';

    this.actionBlend = damp(this.actionBlend, isAction ? 1 : 0, 4.8, dt);
    this.happyBlend = damp(this.happyBlend, isHappy ? 1 : 0, isHappy ? 10 : 5.5, dt);

    const targetYaw = pointerNDC ? clamp(pointerNDC.x * 0.58, -0.58, 0.58) : 0;
    const targetPitch = pointerNDC ? clamp(-pointerNDC.y * 0.3, -0.3, 0.3) : 0;
    this.headYaw = damp(this.headYaw, targetYaw, 9, dt);
    this.headPitch = damp(this.headPitch, targetPitch, 9, dt);

    switch (this.petId) {
      case 'aero-shiba':
        this.animateAeroShiba(dt);
        break;
      case 'cyber-cat':
        this.animateCyberCat(dt);
        break;
      case 'spot-rover':
        this.animateSpotRover(dt, pointerNDC);
        break;
      case 'drone-buddy':
        this.animateDroneBuddy(dt);
        break;
      case 'sky-owl':
        this.animateSkyOwl(dt, pointerNDC);
        break;
    }
  }

  private animateAeroShiba(dt: number): void {
    const t = this.elapsed;
    const aw = this.actionBlend;
    const hw = this.happyBlend;

    const wagSpeed = THREE.MathUtils.lerp(5.5, 10, aw) + hw * 5;
    this.tailPhase += wagSpeed * dt;
    this.gaitPhase += 9.5 * dt;

    const body = this.getRest('body');
    const head = this.getRest('head');
    const leftEar = this.getRest('leftEar');
    const rightEar = this.getRest('rightEar');
    const tail = this.getRest('tail');
    const fl = this.getRest('frontLeftLeg');
    const fr = this.getRest('frontRightLeg');
    const bl = this.getRest('backLeftLeg');
    const br = this.getRest('backRightLeg');

    if (fl && fr && bl && br) {
      const stride = Math.sin(this.gaitPhase) * 0.42 * aw;
      const happyHop = Math.abs(Math.sin(this.happyElapsed * Math.PI * 2.5)) * hw;
      fl.obj.rotation.x = fl.rotation.x + stride - happyHop * 0.25;
      br.obj.rotation.x = br.rotation.x + stride + happyHop * 0.15;
      fr.obj.rotation.x = fr.rotation.x - stride - happyHop * 0.25;
      bl.obj.rotation.x = bl.rotation.x - stride + happyHop * 0.15;
    }

    const actionBounce = Math.abs(Math.sin(this.gaitPhase)) * 0.045 * aw;
    const happyBounce = Math.abs(Math.sin(this.happyElapsed * Math.PI * 2.5)) * 0.18 * hw;
    this.root.position.y = this.baseRootPos.y + Math.max(actionBounce, happyBounce);

    if (body) {
      const breath = 1 + Math.sin(t * 2.6) * 0.02;
      body.obj.scale.set(body.scale.x * breath, body.scale.y * breath, body.scale.z);
      body.obj.rotation.y = body.rotation.y + this.headYaw * 0.28;
    }

    if (tail) {
      const wagAmp = THREE.MathUtils.lerp(0.22, 0.34, aw) + hw * 0.14;
      tail.obj.rotation.z = tail.rotation.z + Math.sin(this.tailPhase) * wagAmp;
      tail.obj.rotation.y = tail.rotation.y + Math.cos(this.tailPhase) * 0.12;
    }

    if (head) {
      const nod = Math.sin(t * 2.6) * 0.025 + Math.sin(this.gaitPhase) * 0.06 * aw;
      const tilt =
        Math.sin(t * 1.1) * 0.04 * (1 - hw) + Math.sin(this.happyElapsed * 7) * 0.22 * hw;
      head.obj.rotation.y = head.rotation.y + this.headYaw;
      head.obj.rotation.x = head.rotation.x + this.headPitch + nod;
      head.obj.rotation.z = head.rotation.z + tilt;
    }

    const twitchWindow = t % 4.2;
    const earTwitch =
      twitchWindow < 0.28 ? Math.sin((twitchWindow / 0.28) * Math.PI) * 0.18 : 0;
    if (rightEar) {
      rightEar.obj.rotation.z = rightEar.rotation.z - earTwitch;
    }
    if (leftEar) {
      leftEar.obj.rotation.z = leftEar.rotation.z + Math.sin(t * 10) * 0.12 * hw;
    }
  }

  private animateCyberCat(dt: number): void {
    const t = this.elapsed;
    const aw = this.actionBlend;
    const hw = this.happyBlend;

    const tailSpeed = THREE.MathUtils.lerp(2.2, 4.8, aw) + hw * 3;
    this.tailPhase += tailSpeed * dt;
    this.gaitPhase += 6 * dt;

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

    const hop = Math.abs(Math.sin(this.happyElapsed * Math.PI * 2)) * 0.12 * hw;
    this.root.position.y = this.baseRootPos.y + hop;

    if (chassis) {
      const pulse = 1 + Math.sin(t * 2.4) * 0.018;
      chassis.obj.scale.set(chassis.scale.x * pulse, chassis.scale.y, chassis.scale.z * pulse);
      chassis.obj.rotation.x = aw * 0.12 - hw * 0.06;
      chassis.obj.rotation.y = chassis.rotation.y + this.headYaw * 0.26;
    }

    if (coreHeart) {
      const heartScale = 1 + Math.sin(t * 3.4) * (0.09 + hw * 0.08);
      coreHeart.obj.scale.setScalar(heartScale);
    }

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
      const felineTilt =
        Math.sin(t * 1.4) * 0.08 * (1 - hw) + Math.sin(this.happyElapsed * 8) * 0.2 * hw;
      head.obj.rotation.y = head.rotation.y + this.headYaw;
      head.obj.rotation.x = head.rotation.x + this.headPitch + Math.sin(t * 2.4) * 0.03;
      head.obj.rotation.z = head.rotation.z + felineTilt;
    }

    if (leftEar && rightEar) {
      const perkAmp = THREE.MathUtils.lerp(0.04, 0.09, Math.max(aw, hw));
      const perk = Math.sin(this.gaitPhase * 0.9) * perkAmp;
      leftEar.obj.rotation.z = leftEar.rotation.z + perk;
      rightEar.obj.rotation.z = rightEar.rotation.z - perk;
    }

    if (tail) {
      const swayAmp = THREE.MathUtils.lerp(0.22, 0.28, aw) + hw * 0.12;
      tail.obj.rotation.z = tail.rotation.z + Math.sin(this.tailPhase) * swayAmp;
      tail.obj.rotation.y = tail.rotation.y + Math.cos(this.tailPhase * 0.7) * 0.16;
    }

    if (fl && fr) {
      const pawAction = aw;
      const flBat = Math.max(0, Math.sin(this.gaitPhase)) * 0.35 * pawAction;
      const frBat = Math.max(0, -Math.sin(this.gaitPhase)) * 0.35 * pawAction;
      const happyRaise = 0.25 * hw;
      fl.obj.rotation.x = fl.rotation.x - flBat - happyRaise;
      fr.obj.rotation.x = fr.rotation.x - frBat - happyRaise;
    }
  }

  private animateSpotRover(dt: number, pointerNDC?: PointerNDC | null): void {
    const t = this.elapsed;
    const aw = this.actionBlend;
    const hw = this.happyBlend;

    this.lidarAngle += (3.2 + hw * 3.8) * dt;
    this.gaitPhase += 8.5 * dt;

    const torso = this.getRest('torso');
    const lidar = this.getRest('lidarDome');
    const antenna = this.getRest('antenna');
    const head = this.getRest('headModule');
    const fl = this.getRest('frontLeftLeg');
    const fr = this.getRest('frontRightLeg');
    const bl = this.getRest('backLeftLeg');
    const br = this.getRest('backRightLeg');

    if (lidar) {
      lidar.obj.rotation.y = lidar.rotation.y + this.lidarAngle;
    }

    if (antenna) {
      antenna.obj.rotation.z = antenna.rotation.z + Math.sin(t * 7.5) * 0.05;
      antenna.obj.rotation.x = antenna.rotation.x + Math.cos(t * 6.2) * 0.04;
    }

    if (torso) {
      const crouchOffset =
        Math.sin(t * 2.5) * 0.015 * (1 - hw) -
        Math.sin(clamp(this.happyElapsed / 1.6, 0, 1) * Math.PI) * 0.16 * hw;
      torso.obj.position.y = torso.position.y + crouchOffset;
      torso.obj.rotation.x = Math.sin(this.gaitPhase) * 0.04 * aw;
      torso.obj.rotation.y = torso.rotation.y + this.headYaw * 0.22;
    }

    if (head) {
      const scanYaw = pointerNDC ? this.headYaw : Math.sin(t * 1.4) * (0.28 + hw * 0.2);
      const scanPitch = pointerNDC ? this.headPitch : Math.sin(this.happyElapsed * 8) * 0.14 * hw;
      head.obj.rotation.y = head.rotation.y + scanYaw;
      head.obj.rotation.x = head.rotation.x + scanPitch;
    }

    if (fl && fr && bl && br) {
      const gait = Math.sin(this.gaitPhase) * 0.32 * aw;
      const splay = Math.sin(clamp(this.happyElapsed / 1.6, 0, 1) * Math.PI) * 0.18 * hw;
      fl.obj.rotation.set(fl.rotation.x + gait, fl.rotation.y, fl.rotation.z - splay);
      br.obj.rotation.set(br.rotation.x + gait, br.rotation.y, br.rotation.z + splay);
      fr.obj.rotation.set(fr.rotation.x - gait, fr.rotation.y, fr.rotation.z + splay);
      bl.obj.rotation.set(bl.rotation.x - gait, bl.rotation.y, bl.rotation.z - splay);
    }
  }

  private animateDroneBuddy(dt: number): void {
    const t = this.elapsed;
    const aw = this.actionBlend;
    const hw = this.happyBlend;

    // Continuous incremental rotor & patrol phase accumulation (zero jump when speeds blend)
    const spinRate = THREE.MathUtils.lerp(13, 18, aw) + hw * 6;
    this.rotorAngle += spinRate * dt;
    this.bladeAngle += (spinRate + 5) * dt;
    this.patrolPhase += THREE.MathUtils.lerp(0.6, 1.4, aw) * dt;

    if (this.happyRemaining > 0) {
      const progress = clamp(this.happyElapsed / 1.2, 0, 1);
      // Smoothstep easing for 360° celebratory twirl
      const eased = progress * progress * (3 - 2 * progress);
      this.happySpinAngle = eased * Math.PI * 2;
    } else {
      this.happySpinAngle = 0;
    }

    const core = this.getRest('core');
    const rotor = this.getRest('topRotor');
    const leftBlade = this.getRest('leftRotorBlade');
    const rightBlade = this.getRest('rightRotorBlade');
    const gimbal = this.getRest('gimbalCamera');
    const leftWing = this.getRest('leftWing');
    const rightWing = this.getRest('rightWing');
    const halo = this.getRest('haloRing');

    if (rotor) {
      rotor.obj.rotation.y = rotor.rotation.y + this.rotorAngle;
    }
    if (leftBlade) {
      leftBlade.obj.rotation.y = leftBlade.rotation.y + this.bladeAngle;
    }
    if (rightBlade) {
      rightBlade.obj.rotation.y = rightBlade.rotation.y - this.bladeAngle;
    }

    if (core) {
      const hoverY = Math.sin(t * 2.3) * 0.085;
      const patrolX = Math.sin(this.patrolPhase) * 0.16 * aw;
      const patrolZ = Math.sin(this.patrolPhase * 2) * 0.08 * aw;
      const happyLift = Math.sin(clamp(this.happyElapsed / 1.6, 0, 1) * Math.PI) * 0.22 * hw;

      core.obj.position.set(
        core.position.x + patrolX,
        core.position.y + hoverY + happyLift,
        core.position.z + patrolZ,
      );
      core.obj.rotation.y = core.rotation.y + this.headYaw + this.happySpinAngle;
      core.obj.rotation.x = core.rotation.x + this.headPitch * 0.85 + 0.08 * aw;
      core.obj.rotation.z =
        core.rotation.z +
        THREE.MathUtils.lerp(
          Math.sin(t * 1.6) * 0.04,
          -Math.cos(this.patrolPhase) * 0.15,
          aw,
        );
    }

    if (gimbal) {
      gimbal.obj.rotation.y = gimbal.rotation.y + this.headYaw * 0.45;
      gimbal.obj.rotation.x = gimbal.rotation.x + this.headPitch * 0.4;
    }

    if (leftWing && rightWing) {
      const tiltForward = 0.24 * aw;
      const flap =
        Math.sin(t * 2.3) * 0.06 * (1 - hw) + Math.sin(this.happyElapsed * 14) * 0.22 * hw;
      leftWing.obj.rotation.x = leftWing.rotation.x + tiltForward;
      rightWing.obj.rotation.x = rightWing.rotation.x + tiltForward;
      leftWing.obj.rotation.z = leftWing.rotation.z + flap;
      rightWing.obj.rotation.z = rightWing.rotation.z - flap;
    }

    if (halo) {
      const padPulse = 1 + Math.sin(t * 2.3) * 0.04;
      halo.obj.scale.set(padPulse, halo.scale.y, padPulse);
    }
  }

  private animateSkyOwl(dt: number, pointerNDC?: PointerNDC | null): void {
    const t = this.elapsed;
    const aw = this.actionBlend;
    const hw = this.happyBlend;

    this.gaitPhase += 7 * dt;

    const body = this.getRest('body');
    const head = this.getRest('head');
    const leftWing = this.getRest('leftWing');
    const rightWing = this.getRest('rightWing');
    const tailFan = this.getRest('tailFan');

    const actionLift = Math.max(0, Math.sin(this.gaitPhase)) * 0.12 * aw;
    const happyLift = Math.abs(Math.sin(this.happyElapsed * Math.PI * 2)) * 0.14 * hw;
    this.root.position.y = this.baseRootPos.y + Math.max(actionLift, happyLift);

    if (body) {
      const breath = 1 + Math.sin(t * 2.2) * 0.02;
      body.obj.scale.set(body.scale.x * breath, body.scale.y, body.scale.z * breath);
      body.obj.rotation.y = body.rotation.y + this.headYaw * 0.25;
    }

    if (head) {
      const glanceStep = Math.floor(t / 2.6) % 3;
      const targetAutoYaw = glanceStep === 0 ? 0 : glanceStep === 1 ? 0.34 : -0.32;
      const targetAutoTilt = glanceStep === 1 ? 0.11 : glanceStep === 2 ? -0.11 : 0;

      this.owlYaw = damp(this.owlYaw, pointerNDC ? this.headYaw : targetAutoYaw, 7, dt);
      this.owlTilt = damp(
        this.owlTilt,
        hw > 0.05 ? Math.sin(this.happyElapsed * 9) * 0.26 : targetAutoTilt,
        7,
        dt,
      );

      head.obj.rotation.y = head.rotation.y + this.owlYaw;
      head.obj.rotation.x = head.rotation.x + this.headPitch;
      head.obj.rotation.z = head.rotation.z + this.owlTilt;
    }

    if (leftWing && rightWing) {
      const idleFlap = Math.sin(t * 2.2) * 0.025;
      const actionFlap = (0.42 + Math.sin(this.gaitPhase) * 0.38) * aw;
      const happyFlap = (0.35 + Math.sin(this.happyElapsed * 14) * 0.3) * hw;
      const flapAngle = idleFlap * (1 - aw) * (1 - hw) + actionFlap + happyFlap;
      leftWing.obj.rotation.z = leftWing.rotation.z - flapAngle;
      rightWing.obj.rotation.z = rightWing.rotation.z + flapAngle;
    }

    if (tailFan) {
      const swayAmp = THREE.MathUtils.lerp(0.04, 0.15, Math.max(aw, hw));
      tailFan.obj.rotation.x = tailFan.rotation.x + Math.sin(this.gaitPhase * 0.9) * swayAmp;
    }
  }
}
