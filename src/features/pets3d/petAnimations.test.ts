import { describe, expect, it } from 'vitest';
import { PetAnimationController } from './petAnimations';
import { PET_MODEL_CATALOG } from './petModels';

describe('PetAnimationController', () => {
  it('advances idle, action, happy, and paused modes cleanly across all 5 pet models', () => {
    for (const spec of PET_MODEL_CATALOG) {
      const model = spec.build();
      const controller = new PetAnimationController(spec.id, model);

      // Idle mode with pointer tracking
      controller.update(0.16, 'idle', { x: 0.6, y: -0.35 });
      controller.update(0.24, 'idle', { x: -0.4, y: 0.45 });

      // Action mode
      controller.update(0.2, 'action', { x: 0.2, y: 0.1 });

      // Trigger happy burst, confirm active then expires across realistic frame steps
      controller.triggerHappy(0.5);
      expect(controller.isHappyActive()).toBe(true);
      for (let i = 0; i < 5; i += 1) {
        controller.update(0.05, 'idle', null);
      }
      expect(controller.isHappyActive()).toBe(true);
      for (let i = 0; i < 8; i += 1) {
        controller.update(0.05, 'idle', null);
      }
      expect(controller.isHappyActive()).toBe(false);

      // Paused resets gently toward rest pose without NaN transforms
      controller.update(0.5, 'paused', null);
      model.traverse((obj) => {
        expect(Number.isFinite(obj.position.x)).toBe(true);
        expect(Number.isFinite(obj.position.y)).toBe(true);
        expect(Number.isFinite(obj.position.z)).toBe(true);
        expect(Number.isFinite(obj.rotation.x)).toBe(true);
        expect(Number.isFinite(obj.rotation.y)).toBe(true);
        expect(Number.isFinite(obj.rotation.z)).toBe(true);
      });

      controller.resetToRestPose();
    }
  });
});
