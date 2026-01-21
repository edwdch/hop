import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
    Terminal, 
    User, 
    LogOut, 
    Loader2, 
    Globe, 
    Settings, 
    FileCode, 
    Shield,
    File,
    ChevronRight,
    CheckCircle2,
    RefreshCw,
    Server,
    Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSession, logout } from '@/api/auth';
import { getSites, testNginxConfig, reloadNginx, type SiteInfo } from '@/api/nginx';

export default function HomePage() {
    const navigate = useNavigate();
    const { data: session, isPending } = useSession();
    const [sites, setSites] = useState<SiteInfo[]>([]);
    const [loadingSites, setLoadingSites] = useState(true);
    const [testing, setTesting] = useState(false);
    const [reloading, setReloading] = useState(false);

    useEffect(() => {
        loadSites();
    }, []);

    const loadSites = async () => {
        try {
            const result = await getSites();
            setSites(result.sites);
        } catch (err) {
            console.error('Failed to load sites:', err);
        } finally {
            setLoadingSites(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const result = await testNginxConfig();
            if (result.success) {
                toast.success('配置验证通过', {
                    description: result.output,
                });
            } else {
                toast.error('配置验证失败', {
                    description: result.output,
                });
            }
        } catch (err) {
            toast.error('验证失败', {
                description: (err as Error).message,
            });
        } finally {
            setTesting(false);
        }
    };

    const handleReload = async () => {
        setReloading(true);
        try {
            const result = await reloadNginx();
            if (result.success) {
                toast.success('Nginx 重载成功');
            } else {
                toast.error('Nginx 重载失败', {
                    description: result.output,
                });
            }
        } catch (err) {
            toast.error('重载失败', {
                description: (err as Error).message,
            });
        } finally {
            setReloading(false);
        }
    };

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center industrial-grid">
                <div className="flex flex-col items-center gap-4 animate-fade-up">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm font-mono text-muted-foreground">正在加载系统...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 animate-fade-in opacity-0 stagger-1">
                <div className="flex h-14 items-center justify-between px-4 lg:px-6">
                    <div className="flex items-center gap-6">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary flex items-center justify-center">
                                <Terminal className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <span className="text-lg font-bold tracking-tight font-mono hidden sm:block">HOP</span>
                        </div>
                        
                        {/* Separator */}
                        <div className="w-px h-6 bg-border hidden md:block" />
                        
                        {/* Quick nav */}
                        <nav className="hidden md:flex items-center gap-1">
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate('/nginx/edit?type=main')}
                                className="gap-2 font-mono text-xs uppercase tracking-wider"
                            >
                                <Settings className="h-3.5 w-3.5 text-primary" />
                                主配置
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate('/nginx/browse?dir=snippets')}
                                className="gap-2 font-mono text-xs uppercase tracking-wider"
                            >
                                <FileCode className="h-3.5 w-3.5 text-accent" />
                                片段
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate('/nginx/browse?dir=ssl')}
                                className="gap-2 font-mono text-xs uppercase tracking-wider"
                            >
                                <Shield className="h-3.5 w-3.5 text-chart-3" />
                                SSL
                            </Button>
                        </nav>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Nginx controls */}
                        <div className="flex items-center gap-1 mr-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleTest}
                                disabled={testing}
                                className="gap-2 font-mono text-xs"
                            >
                                {testing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                <span className="hidden sm:inline">测试</span>
                            </Button>
                            <Button 
                                variant="outline"
                                size="sm"
                                onClick={handleReload}
                                disabled={reloading}
                                className="gap-2 font-mono text-xs"
                            >
                                {reloading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-3.5 w-3.5" />
                                )}
                                <span className="hidden sm:inline">重载</span>
                            </Button>
                        </div>
                        
                        <div className="w-px h-6 bg-border" />
                        
                        <ThemeToggle />
                        
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border/50">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-mono text-muted-foreground">
                                {session?.user?.name || session?.user?.email}
                            </span>
                        </div>
                        
                        <Button variant="ghost" size="icon-sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 lg:p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Stats row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up opacity-0 stagger-2">
                        <div className="bg-card border p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono uppercase text-muted-foreground">站点</span>
                                <Globe className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-2xl font-bold font-mono">{loadingSites ? '-' : sites.length}</p>
                        </div>
                        <div className="bg-card border p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono uppercase text-muted-foreground">状态</span>
                                <Activity className="h-4 w-4 text-chart-3" />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="status-dot status-dot-online" />
                                <span className="text-sm font-mono">运行中</span>
                            </div>
                        </div>
                        <div className="bg-card border p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono uppercase text-muted-foreground">服务</span>
                                <Server className="h-4 w-4 text-accent" />
                            </div>
                            <p className="text-sm font-mono text-muted-foreground">Nginx</p>
                        </div>
                        <div className="bg-card border p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono uppercase text-muted-foreground">用户</span>
                                <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-mono truncate">{session?.user?.name}</p>
                        </div>
                    </div>

                    {/* Sites section */}
                    <div className="bg-card border animate-fade-up opacity-0 stagger-3">
                        {/* Section header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
                                    <Globe className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">网站配置</h2>
                                    <p className="text-xs text-muted-foreground font-mono">conf.d/*.conf</p>
                                </div>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground px-2 py-1 bg-muted">
                                {sites.length} 个站点
                            </span>
                        </div>
                        
                        {/* Sites list */}
                        <div className="divide-y divide-border/50">
                            {loadingSites ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : sites.length === 0 ? (
                                <div className="text-center py-16">
                                    <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                                    <p className="text-muted-foreground font-mono text-sm">暂无配置文件</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">在 conf.d 目录添加 .conf 文件</p>
                                </div>
                            ) : (
                                sites.map((site, index) => (
                                    <div
                                        key={site.path}
                                        className={`flex items-center justify-between py-3 px-4 cursor-pointer transition-all industrial-hover animate-fade-up opacity-0 stagger-${Math.min(index + 4, 8)}`}
                                        onClick={() => navigate(`/nginx/edit?path=${encodeURIComponent(site.path)}`)}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 bg-muted/50 flex items-center justify-center shrink-0">
                                                <File className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-mono text-sm font-medium truncate">
                                                    {site.serverNames.length > 0 ? site.serverNames.join(' · ') : site.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground font-mono truncate">
                                                    {site.path}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Quick actions - mobile */}
                    <div className="grid grid-cols-3 gap-2 md:hidden animate-fade-up opacity-0 stagger-6">
                        <Button 
                            variant="outline" 
                            onClick={() => navigate('/nginx/edit?type=main')}
                            className="flex-col h-auto py-4 gap-2"
                        >
                            <Settings className="h-5 w-5 text-primary" />
                            <span className="text-xs font-mono">主配置</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => navigate('/nginx/browse?dir=snippets')}
                            className="flex-col h-auto py-4 gap-2"
                        >
                            <FileCode className="h-5 w-5 text-accent" />
                            <span className="text-xs font-mono">片段</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => navigate('/nginx/browse?dir=ssl')}
                            className="flex-col h-auto py-4 gap-2"
                        >
                            <Shield className="h-5 w-5 text-chart-3" />
                            <span className="text-xs font-mono">SSL</span>
                        </Button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t bg-muted/30 p-4 animate-fade-in opacity-0 stagger-7">
                <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="status-dot status-dot-online" />
                            <span>系统正常</span>
                        </div>
                    </div>
                    <span>Hop · Nginx Configuration Manager</span>
                </div>
            </footer>
        </div>
    );
}
