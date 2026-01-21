import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
    Unlock,
    AlertCircle,
    ExternalLink
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
import { listCertificates, type Certificate, getCertificateStatusLabel } from '@/api/ssl';

const defaultSite: ProxySite = {
    id: '',
    serverName: '',
    ssl: false,
    sslCert: '',
    sslKey: '',
    certificateId: '',
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

    // 证书列表
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [certificatesLoading, setCertificatesLoading] = useState(true);

    // 加载证书列表
    useEffect(() => {
        loadCertificates();
    }, []);

    useEffect(() => {
        if (editId) {
            loadSite(editId);
        }
    }, [editId]);

    const loadCertificates = async () => {
        setCertificatesLoading(true);
        try {
            const result = await listCertificates();
            // 只显示有效的证书
            setCertificates(result.certificates?.filter(c => c.status === 'active') || []);
        } catch (err) {
            console.error('加载证书列表失败:', err);
            setCertificates([]);
        } finally {
            setCertificatesLoading(false);
        }
    };

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
        // SSL 验证：启用 SSL 时必须选择证书
        if (site.ssl && !site.certificateId) {
            toast.error('请选择一个 SSL 证书');
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
                <div className="max-w-2xl mx-auto space-y-4">
                    {/* 基本信息 */}
                    <div className="bg-card border p-4 space-y-3 animate-fade-up opacity-0 stagger-2">
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            <h2 className="font-semibold text-sm">基本信息</h2>
                        </div>

                        <div className="space-y-1.5">
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
                    </div>

                    {/* 上游配置 */}
                    <div className="bg-card border p-4 space-y-3 animate-fade-up opacity-0 stagger-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-accent" />
                                <h2 className="font-semibold text-sm">上游服务</h2>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                                {site.upstreamScheme}://{site.upstreamHost}:{site.upstreamPort}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
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

                            <div className="space-y-1.5">
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

                            <div className="space-y-1.5">
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
                    </div>

                    {/* 功能选项 */}
                    <div className="bg-card border p-4 animate-fade-up opacity-0 stagger-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wifi className="h-4 w-4 text-chart-3" />
                                <Label className="text-sm font-semibold">WebSocket 支持</Label>
                            </div>
                            <Switch
                                checked={site.websocket}
                                onCheckedChange={(checked: boolean) => updateSite({ websocket: checked })}
                            />
                        </div>
                    </div>

                    {/* SSL 配置 */}
                    <div className="bg-card border p-4 space-y-3 animate-fade-up opacity-0 stagger-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-chart-3" />
                                <h2 className="font-semibold text-sm">SSL/HTTPS</h2>
                            </div>
                            <Switch
                                checked={site.ssl}
                                onCheckedChange={(checked: boolean) => updateSite({ ssl: checked, certificateId: '' })}
                            />
                        </div>

                        {site.ssl && (
                            <div className="space-y-3">
                                {certificatesLoading ? (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">加载证书列表...</span>
                                    </div>
                                ) : certificates.length > 0 ? (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                            选择证书
                                        </Label>
                                        <Select
                                            value={site.certificateId || ''}
                                            onValueChange={(value) => updateSite({ certificateId: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="请选择一个证书" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {certificates.map((cert) => (
                                                    <SelectItem key={cert.id} value={cert.id}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{cert.domain}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                ({getCertificateStatusLabel(cert.status)}, 剩余 {cert.daysRemaining} 天)
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                            <span className="text-sm text-amber-500">尚未申请证书</span>
                                        </div>
                                        <Link to="/ssl">
                                            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                                                <ExternalLink className="h-3 w-3" />
                                                申请证书
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}

                        {!site.ssl && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Unlock className="h-4 w-4" />
                                <span>当前使用 HTTP 协议</span>
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
