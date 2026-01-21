import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Loader2,
    Globe,
    Save,
    Eye,
    Shield,
    Wifi,
    Server,
    Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { getProxySite, saveProxySite, previewProxySite, type ProxySite } from '@/api/nginx';

const defaultSite: ProxySite = {
    id: '',
    serverName: '',
    listenPort: 80,
    ssl: false,
    sslCert: '',
    sslKey: '',
    upstreamScheme: 'http',
    upstreamHost: '127.0.0.1',
    upstreamPort: 8080,
    websocket: false,
};

export default function ProxyEditPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');
    const isNew = !editId;

    const [site, setSite] = useState<ProxySite>(defaultSite);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);

    useEffect(() => {
        if (editId) {
            loadSite(editId);
        }
    }, [editId]);

    const loadSite = async (id: string) => {
        setLoading(true);
        try {
            const data = await getProxySite(id);
            setSite(data);
        } catch (err) {
            toast.error('加载站点失败', { description: (err as Error).message });
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // 验证
        if (!site.serverName.trim()) {
            toast.error('请输入域名');
            return;
        }
        if (!site.upstreamHost.trim()) {
            toast.error('请输入上游主机');
            return;
        }
        if (!site.upstreamPort) {
            toast.error('请输入上游端口');
            return;
        }

        // 生成 ID（如果是新建）
        const siteToSave = { ...site };
        if (!siteToSave.id) {
            // 使用域名作为 ID，替换特殊字符
            siteToSave.id = site.serverName.replace(/[^a-zA-Z0-9.-]/g, '_');
        }

        setSaving(true);
        try {
            const result = await saveProxySite(siteToSave);
            if (result.success) {
                toast.success('站点保存成功');
                navigate('/');
            } else {
                toast.error('保存失败', { description: result.error });
            }
        } catch (err) {
            toast.error('保存失败', { description: (err as Error).message });
        } finally {
            setSaving(false);
        }
    };

    const handlePreview = async () => {
        setPreviewLoading(true);
        setPreviewOpen(true);
        try {
            const result = await previewProxySite(site);
            setPreviewContent(result.content);
        } catch (err) {
            setPreviewContent('预览生成失败: ' + (err as Error).message);
        } finally {
            setPreviewLoading(false);
        }
    };

    const updateSite = (updates: Partial<ProxySite>) => {
        setSite(prev => ({ ...prev, ...updates }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-fade-up">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm font-mono text-muted-foreground">正在加载...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 animate-fade-in opacity-0 stagger-1">
                <div className="flex h-14 items-center justify-between px-4 lg:px-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => navigate('/')}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>

                        <div className="w-px h-6 bg-border" />

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
                                <Globe className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="font-medium text-sm">
                                    {isNew ? '新建代理站点' : '编辑代理站点'}
                                </h1>
                                <p className="text-xs text-muted-foreground font-mono">
                                    {site.serverName || '配置反向代理'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreview}
                            className="gap-2 font-mono text-xs"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">预览配置</span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saving}
                            className="gap-2 font-mono text-xs"
                        >
                            {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Save className="h-3.5 w-3.5" />
                            )}
                            保存
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 p-4 lg:p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* 基本信息 */}
                    <div className="bg-card border p-6 space-y-4 animate-fade-up opacity-0 stagger-2">
                        <div className="flex items-center gap-2 mb-4">
                            <Globe className="h-4 w-4 text-primary" />
                            <h2 className="font-semibold">基本信息</h2>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="serverName" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                域名
                            </Label>
                            <Input
                                id="serverName"
                                value={site.serverName}
                                onChange={(e) => updateSite({ serverName: e.target.value })}
                                placeholder="example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="listenPort" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                监听端口
                            </Label>
                            <Input
                                id="listenPort"
                                type="number"
                                value={site.listenPort || 80}
                                onChange={(e) => updateSite({ listenPort: parseInt(e.target.value) || 80 })}
                                placeholder="80"
                            />
                        </div>
                    </div>

                    {/* 上游配置 */}
                    <div className="bg-card border p-6 space-y-4 animate-fade-up opacity-0 stagger-3">
                        <div className="flex items-center gap-2 mb-4">
                            <Server className="h-4 w-4 text-accent" />
                            <h2 className="font-semibold">上游服务</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                    协议
                                </Label>
                                <Select
                                    value={site.upstreamScheme}
                                    onValueChange={(value: 'http' | 'https') => updateSite({ upstreamScheme: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="http">HTTP</SelectItem>
                                        <SelectItem value="https">HTTPS</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="upstreamHost" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                    主机
                                </Label>
                                <Input
                                    id="upstreamHost"
                                    value={site.upstreamHost}
                                    onChange={(e) => updateSite({ upstreamHost: e.target.value })}
                                    placeholder="127.0.0.1"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="upstreamPort" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                    端口
                                </Label>
                                <Input
                                    id="upstreamPort"
                                    type="number"
                                    value={site.upstreamPort}
                                    onChange={(e) => updateSite({ upstreamPort: parseInt(e.target.value) || 8080 })}
                                    placeholder="8080"
                                />
                            </div>
                        </div>

                        <div className="pt-2 text-xs text-muted-foreground font-mono">
                            代理目标: {site.upstreamScheme}://{site.upstreamHost}:{site.upstreamPort}
                        </div>
                    </div>

                    {/* 功能选项 */}
                    <div className="bg-card border p-6 space-y-4 animate-fade-up opacity-0 stagger-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Wifi className="h-4 w-4 text-chart-3" />
                            <h2 className="font-semibold">功能选项</h2>
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">WebSocket 支持</Label>
                                <p className="text-xs text-muted-foreground">
                                    启用 WebSocket 连接升级和长连接支持
                                </p>
                            </div>
                            <Switch
                                checked={site.websocket}
                                onCheckedChange={(checked: boolean) => updateSite({ websocket: checked })}
                            />
                        </div>
                    </div>

                    {/* SSL 配置 */}
                    <div className="bg-card border p-6 space-y-4 animate-fade-up opacity-0 stagger-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-chart-3" />
                                <h2 className="font-semibold">SSL/HTTPS</h2>
                            </div>
                            <Switch
                                checked={site.ssl}
                                onCheckedChange={(checked: boolean) => updateSite({ ssl: checked })}
                            />
                        </div>

                        {site.ssl && (
                            <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="sslCert" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                        证书路径
                                    </Label>
                                    <Input
                                        id="sslCert"
                                        value={site.sslCert || ''}
                                        onChange={(e) => updateSite({ sslCert: e.target.value })}
                                        placeholder="/path/to/cert.pem"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sslKey" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                        私钥路径
                                    </Label>
                                    <Input
                                        id="sslKey"
                                        value={site.sslKey || ''}
                                        onChange={(e) => updateSite({ sslKey: e.target.value })}
                                        placeholder="/path/to/key.pem"
                                    />
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    启用 SSL 后，HTTP 请求将自动重定向到 HTTPS
                                </p>
                            </div>
                        )}

                        {!site.ssl && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Unlock className="h-4 w-4" />
                                <span className="text-sm">当前使用 HTTP 协议</span>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            配置预览
                        </DialogTitle>
                    </DialogHeader>
                    <div className="overflow-auto">
                        {previewLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : (
                            <pre className="bg-muted p-4 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                                {previewContent}
                            </pre>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
