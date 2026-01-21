import { Network, Loader2 } from 'lucide-react';
import { type StreamRoute } from '@/api/stream';
import { StreamRouteCard } from './StreamRouteCard';
import { EmptyState } from './EmptyState';

interface StreamRouteTableProps {
    routes: StreamRoute[];
    loading: boolean;
    onAdd: () => void;
    onEdit: (route: StreamRoute) => void;
    onDelete: (route: StreamRoute) => void;
    onToggle: (route: StreamRoute) => void;
}

export function StreamRouteTable({
    routes,
    loading,
    onAdd,
    onEdit,
    onDelete,
    onToggle,
}: StreamRouteTableProps) {
    return (
        <div className="animate-fade-up opacity-0 stagger-2">
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
                        <Network className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-semibold">SNI 路由规则</h2>
                        <p className="text-xs text-muted-foreground font-mono">
                            {loading ? '加载中...' : `${routes.length} 条规则`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Routes grid */}
            {loading ? (
                <div className="flex items-center justify-center py-16 bg-card border">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : routes.length === 0 ? (
                <EmptyState onAdd={onAdd} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {routes.map((route, index) => (
                        <StreamRouteCard
                            key={route.id}
                            route={route}
                            index={index}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onToggle={onToggle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
