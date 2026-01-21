// Nginx 配置管理 API

export interface FileInfo {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    modifiedAt?: string;
}

export interface SiteInfo extends FileInfo {
    serverNames: string[];
}

export interface NginxConfig {
    configPath: string;
    configsDir: string;
    sslDir: string;
}

export interface FileContent {
    content: string | null;
    path: string;
    name: string;
    error?: string;
    readonly?: boolean; // 是否只读（nginx.conf 由模板生成，不可直接编辑）
}

export interface CommandResult {
    success: boolean;
    output: string;
    error?: string;
}

// 模板参数类型
export interface TemplateParams {
    workerProcesses: string;
    workerConnections: number;
    keepalive: number;
    clientMaxBodySize: string;
    gzip: boolean;
    serverTokens: boolean;
}

const API_BASE = '/api/nginx';

// 获取环境配置
export async function getNginxConfig(): Promise<NginxConfig> {
    const res = await fetch(`${API_BASE}/config`);
    return res.json();
}

// 获取网站列表
export async function getSites(): Promise<{ sites: SiteInfo[]; directory: string }> {
    const res = await fetch(`${API_BASE}/sites`);
    return res.json();
}

// 浏览目录
export async function browseDirectory(dir: 'configs' | 'ssl'): Promise<{ files: FileInfo[]; directory: string; type: string }> {
    const res = await fetch(`${API_BASE}/browse?dir=${dir}`);
    return res.json();
}

// 读取文件内容
export async function readFile(path: string): Promise<FileContent> {
    const res = await fetch(`${API_BASE}/file?path=${encodeURIComponent(path)}`);
    return res.json();
}

// 读取主配置文件
export async function readMainConfig(): Promise<FileContent> {
    const res = await fetch(`${API_BASE}/main-config`);
    return res.json();
}

// 保存文件
export async function saveFile(path: string, content: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
    });
    return res.json();
}

// 测试 nginx 配置
export async function testNginxConfig(): Promise<CommandResult> {
    const res = await fetch(`${API_BASE}/test`, { method: 'POST' });
    return res.json();
}

// 重载 nginx 配置
export async function reloadNginx(): Promise<CommandResult> {
    const res = await fetch(`${API_BASE}/reload`, { method: 'POST' });
    return res.json();
}

// 创建新文件
export async function createFile(
    dir: 'configs',
    name: string,
    content?: string
): Promise<{ success: boolean; path?: string; name?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir, name, content }),
    });
    return res.json();
}

// 删除文件
export async function deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/file?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
    });
    return res.json();
}

// 获取模板参数
export async function getTemplateParams(): Promise<TemplateParams> {
    const res = await fetch(`${API_BASE}/template-params`);
    return res.json();
}

// 保存模板参数并重新生成 nginx.conf
export async function saveTemplateParams(params: TemplateParams): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/template-params`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    return res.json();
}

// 重新生成 nginx.conf（使用当前参数）
export async function regenerateConfig(): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/regenerate`, { method: 'POST' });
    return res.json();
}

// ===== 代理站点管理 API =====

// 代理站点类型
export interface ProxySite {
    id: string;              // 唯一标识（文件名，不含扩展名）
    serverName: string;      // 域名
    ssl: boolean;            // 是否启用 SSL
    sslCert?: string;        // SSL 证书路径
    sslKey?: string;         // SSL 私钥路径
    certificateId?: string;  // 关联的证书 ID
    upstreamScheme: 'http' | 'https'; // 上游协议
    upstreamHost: string;    // 上游主机名/IP
    upstreamPort: number;    // 上游端口
    websocket: boolean;      // 是否支持 WebSocket

    // 认证配置（登录 URL 和 Cookie 域名从系统设置中全局配置）
    authEnabled: boolean;    // 是否启用访问认证
}

// 获取代理站点列表
export async function listProxySites(): Promise<{ sites: ProxySite[] }> {
    const res = await fetch(`${API_BASE}/proxy/list`);
    return res.json();
}

// 获取单个代理站点
export async function getProxySite(id: string): Promise<ProxySite> {
    const res = await fetch(`${API_BASE}/proxy/get?id=${encodeURIComponent(id)}`);
    return res.json();
}

// 保存代理站点
export async function saveProxySite(site: ProxySite): Promise<{ success: boolean; id?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/proxy/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(site),
    });
    return res.json();
}

// 删除代理站点
export async function deleteProxySite(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/proxy/delete?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    return res.json();
}

// 预览代理站点配置
export async function previewProxySite(site: ProxySite): Promise<{ content: string }> {
    const res = await fetch(`${API_BASE}/proxy/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(site),
    });
    return res.json();
}
