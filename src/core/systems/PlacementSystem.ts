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
    private isGrabbedPredicate?: (id: string) => boolean;

    constructor(cameraSystem: any, inputSystem: any, physicsSystem: any, isGrabbedPredicate?: (id: string) => boolean) {
        this.cameraSystem = cameraSystem;
        this.inputSystem = inputSystem;
        this.physicsSystem = physicsSystem;
        this.isGrabbedPredicate = isGrabbedPredicate;
    }

    public initialize(entityManager: any): void {
        this.entityManager = entityManager;
    }

    update(deltaTime: number, entities: Entity[]): void {
        if (entities.length === 0) return;

        if (entities.length === 0) return;

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

            if (isHit && !placement.isPlaced) {
                // 贴纸模式增加微小法线位移，防止 Z-Fighting
                const offset = (placement.mode === 'sticker') ? 0.05 : 0;
                transform.position = [
                    hitPos[0] + hitNormal[0] * offset,
                    hitPos[1] + hitNormal[1] * offset,
                    hitPos[2] + hitNormal[2] * offset
                ];

                // 🔥 优先使用保存的默认缩放值
                const s = placement.defaultScale !== undefined ? placement.defaultScale : placement.scale;
                transform.scale = [s, s, s];

                // 预览阶段的特殊旋转（如贴纸对齐法线）
                if (placement.mode === 'sticker') {
                    const dummy = new THREE.Object3D();
                    dummy.position.set(transform.position[0], transform.position[1], transform.position[2]);
                    const target = new THREE.Vector3(
                        transform.position[0] + hitNormal[0],
                        transform.position[1] + hitNormal[1],
                        transform.position[2] + hitNormal[2]
                    );
                    dummy.lookAt(target);
                    // 贴纸增加绕法线旋转的控制支持
                    if (placement.rotationY !== 0) {
                        // 弧度转度数或直接旋转。THREE 使用弧度。
                        // 这里的 dummy 仅用于获取四元数，所以 rotateZ 使用弧度是正确的。
                        dummy.rotateZ(placement.rotationY * Math.PI / 180);
                    }
                    const q = dummy.quaternion;
                    transform.quaternion = [q.x, q.y, q.z, q.w];
                    // transform.rotation = [0, 0, 0]; // 🔥 重要：严禁在此覆盖 rotation，会毁掉刚写入的 quaternion
                }
            }

            // --- 旋转行为 (核心隔离逻辑) ---
            // 🔥 关键修正：如果物体正在被 Manager 抓取，跳过此系统的旋转覆盖，防止跳动
            if (this.isGrabbedPredicate && this.isGrabbedPredicate(entity.id)) {
                // Yield control to Manager for rotations during Grab
            } else if (placement.mode === 'billboard') {
                const dummy = new THREE.Object3D();
                const pos = transform.position;
                dummy.position.set(pos[0], pos[1], pos[2]);
                const camPos = this.cameraSystem.getCurrentPosition ? this.cameraSystem.getCurrentPosition() : [0, 50, 50];
                dummy.lookAt(camPos[0], camPos[1], camPos[2]);
                const q = dummy.quaternion;
                transform.quaternion = [q.x, q.y, q.z, q.w];
                // transform.rotation = [0, 0, 0]; // 🔥 重要：物理同步优先使用四元数，禁止覆盖
            } else if (placement.mode === 'standee') {
                // 立牌：强制清除四元数，使用欧拉角
                transform.quaternion = undefined;
                transform.rotation = [0, placement.rotationY, 0];
            } else if (placement.mode === 'sticker') {
                // 已放置贴纸的位姿已在 SET_IMAGE_MODE 指令周期处理完毕，此处无需轮询恢复
            } else if (placement.mode === 'model' && !placement.isPlaced) {
                transform.quaternion = undefined;
                // 🔥 优先使用保存的默认旋转值
                if (placement.defaultRotation) {
                    transform.rotation = [...placement.defaultRotation] as [number, number, number];
                } else {
                    // 兜底：使用旧的逻辑
                    transform.rotation = [placement.rotationX ? -90 : 0, placement.rotationY, 0];
                }
            }

            // --- 物理同步 (确保碰撞体随动态旋转实时更新) ---
            if (placement.isPlaced && this.physicsSystem?.syncTransformToPhysics) {
                this.physicsSystem.syncTransformToPhysics(entity);
            }

            transform.markLocalDirty();
        }
    }

    onEntityAdded(entity: Entity): void {
        // Ghost entity tracked (removed verbose log)
    }

    onEntityRemoved(entity: Entity): void {
        // Ghost entity untracked (removed verbose log)
    }
}
