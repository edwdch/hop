import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { auth, hasUsers } from './auth';
import { logger } from './lib/logger';
import { nginxPlugin } from './nginx';
import { resolve, dirname, join } from 'path';
import { existsSync } from 'fs';

// 尝试加载嵌入资源（构建时生成）
let embeddedAssets: Record<string, string> = {};
let useEmbeddedAssets = false;
try {
    const assets = await import('./embedded-assets');
    embeddedAssets = assets.embeddedAssets;
    useEmbeddedAssets = Object.keys(embeddedAssets).length > 0;
} catch {
    // 开发模式下没有嵌入资源
}

// 获取项目根目录 (dom/)
const ROOT_DIR = resolve(dirname(import.meta.dir));
const DIST_DIR = resolve(ROOT_DIR, 'dist');

// MIME 类型映射
const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
};

function getMimeType(path: string): string {
    const ext = path.substring(path.lastIndexOf('.'));
    return MIME_TYPES[ext] || 'application/octet-stream';
}

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
    // SPA fallback 和静态文件服务
    .get('/*', async ({ request, set }) => {
        const url = new URL(request.url);
        const pathname = url.pathname;
        
        // 跳过 API 请求
        if (pathname.startsWith('/api/')) {
            return;
        }

        // 优先使用嵌入资源（二进制模式）
        if (useEmbeddedAssets) {
            // 尝试作为静态文件提供
            let assetPath = pathname;
            
            // 如果路径不包含扩展名，尝试作为 SPA 路由处理
            if (!pathname.includes('.')) {
                assetPath = '/index.html';
            }
            
            const embeddedPath = embeddedAssets[assetPath];
            if (embeddedPath) {
                const file = Bun.file(embeddedPath);
                set.headers['content-type'] = getMimeType(assetPath);
                return file;
            }
            
            // 文件不存在，返回 index.html (SPA fallback)
            const indexPath = embeddedAssets['/index.html'];
            if (indexPath) {
                set.headers['content-type'] = 'text/html';
                return Bun.file(indexPath);
            }
            
            set.status = 404;
            return 'Not Found';
        }
        
        // 开发模式：从 dist 目录读取文件
        let filePath = join(DIST_DIR, pathname);
        
        // 如果路径不包含扩展名，尝试作为 SPA 路由处理
        if (!pathname.includes('.')) {
            filePath = join(DIST_DIR, 'index.html');
        }
        
        // 检查文件是否存在
        if (existsSync(filePath)) {
            const file = Bun.file(filePath);
            set.headers['content-type'] = getMimeType(filePath);
            return file;
        }
        
        // 文件不存在，返回 index.html (SPA fallback)
        const indexPath = join(DIST_DIR, 'index.html');
        if (existsSync(indexPath)) {
            set.headers['content-type'] = 'text/html';
            return Bun.file(indexPath);
        }
        
        set.status = 404;
        return 'Not Found';
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