import { ChevronRight, Trash2, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { type StreamRoute } from '@/api/stream';

interface StreamRouteRowProps {
    route: StreamRoute;
    index: number;
    onEdit: (route: StreamRoute) => void;
    onDelete: (route: StreamRoute) => void;
    onToggle: (route: StreamRoute) => void;
}

export function StreamRouteRow({
    route,
    index,
    onEdit,
    onDelete,
    onToggle,
}: StreamRouteRowProps) {
    return (
        <div
            className={`group grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-4 py-3 items-center cursor-pointer transition-all industrial-hover animate-fade-up opacity-0 stagger-${Math.min(index + 4, 8)}`}
            onClick={() => onEdit(route)}
        >
            {/* Domain */}
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-muted/50 flex items-center justify-center shrink-0">
                    <Network className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                    <p className="font-mono text-sm font-medium truncate">
                        {route.domain}
                    </p>
                    {route.name && (
                        <p className="text-xs text-muted-foreground truncate">
                            {route.name}
                        </p>
                    )}
                </div>
            </div>

            {/* Backend */}
            <div className="text-center">
                <p className="text-xs font-mono text-muted-foreground truncate">
                    {route.backend}
                </p>
            </div>

            {/* Status Switch */}
            <div
                className="flex items-center gap-2 w-24"
                onClick={(e) => e.stopPropagation()}
            >
                <Switch
                    checked={route.enabled}
                    onCheckedChange={() => onToggle(route)}
                />
                <span className="text-xs text-muted-foreground font-mono">
                    {route.enabled ? '启用' : '禁用'}
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(route);
                    }}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
        </div>
    );
}
