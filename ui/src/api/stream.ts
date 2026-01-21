// SNI 路由管理 API

// SNI 路由类型
export interface StreamRoute {
    id: string;       // 唯一标识
    name: string;     // 名称/备注
    domain: string;   // 域名（SNI 匹配）
    backend: string;  // 后端地址 (host:port)
    enabled: boolean; // 是否启用
}

const API_BASE = '/api/nginx/stream';

// 获取所有 SNI 路由
export async function listStreamRoutes(): Promise<{ routes: StreamRoute[] }> {
    const res = await fetch(`${API_BASE}/list`);
    return res.json();
}

// 获取单个 SNI 路由
export async function getStreamRoute(id: string): Promise<StreamRoute> {
    const res = await fetch(`${API_BASE}/get?id=${encodeURIComponent(id)}`);
    return res.json();
}

// 保存 SNI 路由
export async function saveStreamRoute(route: StreamRoute): Promise<{ success: boolean; id?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(route),
    });
    return res.json();
}

// 删除 SNI 路由
export async function deleteStreamRoute(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/delete?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    return res.json();
}

// 切换 SNI 路由启用状态
export async function toggleStreamRoute(id: string): Promise<{ success: boolean; enabled?: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/toggle?id=${encodeURIComponent(id)}`, {
        method: 'POST',
    });
    return res.json();
}
