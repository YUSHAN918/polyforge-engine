/**
 * PolyForge v1.3.0 Core Module
 * 核心模块导出
 */

// 核心类型
export * from './types';

// 核心类
export { Entity } from './Entity';
export { EntityManager } from './EntityManager';

// 工具函数
export * from './utils';

// 示例组件
export { TransformComponent } from './components/TransformComponent';
export { NameComponent } from './components/NameComponent';

// 演示和测试
export { runCoreDemo } from './demo';
export { runEntityManagerTests } from './__tests__/EntityManager.test';
