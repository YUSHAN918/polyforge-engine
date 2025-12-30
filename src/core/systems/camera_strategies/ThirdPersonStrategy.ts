import { ICameraStrategy } from './ICameraStrategy';
import { CameraComponent } from '../../components/CameraComponent';
import { TransformComponent } from '../../components/TransformComponent';
import { InputSystem } from '../InputSystem';
import { Entity } from '../../Entity';
import * as THREE from 'three';

export class ThirdPersonStrategy implements ICameraStrategy {
    public readonly name = 'thirdPerson';
    public enter(camera: CameraComponent): void { }
    public exit(camera: CameraComponent): void {
        // 清理工作：归零平移偏移
        camera.pivotOffset[0] = 0;
        camera.pivotOffset[1] = 0;
        camera.pivotOffset[2] = 0;
    }

    public handleInput(camera: CameraComponent, inputSystem: InputSystem, deltaTime: number): void {
        const mouseDelta = inputSystem.mouseDelta;
        const pressedButtons = inputSystem.pressedButtons || new Set();
        const isLocked = typeof document !== 'undefined' && !!document.pointerLockElement;

        // Normal TPS Rotation
        if (isLocked) {
            // Sensitivity
            const sensitivity = 0.15;
            camera.yaw -= mouseDelta.x * sensitivity;
            // 🔥 Fix Y-Axis Inversion: Mouse Up -> DeltaY < 0 -> Pitch Decrease -> Look Up
            camera.pitch += mouseDelta.y * sensitivity;
        }

        camera.pitch = Math.max(-85, Math.min(85, camera.pitch));
    }

    public updateTarget(camera: CameraComponent, target: Entity | null, deltaTime: number): { position: [number, number, number]; rotation: [number, number, number]; pivot: [number, number, number]; fov: number; } {
        if (!target) {
            // DEBUG: Log missing target
            console.warn('[TPS] No target entity bound!');
            return {
                position: [0, 2, 5],
                rotation: [-20, 0, 0],
                pivot: [0, 0, 0],
                fov: camera.fov
            };
        }

        const transform = target.getComponent<TransformComponent>('Transform');
        if (!transform) {
            return {
                position: [0, 2, 5],
                rotation: [-20, 0, 0],
                pivot: [0, 0, 0],
                fov: camera.fov
            };
        }

        // 🔥 Fix: TransformComponent.getWorldPosition() relies on HierarchySystem to update _worldMatrix.
        // If Physics updates .position directly and no Hierarchy pass runs, WorldMatrix is stale (0,0,0).
        // Since Player is usually a Root entity, we should use .position directly.
        const targetPos = target.parent
            ? transform.getWorldPosition()
            : transform.position;

        // DEBUG: Output once per second or if changed significantly
        // console.log('[TPS] Target:', targetPos);

        // 计算相机位置（基于球面坐标系）
        // Pitch: 俯仰角，Yaw: 偏航角
        // 0 度 Pitch = 水平，90 度 Pitch = 垂直向下
        // 0 度 Yaw = 正后方（默认）
        const pitchRad = THREE.MathUtils.degToRad(camera.pitch);
        const yawRad = THREE.MathUtils.degToRad(camera.yaw);

        // 球面坐标转换：
        // x = d * cos(p) * sin(y)
        // y = d * sin(p)
        // z = d * cos(p) * cos(y)
        const distance = camera.distance;

        // 修正：PolyForge 坐标系 (Y-up), 0 yaw 应该是 +Z 还是 -Z?
        // 通常 Camera 在 target 后方 (+Z), 看向 -Z。
        // 如果 yaw = 0, x=0, z=distance. 
        const offsetX = distance * Math.cos(pitchRad) * Math.sin(yawRad);
        const offsetY = distance * Math.sin(pitchRad); // 注意正负号，Pitch 向上为正还是向下为正？通常向上为正。
        const offsetZ = distance * Math.cos(pitchRad) * Math.cos(yawRad);

        // 应用 Pivot (Target Head/Body)
        // TPS 通常看向角色头部上方一点，或者腰部
        const pivotX = targetPos[0];
        const pivotY = targetPos[1] + 1.5; // Look at upper body
        const pivotZ = targetPos[2];

        // 最终相机位置 = Pivot + Offset + Manual PivotOffset
        const position: [number, number, number] = [
            pivotX + offsetX + camera.pivotOffset[0],
            pivotY + offsetY + camera.pivotOffset[1], // OffsetY is relative to pivotY
            pivotZ + offsetZ + camera.pivotOffset[2]
        ];

        return {
            position,
            rotation: [-camera.pitch, camera.yaw, 0], // Camera rotation matches the vector
            pivot: [pivotX, pivotY, pivotZ],
            fov: camera.fov
        };
    }
}
