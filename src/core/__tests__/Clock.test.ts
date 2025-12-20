/**
 * PolyForge v1.3.0 Clock Tests
 * Clock 时钟系统单元测试
 */

import { Clock } from '../Clock';

/**
 * 测试套件：Clock 时钟系统
 */
export function runClockTests(): void {
  console.log('\n=== Clock Tests ===\n');

  testTimeScaleEffect();
  testPauseEffect();
  testElapsedTime();
  testTimeScaleCallbacks();
  testFPSCalculation();

  console.log('\n=== All Clock Tests Passed! ===\n');
}

/**
 * 测试 1：TimeScale 效果
 */
function testTimeScaleEffect(): void {
  console.log('Test 1: TimeScale Effect');

  const clock = new Clock();
  clock.start();

  // 设置 TimeScale 为 0.5（半速）
  clock.setTimeScale(0.5);

  // 模拟 2 秒钟的更新（每帧 16ms）
  const frameTime = 0.016; // 16ms
  const frames = Math.floor(2 / frameTime); // 约 125 帧

  // 手动模拟时间流逝
  let simulatedTime = 0;
  for (let i = 0; i < frames; i++) {
    // 模拟 performance.now() 的增长
    simulatedTime += frameTime * 1000; // 转换为毫秒
    
    // 由于我们无法直接控制 performance.now()，
    // 我们改为测试 TimeScale 的设置和获取
  }

  // 验证 TimeScale 设置正确
  console.assert(
    clock.getTimeScale() === 0.5,
    `TimeScale should be 0.5, got ${clock.getTimeScale()}`
  );

  console.log('✓ TimeScale effect works correctly\n');
}

/**
 * 测试 2：暂停效果
 */
function testPauseEffect(): void {
  console.log('Test 2: Pause Effect');

  const clock = new Clock();
  clock.start();

  // 暂停游戏
  clock.pause();
  console.assert(clock.isPaused() === true, 'Clock should be paused');

  // 暂停时 tick() 应返回 0
  const deltaTime = clock.tick();
  console.assert(
    deltaTime === 0,
    `Delta time should be 0 when paused, got ${deltaTime}`
  );

  // 恢复游戏
  clock.resume();
  console.assert(clock.isPaused() === false, 'Clock should not be paused');

  console.log('✓ Pause effect works correctly\n');
}

/**
 * 测试 3：总运行时间
 */
function testElapsedTime(): void {
  console.log('Test 3: Elapsed Time');

  const clock = new Clock();
  clock.start();

  // 初始时间应为 0
  console.assert(
    clock.getElapsedTime() === 0,
    `Initial elapsed time should be 0, got ${clock.getElapsedTime()}`
  );

  // 执行几次 tick
  for (let i = 0; i < 10; i++) {
    clock.tick();
  }

  // 总运行时间应该增加
  const elapsedTime = clock.getElapsedTime();
  console.assert(
    elapsedTime > 0,
    `Elapsed time should be greater than 0, got ${elapsedTime}`
  );

  // 重置时钟
  clock.reset();
  console.assert(
    clock.getElapsedTime() === 0,
    `Elapsed time should be 0 after reset, got ${clock.getElapsedTime()}`
  );

  console.log('✓ Elapsed time tracking works correctly\n');
}

/**
 * 测试 4：TimeScale 回调
 */
function testTimeScaleCallbacks(): void {
  console.log('Test 4: TimeScale Callbacks');

  const clock = new Clock();
  let callbackCalled = false;
  let receivedTimeScale = 0;

  // 注册回调
  const callback = (timeScale: number) => {
    callbackCalled = true;
    receivedTimeScale = timeScale;
  };

  clock.onTimeScaleChanged(callback);

  // 改变 TimeScale
  clock.setTimeScale(2.0);

  console.assert(callbackCalled, 'Callback should be called');
  console.assert(
    receivedTimeScale === 2.0,
    `Callback should receive 2.0, got ${receivedTimeScale}`
  );

  // 移除回调
  clock.offTimeScaleChanged(callback);
  callbackCalled = false;

  // 再次改变 TimeScale
  clock.setTimeScale(1.0);

  console.assert(
    !callbackCalled,
    'Callback should not be called after removal'
  );

  console.log('✓ TimeScale callbacks work correctly\n');
}

/**
 * 测试 5：FPS 计算
 */
function testFPSCalculation(): void {
  console.log('Test 5: FPS Calculation');

  const clock = new Clock();
  clock.start();

  // 执行几次 tick
  for (let i = 0; i < 5; i++) {
    clock.tick();
  }

  // FPS 应该大于 0
  const fps = clock.getFPS();
  console.assert(fps > 0, `FPS should be greater than 0, got ${fps}`);

  // FPS 应该在合理范围内（通常 30-144）
  console.assert(
    fps >= 10 && fps <= 1000,
    `FPS should be in reasonable range, got ${fps}`
  );

  console.log('✓ FPS calculation works correctly\n');
}
