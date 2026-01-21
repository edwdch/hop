import { Globe, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ProxySite } from '@/api/nginx';
import { SiteCard } from './SiteCard';

interface SitesTableProps {
    sites: ProxySite[];
    loading: boolean;
    onDeleteClick: (e: React.MouseEvent, site: ProxySite) => void;
    onNavigate: (path: string) => void;
}

export function SitesTable({ sites, loading, onDeleteClick, onNavigate }: SitesTableProps) {
    return (
        <div className="animate-fade-up opacity-0 stagger-2">
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
                        <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-semibold">网站配置</h2>
                        <p className="text-xs text-muted-foreground font-mono">
                            {loading ? '加载中...' : `${sites.length} 个站点`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Sites grid */}
            {loading ? (
                <div className="flex items-center justify-center py-16 bg-card border">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : sites.length === 0 ? (
                <div className="text-center py-16 bg-card border">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted/30 flex items-center justify-center">
                        <Globe className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-muted-foreground font-mono text-sm mb-1">暂无代理站点</p>
                    <p className="text-xs text-muted-foreground/60 mb-4">
                        点击顶部导航栏的「新建」按钮创建站点
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate('/nginx/proxy')}
                        className="gap-2 font-mono"
                    >
                        <Plus className="h-4 w-4" />
                        新建站点
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sites.map((site, index) => (
                        <SiteCard
                            key={site.id}
                            site={site}
                            index={index}
                            onDeleteClick={onDeleteClick}
                            onNavigate={onNavigate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
