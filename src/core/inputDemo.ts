/**
 * PolyForge v1.3.0 Input Demo
 * Phase 6: 输入系统演示
 * 
 * 场景：创建一个方块，使用方向键移动，自动产生撤销记录
 */

import { EntityManager } from './EntityManager';
import { SerializationService } from './SerializationService';
import { TransformComponent } from './components/TransformComponent';
import { VisualComponent } from './components/VisualComponent';
import { NameComponent } from './components/NameComponent';
import { CommandManager, ModifyComponentCommand } from './CommandManager';
import { InputSystem } from './systems/InputSystem';

// 全局变量
let globalEntityManager: EntityManager | null = null;
let globalCommandManager: CommandManager | null = null;
let globalInputSystem: InputSystem | null = null;
let globalBoxId: string | null = null;

/**
 * Input Demo
 * 演示输入系统和命令系统的集成
 */
export function inputDemo(): void {
  console.log('\n=== PolyForge Phase 6: Input System Demo ===\n');

  // 创建管理器
  const entityManager = new EntityManager();
  const serializationService = new SerializationService(entityManager);
  const commandManager = new CommandManager(entityManager, serializationService, 50);
  const inputSystem = new InputSystem();

  // 关联 CommandManager
  inputSystem.setCommandManager(commandManager);

  // 保存到全局变量
  globalEntityManager = entityManager;
  globalCommandManager = commandManager;
  globalInputSystem = inputSystem;

  // 注册组件
  entityManager.registerComponent('Transform', TransformComponent);
  entityManager.registerComponent('Visual', VisualComponent);
  entityManager.registerComponent('Name', NameComponent);

  console.log('✓ Managers initialized\n');

  // ============================================================================
  // 创建可控制的方块
  // ============================================================================

  console.log('=== Creating Controllable Box ===\n');

  const box = entityManager.createEntity('PlayerBox');
  globalBoxId = box.id;

  // 添加 Transform
  const transform = new TransformComponent([0, 0, 0], [0, 0, 0], [1, 1, 1]);
  entityManager.addComponent(box.id, transform);

  // 添加 Visual
  const visual = new VisualComponent();
  visual.geometry = { type: 'box', parameters: { width: 1, height: 1, depth: 1 } };
  visual.material = { type: 'standard', color: '#4CAF50' };
  entityManager.addComponent(box.id, visual);

  // 添加 Name
  entityManager.addComponent(box.id, new NameComponent('Player Box', 'A controllable box'));

  console.log(`✓ Box created: ${box.id}`);
  console.log(`  Initial position: [${transform.position.join(', ')}]\n`);

  // ============================================================================
  // 绑定输入动作
  // ============================================================================

  console.log('=== Binding Input Actions ===\n');

  const moveSpeed = 1.0;

  // 向前移动（W 或 ↑）
  inputSystem.bindAction('MOVE_FORWARD', ['w', 'arrowup'], () => {
    if (!globalBoxId || !globalEntityManager || !globalCommandManager) return;
    
    const entity = globalEntityManager.getEntity(globalBoxId);
    const transform = entity?.getComponent<TransformComponent>('Transform');
    if (!transform) return;

    const oldZ = transform.position[2];
    const newZ = oldZ + moveSpeed;

    const cmd = new ModifyComponentCommand(
      globalEntityManager,
      globalBoxId,
      'Transform',
      'position[2]',
      oldZ,
      newZ
    );
    globalCommandManager.execute(cmd);

    console.log(`📍 Moved forward: Z ${oldZ.toFixed(1)} → ${newZ.toFixed(1)}`);
  });

  // 向后移动（S 或 ↓）
  inputSystem.bindAction('MOVE_BACKWARD', ['s', 'arrowdown'], () => {
    if (!globalBoxId || !globalEntityManager || !globalCommandManager) return;
    
    const entity = globalEntityManager.getEntity(globalBoxId);
    const transform = entity?.getComponent<TransformComponent>('Transform');
    if (!transform) return;

    const oldZ = transform.position[2];
    const newZ = oldZ - moveSpeed;

    const cmd = new ModifyComponentCommand(
      globalEntityManager,
      globalBoxId,
      'Transform',
      'position[2]',
      oldZ,
      newZ
    );
    globalCommandManager.execute(cmd);

    console.log(`📍 Moved backward: Z ${oldZ.toFixed(1)} → ${newZ.toFixed(1)}`);
  });

  // 向左移动（A 或 ←）
  inputSystem.bindAction('MOVE_LEFT', ['a', 'arrowleft'], () => {
    if (!globalBoxId || !globalEntityManager || !globalCommandManager) return;
    
    const entity = globalEntityManager.getEntity(globalBoxId);
    const transform = entity?.getComponent<TransformComponent>('Transform');
    if (!transform) return;

    const oldX = transform.position[0];
    const newX = oldX - moveSpeed;

    const cmd = new ModifyComponentCommand(
      globalEntityManager,
      globalBoxId,
      'Transform',
      'position[0]',
      oldX,
      newX
    );
    globalCommandManager.execute(cmd);

    console.log(`📍 Moved left: X ${oldX.toFixed(1)} → ${newX.toFixed(1)}`);
  });

  // 向右移动（D 或 →）
  inputSystem.bindAction('MOVE_RIGHT', ['d', 'arrowright'], () => {
    if (!globalBoxId || !globalEntityManager || !globalCommandManager) return;
    
    const entity = globalEntityManager.getEntity(globalBoxId);
    const transform = entity?.getComponent<TransformComponent>('Transform');
    if (!transform) return;

    const oldX = transform.position[0];
    const newX = oldX + moveSpeed;

    const cmd = new ModifyComponentCommand(
      globalEntityManager,
      globalBoxId,
      'Transform',
      'position[0]',
      oldX,
      newX
    );
    globalCommandManager.execute(cmd);

    console.log(`📍 Moved right: X ${oldX.toFixed(1)} → ${newX.toFixed(1)}`);
  });

  console.log('✓ Input actions bound:\n');
  console.log('  W / ↑  - Move forward (+Z)');
  console.log('  S / ↓  - Move backward (-Z)');
  console.log('  A / ←  - Move left (-X)');
  console.log('  D / →  - Move right (+X)');
  console.log('  Ctrl+Z - Undo last move');
  console.log('  Ctrl+Y - Redo last move\n');

  // ============================================================================
  // 演示预设切换
  // ============================================================================

  console.log('=== Input Presets ===\n');
  console.log('Available presets:');
  console.log('  - default: WASD + Arrow keys');
  console.log('  - blender: Blender-style controls');
  console.log('  - game: Game-style controls\n');

  console.log('Current preset: default\n');

  // ============================================================================
  // 统计信息
  // ============================================================================

  const stats = inputSystem.getStats();
  console.log('=== Input System Stats ===\n');
  console.log(`Current Preset: ${stats.currentPreset}`);
  console.log(`Total Presets: ${stats.totalPresets}`);
  console.log(`Total Actions: ${stats.totalActions}`);
  console.log(`Context Stack: ${stats.contextStack.join(' > ')}\n`);

  console.log('=== Input Demo Ready! ===\n');
  console.log('✅ Input system initialized');
  console.log('✅ Box created and ready to control');
  console.log('✅ Command integration working');
  console.log('✅ Undo/Redo available\n');

  console.log('💡 Try it:');
  console.log('  1. Press W/A/S/D or arrow keys to move the box');
  console.log('  2. Press Ctrl+Z to undo moves');
  console.log('  3. Press Ctrl+Y to redo moves');
  console.log('  4. Call window.getBoxPosition() to see current position');
  console.log('  5. Call window.switchPreset("blender") to change input preset\n');
}

// ============================================================================
// 全局控制函数
// ============================================================================

/**
 * 获取方块当前位置
 */
export function getBoxPosition(): void {
  if (!globalBoxId || !globalEntityManager) {
    console.warn('Input demo not initialized. Run inputDemo() first.');
    return;
  }

  const entity = globalEntityManager.getEntity(globalBoxId);
  const transform = entity?.getComponent<TransformComponent>('Transform');

  if (transform) {
    console.log(`📍 Box position: [${transform.position.map(v => v.toFixed(1)).join(', ')}]`);
  } else {
    console.warn('Box has no Transform component.');
  }
}

/**
 * 切换输入预设
 */
export function switchPreset(presetName: string): void {
  if (!globalInputSystem) {
    console.warn('Input demo not initialized. Run inputDemo() first.');
    return;
  }

  globalInputSystem.setPreset(presetName);
}

/**
 * 显示输入系统状态
 */
export function showInputStatus(): void {
  if (!globalInputSystem) {
    console.warn('Input demo not initialized. Run inputDemo() first.');
    return;
  }

  const stats = globalInputSystem.getStats();
  console.log('\n=== Input System Status ===\n');
  console.log(`Current Preset: ${stats.currentPreset}`);
  console.log(`Total Presets: ${stats.totalPresets}`);
  console.log(`Total Actions: ${stats.totalActions}`);
  console.log(`Pressed Keys: ${stats.pressedKeys.length > 0 ? stats.pressedKeys.join(', ') : 'None'}`);
  console.log(`Pressed Buttons: ${stats.pressedButtons.length > 0 ? stats.pressedButtons.join(', ') : 'None'}`);
  console.log(`Context Stack: ${stats.contextStack.join(' > ')}\n`);
}

/**
 * 显示命令历史
 */
export function showCommandHistory(): void {
  if (!globalCommandManager) {
    console.warn('Input demo not initialized. Run inputDemo() first.');
    return;
  }

  globalCommandManager.debug();
}
