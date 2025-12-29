// 🔒 FROZEN: 核心体验已归档，严禁修改
// 除非制作人下达最高指令 "UNLOCK [Module Name]"
// Last Verified: Phase 15.4 by Mountain God

import { ICameraStrategy } from './ICameraStrategy';
import { CameraComponent } from '../../components/CameraComponent';
import { TransformComponent } from '../../components/TransformComponent';
import { InputSystem } from '../InputSystem';
import { Entity } from '../../Entity';

export class IsometricStrategy implements ICameraStrategy {
    public readonly name = 'isometric';
    public enter(camera: CameraComponent): void {
        // 强制参数归位 (ISO 标准参数)
        // 注意：不要覆盖 distance，保留用户上次缩放
        camera.pitch = 45; // 固定俯视 45 度
        camera.yaw = camera.yaw || 45;   // 默认斜 45 度，但允许旋转吗？根据 CameraSystem 里的逻辑是禁止旋转的。
        // 但是 updateCharacterControl 里用到了 yaw。
        // 让我们复刻 handleExperienceInputs 里的逻辑："Disable Rotation for Isometric"
    }

    public exit(camera: CameraComponent): void {
        // 清理工作
    }

    public handleInput(camera: CameraComponent, inputSystem: InputSystem, deltaTime: number): void {
        // 🎮 Input Logic ported from handleExperienceInputs -> Isometric Block

        // 1. Zoom (Wheel) - 处理在 CameraSystem 主循环里，还是这里？
        // CameraSystem 主循环里的缩放是通用的。这里我们只处理特有的。
        // ISO 模式下：InputSystem 主要用于 "Strategy Controller" (Pan or Move)

        this.updateStrategyController(camera, inputSystem, deltaTime);
    }

    public updateTarget(camera: CameraComponent, target: Entity | null, deltaTime: number): { position: [number, number, number]; rotation: [number, number, number]; pivot: [number, number, number]; fov: number; } {
        // 📷 Logic ported from updateIsometricMode

        let targetPos: [number, number, number] = [0, 0, 0];
        if (target) {
            const t = target.getComponent<TransformComponent>('Transform');
            if (t) {
                // 🔥 Fix: Use raw position for root entities to avoid latency
                targetPos = (target.parent && t.getWorldPosition) ? t.getWorldPosition() : t.position;
            }
        }

        // 🔥 制作人提示：纠正方向乱跳。Isometric 模式应使用组件自身的参数
        const pitch = 45;
        const yaw = camera.yaw;
        const distance = camera.distance;

        const pitchRad = pitch * Math.PI / 180;
        const yawRad = yaw * Math.PI / 180;

        // 🔥 Pivot: 基准看向目标位置 (稍微抬高看向头部)
        const pivotX = targetPos[0];
        const pivotY = targetPos[1] + 1.2;
        const pivotZ = targetPos[2];

        // 相机位置 (围绕目标点旋转)
        const x = distance * Math.cos(pitchRad) * Math.sin(yawRad);
        const y = distance * Math.sin(pitchRad);
        const z = distance * Math.cos(pitchRad) * Math.cos(yawRad);

        // 最终状态：将 pivotOffset 应用于整体
        const pivot: [number, number, number] = [
            pivotX + camera.pivotOffset[0],
            pivotY + camera.pivotOffset[1],
            pivotZ + camera.pivotOffset[2]
        ];

        const position: [number, number, number] = [
            pivot[0] + x,
            pivot[1] + y, // 🔥 y is offset from pivotY
            pivot[2] + z
        ];

        const rotation: [number, number, number] = [-pitch, yaw, 0];

        // 锁定 Y 轴旋转
        if (camera.lockAxis === 'y') {
            rotation[1] = yaw;
        }

        return {
            position,
            rotation,
            pivot,
            fov: camera.fov
        };
    }

    /**
     * 移植自 updateStrategyController
     */
    private updateStrategyController(camera: CameraComponent, inputSystem: InputSystem, deltaTime: number): void {
        // 🔥 Legacy Fallback: Enable Camera WASD if NO Character is being controlled
        if (!camera.controlledEntityId && !camera.targetEntityId) {
            let dx = 0;
            let dz = 0;
            const moveYaw = camera.yaw * Math.PI / 180;

            if (inputSystem.isActionPressed('MOVE_FORWARD')) {
                dx -= Math.sin(moveYaw); dz -= Math.cos(moveYaw);
            }
            if (inputSystem.isActionPressed('MOVE_BACKWARD')) {
                dx += Math.sin(moveYaw); dz += Math.cos(moveYaw);
            }
            if (inputSystem.isActionPressed('MOVE_LEFT')) {
                dx -= Math.cos(moveYaw); dz += Math.sin(moveYaw);
            }
            if (inputSystem.isActionPressed('MOVE_RIGHT')) {
                dx += Math.cos(moveYaw); dz -= Math.sin(moveYaw);
            }

            const panSpeed = camera.distance * 0.01;
            camera.pivotOffset[0] += dx * panSpeed;
            camera.pivotOffset[2] += dz * panSpeed;
        }
    }
}
