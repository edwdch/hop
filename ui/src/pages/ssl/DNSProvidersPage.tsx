import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Settings,
    Plus,
    Trash2,
    ChevronLeft,
    Loader2,
    Cloud,
    Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    listDNSProviders,
    createDNSProvider,
    deleteDNSProvider,
    type DNSProvider,
    type DNSProviderType,
    type AliDNSConfig,
    type TencentCloudConfig,
    type CloudflareConfig,
    getDNSProviderLabel,
} from '@/api/ssl';

export default function DNSProvidersPage() {
    const navigate = useNavigate();
    const [providers, setProviders] = useState<DNSProvider[]>([]);
    const [loading, setLoading] = useState(true);

    // 创建提供商弹窗
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [providerName, setProviderName] = useState('');
    const [providerType, setProviderType] = useState<DNSProviderType>('alidns');

    // 阿里云配置
    const [aliAccessKeyId, setAliAccessKeyId] = useState('');
    const [aliAccessKeySecret, setAliAccessKeySecret] = useState('');
    const [aliRegionId, setAliRegionId] = useState('');

    // 腾讯云配置
    const [tencentSecretId, setTencentSecretId] = useState('');
    const [tencentSecretKey, setTencentSecretKey] = useState('');

    // Cloudflare 配置
    const [cfApiToken, setCfApiToken] = useState('');
    const [cfEmail, setCfEmail] = useState('');
    const [cfApiKey, setCfApiKey] = useState('');

    // 删除提供商弹窗
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingProvider, setDeletingProvider] = useState<DNSProvider | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            const result = await listDNSProviders();
            setProviders(result.providers);
        } catch (err) {
            console.error('Failed to load providers:', err);
            toast.error('加载 DNS 提供商失败');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setProviderName('');
        setProviderType('alidns');
        setAliAccessKeyId('');
        setAliAccessKeySecret('');
        setAliRegionId('');
        setTencentSecretId('');
        setTencentSecretKey('');
        setCfApiToken('');
        setCfEmail('');
        setCfApiKey('');
    };

    const handleCreate = async () => {
        if (!providerName.trim()) {
            toast.error('请输入名称');
            return;
        }

        let config: AliDNSConfig | TencentCloudConfig | CloudflareConfig;

        switch (providerType) {
            case 'alidns':
                if (!aliAccessKeyId || !aliAccessKeySecret) {
                    toast.error('请填写阿里云 AccessKey 信息');
                    return;
                }
                config = {
                    accessKeyId: aliAccessKeyId,
                    accessKeySecret: aliAccessKeySecret,
                    regionId: aliRegionId || undefined,
                };
                break;
            case 'tencentcloud':
                if (!tencentSecretId || !tencentSecretKey) {
                    toast.error('请填写腾讯云密钥信息');
                    return;
                }
                config = {
                    secretId: tencentSecretId,
                    secretKey: tencentSecretKey,
                };
                break;
            case 'cloudflare':
                if (!cfApiToken && (!cfEmail || !cfApiKey)) {
                    toast.error('请填写 Cloudflare API Token 或 Global API Key');
                    return;
                }
                config = {
                    apiToken: cfApiToken || undefined,
                    email: cfEmail || undefined,
                    apiKey: cfApiKey || undefined,
                };
                break;
        }

        setCreating(true);
        try {
            const result = await createDNSProvider(providerName, providerType, config);
            if (result.success) {
                toast.success('DNS 提供商创建成功');
                setCreateDialogOpen(false);
                resetForm();
                loadProviders();
            } else {
                toast.error(result.error || '创建失败');
            }
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingProvider) return;

        setDeleting(true);
        try {
            const result = await deleteDNSProvider(deletingProvider.id);
            if (result.success) {
                toast.success('DNS 提供商已删除');
                setDeleteDialogOpen(false);
                setDeletingProvider(null);
                loadProviders();
            } else {
                toast.error(result.error || '删除失败');
            }
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setDeleting(false);
        }
    };

    const renderConfigForm = () => {
        switch (providerType) {
            case 'alidns':
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="ali-access-key-id" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                AccessKey ID *
                            </Label>
                            <Input
                                id="ali-access-key-id"
                                value={aliAccessKeyId}
                                onChange={(e) => setAliAccessKeyId(e.target.value)}
                                placeholder="LTAI..."
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ali-access-key-secret" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                AccessKey Secret *
                            </Label>
                            <Input
                                id="ali-access-key-secret"
                                type="password"
                                value={aliAccessKeySecret}
                                onChange={(e) => setAliAccessKeySecret(e.target.value)}
                                placeholder="Your secret key"
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ali-region" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                Region ID (可选)
                            </Label>
                            <Input
                                id="ali-region"
                                value={aliRegionId}
                                onChange={(e) => setAliRegionId(e.target.value)}
                                placeholder="cn-hangzhou"
                                className="font-mono"
                            />
                        </div>
                    </>
                );
            case 'tencentcloud':
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="tencent-secret-id" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                SecretId *
                            </Label>
                            <Input
                                id="tencent-secret-id"
                                value={tencentSecretId}
                                onChange={(e) => setTencentSecretId(e.target.value)}
                                placeholder="AKID..."
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tencent-secret-key" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                SecretKey *
                            </Label>
                            <Input
                                id="tencent-secret-key"
                                type="password"
                                value={tencentSecretKey}
                                onChange={(e) => setTencentSecretKey(e.target.value)}
                                placeholder="Your secret key"
                                className="font-mono"
                            />
                        </div>
                    </>
                );
            case 'cloudflare':
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="cf-api-token" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                API Token (推荐) *
                            </Label>
                            <Input
                                id="cf-api-token"
                                type="password"
                                value={cfApiToken}
                                onChange={(e) => setCfApiToken(e.target.value)}
                                placeholder="Your API token"
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                推荐使用 API Token。如使用 Global API Key，请填写下面两项。
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cf-email" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                Email (使用 Global API Key 时)
                            </Label>
                            <Input
                                id="cf-email"
                                type="email"
                                value={cfEmail}
                                onChange={(e) => setCfEmail(e.target.value)}
                                placeholder="your@email.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cf-api-key" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                Global API Key (使用 Global API Key 时)
                            </Label>
                            <Input
                                id="cf-api-key"
                                type="password"
                                value={cfApiKey}
                                onChange={(e) => setCfApiKey(e.target.value)}
                                placeholder="Your global API key"
                                className="font-mono"
                            />
                        </div>
                    </>
                );
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="flex h-14 items-center justify-between px-4 lg:px-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/ssl')}
                            className="gap-2"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            返回
                        </Button>
                        <div className="w-px h-6 bg-border" />
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
                                <Settings className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="font-semibold">DNS 提供商配置</h1>
                                <p className="text-xs text-muted-foreground font-mono">
                                    管理 DNS API 配置
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 lg:p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-card border">
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
                                    <Cloud className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">DNS 提供商列表</h2>
                                    <p className="text-xs text-muted-foreground font-mono">
                                        {providers.length} 个配置
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setCreateDialogOpen(true)}
                                className="gap-2 font-mono text-xs"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                添加配置
                            </Button>
                        </div>

                        {providers.length === 0 ? (
                            <div className="text-center py-16">
                                <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                                <p className="text-muted-foreground font-mono text-sm">暂无 DNS 配置</p>
                                <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                                    添加 DNS 提供商配置后才能申请证书
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCreateDialogOpen(true)}
                                    className="gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    添加配置
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {providers.map((provider) => (
                                    <div
                                        key={provider.id}
                                        className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Key className="h-4 w-4 text-muted-foreground" />
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{provider.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {getDNSProviderLabel(provider.type)}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="text-xs text-muted-foreground font-mono">
                                            {new Date(provider.createdAt).toLocaleDateString('zh-CN')}
                                        </span>

                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => {
                                                setDeletingProvider(provider);
                                                setDeleteDialogOpen(true);
                                            }}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Create Provider Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Cloud className="h-5 w-5 text-primary" />
                            添加 DNS 提供商
                        </DialogTitle>
                        <DialogDescription className="font-mono">
                            配置 DNS API 凭证用于自动验证域名
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="provider-name" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                配置名称 *
                            </Label>
                            <Input
                                id="provider-name"
                                value={providerName}
                                onChange={(e) => setProviderName(e.target.value)}
                                placeholder="我的 DNS 配置"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="provider-type" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                DNS 提供商 *
                            </Label>
                            <select
                                id="provider-type"
                                value={providerType}
                                onChange={(e) => setProviderType(e.target.value as DNSProviderType)}
                                className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm"
                            >
                                <option value="alidns">阿里云 DNS</option>
                                <option value="tencentcloud">腾讯云 DNSPod</option>
                                <option value="cloudflare">Cloudflare</option>
                            </select>
                        </div>

                        <div className="border-t pt-4 space-y-4">
                            {renderConfigForm()}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCreateDialogOpen(false);
                                resetForm();
                            }}
                            disabled={creating}
                        >
                            取消
                        </Button>
                        <Button onClick={handleCreate} disabled={creating} className="gap-2">
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            添加
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Provider Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除 DNS 配置</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <span>确定要删除以下 DNS 配置吗？使用此配置的证书将无法续期。</span>
                            {deletingProvider && (
                                <code className="block mt-2 p-2 bg-muted text-sm font-mono rounded">
                                    {deletingProvider.name} ({getDNSProviderLabel(deletingProvider.type)})
                                </code>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
