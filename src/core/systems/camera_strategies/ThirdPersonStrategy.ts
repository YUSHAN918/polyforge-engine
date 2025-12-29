import { ICameraStrategy } from './ICameraStrategy';
import { CameraComponent } from '../../components/CameraComponent';
import { TransformComponent } from '../../components/TransformComponent';
import { InputSystem } from '../InputSystem';
import { Entity } from '../../Entity';

export class ThirdPersonStrategy implements ICameraStrategy {
    public readonly name = 'thirdPerson';
    public enter(camera: CameraComponent): void { }
    public exit(camera: CameraComponent): void { }

    public handleInput(camera: CameraComponent, inputSystem: InputSystem, deltaTime: number): void {
        const mouseDelta = inputSystem.mouseDelta;
        const pressedButtons = inputSystem.pressedButtons || new Set();
        const isLocked = typeof document !== 'undefined' && !!document.pointerLockElement;

        // Normal TPS Rotation
        if (isLocked) {
            camera.yaw -= mouseDelta.x * 0.15;
            camera.pitch -= mouseDelta.y * 0.15;
        } else if (pressedButtons.has(1)) {
            if (mouseDelta && (Math.abs(mouseDelta.x) > 0 || Math.abs(mouseDelta.y) > 0)) {
                camera.yaw -= mouseDelta.x * 0.3;
                camera.pitch -= mouseDelta.y * 0.3;
            }
        }
        camera.pitch = Math.max(-85, Math.min(85, camera.pitch));
    }

    public updateTarget(camera: CameraComponent, target: Entity | null, deltaTime: number): { position: [number, number, number]; rotation: [number, number, number]; pivot: [number, number, number]; fov: number; } {
        if (!target) {
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

        const targetPos = transform.getWorldPosition();

        // 计算相机位置（基于偏移和旋转）
        const pitch = camera.pitch * Math.PI / 180;
        const yaw = camera.yaw * Math.PI / 180;

        // 应用偏移
        const offsetX = camera.offset[0];
        const offsetY = camera.offset[1];
        const offsetZ = camera.offset[2];

        // 旋转偏移向量
        const rotatedX = offsetX * Math.cos(yaw) - offsetZ * Math.sin(yaw);
        const rotatedZ = offsetX * Math.sin(yaw) + offsetZ * Math.cos(yaw);

        const pivotX = targetPos[0];
        const pivotY = targetPos[1] + offsetY;
        const pivotZ = targetPos[2];

        return {
            position: [
                targetPos[0] + rotatedX + camera.pivotOffset[0],
                targetPos[1] + offsetY + camera.pivotOffset[1],
                targetPos[2] + rotatedZ + camera.pivotOffset[2],
            ],
            rotation: [camera.pitch, camera.yaw, 0],
            pivot: [pivotX, pivotY, pivotZ],
            fov: camera.fov
        };
    }
}
