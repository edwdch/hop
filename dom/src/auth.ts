import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db';
import { Database } from 'bun:sqlite';
import path from 'path';
import { createLogger } from './lib/logger';

const log = createLogger('auth');

// 数据库路径
const dbPath = path.resolve(import.meta.dir, '../data/hop.db');

// 确保 data 目录存在
const dataDir = path.dirname(dbPath);
await Bun.write(path.join(dataDir, '.gitkeep'), '');

// 创建数据库连接
const database = new Database(dbPath);

export const auth = betterAuth({
  database,
  basePath: '/api/auth',
  trustedOrigins: ['*'],
  emailAndPassword: {
    enabled: true,
  },
  // 禁用邮箱验证（单用户场景）
  emailVerification: {
    sendVerificationEmail: async () => {
      // 不发送验证邮件
    },
    sendOnSignUp: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 天
    updateAge: 60 * 60 * 24, // 每天更新一次
  },
  // 数据库钩子 - 用于日志
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          log.info({ userId: user.id, email: user.email }, '用户创建成功');
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          log.info({ sessionId: session.id, userId: session.userId }, '会话创建成功');
        },
      },
    },
  },
});

// 运行数据库迁移
const { runMigrations } = await getMigrations(auth.options);
await runMigrations();

log.info('Better Auth 初始化完成');

// 导出辅助函数
export async function hasUsers(): Promise<boolean> {
  const result = database.query('SELECT COUNT(*) as count FROM user').get() as { count: number };
  return result.count > 0;
}
