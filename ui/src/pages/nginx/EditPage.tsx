import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { 
    ArrowLeft, 
    CheckCircle2, 
    Loader2,
    RefreshCw,
    FileText,
    Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NginxEditor } from '@/components/editor/NginxEditor';
import { readMainConfig, testNginxConfig, reloadNginx } from '@/api/nginx';

export default function EditPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isMainConfig = searchParams.get('type') === 'main';

    const [content, setContent] = useState('');
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [reloading, setReloading] = useState(false);
    const [currentPath, setCurrentPath] = useState('');

    useEffect(() => {
        if (!isMainConfig) {
            // 如果不是主配置，重定向回首页
            navigate('/');
            return;
        }
        loadFile();
    }, [isMainConfig, navigate]);

    const loadFile = async () => {
        setLoading(true);
        try {
            const result = await readMainConfig();

            if (result.error) {
                toast.error('加载失败', { description: result.error });
            } else if (result.content !== null) {
                setContent(result.content);
                setFileName(result.name);
                setCurrentPath(result.path);
            }
        } catch (err) {
            toast.error('加载失败', { description: (err as Error).message });
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const result = await testNginxConfig();
            if (result.success) {
                toast.success('配置验证通过', { description: result.output });
            } else {
                toast.error('配置验证失败', { description: result.output });
            }
        } catch (err) {
            toast.error('验证失败', { description: (err as Error).message });
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
                toast.error('Nginx 重载失败', { description: result.output });
            }
        } catch (err) {
            toast.error('重载失败', { description: (err as Error).message });
        } finally {
            setReloading(false);
        }
    };

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
                                <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h1 className="font-mono text-sm font-medium truncate">
                                        {fileName || '主配置'}
                                    </h1>
                                </div>
                                <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px] lg:max-w-md">
                                    {currentPath}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
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
                        
                        <div className="w-px h-6 bg-border" />
                        
                        <span className="text-xs font-mono text-muted-foreground px-2">
                            只读（由模板生成）
                        </span>
                    </div>
                </div>
            </header>

            {/* Editor area */}
            <main className="flex-1 flex flex-col animate-fade-up opacity-0 stagger-2">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-sm font-mono text-muted-foreground">正在加载文件...</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 relative">
                        {/* Editor container with industrial border */}
                        <div className="absolute inset-4 lg:inset-6 border border-border/50 bg-card overflow-hidden">
                            {/* Editor toolbar */}
                            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                                    <Terminal className="h-3.5 w-3.5" />
                                    <span>NGINX CONFIG</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                                    <span>{content.split('\n').length} 行</span>
                                </div>
                            </div>
                            
                            {/* Editor */}
                            <div className="h-[calc(100%-40px)]">
                                <NginxEditor
                                    value={content}
                                    onChange={() => {}} // 只读模式
                                    height="100%"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer status bar */}
            <footer className="border-t bg-muted/30 p-3 animate-fade-in opacity-0 stagger-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono px-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="status-dot status-dot-online" />
                            <span>只读模式</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span>UTF-8</span>
                        <span>Nginx Config</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
