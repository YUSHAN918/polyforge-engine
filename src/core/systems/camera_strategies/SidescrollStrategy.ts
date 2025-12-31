import { ICameraStrategy } from './ICameraStrategy';
import { CameraComponent } from '../../components/CameraComponent';
import { TransformComponent } from '../../components/TransformComponent';
import { InputSystem } from '../InputSystem';
import { Entity } from '../../Entity';

export class SidescrollStrategy implements ICameraStrategy {
    public readonly name = 'sidescroll';
    public enter(camera: CameraComponent): void { }
    public exit(camera: CameraComponent): void {
        // 清理工作：归零平移偏移
        camera.pivotOffset[0] = 0;
        camera.pivotOffset[1] = 0;
        camera.pivotOffset[2] = 0;
    }

    public handleInput(camera: CameraComponent, inputSystem: InputSystem, deltaTime: number): void {
        // 🚫 NO-OP: Do not move camera pivot manually. 
        // Let CameraSystem.updateCharacterControl handle WASD for the character.
        // The camera will naturally follow the character.
    }

    public updateTarget(camera: CameraComponent, target: Entity | null, deltaTime: number): { position: [number, number, number]; rotation: [number, number, number]; pivot: [number, number, number]; fov: number; } {
        let targetPos: [number, number, number] = [0, 0, 0];
        const t = target?.getComponent<TransformComponent>('Transform');

        if (t) {
            // 🔥 Fix: Use raw position for root entities to avoid latency (Same as TPS/FPS)
            targetPos = (target?.parent && t.getWorldPosition) ? t.getWorldPosition() : t.position;
        }


        // 侧板模式：严格锁定 Z 轴距离，跟随 X/Y
        // 旋转必须归零（正视前方）

        // 1. 计算目标中心 (Pivot)
        const pivot: [number, number, number] = [
            targetPos[0],
            targetPos[1] + 1.5, // 🚀 提高高度至 1.5m，越过地表植被，看向胸部/头部
            targetPos[2]
        ];

        // 2. 计算相机位置 (基于球面坐标，与 TPS/ISO 统一)
        const pitchRad = camera.pitch * Math.PI / 180;
        const yawRad = camera.yaw * Math.PI / 180;
        const distance = camera.distance;

        const offsetX = distance * Math.cos(pitchRad) * Math.sin(yawRad);
        const offsetY = distance * Math.sin(pitchRad);
        const offsetZ = distance * Math.cos(pitchRad) * Math.cos(yawRad);

        // 最终相机位置 = Pivot + Offset + Manual PivotOffset
        const position: [number, number, number] = [
            pivot[0] + offsetX + camera.pivotOffset[0],
            pivot[1] + offsetY + camera.pivotOffset[1],
            pivot[2] + offsetZ + camera.pivotOffset[2]
        ];

        // 3. 角度同步
        const rotation: [number, number, number] = [-camera.pitch, camera.yaw, 0];

        return {
            position,
            rotation,
            pivot,
            fov: camera.fov
        };
    }
}
