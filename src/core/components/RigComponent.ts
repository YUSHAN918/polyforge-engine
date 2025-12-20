/**
 * PolyForge v1.3.0 RigComponent
 * 骨骼组件 - 定义实体的骨骼结构
 */

import { Component, ComponentData } from '../types';

/**
 * 骨骼类型
 */
export type RigType = 'humanoid' | 'multiped' | 'custom';

/**
 * 骨骼定义
 */
export interface BoneDefinition {
  name: string; // 骨骼名称（如 'spine', 'head', 'arm_left'）
  parent?: string; // 父骨骼名称
  position: [number, number, number]; // 相对父骨骼的位置
  rotation: [number, number, number]; // 相对父骨骼的旋转（欧拉角）
}

/**
 * IK 链定义
 */
export interface IKChain {
  name: string; // IK 链名称（如 'left_arm_ik'）
  bones: string[]; // 骨骼名称列表（从根到末端）
  target?: [number, number, number]; // IK 目标位置
  poleTarget?: [number, number, number]; // 极向量目标
}

/**
 * 骨骼约束
 */
export interface BoneConstraint {
  boneName: string; // 约束的骨骼名称
  type: 'rotation' | 'position' | 'scale'; // 约束类型
  min?: [number, number, number]; // 最小值
  max?: [number, number, number]; // 最大值
  locked?: boolean[]; // 锁定的轴 [x, y, z]
}

/**
 * RigComponent 骨骼组件
 * 定义实体的骨骼结构，支持人形、多足和自定义骨骼树
 */
export class RigComponent implements Component {
  public readonly type = 'Rig';
  public enabled: boolean = true;

  // 骨骼类型
  public rigType: RigType;

  // 骨骼树（骨骼名称 -> 骨骼定义）
  public bones: Map<string, BoneDefinition>;

  // IK 链（可选）
  public ikChains: IKChain[];

  // 骨骼约束（可选）
  public constraints: BoneConstraint[];

  constructor(
    rigType: RigType = 'humanoid',
    bones: Map<string, BoneDefinition> = new Map(),
    ikChains: IKChain[] = [],
    constraints: BoneConstraint[] = []
  ) {
    this.rigType = rigType;
    this.bones = bones;
    this.ikChains = ikChains;
    this.constraints = constraints;
  }

  serialize(): ComponentData {
    // 将 Map 转换为数组以便序列化
    const bonesArray = Array.from(this.bones.entries()).map(([name, bone]) => ({
      name,
      ...bone,
    }));

    return {
      type: this.type,
      enabled: this.enabled,
      rigType: this.rigType,
      bones: bonesArray,
      ikChains: this.ikChains,
      constraints: this.constraints,
    };
  }

  deserialize(data: ComponentData): void {
    this.enabled = data.enabled ?? true;
    this.rigType = data.rigType || 'humanoid';

    // 将数组转换回 Map
    this.bones = new Map();
    if (data.bones && Array.isArray(data.bones)) {
      for (const bone of data.bones) {
        this.bones.set(bone.name, {
          name: bone.name,
          parent: bone.parent,
          position: bone.position || [0, 0, 0],
          rotation: bone.rotation || [0, 0, 0],
        });
      }
    }

    this.ikChains = data.ikChains || [];
    this.constraints = data.constraints || [];
  }

  /**
   * 添加骨骼
   */
  addBone(bone: BoneDefinition): void {
    this.bones.set(bone.name, bone);
  }

  /**
   * 移除骨骼
   */
  removeBone(boneName: string): void {
    this.bones.delete(boneName);
  }

  /**
   * 获取骨骼
   */
  getBone(boneName: string): BoneDefinition | undefined {
    return this.bones.get(boneName);
  }

  /**
   * 获取根骨骼（没有父骨骼的骨骼）
   */
  getRootBones(): BoneDefinition[] {
    const roots: BoneDefinition[] = [];
    for (const bone of this.bones.values()) {
      if (!bone.parent) {
        roots.push(bone);
      }
    }
    return roots;
  }

  /**
   * 获取子骨骼
   */
  getChildBones(parentName: string): BoneDefinition[] {
    const children: BoneDefinition[] = [];
    for (const bone of this.bones.values()) {
      if (bone.parent === parentName) {
        children.push(bone);
      }
    }
    return children;
  }

  /**
   * 添加 IK 链
   */
  addIKChain(chain: IKChain): void {
    this.ikChains.push(chain);
  }

  /**
   * 移除 IK 链
   */
  removeIKChain(chainName: string): void {
    this.ikChains = this.ikChains.filter((chain) => chain.name !== chainName);
  }

  /**
   * 添加约束
   */
  addConstraint(constraint: BoneConstraint): void {
    this.constraints.push(constraint);
  }

  /**
   * 移除约束
   */
  removeConstraint(boneName: string): void {
    this.constraints = this.constraints.filter(
      (constraint) => constraint.boneName !== boneName
    );
  }

  /**
   * 创建标准人形骨骼
   */
  static createHumanoidRig(): RigComponent {
    const rig = new RigComponent('humanoid');

    // 躯干
    rig.addBone({ name: 'root', position: [0, 0, 0], rotation: [0, 0, 0] });
    rig.addBone({
      name: 'spine',
      parent: 'root',
      position: [0, 1, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'chest',
      parent: 'spine',
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'neck',
      parent: 'chest',
      position: [0, 0.3, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'head',
      parent: 'neck',
      position: [0, 0.2, 0],
      rotation: [0, 0, 0],
    });

    // 左臂
    rig.addBone({
      name: 'shoulder_left',
      parent: 'chest',
      position: [-0.2, 0.2, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'arm_left',
      parent: 'shoulder_left',
      position: [-0.3, 0, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'forearm_left',
      parent: 'arm_left',
      position: [-0.3, 0, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'hand_left',
      parent: 'forearm_left',
      position: [-0.2, 0, 0],
      rotation: [0, 0, 0],
    });

    // 右臂
    rig.addBone({
      name: 'shoulder_right',
      parent: 'chest',
      position: [0.2, 0.2, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'arm_right',
      parent: 'shoulder_right',
      position: [0.3, 0, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'forearm_right',
      parent: 'arm_right',
      position: [0.3, 0, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'hand_right',
      parent: 'forearm_right',
      position: [0.2, 0, 0],
      rotation: [0, 0, 0],
    });

    // 左腿
    rig.addBone({
      name: 'hip_left',
      parent: 'root',
      position: [-0.15, 0, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'thigh_left',
      parent: 'hip_left',
      position: [0, -0.4, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'shin_left',
      parent: 'thigh_left',
      position: [0, -0.4, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'foot_left',
      parent: 'shin_left',
      position: [0, -0.2, 0.1],
      rotation: [0, 0, 0],
    });

    // 右腿
    rig.addBone({
      name: 'hip_right',
      parent: 'root',
      position: [0.15, 0, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'thigh_right',
      parent: 'hip_right',
      position: [0, -0.4, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'shin_right',
      parent: 'thigh_right',
      position: [0, -0.4, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'foot_right',
      parent: 'shin_right',
      position: [0, -0.2, 0.1],
      rotation: [0, 0, 0],
    });

    return rig;
  }

  /**
   * 创建四足动物骨骼
   */
  static createMultipedRig(): RigComponent {
    const rig = new RigComponent('multiped');

    // 躯干
    rig.addBone({ name: 'root', position: [0, 0, 0], rotation: [0, 0, 0] });
    rig.addBone({
      name: 'spine1',
      parent: 'root',
      position: [0, 0, 0.3],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'spine2',
      parent: 'spine1',
      position: [0, 0, 0.3],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'neck',
      parent: 'spine2',
      position: [0, 0, 0.2],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'head',
      parent: 'neck',
      position: [0, 0, 0.2],
      rotation: [0, 0, 0],
    });

    // 前左腿
    rig.addBone({
      name: 'shoulder_front_left',
      parent: 'spine2',
      position: [-0.15, 0, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'leg_front_left',
      parent: 'shoulder_front_left',
      position: [0, -0.3, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'foot_front_left',
      parent: 'leg_front_left',
      position: [0, -0.3, 0],
      rotation: [0, 0, 0],
    });

    // 前右腿
    rig.addBone({
      name: 'shoulder_front_right',
      parent: 'spine2',
      position: [0.15, 0, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'leg_front_right',
      parent: 'shoulder_front_right',
      position: [0, -0.3, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'foot_front_right',
      parent: 'leg_front_right',
      position: [0, -0.3, 0],
      rotation: [0, 0, 0],
    });

    // 后左腿
    rig.addBone({
      name: 'hip_back_left',
      parent: 'root',
      position: [-0.15, 0, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'leg_back_left',
      parent: 'hip_back_left',
      position: [0, -0.3, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'foot_back_left',
      parent: 'leg_back_left',
      position: [0, -0.3, 0],
      rotation: [0, 0, 0],
    });

    // 后右腿
    rig.addBone({
      name: 'hip_back_right',
      parent: 'root',
      position: [0.15, 0, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'leg_back_right',
      parent: 'hip_back_right',
      position: [0, -0.3, 0],
      rotation: [0, 0, 0],
    });
    rig.addBone({
      name: 'foot_back_right',
      parent: 'leg_back_right',
      position: [0, -0.3, 0],
      rotation: [0, 0, 0],
    });

    return rig;
  }
}
