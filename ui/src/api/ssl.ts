// SSL 证书管理 API

const API_BASE = '/api/ssl';

// DNS 提供商类型
export type DNSProviderType = 'alidns' | 'tencentcloud' | 'cloudflare';

// DNS 提供商信息
export interface DNSProvider {
    id: string;
    name: string;
    type: DNSProviderType;
    createdAt: string;
    updatedAt: string;
}

// 阿里云 DNS 配置
export interface AliDNSConfig {
    accessKeyId: string;
    accessKeySecret: string;
    regionId?: string;
}

// 腾讯云 DNS 配置
export interface TencentCloudConfig {
    secretId: string;
    secretKey: string;
}

// Cloudflare DNS 配置
export interface CloudflareConfig {
    apiToken?: string;
    email?: string;
    apiKey?: string;
}

// DNS 提供商配置
export type DNSProviderConfig = AliDNSConfig | TencentCloudConfig | CloudflareConfig;

// 证书信息
export interface Certificate {
    id: string;
    domain: string;
    domains: string[];
    dnsProviderId: string;
    certPath: string;
    keyPath: string;
    issuer: string;
    notBefore: string;
    notAfter: string;
    autoRenew: boolean;
    lastRenewAt: string | null;
    status: 'pending' | 'active' | 'expired' | 'error';
    error: string | null;
    daysRemaining: number;
    createdAt: string;
    updatedAt: string;
}

// 证书日志
export interface CertificateLog {
    id: string;
    action: 'create' | 'renew' | 'error' | 'cleanup';
    message: string;
    createdAt: string;
}

// SSL 状态
export interface SSLStatus {
    legoInstalled: boolean;
    legoVersion: string;
}

// === DNS 提供商 API ===

// 获取 DNS 提供商列表
export async function listDNSProviders(): Promise<{ providers: DNSProvider[] }> {
    const res = await fetch(`${API_BASE}/dns-providers`);
    return res.json();
}

// 创建 DNS 提供商
export async function createDNSProvider(
    name: string,
    type: DNSProviderType,
    config: DNSProviderConfig
): Promise<{ success: boolean; id?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/dns-providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, config }),
    });
    return res.json();
}

// 获取 DNS 提供商
export async function getDNSProvider(id: string): Promise<DNSProvider> {
    const res = await fetch(`${API_BASE}/dns-providers/${id}`);
    return res.json();
}

// 更新 DNS 提供商
export async function updateDNSProvider(
    id: string,
    data: { name?: string; type?: DNSProviderType; config?: DNSProviderConfig }
): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/dns-providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return res.json();
}

// 删除 DNS 提供商
export async function deleteDNSProvider(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/dns-providers/${id}`, {
        method: 'DELETE',
    });
    return res.json();
}

// === 证书 API ===

// 获取证书列表
export async function listCertificates(): Promise<{ certificates: Certificate[] }> {
    const res = await fetch(`${API_BASE}/certificates`);
    return res.json();
}

// 申请证书
export async function issueCertificate(
    domains: string[],
    dnsProviderId: string,
    email: string
): Promise<{ success: boolean; certificate?: Certificate; error?: string }> {
    const res = await fetch(`${API_BASE}/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains, dnsProviderId, email }),
    });
    return res.json();
}

// 获取证书
export async function getCertificate(id: string): Promise<Certificate> {
    const res = await fetch(`${API_BASE}/certificates/${id}`);
    return res.json();
}

// 续期证书
export async function renewCertificate(
    id: string,
    email: string
): Promise<{ success: boolean; certificate?: Certificate; error?: string }> {
    const res = await fetch(`${API_BASE}/certificates/${id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    return res.json();
}

// 清理证书的 lego 数据（用于解决 DNS 记录冲突）
export async function cleanupCertificate(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/certificates/${id}/cleanup`, {
        method: 'POST',
    });
    return res.json();
}

// 删除证书
export async function deleteCertificate(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/certificates/${id}`, {
        method: 'DELETE',
    });
    return res.json();
}

// 获取证书日志
export async function getCertificateLogs(id: string): Promise<{ logs: CertificateLog[] }> {
    const res = await fetch(`${API_BASE}/certificates/${id}/logs`);
    return res.json();
}

// === 系统状态 API ===

// 获取 SSL 系统状态
export async function getSSLStatus(): Promise<SSLStatus> {
    const res = await fetch(`${API_BASE}/status`);
    return res.json();
}

// === 辅助函数 ===

// 获取 DNS 提供商显示名称
export function getDNSProviderLabel(type: DNSProviderType): string {
    switch (type) {
        case 'alidns':
            return '阿里云 DNS';
        case 'tencentcloud':
            return '腾讯云 DNSPod';
        case 'cloudflare':
            return 'Cloudflare';
        default:
            return type;
    }
}

// 获取证书状态显示
export function getCertificateStatusLabel(status: Certificate['status']): string {
    switch (status) {
        case 'pending':
            return '申请中';
        case 'active':
            return '有效';
        case 'expired':
            return '已过期';
        case 'error':
            return '错误';
        default:
            return status;
    }
}

// 获取证书状态颜色
export function getCertificateStatusColor(status: Certificate['status']): string {
    switch (status) {
        case 'pending':
            return 'text-yellow-500';
        case 'active':
            return 'text-green-500';
        case 'expired':
            return 'text-red-500';
        case 'error':
            return 'text-red-500';
        default:
            return 'text-gray-500';
    }
}
