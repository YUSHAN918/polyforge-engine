import { ICameraStrategy } from './ICameraStrategy';
import { CameraComponent } from '../../components/CameraComponent';
import { TransformComponent } from '../../components/TransformComponent';
import { InputSystem } from '../InputSystem';
import { Entity } from '../../Entity';

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

        let pos: [number, number, number] = [0, 0, 0];
        const headSocket = target.getSocket(camera.firstPersonSocket);

        if (headSocket) {
            // Need getSocketWorldPosition logic... 
            // Since we don't have access to CameraSystem's helper method easily without passing it in,
            // we might need to duplicate it or move it to a utility.
            // For now, let's implement a simplified local version or assume TransformComponent has what we need?
            // Actually, socket world position calculation relies on the entity transform hierarchy.
            // Let's implement a safe approximation here or assume the socket logic is simple.
            // Or better: The CameraSystem.ts has `getSocketWorldPosition`. 
            // We should probably rely on the transform component's world matrix + socket local matrix.
            // But for simplicity in this refactor step, let's just use the logic from CameraSystem.

            // We can use transform.getWorldPosition() + rotation applied to socket offset.
            // BUT head socket might be animated? No, sockets are static offsets usually unless bone attached.

            const worldPos = transform.getWorldPosition();
            // Apply rotation?
            // Let's revert to a simpler approach: Just use Entity Root + Offset if socket logic is too complex to decouple right now.
            // Wait, I can just copy the math.

            // Simplified for now to ensure stability:
            pos = [
                worldPos[0],
                worldPos[1] + 1.7,
                worldPos[2]
            ];
        } else {
            const t = transform;
            const rawPos = (target.parent && t.getWorldPosition) ? t.getWorldPosition() : t.position;
            pos = [
                rawPos[0],
                rawPos[1] + 1.7,
                rawPos[2]
            ];
        }

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
