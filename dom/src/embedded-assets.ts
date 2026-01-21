// 自动生成的嵌入资源文件 - 请勿手动编辑
// 生成时间: 2026-01-21T03:23:58Z

import asset0 from '../dist/assets/index-Cj1fEBmA.css' with { type: 'file' };
import asset1 from '../dist/assets/index-fSLN4KBS.js' with { type: 'file' };
import asset2 from '../dist/index.html' with { type: 'file' };
import asset3 from '../dist/vite.svg' with { type: 'file' };

export const embeddedAssets: Record<string, string> = {
    '/assets/index-Cj1fEBmA.css': asset0,
    '/assets/index-fSLN4KBS.js': asset1,
    '/index.html': asset2,
    '/vite.svg': asset3,
};

export function getEmbeddedAsset(path: string): string | undefined {
    return embeddedAssets[path];
}

