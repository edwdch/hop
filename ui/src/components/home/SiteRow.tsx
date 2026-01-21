import { Globe, ChevronRight, Trash2, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ProxySite } from '@/api/nginx';

interface SiteRowProps {
    site: ProxySite;
    index: number;
    onDeleteClick: (e: React.MouseEvent, site: ProxySite) => void;
    onNavigate: (path: string) => void;
}

export function SiteRow({ site, index, onDeleteClick, onNavigate }: SiteRowProps) {
    return (
        <div
            className={`group grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center cursor-pointer transition-all industrial-hover animate-fade-up opacity-0 stagger-${Math.min(index + 4, 8)}`}
            onClick={() => onNavigate(`/nginx/proxy?id=${encodeURIComponent(site.id)}`)}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-muted/50 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                    <p className="font-mono text-sm font-medium truncate">
                        {site.serverName}
                    </p>
                </div>
            </div>
            <div className="w-32 text-center hidden sm:block">
                <p className="text-xs font-mono text-muted-foreground truncate">
                    {site.upstreamScheme}://{site.upstreamHost}:{site.upstreamPort}
                </p>
            </div>
            <div className="flex items-center gap-1 w-24 justify-center hidden md:flex">
                {site.ssl && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-chart-3/10 text-chart-3 text-xs font-mono rounded">
                        <Lock className="h-3 w-3" />
                        SSL
                    </span>
                )}
                {site.websocket && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-accent/10 text-accent text-xs font-mono rounded">
                        <Zap className="h-3 w-3" />
                        WS
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => onDeleteClick(e, site)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
        </div>
    );
}
