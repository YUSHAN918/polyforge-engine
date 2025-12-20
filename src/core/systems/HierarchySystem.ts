/**
 * PolyForge v1.3.0 HierarchySystem
 * 层级系统 - 负责更新实体的世界变换矩阵
 */

import { System, Entity } from '../types';
import { TransformComponent, Matrix4 } from '../components/TransformComponent';

/**
 * HierarchySystem 层级系统
 * 每帧更新所有实体的世界矩阵，确保父级先于子级更新
 */
export class HierarchySystem implements System {
  public readonly priority = 0; // 最高优先级，最先执行
  public readonly requiredComponents = ['Transform'];

  private tempMatrix: Matrix4;

  constructor() {
    this.tempMatrix = new Float32Array(16);
  }

  /**
   * 更新所有实体的世界矩阵
   */
  update(deltaTime: number, entities: Entity[]): void {
    // 按层级深度排序实体（根实体优先）
    const sorted = this.sortByHierarchyDepth(entities);

    // 更新所有实体的世界矩阵
    for (const entity of sorted) {
      this.updateEntityWorldMatrix(entity);
    }
  }

  /**
   * 更新单个实体的世界矩阵
   */
  private updateEntityWorldMatrix(entity: Entity): void {
    const transform = entity.getComponent<TransformComponent>('Transform');
    if (!transform) return;

    // 获取本地矩阵
    const localMatrix = transform.getLocalMatrix();

    // 如果有父实体，计算世界矩阵 = 父世界矩阵 * 本地矩阵
    if (entity.parent) {
      const parentTransform = entity.parent.getComponent<TransformComponent>('Transform');
      if (parentTransform) {
        const parentWorldMatrix = parentTransform.getWorldMatrix();
        
        // 如果附加到 Socket，需要应用 Socket 的本地变换
        const socketTransform = this.getSocketTransform(entity);
        if (socketTransform) {
          // worldMatrix = parentWorldMatrix * socketTransform * localMatrix
          TransformComponent.multiply(parentWorldMatrix, socketTransform, this.tempMatrix);
          TransformComponent.multiply(this.tempMatrix, localMatrix, this.tempMatrix);
        } else {
          // worldMatrix = parentWorldMatrix * localMatrix
          TransformComponent.multiply(parentWorldMatrix, localMatrix, this.tempMatrix);
        }
        
        transform.setWorldMatrix(this.tempMatrix);
      } else {
        // 父实体没有 Transform，使用本地矩阵作为世界矩阵
        transform.setWorldMatrix(localMatrix);
      }
    } else {
      // 根实体，世界矩阵 = 本地矩阵
      transform.setWorldMatrix(localMatrix);
    }

    // 标记子实体为脏（如果本地变换改变了）
    if (transform.isWorldDirty()) {
      this.markChildrenDirty(entity);
    }

    transform.clearDirty();
  }

  /**
   * 获取 Socket 的变换矩阵
   */
  private getSocketTransform(entity: Entity): Matrix4 | null {
    if (!entity.parent) return null;

    // 查找实体附加到哪个 Socket
    for (const [socketName, socket] of entity.parent.sockets.entries()) {
      if (socket.occupied === entity) {
        // 创建 Socket 的变换矩阵
        const socketMatrix = new Float32Array(16);
        this.setIdentity(socketMatrix);
        
        // 应用 Socket 的本地变换
        this.translate(socketMatrix, socket.localTransform.position);
        this.rotateZ(socketMatrix, socket.localTransform.rotation[2]);
        this.rotateY(socketMatrix, socket.localTransform.rotation[1]);
        this.rotateX(socketMatrix, socket.localTransform.rotation[0]);
        this.scale3(socketMatrix, socket.localTransform.scale);
        
        return socketMatrix;
      }
    }

    return null;
  }

  /**
   * 标记所有子实体为脏
   */
  private markChildrenDirty(entity: Entity): void {
    for (const child of entity.children) {
      const childTransform = child.getComponent<TransformComponent>('Transform');
      if (childTransform) {
        childTransform.markWorldDirty();
      }
      // 递归标记子实体的子实体
      this.markChildrenDirty(child);
    }
  }

  /**
   * 按层级深度排序实体（根实体优先）
   */
  private sortByHierarchyDepth(entities: Entity[]): Entity[] {
    return entities.slice().sort((a, b) => {
      const depthA = this.getHierarchyDepth(a);
      const depthB = this.getHierarchyDepth(b);
      return depthA - depthB;
    });
  }

  /**
   * 获取实体的层级深度
   */
  private getHierarchyDepth(entity: Entity): number {
    let depth = 0;
    let current: Entity | undefined = entity.parent;
    while (current) {
      depth++;
      current = current.parent;
    }
    return depth;
  }

  // ============================================================================
  // 矩阵工具方法（简化版）
  // ============================================================================

  private setIdentity(m: Matrix4): void {
    m[0] = 1; m[4] = 0; m[8] = 0; m[12] = 0;
    m[1] = 0; m[5] = 1; m[9] = 0; m[13] = 0;
    m[2] = 0; m[6] = 0; m[10] = 1; m[14] = 0;
    m[3] = 0; m[7] = 0; m[11] = 0; m[15] = 1;
  }

  private translate(m: Matrix4, v: [number, number, number]): void {
    m[12] += v[0];
    m[13] += v[1];
    m[14] += v[2];
  }

  private rotateX(m: Matrix4, degrees: number): void {
    const rad = degrees * Math.PI / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const m1 = m[1], m2 = m[2];
    const m5 = m[5], m6 = m[6];
    const m9 = m[9], m10 = m[10];
    m[1] = m1 * c + m2 * s;
    m[2] = m2 * c - m1 * s;
    m[5] = m5 * c + m6 * s;
    m[6] = m6 * c - m5 * s;
    m[9] = m9 * c + m10 * s;
    m[10] = m10 * c - m9 * s;
  }

  private rotateY(m: Matrix4, degrees: number): void {
    const rad = degrees * Math.PI / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const m0 = m[0], m2 = m[2];
    const m4 = m[4], m6 = m[6];
    const m8 = m[8], m10 = m[10];
    m[0] = m0 * c - m2 * s;
    m[2] = m2 * c + m0 * s;
    m[4] = m4 * c - m6 * s;
    m[6] = m6 * c + m4 * s;
    m[8] = m8 * c - m10 * s;
    m[10] = m10 * c + m8 * s;
  }

  private rotateZ(m: Matrix4, degrees: number): void {
    const rad = degrees * Math.PI / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const m0 = m[0], m1 = m[1];
    const m4 = m[4], m5 = m[5];
    const m8 = m[8], m9 = m[9];
    m[0] = m0 * c + m1 * s;
    m[1] = m1 * c - m0 * s;
    m[4] = m4 * c + m5 * s;
    m[5] = m5 * c - m4 * s;
    m[8] = m8 * c + m9 * s;
    m[9] = m9 * c - m8 * s;
  }

  private scale3(m: Matrix4, v: [number, number, number]): void {
    m[0] *= v[0];
    m[1] *= v[0];
    m[2] *= v[0];
    m[3] *= v[0];
    m[4] *= v[1];
    m[5] *= v[1];
    m[6] *= v[1];
    m[7] *= v[1];
    m[8] *= v[2];
    m[9] *= v[2];
    m[10] *= v[2];
    m[11] *= v[2];
  }

  // ============================================================================
  // System 生命周期回调
  // ============================================================================

  onEntityAdded(entity: Entity): void {
    // 实体添加时，标记其 Transform 为脏
    const transform = entity.getComponent<TransformComponent>('Transform');
    if (transform) {
      transform.markWorldDirty();
    }
  }

  onEntityRemoved(entity: Entity): void {
    // 实体移除时无需特殊处理
  }
}
