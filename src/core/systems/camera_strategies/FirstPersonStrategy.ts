import { ICameraStrategy } from './ICameraStrategy';
import { CameraComponent } from '../../components/CameraComponent';
import { TransformComponent } from '../../components/TransformComponent';
import { InputSystem } from '../InputSystem';
import { Entity } from '../../Entity';
import * as THREE from 'three';

export class FirstPersonStrategy implements ICameraStrategy {
    public readonly name = 'firstPerson';
    public enter(camera: CameraComponent): void { }
    public exit(camera: CameraComponent): void {
        // 清理工作：归零平移偏移
        camera.pivotOffset[0] = 0;
        camera.pivotOffset[1] = 0;
        camera.pivotOffset[2] = 0;
    }

    public handleInput(camera: CameraComponent, inputSystem: InputSystem, deltaTime: number): void {
        const mouseDelta = inputSystem.mouseDelta;
        const isLocked = typeof document !== 'undefined' && !!document.pointerLockElement;

        if (isLocked) {
            camera.yaw -= mouseDelta.x * 0.15;
            camera.pitch -= mouseDelta.y * 0.15;
            camera.pitch = Math.max(-85, Math.min(85, camera.pitch));
        }

        // Character movement is handled globally in CameraSystem for now, 
        // or we can move it here if we want full isolation. 
        // For now, CameraSystem keeps character control to avoid duplicating physics logic.
    }

    public updateTarget(camera: CameraComponent, target: Entity | null, deltaTime: number): { position: [number, number, number]; rotation: [number, number, number]; pivot: [number, number, number]; fov: number; } {
        if (!target) {
            return {
                position: [0, 1.7, 0],
                rotation: [camera.pitch, camera.yaw, 0],
                pivot: [0, 0, 0],
                fov: camera.fov
            };
        }

        const transform = target.getComponent<TransformComponent>('Transform');
        if (!transform) { // Fallback
            return {
                position: [0, 1.7, 0],
                rotation: [camera.pitch, camera.yaw, 0],
                pivot: [0, 0, 0],
                fov: camera.fov
            };
        }

        // 统一计算逻辑：无论是否有 Socket，都强制应用防穿模偏移
        // The implementation ignores specific socket transforms for now to ensure stable execution
        const t = transform;
        const rawPos = (target.parent && t.getWorldPosition) ? t.getWorldPosition() : t.position;

        // 🔥 FPS Anti-Clipping: Push camera forward to clear the customized capsule/mesh
        // Use camera's own yaw (since it drives the character)
        // Offset: 0.6m forward (clears most humanoid meshes with radius 0.5), 1.7m height (natural eye level)
        const radYaw = THREE.MathUtils.degToRad(camera.yaw);
        const forwardOffset = 0.6;

        const pos: [number, number, number] = [
            rawPos[0] - Math.sin(radYaw) * forwardOffset,
            rawPos[1] + 1.7,
            rawPos[2] - Math.cos(radYaw) * forwardOffset
        ];

        return {
            position: [
                pos[0] + camera.pivotOffset[0],
                pos[1] + camera.pivotOffset[1],
                pos[2] + camera.pivotOffset[2]
            ],
            rotation: [camera.pitch, camera.yaw, 0],
            pivot: [pos[0], pos[1], pos[2]], // FPS Pivot is the player eye
            fov: camera.fov
        };
    }
}
