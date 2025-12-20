/**
 * PolyForge v1.3.0 Test Runner
 * 简单的测试运行器，用于在浏览器控制台中运行测试
 */

import { runCoreDemo } from './core';
import { quickDemo } from './core/quickDemo';

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

// 暴露到全局，方便在控制台调用
if (typeof window !== 'undefined') {
  (window as any).runPolyForgeTests = runAllTests;
  (window as any).quickDemo = runQuickDemo;
  
  console.log('%c╔════════════════════════════════════════════════════════════╗', 'color: #4CAF50;');
  console.log('%c║  PolyForge v1.3.0 Core ECS - Test Runner Loaded          ║', 'color: #4CAF50; font-weight: bold;');
  console.log('%c╚════════════════════════════════════════════════════════════╝', 'color: #4CAF50;');
  console.log('');
  console.log('%c📋 Available Commands:', 'color: #2196F3; font-weight: bold;');
  console.log('%c  window.quickDemo()        ', 'color: #FF9800;', '- Quick demo (recommended)');
  console.log('%c  window.runPolyForgeTests()', 'color: #FF9800;', '- Full test suite');
  console.log('');
}
