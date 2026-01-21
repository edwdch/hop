import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    ArrowLeft, 
    Loader2,
    File,
    Folder,
    FileCode,
    Shield,
    FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { browseDirectory, type FileInfo } from '@/api/nginx';

const dirConfig = {
    configs: {
        title: '网站配置',
        description: 'conf.d 目录',
        icon: FolderOpen,
        iconColor: 'text-blue-500',
    },
    snippets: {
        title: '代码片段',
        description: 'snippets 目录',
        icon: FileCode,
        iconColor: 'text-purple-500',
    },
    ssl: {
        title: 'SSL 证书',
        description: 'ssl 目录',
        icon: Shield,
        iconColor: 'text-green-500',
    },
};

export default function BrowsePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const dirType = searchParams.get('dir') as 'configs' | 'snippets' | 'ssl';

    const [files, setFiles] = useState<FileInfo[]>([]);
    const [directory, setDirectory] = useState('');
    const [loading, setLoading] = useState(true);

    const config = dirConfig[dirType] || dirConfig.configs;
    const IconComponent = config.icon;

    useEffect(() => {
        if (dirType) {
            loadDirectory();
        }
    }, [dirType]);

    const loadDirectory = async () => {
        setLoading(true);
        try {
            const result = await browseDirectory(dirType);
            setFiles(result.files);
            setDirectory(result.directory);
        } catch (err) {
            console.error('Failed to load directory:', err);
        } finally {
            setLoading(false);
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

    const handleFileClick = (file: FileInfo) => {
        if (file.type === 'file') {
            // 检查是否是可编辑的文本文件
            const editableExtensions = ['.conf', '.txt', '.pem', '.crt', '.key', '.json', ''];
            const isEditable = editableExtensions.some(ext => 
                file.name.endsWith(ext) || !file.name.includes('.')
            );
            
            if (isEditable) {
                navigate(`/nginx/edit?path=${encodeURIComponent(file.path)}`);
            }
        }
    };

    const getFileIcon = (file: FileInfo) => {
        if (file.type === 'directory') {
            return <Folder className="h-5 w-5 text-yellow-500" />;
        }
        
        const name = file.name.toLowerCase();
        if (name.endsWith('.conf')) {
            return <FileCode className="h-5 w-5 text-blue-500" />;
        }
        if (name.endsWith('.pem') || name.endsWith('.crt') || name.endsWith('.key')) {
            return <Shield className="h-5 w-5 text-green-500" />;
        }
        return <File className="h-5 w-5 text-muted-foreground" />;
    };

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
                        {config.title}
                    </h1>
                    <p className="text-sm text-muted-foreground">{directory}</p>
                </div>
            </div>

            {/* Files List */}
            <Card>
                <CardHeader>
                    <CardTitle>文件列表</CardTitle>
                    <CardDescription>
                        点击文件进行编辑
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>目录为空</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {files.map((file) => (
                                <div
                                    key={file.path}
                                    className={`flex items-center justify-between py-3 -mx-4 px-4 transition-colors ${
                                        file.type === 'file' 
                                            ? 'hover:bg-accent/50 cursor-pointer' 
                                            : 'opacity-75'
                                    }`}
                                    onClick={() => handleFileClick(file)}
                                >
                                    <div className="flex items-center gap-3">
                                        {getFileIcon(file)}
                                        <div>
                                            <p className="font-medium">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {file.type === 'directory' ? '目录' : file.path}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        <p>{formatFileSize(file.size)}</p>
                                        <p>{formatDate(file.modifiedAt)}</p>
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
