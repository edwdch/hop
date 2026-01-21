// 系统配置管理 API

const API_BASE = '/api/config';

// 服务器配置
export interface ServerConfig {
    host: string;
    port: number;
}

// 认证配置（不包含敏感信息）
export interface AuthConfig {
    proxyLoginURL: string;
    proxyCookieDomain: string;
}

// Nginx 配置
export interface NginxConfigSettings {
    workerProcesses: string;
    workerConnections: number;
    keepalive: number;
    clientMaxBodySize: string;
    gzip: boolean;
    serverTokens: boolean;
}

// 完整的应用配置（不包含敏感信息）
export interface AppConfig {
    server: ServerConfig;
    auth: AuthConfig;
    nginx: NginxConfigSettings;
}

// 更新认证配置的请求
export interface UpdateAuthConfigRequest {
    proxyLoginURL: string;
    proxyCookieDomain: string;
}

// 获取系统配置
export async function getConfig(): Promise<AppConfig> {
    const res = await fetch(API_BASE);
    if (!res.ok) {
        throw new Error('获取配置失败');
    }
    return res.json();
}

// 更新认证配置
export async function updateAuthConfig(config: UpdateAuthConfigRequest): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/auth`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
    return res.json();
}
