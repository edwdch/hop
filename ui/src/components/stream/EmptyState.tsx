import { Network, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
    return (
        <div className="text-center py-16 bg-card border">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted/30 flex items-center justify-center">
                <Network className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground font-mono text-sm mb-1">暂无 SNI 路由规则</p>
            <p className="text-xs text-muted-foreground/60 mb-4 max-w-md mx-auto">
                SNI 分流可根据 TLS 握手时的域名信息，将流量转发到不同的后端服务
            </p>
            <Button
                variant="outline"
                size="sm"
                onClick={onAdd}
                className="gap-2 font-mono"
            >
                <Plus className="h-4 w-4" />
                添加路由规则
            </Button>
        </div>
    );
}
