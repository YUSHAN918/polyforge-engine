import { ICameraStrategy } from './ICameraStrategy';
import { CameraComponent } from '../../components/CameraComponent';
import { TransformComponent } from '../../components/TransformComponent';
import { InputSystem } from '../InputSystem';
import { Entity } from '../../Entity';

export class OrbitStrategy implements ICameraStrategy {
    public enter(camera: CameraComponent): void {
        // Reset to pure creation mode defaults if needed
    }

    public exit(camera: CameraComponent): void {
        // Cleanup
    }

    public handleInput(camera: CameraComponent, inputSystem: InputSystem, deltaTime: number): void {
        // 移植自 handleCreationInputs
        // 如果正在跟随目标，则禁用手动 Panning 和旋转 (ISO 模式下通常固定，但也防止干扰)
        if (camera.targetEntityId) return;

        const mouseDelta = inputSystem.mouseDelta;
        const pressedButtons = inputSystem.pressedButtons || new Set();
        const pressedKeys = inputSystem.pressedKeys || new Set();

        // 1. Panning: Space + Left Click (0) OR Middle Click (1)
        if (pressedKeys.has(' ') && (pressedButtons.has(0) || pressedButtons.has(1))) {
            if (mouseDelta && (Math.abs(mouseDelta.x) > 0 || Math.abs(mouseDelta.y) > 0)) {
                const panSpeed = camera.distance * 0.002;
                const yawRad = camera.yaw * Math.PI / 180;
                const forwardX = Math.sin(yawRad);
                const forwardZ = Math.cos(yawRad);
                const rightX = Math.cos(yawRad);
                const rightZ = -Math.sin(yawRad);

                camera.pivotOffset[0] -= (rightX * mouseDelta.x + forwardX * mouseDelta.y) * panSpeed;
                camera.pivotOffset[2] -= (rightZ * mouseDelta.x + forwardZ * mouseDelta.y) * panSpeed;
            }
        }

        // 2. Rotation: Middle Click Only
        if (pressedButtons.has(1)) {
            if (mouseDelta && (Math.abs(mouseDelta.x) > 0 || Math.abs(mouseDelta.y) > 0)) {
                camera.yaw -= mouseDelta.x * 0.3;
                camera.pitch += mouseDelta.y * 0.3; // Editor Move: Mouse Up -> Look Up
                camera.pitch = Math.max(-89, Math.min(89, camera.pitch));
            }
        }
    }

    public updateTarget(camera: CameraComponent, target: Entity | null, deltaTime: number): { position: [number, number, number]; rotation: [number, number, number]; pivot: [number, number, number]; fov: number; } {
        // 移植自 updateOrbitMode
        const targetPos = target
            ? target.getComponent<TransformComponent>('Transform')?.position || [0, 0, 0]
            : [0, 0, 0];

        // 基础参数
        const distance = camera.distance;

        // Euler Angles to Radians
        const pitchRad = camera.pitch * Math.PI / 180;
        const yawRad = camera.yaw * Math.PI / 180;

        // 计算相机相对于 Pivot 的偏移向量 (Spherical to Cartesian)
        const y = distance * Math.sin(pitchRad);
        const hDist = distance * Math.cos(pitchRad); // 水平投影距离
        const x = hDist * Math.sin(yawRad);
        const z = hDist * Math.cos(yawRad);

        // 最终位置 = 目标位置 + 手动平移偏移 + 球面旋转偏移
        const pivotX = targetPos[0] + camera.pivotOffset[0];
        const pivotY = targetPos[1] + camera.pivotOffset[1];
        const pivotZ = targetPos[2] + camera.pivotOffset[2];

        const finalX = pivotX + x;
        const finalY = pivotY + y;
        const finalZ = pivotZ + z;

        return {
            position: [finalX, finalY, finalZ],
            rotation: [camera.pitch, camera.yaw, 0],
            pivot: [pivotX, pivotY, pivotZ],
            fov: camera.fov
        };
    }
}
