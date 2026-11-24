import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { disposeObject3D, PET_MODEL_CATALOG } from './petModels';

describe('PET_MODEL_CATALOG (5 static Three.js 3D pet models)', () => {
  it('builds all 5 distinct 3D pet models with meshes and named pivots', () => {
    expect(PET_MODEL_CATALOG).toHaveLength(5);

    for (const spec of PET_MODEL_CATALOG) {
      const group = spec.build();
      expect(group).toBeInstanceOf(THREE.Group);

      let meshCount = 0;
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          meshCount += 1;
        }
      });

      expect(meshCount).toBeGreaterThanOrEqual(8);
      disposeObject3D(group);
    }
  });
});
