import { ICameraStrategy } from './ICameraStrategy';
import { CameraComponent } from '../../components/CameraComponent';
import { TransformComponent } from '../../components/TransformComponent';
import { InputSystem } from '../InputSystem';
import { Entity } from '../../Entity';

export class SidescrollStrategy implements ICameraStrategy {
    public enter(camera: CameraComponent): void { }
    public exit(camera: CameraComponent): void { }

    public handleInput(camera: CameraComponent, inputSystem: InputSystem, deltaTime: number): void {
        const moveSpeed = (camera.moveSpeed || 15.0) * deltaTime;
        if (inputSystem.isActionPressed('MOVE_LEFT')) camera.pivotOffset[0] -= moveSpeed;
        if (inputSystem.isActionPressed('MOVE_RIGHT')) camera.pivotOffset[0] += moveSpeed;
    }

    public updateTarget(camera: CameraComponent, target: Entity | null, deltaTime: number): { position: [number, number, number]; rotation: [number, number, number]; pivot: [number, number, number]; fov: number; } {
        const targetPos = target
            ? target.getComponent<TransformComponent>('Transform')?.getWorldPosition() || [0, 0, 0]
            : [0, 0, 0];

        // 固定 Z 轴位置，只跟随 X 和 Y
        const distance = camera.distance;

        const position: [number, number, number] = [
            targetPos[0],
            targetPos[1] + camera.offset[1],
            targetPos[2] + distance,
        ];

        // 锁定 Z 轴移动
        if (camera.lockAxis === 'z') {
            position[2] = distance;
        }

        return {
            position,
            rotation: [0, 0, 0],
            pivot: [targetPos[0], targetPos[1], targetPos[2]],
            fov: camera.fov
        };
    }
}
