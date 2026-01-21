import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Save, 
    ArrowLeft, 
    CheckCircle2, 
    AlertCircle,
    Loader2,
    RefreshCw,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NginxEditor } from '@/components/editor/NginxEditor';
import { readFile, readMainConfig, saveFile, testNginxConfig, reloadNginx } from '@/api/nginx';

export default function EditPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const filePath = searchParams.get('path');
    const isMainConfig = searchParams.get('type') === 'main';

    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [reloading, setReloading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [currentPath, setCurrentPath] = useState('');

    useEffect(() => {
        loadFile();
    }, [filePath, isMainConfig]);

    const loadFile = async () => {
        setLoading(true);
        setMessage(null);
        try {
            let result;
            if (isMainConfig) {
                result = await readMainConfig();
            } else if (filePath) {
                result = await readFile(filePath);
            } else {
                setMessage({ type: 'error', text: '未指定文件路径' });
                setLoading(false);
                return;
            }

            if (result.error) {
                setMessage({ type: 'error', text: result.error });
            } else if (result.content !== null) {
                setContent(result.content);
                setOriginalContent(result.content);
                setFileName(result.name);
                setCurrentPath(result.path);
            }
        } catch (err) {
            setMessage({ type: 'error', text: `加载失败: ${(err as Error).message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentPath) return;
        
        setSaving(true);
        setMessage(null);
        try {
            const result = await saveFile(currentPath, content);
            if (result.success) {
                setOriginalContent(content);
                setMessage({ type: 'success', text: '保存成功' });
            } else {
                setMessage({ type: 'error', text: result.error || '保存失败' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: `保存失败: ${(err as Error).message}` });
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setMessage(null);
        try {
            const result = await testNginxConfig();
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.output,
            });
        } catch (err) {
            setMessage({ type: 'error', text: `测试失败: ${(err as Error).message}` });
        } finally {
            setTesting(false);
        }
    };

    const handleReload = async () => {
        setReloading(true);
        setMessage(null);
        try {
            const result = await reloadNginx();
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.output,
            });
        } catch (err) {
            setMessage({ type: 'error', text: `重载失败: ${(err as Error).message}` });
        } finally {
            setReloading(false);
        }
    };

    const hasChanges = content !== originalContent;

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/nginx')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <FileText className="h-6 w-6" />
                            {fileName || '配置编辑器'}
                        </h1>
                        <p className="text-sm text-muted-foreground">{currentPath}</p>
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
                        variant="outline"
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
                    <Button 
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                    >
                        {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        保存 {hasChanges && '*'}
                    </Button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-4 rounded-lg border ${
                    message.type === 'success' 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                }`}>
                    <div className="flex items-start gap-2">
                        {message.type === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                        )}
                        <pre className="text-sm whitespace-pre-wrap font-mono flex-1">
                            {message.text}
                        </pre>
                    </div>
                </div>
            )}

            {/* Editor */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <NginxEditor
                            value={content}
                            onChange={setContent}
                            height="calc(100vh - 280px)"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
