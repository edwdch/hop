import { Elysia, t } from 'elysia';
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, basename } from 'path';
import { spawn } from 'child_process';

// 环境变量配置
const NGINX_CONFIG_PATH = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
const NGINX_CONFIGS_DIR = process.env.NGINX_CONFIGS_DIR || '/etc/nginx/conf.d';
const NGINX_SNIPPETS_DIR = process.env.NGINX_SNIPPETS_DIR || '/etc/nginx/snippets';
const NGINX_SSL_DIR = process.env.NGINX_SSL_DIR || '/etc/nginx/ssl';

interface FileInfo {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    modifiedAt?: string;
}

// 执行命令的辅助函数
function execCommand(command: string, args: string[]): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
        const child = spawn(command, args);
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            resolve({
                success: code === 0,
                output: stdout || stderr,
                error: code !== 0 ? stderr : undefined,
            });
        });

        child.on('error', (err) => {
            resolve({
                success: false,
                output: '',
                error: err.message,
            });
        });
    });
}

// 获取目录下的文件列表
async function listFiles(dirPath: string): Promise<FileInfo[]> {
    try {
        const entries = await readdir(dirPath, { withFileTypes: true });
        const files: FileInfo[] = [];

        for (const entry of entries) {
            const fullPath = join(dirPath, entry.name);
            try {
                const fileStat = await stat(fullPath);
                files.push({
                    name: entry.name,
                    path: fullPath,
                    type: entry.isDirectory() ? 'directory' : 'file',
                    size: fileStat.size,
                    modifiedAt: fileStat.mtime.toISOString(),
                });
            } catch {
                // 如果无法获取文件信息，跳过
            }
        }

        return files.sort((a, b) => {
            // 目录优先，然后按名称排序
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    } catch (err) {
        return [];
    }
}

// 安全检查：确保路径在允许的目录内
function isPathAllowed(filePath: string): boolean {
    const allowedDirs = [NGINX_CONFIGS_DIR, NGINX_SNIPPETS_DIR, NGINX_SSL_DIR];
    const normalizedPath = join(filePath);
    
    // 检查是否是主配置文件
    if (normalizedPath === NGINX_CONFIG_PATH) {
        return true;
    }
    
    // 检查是否在允许的目录内
    return allowedDirs.some(dir => normalizedPath.startsWith(dir));
}

export const nginxPlugin = new Elysia({ prefix: '/api/nginx' })
    // 获取环境配置
    .get('/config', () => ({
        configPath: NGINX_CONFIG_PATH,
        configsDir: NGINX_CONFIGS_DIR,
        snippetsDir: NGINX_SNIPPETS_DIR,
        sslDir: NGINX_SSL_DIR,
    }))

    // 获取网站列表（conf.d 目录下的文件）
    .get('/sites', async () => {
        const files = await listFiles(NGINX_CONFIGS_DIR);
        return {
            sites: files.filter(f => f.type === 'file'),
            directory: NGINX_CONFIGS_DIR,
        };
    })

    // 浏览指定目录
    .get('/browse', async ({ query }) => {
        const { dir } = query;
        
        // 验证目录类型
        let targetDir: string;
        switch (dir) {
            case 'configs':
                targetDir = NGINX_CONFIGS_DIR;
                break;
            case 'snippets':
                targetDir = NGINX_SNIPPETS_DIR;
                break;
            case 'ssl':
                targetDir = NGINX_SSL_DIR;
                break;
            default:
                return { error: 'Invalid directory type', files: [] };
        }

        const files = await listFiles(targetDir);
        return { files, directory: targetDir, type: dir };
    }, {
        query: t.Object({
            dir: t.String(),
        }),
    })

    // 读取文件内容
    .get('/file', async ({ query }) => {
        const { path: filePath } = query;

        if (!isPathAllowed(filePath)) {
            return { error: 'Access denied', content: null };
        }

        try {
            const content = await readFile(filePath, 'utf-8');
            return { content, path: filePath, name: basename(filePath) };
        } catch (err) {
            return { error: `Failed to read file: ${(err as Error).message}`, content: null };
        }
    }, {
        query: t.Object({
            path: t.String(),
        }),
    })

    // 读取主配置文件
    .get('/main-config', async () => {
        try {
            const content = await readFile(NGINX_CONFIG_PATH, 'utf-8');
            return { content, path: NGINX_CONFIG_PATH, name: basename(NGINX_CONFIG_PATH) };
        } catch (err) {
            return { error: `Failed to read main config: ${(err as Error).message}`, content: null };
        }
    })

    // 保存文件内容
    .post('/file', async ({ body }) => {
        const { path: filePath, content } = body;

        if (!isPathAllowed(filePath)) {
            return { success: false, error: 'Access denied' };
        }

        try {
            await writeFile(filePath, content, 'utf-8');
            return { success: true };
        } catch (err) {
            return { success: false, error: `Failed to save file: ${(err as Error).message}` };
        }
    }, {
        body: t.Object({
            path: t.String(),
            content: t.String(),
        }),
    })

    // 测试 nginx 配置
    .post('/test', async () => {
        const result = await execCommand('nginx', ['-t']);
        return {
            success: result.success,
            output: result.output,
            error: result.error,
        };
    })

    // 重载 nginx 配置
    .post('/reload', async () => {
        const result = await execCommand('nginx', ['-s', 'reload']);
        return {
            success: result.success,
            output: result.output || 'Nginx reloaded successfully',
            error: result.error,
        };
    });
