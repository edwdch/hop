import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Terminal,
    User,
    LogOut,
    Loader2,
    CheckCircle2,
    RefreshCw,
    Plus,
    ArrowLeft,
    Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSession, logout } from '@/api/auth';
import { testNginxConfig, reloadNginx } from '@/api/nginx';
import {
    listStreamRoutes,
    saveStreamRoute,
    deleteStreamRoute,
    toggleStreamRoute,
    type StreamRoute,
} from '@/api/stream';
import { StreamRouteTable } from '@/components/stream/StreamRouteTable';
import { StreamRouteDialog } from '@/components/stream/StreamRouteDialog';
import { DeleteRouteDialog } from '@/components/stream/DeleteRouteDialog';
import { LoadingScreen } from '@/components/home/LoadingScreen';
import { AppFooter } from '@/components/home/AppFooter';

export default function StreamPage() {
    const navigate = useNavigate();
    const { data: session, isPending } = useSession();

    const [routes, setRoutes] = useState<StreamRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [reloading, setReloading] = useState(false);

    // 编辑/新建弹窗状态
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<StreamRoute | null>(null);
    const [saving, setSaving] = useState(false);

    // 删除弹窗状态
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [routeToDelete, setRouteToDelete] = useState<StreamRoute | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadRoutes();
    }, []);

    const loadRoutes = async () => {
        try {
            const result = await listStreamRoutes();
            setRoutes(result.routes ?? []);
        } catch (err) {
            console.error('Failed to load routes:', err);
            toast.error('加载路由列表失败');
        } finally {
            setLoading(false);
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

    // 添加新路由
    const handleAdd = () => {
        setEditingRoute(null);
        setDialogOpen(true);
    };

    // 编辑路由
    const handleEdit = (route: StreamRoute) => {
        setEditingRoute(route);
        setDialogOpen(true);
    };

    // 保存路由
    const handleSave = async (route: StreamRoute) => {
        setSaving(true);
        try {
            const result = await saveStreamRoute(route);
            if (result.success) {
                toast.success(editingRoute ? '路由已更新' : '路由已创建');
                setDialogOpen(false);
                loadRoutes();
            } else {
                toast.error('保存失败', { description: result.error });
            }
        } catch (err) {
            toast.error('保存失败', { description: (err as Error).message });
        } finally {
            setSaving(false);
        }
    };

    // 删除路由
    const handleDelete = (route: StreamRoute) => {
        setRouteToDelete(route);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!routeToDelete) return;

        setDeleting(true);
        try {
            const result = await deleteStreamRoute(routeToDelete.id);
            if (result.success) {
                toast.success('路由已删除');
                setDeleteDialogOpen(false);
                setRouteToDelete(null);
                loadRoutes();
            } else {
                toast.error('删除失败', { description: result.error });
            }
        } catch (err) {
            toast.error('删除失败', { description: (err as Error).message });
        } finally {
            setDeleting(false);
        }
    };

    // 切换启用状态
    const handleToggle = async (route: StreamRoute) => {
        try {
            const result = await toggleStreamRoute(route.id);
            if (result.success) {
                toast.success(result.enabled ? '已启用' : '已禁用');
                loadRoutes();
            } else {
                toast.error('操作失败', { description: result.error });
            }
        } catch (err) {
            toast.error('操作失败', { description: (err as Error).message });
        }
    };

    if (isPending) {
        return <LoadingScreen />;
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

                        {/* Back + Title */}
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => navigate('/')}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Network className="h-4 w-4 text-primary" />
                                <span className="font-mono text-sm font-medium">SNI 分流</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Add button */}
                        <Button
                            size="sm"
                            onClick={handleAdd}
                            className="gap-2 font-mono text-xs uppercase tracking-wider"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            添加
                        </Button>

                        {/* Nginx controls */}
                        <div className="flex items-center gap-1">
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

                        <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="hidden lg:flex gap-2 font-mono text-xs"
                        >
                            <User className="h-3.5 w-3.5" />
                            {session?.user?.name || session?.user?.email}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleLogout}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 p-4 lg:p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Info banner */}
                    <div className="bg-muted/30 border p-4 animate-fade-up opacity-0 stagger-1">
                        <div className="flex items-start gap-3">
                            <Network className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Stream 端口复用</p>
                                <p className="text-xs text-muted-foreground">
                                    通过 Nginx stream 模块，443 端口根据 TLS 握手时的 SNI 信息将流量分发到不同后端。
                                    未匹配的域名将转发到 444 端口由 HTTP 块处理。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Routes table */}
                    <StreamRouteTable
                        routes={routes}
                        loading={loading}
                        onAdd={handleAdd}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggle={handleToggle}
                    />
                </div>
            </main>

            <AppFooter />

            {/* Dialogs */}
            <StreamRouteDialog
                open={dialogOpen}
                route={editingRoute}
                saving={saving}
                onOpenChange={setDialogOpen}
                onSave={handleSave}
            />

            <DeleteRouteDialog
                open={deleteDialogOpen}
                route={routeToDelete}
                deleting={deleting}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    );
}
