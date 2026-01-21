import { Globe, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ProxySite } from '@/api/nginx';
import { SiteRow } from './SiteRow';

interface SitesTableProps {
    sites: ProxySite[];
    loading: boolean;
    onDeleteClick: (e: React.MouseEvent, site: ProxySite) => void;
    onNavigate: (path: string) => void;
}

export function SitesTable({ sites, loading, onDeleteClick, onNavigate }: SitesTableProps) {
    return (
        <div className="bg-card border animate-fade-up opacity-0 stagger-3">
            {/* Section header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
                        <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-semibold">网站配置</h2>
                        <p className="text-xs text-muted-foreground font-mono">conf.d/*.conf</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground px-2 py-1 bg-muted hidden sm:block">
                        {sites.length} 个站点
                    </span>
                    <Button
                        size="sm"
                        onClick={() => onNavigate('/nginx/proxy')}
                        className="gap-2 font-mono text-xs"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">新建站点</span>
                    </Button>
                </div>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 border-b bg-muted/30 text-xs font-mono uppercase text-muted-foreground">
                <span>站点</span>
                <span className="w-32 text-center hidden sm:block">上游</span>
                <span className="w-24 text-center hidden md:block">特性</span>
                <span className="w-16"></span>
            </div>

            {/* Sites list */}
            <div className="divide-y divide-border/50">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : sites.length === 0 ? (
                    <div className="text-center py-16">
                        <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground font-mono text-sm">暂无代理站点</p>
                        <p className="text-xs text-muted-foreground/60 mt-1 mb-4">点击上方按钮创建新的代理站点</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onNavigate('/nginx/proxy')}
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            新建站点
                        </Button>
                    </div>
                ) : (
                    sites.map((site, index) => (
                        <SiteRow
                            key={site.id}
                            site={site}
                            index={index}
                            onDeleteClick={onDeleteClick}
                            onNavigate={onNavigate}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
