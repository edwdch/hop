import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
    Rocket, 
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
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
                toast.success('配置测试通过', {
                    description: result.output,
                });
            } else {
                toast.error('配置测试失败', {
                    description: result.output,
                });
            }
        } catch (err) {
            toast.error('测试失败', {
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
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="border-b bg-card">
                <div className="container mx-auto flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-primary" />
                            <h1 className="text-lg font-semibold">Hop</h1>
                        </div>
                        {/* 快速访问导航 */}
                        <nav className="flex items-center gap-1">
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate('/nginx/edit?type=main')}
                                className="gap-1.5"
                            >
                                <Settings className="h-4 w-4 text-blue-500" />
                                主配置
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate('/nginx/browse?dir=snippets')}
                                className="gap-1.5"
                            >
                                <FileCode className="h-4 w-4 text-purple-500" />
                                代码片段
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate('/nginx/browse?dir=ssl')}
                                className="gap-1.5"
                            >
                                <Shield className="h-4 w-4 text-green-500" />
                                SSL 证书
                            </Button>
                        </nav>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Nginx 操作按钮 */}
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleTest}
                            disabled={testing}
                            className="gap-1.5"
                        >
                            {testing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                            测试
                        </Button>
                        <Button 
                            variant="outline"
                            size="sm"
                            onClick={handleReload}
                            disabled={reloading}
                            className="gap-1.5"
                        >
                            {reloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            重载
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <ThemeToggle />
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span className="text-sm">{session?.user?.name || session?.user?.email}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6">
                <div className="container mx-auto max-w-4xl">
                    {/* Sites List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                网站列表
                            </CardTitle>
                            <CardDescription>
                                conf.d 目录下的配置文件，每个文件代表一个网站
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingSites ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : sites.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Globe className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                    <p>暂无网站配置</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {sites.map((site) => (
                                        <div
                                            key={site.path}
                                            className="flex items-center justify-between py-3 px-6 hover:bg-accent/50 cursor-pointer transition-colors"
                                            onClick={() => navigate(`/nginx/edit?path=${encodeURIComponent(site.path)}`)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <File className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium">{site.name}</p>
                                                    {site.serverNames.length > 0 ? (
                                                        <p className="text-sm text-primary truncate">
                                                            {site.serverNames.join(', ')}
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground italic">
                                                            无 server_name
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
