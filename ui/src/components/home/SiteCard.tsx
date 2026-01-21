import { Globe, Trash2, Lock, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ProxySite } from '@/api/nginx';

interface SiteCardProps {
    site: ProxySite;
    index: number;
    onDeleteClick: (e: React.MouseEvent, site: ProxySite) => void;
    onNavigate: (path: string) => void;
}

export function SiteCard({ site, index, onDeleteClick, onNavigate }: SiteCardProps) {
    return (
        <div
            className={`group relative bg-card border p-4 cursor-pointer transition-all industrial-hover animate-fade-up opacity-0 stagger-${Math.min(index + 2, 8)}`}
            onClick={() => onNavigate(`/nginx/proxy?id=${encodeURIComponent(site.id)}`)}
        >
            {/* Header: Status + Domain + Port */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Status indicator */}
                    <div className="relative shrink-0">
                        <div className="w-10 h-10 bg-muted/50 flex items-center justify-center">
                            <Globe className="h-5 w-5 text-primary" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-card flex items-center justify-center">
                            <div className="status-dot status-dot-online" />
                        </div>
                    </div>
                    {/* Domain name */}
                    <div className="min-w-0 flex-1">
                        <h3 className="font-mono text-sm font-semibold truncate text-foreground">
                            {site.serverName}
                        </h3>
                    </div>
                </div>
                {/* Delete button - shown on hover */}
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => onDeleteClick(e, site)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Upstream info */}
            <div className="mb-3 p-2 bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                    <span className="truncate">
                        {site.upstreamScheme}://{site.upstreamHost}:{site.upstreamPort}
                    </span>
                </div>
            </div>

            {/* Feature tags */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {site.ssl && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-chart-3/10 text-chart-3 text-xs font-mono">
                            <Lock className="h-3 w-3" />
                            SSL
                        </span>
                    )}
                    {site.websocket && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent text-xs font-mono">
                            <Zap className="h-3 w-3" />
                            WS
                        </span>
                    )}
                    {!site.ssl && !site.websocket && (
                        <span className="text-xs text-muted-foreground/50 font-mono">
                            基础配置
                        </span>
                    )}
                </div>
                {/* Edit indicator */}
                <div className="text-xs text-muted-foreground/50 font-mono opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    编辑
                    <ArrowRight className="h-3 w-3" />
                </div>
            </div>

            {/* Hover accent border effect */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/30 pointer-events-none transition-colors" />
        </div>
    );
}
