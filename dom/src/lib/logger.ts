import { consola } from 'consola';

export const logger = consola.withTag('hop');

// 子 logger 工厂函数
export function createLogger(name: string) {
  return consola.withTag(name);
}
