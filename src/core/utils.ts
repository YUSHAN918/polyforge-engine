/**
 * PolyForge v1.3.0 Core Utilities
 * 核心工具函数
 */

/**
 * 生成唯一 ID
 * 使用时间戳 + 随机数 + 计数器确保唯一性
 */
let uidCounter = 0;
export function generateUID(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  const counter = (uidCounter++).toString(36);
  return `${timestamp}-${random}-${counter}`;
}

/**
 * 深度克隆对象（仅支持 JSON 可序列化的对象）
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 检查两个数组是否有交集
 */
export function hasIntersection<T>(arr1: T[], arr2: T[]): boolean {
  return arr1.some(item => arr2.includes(item));
}

/**
 * 安全地获取嵌套属性
 */
export function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * 性能计时器
 */
export class PerformanceTimer {
  private startTime: number = 0;
  private marks: Map<string, number> = new Map();

  start(): void {
    this.startTime = performance.now();
    this.marks.clear();
  }

  mark(label: string): void {
    this.marks.set(label, performance.now() - this.startTime);
  }

  getElapsed(): number {
    return performance.now() - this.startTime;
  }

  getMark(label: string): number | undefined {
    return this.marks.get(label);
  }

  report(): void {
    console.log(`Total elapsed: ${this.getElapsed().toFixed(2)}ms`);
    for (const [label, time] of this.marks.entries()) {
      console.log(`  ${label}: ${time.toFixed(2)}ms`);
    }
  }
}
