import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { 
    Save, 
    ArrowLeft, 
    CheckCircle2, 
    Loader2,
    RefreshCw,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    const [currentPath, setCurrentPath] = useState('');

    useEffect(() => {
        loadFile();
    }, [filePath, isMainConfig]);

    const loadFile = async () => {
        setLoading(true);
        try {
            let result;
            if (isMainConfig) {
                result = await readMainConfig();
            } else if (filePath) {
                result = await readFile(filePath);
            } else {
                toast.error('未指定文件路径');
                setLoading(false);
                return;
            }

            if (result.error) {
                toast.error('加载失败', { description: result.error });
            } else if (result.content !== null) {
                setContent(result.content);
                setOriginalContent(result.content);
                setFileName(result.name);
                setCurrentPath(result.path);
            }
        } catch (err) {
            toast.error('加载失败', { description: (err as Error).message });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentPath) return;
        
        setSaving(true);
        try {
            const result = await saveFile(currentPath, content);
            if (result.success) {
                setOriginalContent(content);
                toast.success('保存成功');
            } else {
                toast.error('保存失败', { description: result.error });
            }
        } catch (err) {
            toast.error('保存失败', { description: (err as Error).message });
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const result = await testNginxConfig();
            if (result.success) {
                toast.success('配置测试通过', { description: result.output });
            } else {
                toast.error('配置测试失败', { description: result.output });
            }
        } catch (err) {
            toast.error('测试失败', { description: (err as Error).message });
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

    const hasChanges = content !== originalContent;

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
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
                            height="calc(100vh - 200px)"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
