/**
 * PolyForge v1.3.0 Test Runner
 * 简单的测试运行器，用于在浏览器控制台中运行测试
 */

import { hierarchyDemo, clockDemo, setSpeed, pauseGame, resumeGame, togglePause, getClockStatus, commandDemo, spawnBox, moveBox, deleteLastBox, undoLast, redoLast, showHistory, clearHistory, inputDemo, getBoxPosition, switchPreset, showInputStatus, showCommandHistory, physicsDemo, stopPhysics, startPhysics, resetPhysics, setGravity, spawnPhysicsBox, showPhysicsStatus, cameraDemo, stopCameraDemo, startCameraDemo, switchCameraMode, applyCameraPreset, getCameraSnapshot, moveCameraTarget, rotateCameraView, setCameraDistance, showCameraStatus, assetDemo, listAssets, clearAssets, assetStats, modelUploadDemo } from './core';
import { quickDemo } from './core/quickDemo';
import { runSystemDemo, runHeartbeatDemo } from './core/systemDemo';
import { runSerializationDemo, runSnapshotDemo } from './core/serializationDemo';
import { runVisualDemo } from './core/visualDemo';
import { runVehicleDemo } from './core/vehicleDemo';
import { runHierarchyTests } from './core/__tests__/Hierarchy.test';
import { runEntityManagerTests } from './core/__tests__/EntityManager.test';
import { runClockTests } from './core/__tests__/Clock.test';
import { runCommandTests } from './core/__tests__/Command.test';

/**
 * 在浏览器控制台中运行所有测试
 */
export function runAllTests(): void {
  console.clear();
  console.log('%c🚀 PolyForge v1.3.0 Test Runner', 'font-size: 20px; font-weight: bold; color: #4CAF50;');
  console.log('%cRunning ECS Core Tests...', 'font-size: 14px; color: #2196F3;');
  console.log('');

  try {
    // Phase 1 测试
    runEntityManagerTests();
    
    // Phase 3 测试
    runHierarchyTests();
    
    // Phase 4 测试
    runClockTests();
    
    // Phase 5 测试
    runCommandTests();
    
    console.log('%c✅ All tests passed!', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
  } catch (error) {
    console.error('%c❌ Tests failed!', 'font-size: 16px; font-weight: bold; color: #F44336;');
    console.error(error);
  }
}

/**
 * 运行快速演示（更简洁的输出）
 */
export function runQuickDemo(): void {
  console.clear();
  try {
    quickDemo();
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

/**
 * 运行系统演示
 */
export function runSystemDemoWrapper(): void {
  console.clear();
  try {
    runSystemDemo();
  } catch (error) {
    console.error('System demo failed:', error);
  }
}

/**
 * 运行心跳演示
 */
export function runHeartbeatDemoWrapper(): void {
  console.clear();
  try {
    runHeartbeatDemo();
  } catch (error) {
    console.error('Heartbeat demo failed:', error);
  }
}

/**
 * 运行序列化演示
 */
export function runSerializationDemoWrapper(): void {
  console.clear();
  try {
    runSerializationDemo();
  } catch (error) {
    console.error('Serialization demo failed:', error);
  }
}

/**
 * 运行快照演示
 */
export function runSnapshotDemoWrapper(): void {
  console.clear();
  try {
    runSnapshotDemo();
  } catch (error) {
    console.error('Snapshot demo failed:', error);
  }
}

/**
 * 运行视觉组件演示（阶段 2）
 */
export function runVisualDemoWrapper(): void {
  console.clear();
  try {
    runVisualDemo();
  } catch (error) {
    console.error('Visual demo failed:', error);
  }
}

/**
 * 运行载具演示（阶段 2）
 */
export function runVehicleDemoWrapper(): void {
  console.clear();
  try {
    runVehicleDemo();
  } catch (error) {
    console.error('Vehicle demo failed:', error);
  }
}

/**
 * 运行层级系统演示（阶段 3）
 */
export function runHierarchyDemoWrapper(): void {
  console.clear();
  try {
    hierarchyDemo();
  } catch (error) {
    console.error('Hierarchy demo failed:', error);
  }
}

/**
 * 运行时钟系统演示（阶段 4）
 */
export function runClockDemoWrapper(): void {
  console.clear();
  try {
    clockDemo();
  } catch (error) {
    console.error('Clock demo failed:', error);
  }
}

/**
 * 运行命令系统演示（阶段 5）
 */
export function runCommandDemoWrapper(): void {
  console.clear();
  try {
    commandDemo();
  } catch (error) {
    console.error('Command demo failed:', error);
  }
}

/**
 * 运行输入系统演示（阶段 6）
 */
export function runInputDemoWrapper(): void {
  console.clear();
  try {
    inputDemo();
  } catch (error) {
    console.error('Input demo failed:', error);
  }
}

/**
 * 运行物理系统演示（阶段 8）
 */
export function runPhysicsDemoWrapper(): void {
  console.clear();
  try {
    physicsDemo();
  } catch (error) {
    console.error('Physics demo failed:', error);
  }
}

/**
 * 运行相机系统演示（阶段 10）
 */
export function runCameraDemoWrapper(): void {
  console.clear();
  try {
    cameraDemo();
  } catch (error) {
    console.error('Camera demo failed:', error);
  }
}

/**
 * 运行资产系统演示（阶段 7）
 */
export function runAssetDemoWrapper(): void {
  console.clear();
  try {
    assetDemo();
  } catch (error) {
    console.error('Asset demo failed:', error);
  }
}

// 暴露到全局，方便在控制台调用
if (typeof window !== 'undefined') {
  (window as any).runPolyForgeTests = runAllTests;
  (window as any).quickDemo = runQuickDemo;
  (window as any).systemDemo = runSystemDemoWrapper;
  (window as any).heartbeatDemo = runHeartbeatDemoWrapper;
  (window as any).serializationDemo = runSerializationDemoWrapper;
  (window as any).snapshotDemo = runSnapshotDemoWrapper;
  (window as any).visualDemo = runVisualDemoWrapper; // 🆕 阶段 2.1
  (window as any).vehicleDemo = runVehicleDemoWrapper; // 🆕 阶段 2.2
  (window as any).hierarchyDemo = runHierarchyDemoWrapper; // 🆕 阶段 3
  (window as any).clockDemo = runClockDemoWrapper; // 🆕 阶段 4
  (window as any).commandDemo = runCommandDemoWrapper; // 🆕 阶段 5
  (window as any).inputDemo = runInputDemoWrapper; // 🆕 阶段 6
  (window as any).physicsDemo = runPhysicsDemoWrapper; // 🆕 阶段 8
  (window as any).cameraDemo = runCameraDemoWrapper; // 🆕 阶段 10
  (window as any).assetDemo = runAssetDemoWrapper; // 🆕 阶段 7
  
  // 时钟控制函数
  (window as any).setSpeed = setSpeed;
  (window as any).pauseGame = pauseGame;
  (window as any).resumeGame = resumeGame;
  (window as any).togglePause = togglePause;
  (window as any).getClockStatus = getClockStatus;
  
  // 命令控制函数
  (window as any).spawnBox = spawnBox;
  (window as any).moveBox = moveBox;
  (window as any).deleteLastBox = deleteLastBox;
  (window as any).undoLast = undoLast;
  (window as any).redoLast = redoLast;
  (window as any).showHistory = showHistory;
  (window as any).clearHistory = clearHistory;
  
  // 输入控制函数
  (window as any).getBoxPosition = getBoxPosition;
  (window as any).switchPreset = switchPreset;
  (window as any).showInputStatus = showInputStatus;
  (window as any).showCommandHistory = showCommandHistory;
  
  // 物理控制函数
  (window as any).stopPhysics = stopPhysics;
  (window as any).startPhysics = startPhysics;
  (window as any).resetPhysics = resetPhysics;
  (window as any).setGravity = setGravity;
  (window as any).spawnPhysicsBox = spawnPhysicsBox;
  (window as any).showPhysicsStatus = showPhysicsStatus;
  
  // 相机控制函数
  (window as any).stopCameraDemo = stopCameraDemo;
  (window as any).startCameraDemo = startCameraDemo;
  (window as any).switchCameraMode = switchCameraMode;
  (window as any).applyCameraPreset = applyCameraPreset;
  (window as any).getCameraSnapshot = getCameraSnapshot;
  (window as any).moveCameraTarget = moveCameraTarget;
  (window as any).rotateCameraView = rotateCameraView;
  (window as any).setCameraDistance = setCameraDistance;
  (window as any).showCameraStatus = showCameraStatus;
  
  // 资产控制函数
  (window as any).listAssets = listAssets;
  (window as any).clearAssets = clearAssets;
  (window as any).assetStats = assetStats;
  (window as any).modelUploadDemo = modelUploadDemo;
  
  console.log('%c╔════════════════════════════════════════════════════════════╗', 'color: #4CAF50;');
  console.log('%c║  PolyForge v1.3.0 Core ECS - Test Runner Loaded          ║', 'color: #4CAF50; font-weight: bold;');
  console.log('%c╚════════════════════════════════════════════════════════════╝', 'color: #4CAF50;');
  console.log('');
  console.log('%c📋 Available Commands:', 'color: #2196F3; font-weight: bold;');
  console.log('%c  window.quickDemo()           ', 'color: #FF9800;', '- Quick demo (recommended)');
  console.log('%c  window.clockDemo()           ', 'color: #FF9800;', '- Clock system demo ⏱️ NEW!');
  console.log('%c  window.commandDemo()         ', 'color: #FF9800;', '- Command system demo 🔄 NEW!');
  console.log('%c  window.inputDemo()           ', 'color: #FF9800;', '- Input system demo 🎮 NEW!');
  console.log('%c  window.physicsDemo()         ', 'color: #FF9800;', '- Physics system demo 🎱 NEW!');
  console.log('%c  window.cameraDemo()          ', 'color: #FF9800;', '- Camera system demo 📷 NEW!');
  console.log('%c  window.assetDemo()           ', 'color: #FF9800;', '- Asset system demo 📦 NEW!');
  console.log('%c  window.hierarchyDemo()       ', 'color: #FF9800;', '- Hierarchy & Socket demo 🔗');
  console.log('%c  window.visualDemo()          ', 'color: #FF9800;', '- Visual components demo ⚔️✨');
  console.log('%c  window.vehicleDemo()         ', 'color: #FF9800;', '- Vehicle demo 🚁🔊');
  console.log('%c  window.serializationDemo()   ', 'color: #FF9800;', '- Serialization demo');
  console.log('%c  window.snapshotDemo()        ', 'color: #FF9800;', '- Snapshot demo');
  console.log('%c  window.systemDemo()          ', 'color: #FF9800;', '- SystemManager demo');
  console.log('%c  window.heartbeatDemo()       ', 'color: #FF9800;', '- Heartbeat demo');
  console.log('%c  window.runPolyForgeTests()   ', 'color: #FF9800;', '- Full test suite');
  console.log('');
  console.log('%c⏱️  Clock Controls:', 'color: #2196F3; font-weight: bold;');
  console.log('%c  window.setSpeed(0.5)         ', 'color: #FF9800;', '- Set time scale to 0.5x');
  console.log('%c  window.pauseGame()           ', 'color: #FF9800;', '- Pause the game');
  console.log('%c  window.resumeGame()          ', 'color: #FF9800;', '- Resume the game');
  console.log('%c  window.togglePause()         ', 'color: #FF9800;', '- Toggle pause state');
  console.log('%c  window.getClockStatus()      ', 'color: #FF9800;', '- Get clock status');
  console.log('');
  console.log('%c🔄 Command Controls:', 'color: #2196F3; font-weight: bold;');
  console.log('%c  window.spawnBox()            ', 'color: #FF9800;', '- Create a new box');
  console.log('%c  window.moveBox(x, y, z)      ', 'color: #FF9800;', '- Move the last box');
  console.log('%c  window.deleteLastBox()       ', 'color: #FF9800;', '- Delete the last box');
  console.log('%c  window.undoLast()            ', 'color: #FF9800;', '- Undo last command');
  console.log('%c  window.redoLast()            ', 'color: #FF9800;', '- Redo last command');
  console.log('%c  window.showHistory()         ', 'color: #FF9800;', '- Show command history');
  console.log('%c  window.clearHistory()        ', 'color: #FF9800;', '- Clear all history');
  console.log('');
  console.log('%c🎮 Input Controls:', 'color: #2196F3; font-weight: bold;');
  console.log('%c  window.getBoxPosition()      ', 'color: #FF9800;', '- Get box position');
  console.log('%c  window.switchPreset(name)    ', 'color: #FF9800;', '- Switch input preset');
  console.log('%c  window.showInputStatus()     ', 'color: #FF9800;', '- Show input status');
  console.log('%c  window.showCommandHistory()  ', 'color: #FF9800;', '- Show command history');
  console.log('');
  console.log('%c🎱 Physics Controls:', 'color: #2196F3; font-weight: bold;');
  console.log('%c  window.stopPhysics()         ', 'color: #FF9800;', '- Stop physics simulation');
  console.log('%c  window.startPhysics()        ', 'color: #FF9800;', '- Start physics simulation');
  console.log('%c  window.resetPhysics()        ', 'color: #FF9800;', '- Reset all boxes');
  console.log('%c  window.setGravity(x,y,z)     ', 'color: #FF9800;', '- Change gravity');
  console.log('%c  window.spawnPhysicsBox()     ', 'color: #FF9800;', '- Spawn new box');
  console.log('%c  window.showPhysicsStatus()   ', 'color: #FF9800;', '- Show physics status');
  console.log('');
  console.log('%c📷 Camera Controls:', 'color: #2196F3; font-weight: bold;');
  console.log('%c  window.switchCameraMode(mode)', 'color: #FF9800;', '- Switch camera mode');
  console.log('%c  window.applyCameraPreset(name)', 'color: #FF9800;', '- Apply camera preset');
  console.log('%c  window.getCameraSnapshot()   ', 'color: #FF9800;', '- Get camera snapshot');
  console.log('%c  window.moveCameraTarget(x,y,z)', 'color: #FF9800;', '- Move target');
  console.log('%c  window.rotateCameraView(p,y)', 'color: #FF9800;', '- Rotate camera');
  console.log('%c  window.setCameraDistance(d)  ', 'color: #FF9800;', '- Set camera distance');
  console.log('%c  window.showCameraStatus()    ', 'color: #FF9800;', '- Show camera status');
  console.log('');
  console.log('%c📦 Asset Controls:', 'color: #2196F3; font-weight: bold;');
  console.log('%c  window.listAssets()          ', 'color: #FF9800;', '- List all assets');
  console.log('%c  window.clearAssets()         ', 'color: #FF9800;', '- Clear all assets');
  console.log('%c  window.assetStats()          ', 'color: #FF9800;', '- Show cache statistics');
  console.log('%c  window.modelUploadDemo()     ', 'color: #FF9800;', '- Upload GLB/GLTF model 🆕');
  console.log('');
}
