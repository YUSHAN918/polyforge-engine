/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { VegetationSystem } from '../VegetationSystem';
import { EntityManager } from '../../EntityManager';
import { Clock } from '../../Clock';
import { VegetationComponent, VegetationType } from '../../components/VegetationComponent';
import { TerrainComponent } from '../../components/TerrainComponent';
import * as THREE from 'three';

describe('VegetationSystem - Data Layer Purity', () => {
    let system: VegetationSystem;
    let entityManager: EntityManager;
    let clock: Clock;
    let terrainEntityId: string;

    beforeEach(() => {
        system = new VegetationSystem();
        entityManager = new EntityManager();
        clock = new Clock();
        system.initialize(entityManager, clock);

        // Setup Mock Terrain
        const terrainEntity = entityManager.createEntity('Terrain');
        terrainEntityId = terrainEntity.id;
        const terrainComp = new TerrainComponent({
            width: 100,
            depth: 100,
            widthSegments: 10,
            depthSegments: 10
        });
        terrainComp.heightData.fill(0);
        entityManager.addComponent(terrainEntityId, terrainComp);
    });

    it('Generated instance scale should be within [0.8, 1.2] range', () => {
        const vegEntity = entityManager.createEntity('Grass');
        const vegComp = new VegetationComponent({
            density: 0.1,
            type: VegetationType.GRASS,
            seed: 1234,
            scale: 2.0, // Should NOT affect instance.scale
            terrainEntityId: terrainEntityId,
            baseColor: '#ffffff',
            colorVariation: 0,
            windStrength: 0,
            windSpeed: 0
        });
        entityManager.addComponent(vegEntity.id, vegComp);

        system.onEntityAdded(vegEntity);
        const instances = system.getInstances(vegEntity.id);

        expect(instances).not.toBeNull();
        instances!.forEach(instance => {
            // In current implementation, instances use a random scale variation
            expect(instance.scale.x).toBeGreaterThanOrEqual(0.8);
            expect(instance.scale.x).toBeLessThanOrEqual(1.2);
        });
    });

    it('Same seed should generate identical instance data regardless of globalScale', () => {
        const seed = 9999;

        // Batch 1: Scale 0.5
        const entity1 = entityManager.createEntity('Grass_0.5');
        const vegComp1 = new VegetationComponent({
            density: 0.1, seed, scale: 0.5, terrainEntityId,
            type: VegetationType.GRASS, baseColor: '#ffffff', colorVariation: 0,
            windStrength: 0, windSpeed: 0
        });
        entityManager.addComponent(entity1.id, vegComp1);
        system.onEntityAdded(entity1);
        const instances1 = JSON.parse(JSON.stringify(system.getInstances(entity1.id))); // Deep copy

        // Batch 2: Scale 5.0
        const entity2 = entityManager.createEntity('Grass_5.0');
        const vegComp2 = new VegetationComponent({
            density: 0.1, seed, scale: 5.0, terrainEntityId,
            type: VegetationType.GRASS, baseColor: '#ffffff', colorVariation: 0,
            windStrength: 0, windSpeed: 0
        });
        entityManager.addComponent(entity2.id, vegComp2);
        system.onEntityAdded(entity2);
        const instances2 = system.getInstances(entity2.id);

        expect(instances1.length).toBe(instances2!.length);
        for (let i = 0; i < instances1.length; i++) {
            // Compare values
            expect(instances1[i].position.x).toBeCloseTo(instances2![i].position.x);
            expect(instances1[i].rotation).toBe(instances2![i].rotation);
            expect(instances1[i].scale.x).toBeCloseTo(instances2![i].scale.x);
        }
    });

    it('Changing globalScale should not trigger instance regeneration', () => {
        const vegEntity = entityManager.createEntity('Grass_Mutable');
        const vegComp = new VegetationComponent({
            density: 0.1, seed: 123, scale: 1.0, terrainEntityId,
            type: VegetationType.GRASS, baseColor: '#ffffff', colorVariation: 0,
            windStrength: 0, windSpeed: 0
        });
        entityManager.addComponent(vegEntity.id, vegComp);
        system.onEntityAdded(vegEntity);

        const initialInstances = system.getInstances(vegEntity.id);
        const initialCount = initialInstances?.length;

        // Change scale and trigger update
        vegComp.config.scale = 2.0;
        vegComp.isScaleDirty = true;
        system.update();

        const currentInstances = system.getInstances(vegEntity.id);
        expect(currentInstances).toBe(initialInstances); // Still same reference
        expect(currentInstances?.length).toBe(initialCount);
    });
});
