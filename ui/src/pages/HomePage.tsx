import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSession, logout } from '@/api/auth';
import { getSites, type FileInfo } from '@/api/nginx';

export default function HomePage() {
    const navigate = useNavigate();
    const { data: session, isPending } = useSession();
    const [sites, setSites] = useState<FileInfo[]>([]);
    const [loadingSites, setLoadingSites] = useState(true);

    useEffect(() => {
        loadSites();
    }, []);

    const loadSites = async () => {
        try {
            const result = await getSites();
            setSites(result.sites.slice(0, 5)); // 只显示前5个
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
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <Rocket className="h-6 w-6 text-primary" />
                        <h1 className="text-xl font-semibold">Hop 代理管理</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span className="text-sm">{session?.user?.name || session?.user?.email}</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            退出登录
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6">
                <div className="container mx-auto max-w-6xl">
                    {/* Quick Access */}
                    <h2 className="text-lg font-semibold mb-4">快速访问</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <Card 
                            className="cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => navigate('/nginx')}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Server className="h-5 w-5 text-orange-500" />
                                    Nginx 管理
                                </CardTitle>
                                <CardDescription>管理网站配置</CardDescription>
                            </CardHeader>
                        </Card>

                        <Card 
                            className="cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => navigate('/nginx/edit?type=main')}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Settings className="h-5 w-5 text-blue-500" />
                                    主配置
                                </CardTitle>
                                <CardDescription>nginx.conf</CardDescription>
                            </CardHeader>
                        </Card>

                        <Card 
                            className="cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => navigate('/nginx/browse?dir=snippets')}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FileCode className="h-5 w-5 text-purple-500" />
                                    代码片段
                                </CardTitle>
                                <CardDescription>snippets 目录</CardDescription>
                            </CardHeader>
                        </Card>

                        <Card 
                            className="cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => navigate('/nginx/browse?dir=ssl')}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Shield className="h-5 w-5 text-green-500" />
                                    SSL 证书
                                </CardTitle>
                                <CardDescription>ssl 目录</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Sites List */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            网站列表
                        </h2>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/nginx')}>
                            查看全部
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                    
                    <Card>
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
                                            className="flex items-center justify-between py-3 px-4 hover:bg-accent/50 cursor-pointer transition-colors"
                                            onClick={() => navigate(`/nginx/edit?path=${encodeURIComponent(site.path)}`)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <File className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{site.name}</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
