/**
 * PolyForge v1.3.0 Command Tests
 * CommandManager 命令系统单元测试
 */

import { EntityManager } from '../EntityManager';
import { SerializationService } from '../SerializationService';
import { TransformComponent } from '../components/TransformComponent';
import { NameComponent } from '../components/NameComponent';
import {
  CommandManager,
  CreateEntityCommand,
  DeleteEntityCommand,
  ModifyComponentCommand,
  AttachToSocketCommand,
} from '../CommandManager';

/**
 * 测试套件：CommandManager
 */
export function runCommandTests(): void {
  console.log('\n=== Command Tests ===\n');

  testCreateEntityCommand();
  testDeleteEntityCommand();
  testModifyComponentCommand();
  testMultipleUndoRedo();
  testStackSizeLimit();
  testAttachToSocketCommand();

  console.log('\n=== All Command Tests Passed! ===\n');
}

/**
 * 测试 1：创建实体命令
 */
function testCreateEntityCommand(): void {
  console.log('Test 1: Create Entity Command');

  const entityManager = new EntityManager();
  const serializationService = new SerializationService(entityManager);
  const commandManager = new CommandManager(entityManager, serializationService);

  // 注册组件
  entityManager.registerComponent('Transform', TransformComponent);

  // 执行创建命令
  const createCmd = new CreateEntityCommand(entityManager, 'TestBox');
  commandManager.execute(createCmd);

  // 验证实体已创建
  const stats1 = entityManager.getStats();
  console.assert(stats1.totalEntities === 1, 'Entity should be created');

  // 撤销创建
  commandManager.undo();

  // 验证实体已删除
  const stats2 = entityManager.getStats();
  console.assert(stats2.totalEntities === 0, 'Entity should be deleted after undo');

  // 重做创建
  commandManager.redo();

  // 验证实体已恢复
  const stats3 = entityManager.getStats();
  console.assert(stats3.totalEntities === 1, 'Entity should be restored after redo');

  console.log('✓ Create entity command works correctly\n');
}

/**
 * 测试 2：删除实体命令
 */
function testDeleteEntityCommand(): void {
  console.log('Test 2: Delete Entity Command');

  const entityManager = new EntityManager();
  const serializationService = new SerializationService(entityManager);
  const commandManager = new CommandManager(entityManager, serializationService);

  // 注册组件
  entityManager.registerComponent('Transform', TransformComponent);
  entityManager.registerComponent('Name', NameComponent);

  // 创建实体并添加组件
  const entity = entityManager.createEntity('TestEntity');
  entityManager.addComponent(entity.id, new TransformComponent([1, 2, 3]));
  entityManager.addComponent(entity.id, new NameComponent('Test', 'Description'));

  const entityId = entity.id;

  // 执行删除命令
  const deleteCmd = new DeleteEntityCommand(entityManager, serializationService, entityId);
  commandManager.execute(deleteCmd);

  // 验证实体已删除
  const stats1 = entityManager.getStats();
  console.assert(stats1.totalEntities === 0, 'Entity should be deleted');

  // 撤销删除
  commandManager.undo();

  // 验证实体已恢复
  const stats2 = entityManager.getStats();
  console.assert(stats2.totalEntities === 1, 'Entity should be restored after undo');

  // 验证组件也已恢复
  const restoredEntity = entityManager.getEntity(entityId);
  console.assert(restoredEntity !== undefined, 'Entity should exist');
  console.assert(
    restoredEntity?.hasComponent('Transform'),
    'Transform component should be restored'
  );
  console.assert(restoredEntity?.hasComponent('Name'), 'Name component should be restored');

  console.log('✓ Delete entity command works correctly\n');
}

/**
 * 测试 3：修改组件命令
 */
function testModifyComponentCommand(): void {
  console.log('Test 3: Modify Component Command');

  const entityManager = new EntityManager();
  const serializationService = new SerializationService(entityManager);
  const commandManager = new CommandManager(entityManager, serializationService);

  // 注册组件
  entityManager.registerComponent('Transform', TransformComponent);

  // 创建实体并添加组件
  const entity = entityManager.createEntity('TestEntity');
  const transform = new TransformComponent([0, 0, 0]);
  entityManager.addComponent(entity.id, transform);

  // 修改位置
  const modifyCmd = new ModifyComponentCommand(
    entityManager,
    entity.id,
    'Transform',
    'position[0]',
    0,
    10
  );
  commandManager.execute(modifyCmd);

  // 验证位置已改变
  const transform1 = entity.getComponent<TransformComponent>('Transform');
  console.assert(transform1?.position[0] === 10, 'Position should be changed to 10');

  // 撤销修改
  commandManager.undo();

  // 验证位置已恢复
  const transform2 = entity.getComponent<TransformComponent>('Transform');
  console.assert(transform2?.position[0] === 0, 'Position should be restored to 0');

  // 重做修改
  commandManager.redo();

  // 验证位置再次改变
  const transform3 = entity.getComponent<TransformComponent>('Transform');
  console.assert(transform3?.position[0] === 10, 'Position should be changed to 10 again');

  console.log('✓ Modify component command works correctly\n');
}

/**
 * 测试 4：多次撤销/重做
 */
function testMultipleUndoRedo(): void {
  console.log('Test 4: Multiple Undo/Redo');

  const entityManager = new EntityManager();
  const serializationService = new SerializationService(entityManager);
  const commandManager = new CommandManager(entityManager, serializationService);

  // 注册组件
  entityManager.registerComponent('Transform', TransformComponent);

  // 创建实体
  const entity = entityManager.createEntity('TestEntity');
  const transform = new TransformComponent([0, 0, 0]);
  entityManager.addComponent(entity.id, transform);

  // 执行多次修改
  for (let i = 1; i <= 5; i++) {
    const cmd = new ModifyComponentCommand(
      entityManager,
      entity.id,
      'Transform',
      'position[0]',
      i - 1,
      i
    );
    commandManager.execute(cmd);
  }

  // 验证最终值
  const transform1 = entity.getComponent<TransformComponent>('Transform');
  console.assert(transform1?.position[0] === 5, 'Position should be 5');

  // 撤销 3 次
  commandManager.undo();
  commandManager.undo();
  commandManager.undo();

  // 验证值
  const transform2 = entity.getComponent<TransformComponent>('Transform');
  console.assert(transform2?.position[0] === 2, 'Position should be 2 after 3 undos');

  // 重做 2 次
  commandManager.redo();
  commandManager.redo();

  // 验证值
  const transform3 = entity.getComponent<TransformComponent>('Transform');
  console.assert(transform3?.position[0] === 4, 'Position should be 4 after 2 redos');

  console.log('✓ Multiple undo/redo works correctly\n');
}

/**
 * 测试 5：栈大小限制
 */
function testStackSizeLimit(): void {
  console.log('Test 5: Stack Size Limit');

  const entityManager = new EntityManager();
  const serializationService = new SerializationService(entityManager);
  const commandManager = new CommandManager(entityManager, serializationService, 3); // 限制为 3

  // 执行 5 个命令
  for (let i = 0; i < 5; i++) {
    const cmd = new CreateEntityCommand(entityManager, `Entity${i}`);
    commandManager.execute(cmd);
  }

  // 验证栈大小
  const stats = commandManager.getStats();
  console.assert(stats.undoStackSize === 3, 'Undo stack should be limited to 3');
  console.assert(stats.maxStackSize === 3, 'Max stack size should be 3');

  console.log('✓ Stack size limit works correctly\n');
}

/**
 * 测试 6：附加到 Socket 命令
 */
function testAttachToSocketCommand(): void {
  console.log('Test 6: Attach to Socket Command');

  const entityManager = new EntityManager();
  const serializationService = new SerializationService(entityManager);
  const commandManager = new CommandManager(entityManager, serializationService);

  // 注册组件
  entityManager.registerComponent('Transform', TransformComponent);

  // 创建父子实体
  const parent = entityManager.createEntity('Parent');
  const child = entityManager.createEntity('Child');

  // 添加 Socket
  parent.addSocket({
    name: 'hand',
    localTransform: {
      position: [1, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  });

  // 执行附加命令
  const attachCmd = new AttachToSocketCommand(entityManager, child.id, parent.id, 'hand');
  commandManager.execute(attachCmd);

  // 验证附加成功
  console.assert(child.parent?.id === parent.id, 'Child should be attached to parent');
  console.assert(child.parentSocket === 'hand', 'Child should be attached to hand socket');

  // 撤销附加
  commandManager.undo();

  // 验证已分离
  console.assert(child.parent === null, 'Child should be detached from parent');
  console.assert(child.parentSocket === null, 'Child should have no parent socket');

  // 重做附加
  commandManager.redo();

  // 验证再次附加
  console.assert(child.parent?.id === parent.id, 'Child should be attached to parent again');
  console.assert(
    child.parentSocket === 'hand',
    'Child should be attached to hand socket again'
  );

  console.log('✓ Attach to socket command works correctly\n');
}
