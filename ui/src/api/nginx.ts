// Nginx 配置管理 API

export interface FileInfo {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    modifiedAt?: string;
}

export interface NginxConfig {
    configPath: string;
    configsDir: string;
    snippetsDir: string;
    sslDir: string;
}

export interface FileContent {
    content: string | null;
    path: string;
    name: string;
    error?: string;
}

export interface CommandResult {
    success: boolean;
    output: string;
    error?: string;
}

const API_BASE = '/api/nginx';

// 获取环境配置
export async function getNginxConfig(): Promise<NginxConfig> {
    const res = await fetch(`${API_BASE}/config`);
    return res.json();
}

// 获取网站列表
export async function getSites(): Promise<{ sites: FileInfo[]; directory: string }> {
    const res = await fetch(`${API_BASE}/sites`);
    return res.json();
}

// 浏览目录
export async function browseDirectory(dir: 'configs' | 'snippets' | 'ssl'): Promise<{ files: FileInfo[]; directory: string; type: string }> {
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
