import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    ArrowLeft, 
    Loader2,
    File,
    Folder,
    FileCode,
    Shield,
    FolderOpen,
    ChevronRight,
    Terminal,
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { browseDirectory, deleteFile, type FileInfo } from '@/api/nginx';
import { toast } from 'sonner';

const dirConfig = {
    configs: {
        title: '网站配置',
        description: 'conf.d 目录',
        icon: FolderOpen,
        iconColor: 'text-primary',
    },
    ssl: {
        title: 'SSL 证书',
        description: 'ssl 目录',
        icon: Shield,
        iconColor: 'text-chart-3',
    },
};

export default function BrowsePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const dirType = searchParams.get('dir') as 'configs' | 'ssl';

    const [files, setFiles] = useState<FileInfo[]>([]);
    const [directory, setDirectory] = useState('');
    const [loading, setLoading] = useState(true);
    
    // 删除文件弹窗状态
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<FileInfo | null>(null);
    const [deleting, setDeleting] = useState(false);

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
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleFileClick = (file: FileInfo) => {
        if (file.type === 'file') {
            const editableExtensions = ['.conf', '.txt', '.pem', '.crt', '.key', '.json', ''];
            const isEditable = editableExtensions.some(ext => 
                file.name.endsWith(ext) || !file.name.includes('.')
            );
            
            if (isEditable) {
                navigate(`/nginx/edit?path=${encodeURIComponent(file.path)}`);
            }
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, file: FileInfo) => {
        e.stopPropagation(); // 防止触发行点击
        setFileToDelete(file);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!fileToDelete) return;

        setDeleting(true);
        try {
            const result = await deleteFile(fileToDelete.path);
            if (result.success) {
                toast.success('文件已删除');
                setDeleteDialogOpen(false);
                setFileToDelete(null);
                // 重新加载目录
                loadDirectory();
            } else {
                toast.error('删除失败', { description: result.error });
            }
        } catch (err) {
            toast.error('删除失败', { description: (err as Error).message });
        } finally {
            setDeleting(false);
        }
    };

    const getFileIcon = (file: FileInfo) => {
        if (file.type === 'directory') {
            return <Folder className="h-4 w-4 text-primary" />;
        }
        
        const name = file.name.toLowerCase();
        if (name.endsWith('.conf')) {
            return <FileCode className="h-4 w-4 text-primary" />;
        }
        if (name.endsWith('.pem') || name.endsWith('.crt') || name.endsWith('.key')) {
            return <Shield className="h-4 w-4 text-chart-3" />;
        }
        return <File className="h-4 w-4 text-muted-foreground" />;
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
                            <div className={`w-8 h-8 bg-muted flex items-center justify-center`}>
                                <IconComponent className={`h-4 w-4 ${config.iconColor}`} />
                            </div>
                            <div>
                                <h1 className="font-medium text-sm">{config.title}</h1>
                                <p className="text-xs text-muted-foreground font-mono">{directory}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground hidden sm:block">
                            {files.length} 个文件
                        </span>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 p-4 lg:p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-card border animate-fade-up opacity-0 stagger-2">
                        {/* Table header */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 border-b bg-muted/30 text-xs font-mono uppercase text-muted-foreground">
                            <span>文件名</span>
                            <span className="w-20 text-right hidden sm:block">大小</span>
                            <span className="w-32 text-right hidden md:block">修改时间</span>
                            <span className="w-16"></span>
                        </div>
                        
                        {/* File list */}
                        <div className="divide-y divide-border/50">
                            {loading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        <span className="text-sm font-mono text-muted-foreground">正在加载目录...</span>
                                    </div>
                                </div>
                            ) : files.length === 0 ? (
                                <div className="text-center py-16">
                                    <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                                    <p className="text-muted-foreground font-mono text-sm">目录为空</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1 mb-4">暂无文件</p>
                                </div>
                            ) : (
                                files.map((file, index) => (
                                    <div
                                        key={file.path}
                                        className={`group grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center transition-all cursor-pointer industrial-hover animate-fade-up opacity-0 stagger-${Math.min(index + 3, 8)}`}
                                        onClick={() => handleFileClick(file)}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 bg-muted/50 flex items-center justify-center shrink-0">
                                                {getFileIcon(file)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-mono text-sm truncate">{file.name}</p>
                                                <p className="text-xs text-muted-foreground truncate sm:hidden">
                                                    {formatFileSize(file.size)}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono text-muted-foreground w-20 text-right hidden sm:block">
                                            {file.type === 'directory' ? '-' : formatFileSize(file.size)}
                                        </span>
                                        <div className="flex items-center gap-2 w-32 justify-end hidden md:flex">
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {formatDate(file.modifiedAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {file.type === 'file' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={(e) => handleDeleteClick(e, file)}
                                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {file.type === 'file' && (
                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t bg-muted/30 p-4 animate-fade-in opacity-0 stagger-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-3.5 w-3.5" />
                        <span>{config.title}</span>
                    </div>
                    <span>点击文件进行编辑</span>
                </div>
            </footer>

            {/* Delete File AlertDialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除文件</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <span>确定要删除以下文件吗？此操作无法撤销。</span>
                            {fileToDelete && (
                                <code className="block mt-2 p-2 bg-muted text-sm font-mono rounded">
                                    {fileToDelete.path}
                                </code>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
