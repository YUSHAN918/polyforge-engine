/**
 * PolyForge v1.3.0 Test Runner
 * 简单的测试运行器，用于在浏览器控制台中运行测试
 */

import { runCoreDemo } from './core';
import { quickDemo } from './core/quickDemo';
import { runSystemDemo, runHeartbeatDemo } from './core/systemDemo';
import { runSerializationDemo, runSnapshotDemo } from './core/serializationDemo';
import { runVisualDemo } from './core/visualDemo';
import { runVehicleDemo } from './core/vehicleDemo';

/**
 * 在浏览器控制台中运行所有测试
 */
export function runAllTests(): void {
  console.clear();
  console.log('%c🚀 PolyForge v1.3.0 Test Runner', 'font-size: 20px; font-weight: bold; color: #4CAF50;');
  console.log('%cRunning ECS Core Tests...', 'font-size: 14px; color: #2196F3;');
  console.log('');

  try {
    runCoreDemo();
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
  
  console.log('%c╔════════════════════════════════════════════════════════════╗', 'color: #4CAF50;');
  console.log('%c║  PolyForge v1.3.0 Core ECS - Test Runner Loaded          ║', 'color: #4CAF50; font-weight: bold;');
  console.log('%c╚════════════════════════════════════════════════════════════╝', 'color: #4CAF50;');
  console.log('');
  console.log('%c📋 Available Commands:', 'color: #2196F3; font-weight: bold;');
  console.log('%c  window.quickDemo()           ', 'color: #FF9800;', '- Quick demo (recommended)');
  console.log('%c  window.visualDemo()          ', 'color: #FF9800;', '- Visual components demo ⚔️✨');
  console.log('%c  window.vehicleDemo()         ', 'color: #FF9800;', '- Vehicle demo 🚁🔊 NEW!');
  console.log('%c  window.serializationDemo()   ', 'color: #FF9800;', '- Serialization demo');
  console.log('%c  window.snapshotDemo()        ', 'color: #FF9800;', '- Snapshot demo');
  console.log('%c  window.systemDemo()          ', 'color: #FF9800;', '- SystemManager demo');
  console.log('%c  window.heartbeatDemo()       ', 'color: #FF9800;', '- Heartbeat demo');
  console.log('%c  window.runPolyForgeTests()   ', 'color: #FF9800;', '- Full test suite');
  console.log('');
}
