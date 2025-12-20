/**
 * PolyForge v1.3.0 Hierarchy Tests
 * 层级系统单元测试 - 验证父子变换传播
 */

import { EntityManager } from '../EntityManager';
import { SystemManager } from '../SystemManager';
import { TransformComponent } from '../components/TransformComponent';
import { HierarchySystem } from '../systems/HierarchySystem';

/**
 * 测试套件：层级变换传播
 */
export function runHierarchyTests(): void {
  console.log('\n=== Hierarchy Transform Tests ===\n');

  testBasicHierarchy();
  testSocketAttachment();
  testDeepHierarchy();
  testParentRotation();
  testDirtyPropagation();

  console.log('\n=== All Hierarchy Tests Passed! ===\n');
}

/**
 * 测试 1：基础层级变换
 */
function testBasicHierarchy(): void {
  console.log('Test 1: Basic Hierarchy Transform');

  const entityManager = new EntityManager();
  const systemManager = new SystemManager(entityManager);
  entityManager.setSystemManager(systemManager);

  // 注册组件和系统
  entityManager.registerComponent('Transform', TransformComponent);
  systemManager.registerSystem('Hierarchy', new HierarchySystem());

  // 创建父子实体
  const parent = entityManager.createEntity('Parent');
  const child = entityManager.createEntity('Child');

  const parentTransform = new TransformComponent([10, 0, 0]);
  const childTransform = new TransformComponent([5, 0, 0]);

  entityManager.addComponent(parent.id, parentTransform);
  entityManager.addComponent(child.id, childTransform);

  // 设置父子关系
  entityManager.setParent(child.id, parent.id);

  // 更新层级系统
  systemManager.update(0.016);

  // 验证子实体的世界位置 = 父位置 + 子本地位置
  const childWorldPos = childTransform.getWorldPosition();
  console.assert(
    Math.abs(childWorldPos[0] - 15) < 0.001,
    `Child world X should be 15, got ${childWorldPos[0]}`
  );
  console.assert(
    Math.abs(childWorldPos[1] - 0) < 0.001,
    `Child world Y should be 0, got ${childWorldPos[1]}`
  );
  console.assert(
    Math.abs(childWorldPos[2] - 0) < 0.001,
    `Child world Z should be 0, got ${childWorldPos[2]}`
  );

  console.log('✓ Basic hierarchy transform works correctly\n');
}

/**
 * 测试 2：Socket 附加
 */
function testSocketAttachment(): void {
  console.log('Test 2: Socket Attachment');

  const entityManager = new EntityManager();
  const systemManager = new SystemManager(entityManager);
  entityManager.setSystemManager(systemManager);

  entityManager.registerComponent('Transform', TransformComponent);
  systemManager.registerSystem('Hierarchy', new HierarchySystem());

  // 创建父子实体
  const parent = entityManager.createEntity('Parent');
  const child = entityManager.createEntity('Child');

  const parentTransform = new TransformComponent([0, 0, 0]);
  const childTransform = new TransformComponent([0, 0, 0]);

  entityManager.addComponent(parent.id, parentTransform);
  entityManager.addComponent(child.id, childTransform);

  // 添加 Socket
  parent.addSocket({
    name: 'hand_right',
    localTransform: {
      position: [2, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  });

  // 附加到 Socket
  entityManager.setParent(child.id, parent.id, 'hand_right');

  // 更新层级系统
  systemManager.update(0.016);

  // 验证子实体的世界位置 = Socket 位置
  const childWorldPos = childTransform.getWorldPosition();
  console.assert(
    Math.abs(childWorldPos[0] - 2) < 0.001,
    `Child world X should be 2 (socket offset), got ${childWorldPos[0]}`
  );
  console.assert(
    Math.abs(childWorldPos[1] - 1) < 0.001,
    `Child world Y should be 1 (socket offset), got ${childWorldPos[1]}`
  );

  console.log('✓ Socket attachment works correctly\n');
}

/**
 * 测试 3：深度嵌套层级
 */
function testDeepHierarchy(): void {
  console.log('Test 3: Deep Hierarchy (3 levels)');

  const entityManager = new EntityManager();
  const systemManager = new SystemManager(entityManager);
  entityManager.setSystemManager(systemManager);

  entityManager.registerComponent('Transform', TransformComponent);
  systemManager.registerSystem('Hierarchy', new HierarchySystem());

  // 创建三层层级：祖父 -> 父 -> 子
  const grandparent = entityManager.createEntity('Grandparent');
  const parent = entityManager.createEntity('Parent');
  const child = entityManager.createEntity('Child');

  const gpTransform = new TransformComponent([10, 0, 0]);
  const pTransform = new TransformComponent([5, 0, 0]);
  const cTransform = new TransformComponent([2, 0, 0]);

  entityManager.addComponent(grandparent.id, gpTransform);
  entityManager.addComponent(parent.id, pTransform);
  entityManager.addComponent(child.id, cTransform);

  // 设置层级关系
  entityManager.setParent(parent.id, grandparent.id);
  entityManager.setParent(child.id, parent.id);

  // 更新层级系统
  systemManager.update(0.016);

  // 验证子实体的世界位置 = 10 + 5 + 2 = 17
  const childWorldPos = cTransform.getWorldPosition();
  console.assert(
    Math.abs(childWorldPos[0] - 17) < 0.001,
    `Child world X should be 17, got ${childWorldPos[0]}`
  );

  console.log('✓ Deep hierarchy works correctly\n');
}

/**
 * 测试 4：父实体旋转
 */
function testParentRotation(): void {
  console.log('Test 4: Parent Rotation Affects Child');

  const entityManager = new EntityManager();
  const systemManager = new SystemManager(entityManager);
  entityManager.setSystemManager(systemManager);

  entityManager.registerComponent('Transform', TransformComponent);
  systemManager.registerSystem('Hierarchy', new HierarchySystem());

  // 创建父子实体
  const parent = entityManager.createEntity('Parent');
  const child = entityManager.createEntity('Child');

  const parentTransform = new TransformComponent([0, 0, 0], [0, 90, 0]); // 绕 Y 轴旋转 90 度
  const childTransform = new TransformComponent([1, 0, 0]); // 子实体在父实体的 X 轴正方向

  entityManager.addComponent(parent.id, parentTransform);
  entityManager.addComponent(child.id, childTransform);

  entityManager.setParent(child.id, parent.id);

  // 更新层级系统
  systemManager.update(0.016);

  // 验证子实体的世界位置（旋转 90 度后，X 轴变成 Z 轴）
  const childWorldPos = childTransform.getWorldPosition();
  console.assert(
    Math.abs(childWorldPos[0]) < 0.001,
    `Child world X should be ~0, got ${childWorldPos[0]}`
  );
  console.assert(
    Math.abs(childWorldPos[2] - 1) < 0.001,
    `Child world Z should be ~1, got ${childWorldPos[2]}`
  );

  console.log('✓ Parent rotation affects child correctly\n');
}

/**
 * 测试 5：脏标记传播
 */
function testDirtyPropagation(): void {
  console.log('Test 5: Dirty Flag Propagation');

  const entityManager = new EntityManager();
  const systemManager = new SystemManager(entityManager);
  entityManager.setSystemManager(systemManager);

  entityManager.registerComponent('Transform', TransformComponent);
  systemManager.registerSystem('Hierarchy', new HierarchySystem());

  // 创建父子实体
  const parent = entityManager.createEntity('Parent');
  const child = entityManager.createEntity('Child');

  const parentTransform = new TransformComponent([0, 0, 0]);
  const childTransform = new TransformComponent([5, 0, 0]);

  entityManager.addComponent(parent.id, parentTransform);
  entityManager.addComponent(child.id, childTransform);

  entityManager.setParent(child.id, parent.id);

  // 第一次更新
  systemManager.update(0.016);

  const initialChildPos = childTransform.getWorldPosition();
  console.assert(
    Math.abs(initialChildPos[0] - 5) < 0.001,
    `Initial child world X should be 5, got ${initialChildPos[0]}`
  );

  // 改变父实体位置
  parentTransform.position[0] = 10;
  parentTransform.markLocalDirty();

  // 第二次更新
  systemManager.update(0.016);

  // 验证子实体的世界位置已更新
  const updatedChildPos = childTransform.getWorldPosition();
  console.assert(
    Math.abs(updatedChildPos[0] - 15) < 0.001,
    `Updated child world X should be 15, got ${updatedChildPos[0]}`
  );

  console.log('✓ Dirty flag propagation works correctly\n');
}
