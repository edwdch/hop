import { Network, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { type StreamRoute } from '@/api/stream';

interface StreamRouteCardProps {
    route: StreamRoute;
    index: number;
    onEdit: (route: StreamRoute) => void;
    onDelete: (route: StreamRoute) => void;
    onToggle: (route: StreamRoute) => void;
}

export function StreamRouteCard({
    route,
    index,
    onEdit,
    onDelete,
    onToggle,
}: StreamRouteCardProps) {
    return (
        <div
            className={`group relative bg-card border p-4 cursor-pointer transition-all industrial-hover animate-fade-up opacity-0 stagger-${Math.min(index + 2, 8)}`}
            onClick={() => onEdit(route)}
        >
            {/* Header: Status + Domain */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Status indicator */}
                    <div className="relative shrink-0">
                        <div className="w-10 h-10 bg-muted/50 flex items-center justify-center">
                            <Network className="h-5 w-5 text-primary" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-card flex items-center justify-center">
                            <div className={`status-dot ${route.enabled ? 'status-dot-online' : 'status-dot-offline'}`} />
                        </div>
                    </div>
                    {/* Domain name */}
                    <div className="min-w-0 flex-1">
                        <h3 className="font-mono text-sm font-semibold truncate text-foreground">
                            {route.domain}
                        </h3>
                        {route.name && (
                            <p className="text-xs text-muted-foreground truncate">
                                {route.name}
                            </p>
                        )}
                    </div>
                </div>
                {/* Delete button - shown on hover */}
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(route);
                    }}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Backend info */}
            <div className="mb-3 p-2 bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                    <span className="truncate">{route.backend}</span>
                </div>
            </div>

            {/* Footer: Switch + Edit hint */}
            <div className="flex items-center justify-between gap-2">
                <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Switch
                        checked={route.enabled}
                        onCheckedChange={() => onToggle(route)}
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                        {route.enabled ? '已启用' : '已禁用'}
                    </span>
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
