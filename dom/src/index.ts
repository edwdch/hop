import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { auth, hasUsers } from './auth';
import { logger } from './lib/logger';
import { nginxPlugin } from './nginx';

const app = new Elysia()
    .use(cors({
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
    }))
    // 请求日志中间件
    .onRequest(({ request }) => {
        const url = new URL(request.url);
        logger.info({ method: request.method, path: url.pathname }, 'incoming request');
    })
    .onAfterResponse(({ request, set }) => {
        const url = new URL(request.url);
        logger.info({ method: request.method, path: url.pathname, status: set.status || 200 }, 'response sent');
    })
    .get("/api/ping", () => ({ pong: true }))
    .use(nginxPlugin)
    // 3. 检查是否需要初始化
    .get('/api/auth/need-init', async () => {
        const hasExistingUsers = await hasUsers();
        return { needInit: !hasExistingUsers };
    })
    // 4. Better Auth 路由 - 捕获所有 /api/auth 开头的请求
    .onRequest(async ({ request, set }) => {
        const url = new URL(request.url);
        // 只处理 /api/auth 路径（排除自定义的 need-init）
        if (url.pathname.startsWith('/api/auth') && url.pathname !== '/api/auth/need-init') {
            const response = await auth.handler(request);
            // 直接返回 better-auth 的响应
            set.status = response.status;
            set.headers = Object.fromEntries(response.headers.entries());
            return new Response(response.body, {
                status: response.status,
                headers: response.headers
            });
        }
    })
    .listen({
        port: 3000,
        hostname: '0.0.0.0'
    });

// 获取局域网 IP
function getLocalIP(): string {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();
const port = app.server?.port;

logger.info(`🚀 后端已启动:`);
logger.info(`   ➜ 本地:   http://localhost:${port}`);
logger.info(`   ➜ 局域网: http://${localIP}:${port}`);