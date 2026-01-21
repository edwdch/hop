import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Shield,
    Plus,
    RefreshCw,
    Trash2,
    AlertCircle,
    CheckCircle2,
    Clock,
    XCircle,
    ChevronLeft,
    Loader2,
    Settings,
    Calendar
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
    listCertificates,
    listDNSProviders,
    issueCertificate,
    renewCertificate,
    cleanupCertificate,
    deleteCertificate,
    getSSLStatus,
    type Certificate,
    type DNSProvider,
    getCertificateStatusLabel,
    getCertificateStatusColor,
    getDNSProviderLabel,
} from '@/api/ssl';

export default function SSLPage() {
    const navigate = useNavigate();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [providers, setProviders] = useState<DNSProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [legoInstalled, setLegoInstalled] = useState(false);

    // 申请证书弹窗
    const [issueDialogOpen, setIssueDialogOpen] = useState(false);
    const [issuing, setIssuing] = useState(false);
    const [domains, setDomains] = useState('');
    const [selectedProvider, setSelectedProvider] = useState('');
    const [email, setEmail] = useState('');

    // 续期证书弹窗
    const [renewDialogOpen, setRenewDialogOpen] = useState(false);
    const [renewingCert, setRenewingCert] = useState<Certificate | null>(null);
    const [renewing, setRenewing] = useState(false);
    const [renewEmail, setRenewEmail] = useState('');

    // 删除证书弹窗
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingCert, setDeletingCert] = useState<Certificate | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [certsRes, providersRes, statusRes] = await Promise.all([
                listCertificates(),
                listDNSProviders(),
                getSSLStatus(),
            ]);
            setCertificates(certsRes.certificates);
            setProviders(providersRes.providers);
            setLegoInstalled(statusRes.legoInstalled);
        } catch (err) {
            console.error('Failed to load SSL data:', err);
            toast.error('加载数据失败');
        } finally {
            setLoading(false);
        }
    };

    const handleIssue = async () => {
        if (!domains.trim()) {
            toast.error('请输入域名');
            return;
        }
        if (!selectedProvider) {
            toast.error('请选择 DNS 提供商');
            return;
        }
        if (!email.trim()) {
            toast.error('请输入邮箱');
            return;
        }

        setIssuing(true);
        try {
            const domainList = domains.split(',').map(d => d.trim()).filter(d => d);
            const result = await issueCertificate(domainList, selectedProvider, email);
            if (result.success) {
                toast.success('证书申请成功');
                setIssueDialogOpen(false);
                setDomains('');
                setSelectedProvider('');
                setEmail('');
                loadData();
            } else {
                const errorMsg = result.error || '证书申请失败';
                
                // 检查是否是 DNS 记录冲突错误
                if (errorMsg.includes('已存在') || errorMsg.includes('already exists')) {
                    toast.error('DNS 验证记录冲突', {
                        description: '请在证书列表中点击"清理"按钮清除旧记录后重试',
                        duration: 5000,
                    });
                } else if (errorMsg.includes('认证失败') || errorMsg.includes('authentication')) {
                    toast.error('DNS API 认证失败', {
                        description: '请检查 DNS 提供商配置是否正确',
                        duration: 5000,
                    });
                } else if (errorMsg.includes('rate limit') || errorMsg.includes('速率限制')) {
                    toast.error('触发速率限制', {
                        description: 'Let\'s Encrypt 限制了申请频率，请稍后再试',
                        duration: 5000,
                    });
                } else {
                    toast.error(errorMsg);
                }
            }
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setIssuing(false);
        }
    };

    const handleRenew = async () => {
        if (!renewingCert) return;
        if (!renewEmail.trim()) {
            toast.error('请输入邮箱');
            return;
        }

        setRenewing(true);
        try {
            const result = await renewCertificate(renewingCert.id, renewEmail);
            if (result.success) {
                toast.success('证书续期成功');
                setRenewDialogOpen(false);
                setRenewingCert(null);
                setRenewEmail('');
                loadData();
            } else {
                toast.error(result.error || '证书续期失败');
            }
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setRenewing(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingCert) return;

        setDeleting(true);
        try {
            const result = await deleteCertificate(deletingCert.id);
            if (result.success) {
                toast.success('证书已删除');
                setDeleteDialogOpen(false);
                setDeletingCert(null);
                loadData();
            } else {
                toast.error(result.error || '删除失败');
            }
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setDeleting(false);
        }
    };

    const handleCleanup = async (cert: Certificate) => {
        try {
            const result = await cleanupCertificate(cert.id);
            if (result.success) {
                toast.success('已清理 lego 数据', {
                    description: '现在可以重新申请证书了',
                });
                loadData();
            } else {
                toast.error(result.error || '清理失败');
            }
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    const getStatusIcon = (status: Certificate['status']) => {
        switch (status) {
            case 'active':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'expired':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
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
                            onClick={() => navigate('/')}
                            className="gap-2"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            返回
                        </Button>
                        <div className="w-px h-6 bg-border" />
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
                                <Shield className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="font-semibold">SSL 证书管理</h1>
                                <p className="text-xs text-muted-foreground font-mono">
                                    Let's Encrypt 自动化证书
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/ssl/providers')}
                            className="gap-2 font-mono text-xs"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            DNS 配置
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 lg:p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Lego Status Warning */}
                    {!legoInstalled && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm">Lego 未安装</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        请先安装 lego 工具：
                                        <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
                                            go install github.com/go-acme/lego/v4/cmd/lego@latest
                                        </code>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Certificates Section */}
                    <div className="bg-card border">
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
                                    <Shield className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">证书列表</h2>
                                    <p className="text-xs text-muted-foreground font-mono">
                                        {certificates.length} 个证书
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setIssueDialogOpen(true)}
                                disabled={!legoInstalled || providers.length === 0}
                                className="gap-2 font-mono text-xs"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                申请证书
                            </Button>
                        </div>

                        {/* Table */}
                        {certificates.length === 0 ? (
                            <div className="text-center py-16">
                                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                                <p className="text-muted-foreground font-mono text-sm">暂无证书</p>
                                <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                                    点击上方按钮申请新证书
                                </p>
                                {providers.length === 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate('/ssl/providers')}
                                        className="gap-2"
                                    >
                                        <Settings className="h-4 w-4" />
                                        配置 DNS 提供商
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y">
                                {certificates.map((cert) => (
                                    <div
                                        key={cert.id}
                                        className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {getStatusIcon(cert.status)}
                                            <div className="min-w-0 flex-1">
                                                <p className="font-mono text-sm font-medium truncate">
                                                    {cert.domain}
                                                </p>
                                                {cert.domains.length > 1 && (
                                                    <p className="text-xs text-muted-foreground">
                                                        +{cert.domains.length - 1} 个域名
                                                    </p>
                                                )}
                                                {cert.error && (
                                                    <p className="text-xs text-red-500 mt-1 truncate" title={cert.error}>
                                                        {cert.error}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            <div className="text-right">
                                                <p className="text-xs font-mono">
                                                    {formatDate(cert.notAfter)}
                                                </p>
                                                <p className={`text-xs ${cert.daysRemaining < 30 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                    剩余 {cert.daysRemaining} 天
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => {
                                                    setRenewingCert(cert);
                                                    setRenewDialogOpen(true);
                                                }}
                                                disabled={cert.status !== 'active'}
                                                title="续期证书"
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                            {cert.status === 'error' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleCleanup(cert)}
                                                    title="清理 lego 数据（解决 DNS 冲突）"
                                                    className="text-yellow-500 hover:text-yellow-600"
                                                >
                                                    <AlertCircle className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => {
                                                    setDeletingCert(cert);
                                                    setDeleteDialogOpen(true);
                                                }}
                                                className="text-muted-foreground hover:text-destructive"
                                                title="删除证书"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <span className={`text-xs font-mono ${getCertificateStatusColor(cert.status)}`}>
                                            {getCertificateStatusLabel(cert.status)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Issue Certificate Dialog */}
            <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            申请 SSL 证书
                        </DialogTitle>
                        <DialogDescription className="font-mono">
                            使用 Let's Encrypt 免费申请 SSL 证书
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="domains" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                域名 (逗号分隔)
                            </Label>
                            <Input
                                id="domains"
                                value={domains}
                                onChange={(e) => setDomains(e.target.value)}
                                placeholder="example.com, www.example.com"
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="provider" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                DNS 提供商
                            </Label>
                            <select
                                id="provider"
                                value={selectedProvider}
                                onChange={(e) => setSelectedProvider(e.target.value)}
                                className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm"
                            >
                                <option value="">选择 DNS 提供商</option>
                                {providers.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({getDNSProviderLabel(p.type)})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                邮箱地址
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIssueDialogOpen(false)} disabled={issuing}>
                            取消
                        </Button>
                        <Button onClick={handleIssue} disabled={issuing} className="gap-2">
                            {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            申请证书
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Renew Certificate Dialog */}
            <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-primary" />
                            续期证书
                        </DialogTitle>
                        <DialogDescription className="font-mono">
                            为 {renewingCert?.domain} 续期证书
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="renew-email" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                邮箱地址
                            </Label>
                            <Input
                                id="renew-email"
                                type="email"
                                value={renewEmail}
                                onChange={(e) => setRenewEmail(e.target.value)}
                                placeholder="your@email.com"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenewDialogOpen(false)} disabled={renewing}>
                            取消
                        </Button>
                        <Button onClick={handleRenew} disabled={renewing} className="gap-2">
                            {renewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            续期
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Certificate Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除证书</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <span>确定要删除以下证书吗？此操作无法撤销。</span>
                            {deletingCert && (
                                <code className="block mt-2 p-2 bg-muted text-sm font-mono rounded">
                                    {deletingCert.domain}
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
