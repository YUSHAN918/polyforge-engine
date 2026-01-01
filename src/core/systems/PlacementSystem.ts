import * as THREE from 'three';
import { System, Entity } from '../types';
import { TransformComponent } from '../components/TransformComponent';
import { PlacementComponent } from '../components/PlacementComponent';

/**
 * PlacementSystem
 * 处理放置预览实体的逻辑
 */
export class PlacementSystem implements System {
    public readonly name = 'PlacementSystem';
    public readonly priority = 50; // 交互系统优先级较高
    public readonly requiredComponents = ['Placement', 'Transform'];

    private entityManager: any;
    private cameraSystem: any;
    private inputSystem: any;
    private physicsSystem: any;
    private tickCounter: number = 0;

    constructor(cameraSystem: any, inputSystem: any, physicsSystem: any) {
        this.cameraSystem = cameraSystem;
        this.inputSystem = inputSystem;
        this.physicsSystem = physicsSystem;
    }

    public initialize(entityManager: any): void {
        this.entityManager = entityManager;
    }

    update(deltaTime: number, entities: Entity[]): void {
        if (entities.length === 0) return;

        // 性能优化：降低射线检测频率
        this.tickCounter++;
        if (this.tickCounter % 2 !== 0) return;

        for (const entity of entities) {
            const placement = entity.getComponent<PlacementComponent>('Placement');
            const transform = entity.getComponent<TransformComponent>('Transform');

            if (!placement || !transform || !placement.enabled) continue;

            const mouse = this.inputSystem.mousePosition;
            const ray = this.cameraSystem.getRayFromScreen ? this.cameraSystem.getRayFromScreen(mouse.x, mouse.y) : null;
            if (!ray) continue;

            let hitPos = [0, 0, 0] as [number, number, number];
            let hitNormal = [0, 1, 0];
            let isHit = false;

            if (this.physicsSystem) {
                const hit = this.physicsSystem.castRay(
                    { x: ray.origin.x, y: ray.origin.y, z: ray.origin.z },
                    { x: ray.direction.x, y: ray.direction.y, z: ray.direction.z },
                    1000
                ) as any;

                if (hit.hit) {
                    hitPos = [hit.point.x, hit.point.y, hit.point.z];
                    hitNormal = hit.normal ? [hit.normal.x, hit.normal.y, hit.normal.z] : [0, 1, 0];
                    isHit = true;
                }
            }

            // 兜底：与 Y=0 平面相交
            if (!isHit && ray.direction.y < -0.01) {
                const t = -ray.origin.y / ray.direction.y;
                if (t > 0) {
                    hitPos = [
                        ray.origin.x + ray.direction.x * t,
                        0,
                        ray.origin.z + ray.direction.z * t
                    ];
                    isHit = true;
                }
            }

            if (isHit) {
                transform.position = [...hitPos];
                const s = placement.scale;
                transform.scale = [s, s, s];

                // 旋转逻辑 (移植并微调自 Manager)
                if (placement.mode === 'model') {
                    transform.quaternion = undefined;
                    transform.rotation = [placement.rotationX ? -90 : 0, placement.rotationY, 0];
                } else if (placement.mode === 'billboard') {
                    const dummy = new THREE.Object3D();
                    dummy.position.set(hitPos[0], hitPos[1], hitPos[2]);
                    const camPos = this.cameraSystem.getCurrentPosition ? this.cameraSystem.getCurrentPosition() : [0, 50, 50];
                    dummy.lookAt(camPos[0], camPos[1], camPos[2]);
                    const q = dummy.quaternion;
                    transform.quaternion = [q.x, q.y, q.z, q.w];
                    transform.rotation = [0, 0, 0];
                }
                // ... 其他模式（standee, sticker）可按需恢复

                transform.markLocalDirty();
            }
        }
    }

    onEntityAdded(entity: Entity): void {
        console.log(`[PlacementSystem] Ghost entity tracked: ${entity.id}`);
    }

    onEntityRemoved(entity: Entity): void {
        console.log(`[PlacementSystem] Ghost entity untracked: ${entity.id}`);
    }
}
