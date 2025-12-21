/**
 * Vitest Setup File
 * 配置 IndexedDB 模拟环境
 */

import 'fake-indexeddb/auto';

// 如果 crypto.subtle 不存在，添加模拟
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      subtle: {
        digest: async (algorithm: string, data: BufferSource) => {
          // 简单的哈希模拟（用于测试）
          const buffer = data instanceof ArrayBuffer ? data : data.buffer;
          const view = new Uint8Array(buffer);
          let hash = 0;
          for (let i = 0; i < view.length; i++) {
            hash = ((hash << 5) - hash) + view[i];
            hash = hash & hash; // Convert to 32bit integer
          }
          // 返回一个固定长度的 ArrayBuffer
          const hashBuffer = new ArrayBuffer(32);
          const hashView = new Uint8Array(hashBuffer);
          for (let i = 0; i < 32; i++) {
            hashView[i] = (hash >> (i % 4 * 8)) & 0xFF;
          }
          return hashBuffer;
        },
      },
    },
    writable: false,
    configurable: true,
  });
}

