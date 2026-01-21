import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FileText, 
    Settings, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle,
    Loader2,
    ArrowLeft,
    Globe,
    FileCode,
    Shield,
    File
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSites, testNginxConfig, reloadNginx, type FileInfo } from '@/api/nginx';

export default function NginxSitesPage() {
    const navigate = useNavigate();
    const [sites, setSites] = useState<FileInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [testResult, setTestResult] = useState<{ success: boolean; output: string } | null>(null);
    const [testing, setTesting] = useState(false);
    const [reloading, setReloading] = useState(false);

    useEffect(() => {
        loadSites();
    }, []);

    const loadSites = async () => {
        setLoading(true);
        try {
            const result = await getSites();
            setSites(result.sites);
        } catch (err) {
            console.error('Failed to load sites:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await testNginxConfig();
            setTestResult(result);
        } catch (err) {
            setTestResult({ success: false, output: `Error: ${(err as Error).message}` });
        } finally {
            setTesting(false);
        }
    };

    const handleReload = async () => {
        setReloading(true);
        try {
            const result = await reloadNginx();
            setTestResult(result);
        } catch (err) {
            setTestResult({ success: false, output: `Error: ${(err as Error).message}` });
        } finally {
            setReloading(false);
        }
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN');
    };

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Nginx 配置管理</h1>
                        <p className="text-muted-foreground">管理您的网站配置文件</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={handleTest}
                        disabled={testing}
                    >
                        {testing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        测试配置
                    </Button>
                    <Button 
                        onClick={handleReload}
                        disabled={reloading}
                    >
                        {reloading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        重载 Nginx
                    </Button>
                </div>
            </div>

            {/* Test Result */}
            {testResult && (
                <div className={`mb-6 p-4 rounded-lg border ${
                    testResult.success 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                }`}>
                    <div className="flex items-start gap-2">
                        {testResult.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                        )}
                        <pre className="text-sm whitespace-pre-wrap font-mono flex-1">
                            {testResult.output}
                        </pre>
                    </div>
                </div>
            )}

            {/* Quick Access Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card 
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => navigate('/nginx/edit?type=main')}
                >
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Settings className="h-5 w-5 text-blue-500" />
                            主配置文件
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
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : sites.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>暂无网站配置文件</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {sites.map((site) => (
                                <div
                                    key={site.path}
                                    className="flex items-center justify-between py-3 hover:bg-accent/50 -mx-4 px-4 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/nginx/edit?path=${encodeURIComponent(site.path)}`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <File className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{site.name}</p>
                                            <p className="text-sm text-muted-foreground">{site.path}</p>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        <p>{formatFileSize(site.size)}</p>
                                        <p>{formatDate(site.modifiedAt)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
