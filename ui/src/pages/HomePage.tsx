import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSession, logout } from '@/api/auth';
import { listProxySites, deleteProxySite, testNginxConfig, reloadNginx, type ProxySite } from '@/api/nginx';
import { LoadingScreen } from '@/components/home/LoadingScreen';
import { AppHeader } from '@/components/home/AppHeader';
import { StatsGrid } from '@/components/home/StatsGrid';
import { SitesTable } from '@/components/home/SitesTable';
import { MobileQuickActions } from '@/components/home/MobileQuickActions';
import { AppFooter } from '@/components/home/AppFooter';
import { DeleteSiteDialog } from '@/components/home/DeleteSiteDialog';

export default function HomePage() {
    const navigate = useNavigate();
    const { data: session, isPending } = useSession();
    const [sites, setSites] = useState<ProxySite[]>([]);
    const [loadingSites, setLoadingSites] = useState(true);
    const [testing, setTesting] = useState(false);
    const [reloading, setReloading] = useState(false);

    // 删除站点弹窗状态
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [siteToDelete, setSiteToDelete] = useState<ProxySite | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadSites();
    }, []);

    const loadSites = async () => {
        try {
            const result = await listProxySites();
            setSites(result.sites ?? []);
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

    const handleDeleteClick = (e: React.MouseEvent, site: ProxySite) => {
        e.stopPropagation(); // 防止触发行点击
        setSiteToDelete(site);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!siteToDelete) return;

        setDeleting(true);
        try {
            const result = await deleteProxySite(siteToDelete.id);
            if (result.success) {
                toast.success('站点已删除');
                setDeleteDialogOpen(false);
                setSiteToDelete(null);
                // 重新加载站点列表
                loadSites();
            } else {
                toast.error('删除失败', { description: result.error });
            }
        } catch (err) {
            toast.error('删除失败', { description: (err as Error).message });
        } finally {
            setDeleting(false);
        }
    };

    if (isPending) {
        return <LoadingScreen />;
    }

    return (
        <div className="min-h-screen flex flex-col">
            <AppHeader
                session={session}
                testing={testing}
                reloading={reloading}
                onTest={handleTest}
                onReload={handleReload}
                onLogout={handleLogout}
            />

            <main className="flex-1 p-4 lg:p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    <StatsGrid
                        sites={sites}
                        loading={loadingSites}
                        session={session}
                    />

                    <SitesTable
                        sites={sites}
                        loading={loadingSites}
                        onDeleteClick={handleDeleteClick}
                        onNavigate={navigate}
                    />

                    <MobileQuickActions onNavigate={navigate} />
                </div>
            </main>

            <AppFooter />

            <DeleteSiteDialog
                open={deleteDialogOpen}
                site={siteToDelete}
                deleting={deleting}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    );
}
