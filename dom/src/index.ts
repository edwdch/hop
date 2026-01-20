import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { cors } from '@elysiajs/cors';
import path from 'path';
import { auth, hasUsers } from './auth';
import { logger } from './lib/logger';

// 获取 dist 的绝对路径
const distPath = path.resolve(import.meta.dir, '../dist');

const app = new Elysia()
    .use(cors({
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
    }))
    // 请求日志中间件
    .onRequest(({ request }) => {
        const url = new URL(request.url);
        // 忽略静态资源请求的日志
        if (!url.pathname.startsWith('/api') && url.pathname !== '/') return;
        logger.info({ method: request.method, path: url.pathname }, 'incoming request');
    })
    .onAfterResponse(({ request, set }) => {
        const url = new URL(request.url);
        if (!url.pathname.startsWith('/api') && url.pathname !== '/') return;
        logger.info({ method: request.method, path: url.pathname, status: set.status || 200 }, 'response sent');
    })
    // 1. 托管静态资源 (React 编译后的产物)
    .use(staticPlugin({
        assets: distPath,
        prefix: '/',
        alwaysStatic: false,  // 允许处理 SPA 路由
    }))
    // 2. 根路径返回 index.html
    .get('/', () => {
        const indexPath = path.join(distPath, 'index.html');
        return Bun.file(indexPath);
    })
    .get("/api/ping", () => ({ pong: true }))
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
    // 5. 其他 API 路由
    .group('/api', (app) => app
        .get('/status', () => ({ status: 'running', engine: 'Bun + Elysia' }))
        .post('/proxy/add', ({ body }) => {
            // 这里以后写添加 Nginx 代理的逻辑
            return { success: true, data: body };
        })
    )
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