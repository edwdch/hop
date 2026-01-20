import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { cors } from '@elysiajs/cors';

const app = new Elysia()
    .use(cors()) // 允许跨域
    // 1. 托管静态资源 (React 编译后的产物)
    .use(staticPlugin({
        assets: '../ui/dist', 
        prefix: '/'
    }))
    .group('/api', (app) => app
        .get('/status', () => ({ status: 'running', engine: 'Bun + Elysia' }))
        .post('/proxy/add', ({ body }) => {
            // 这里以后写添加 Nginx 代理的逻辑
            return { success: true, data: body };
        })
    )

    // 3. 处理 React 的 SPA 路由 (fallback)
    // 如果不是 API 请求，且静态资源没匹配到，则返回 index.html
    .get('*', async ({ path }) => {
        const file = Bun.file('../ui/dist/index.html');
        const exists = await file.exists();
        
        if (exists) {
            return new Response(file);
        }
        
        return new Response("Frontend not built yet. Run 'bun run build' in ui folder.", { status: 404 });
    })

    .listen(3000);

console.log(`🚀 后端已启动: http://${app.server?.hostname}:${app.server?.port}`);