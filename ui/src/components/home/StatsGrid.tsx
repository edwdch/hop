import { Globe, Activity, Server, User } from 'lucide-react';
import { type ProxySite } from '@/api/nginx';

interface Session {
    user?: {
        name?: string;
        email?: string;
    };
}

interface StatsGridProps {
    sites: ProxySite[];
    loading: boolean;
    session: Session | null;
}

export function StatsGrid({ sites, loading, session }: StatsGridProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up opacity-0 stagger-2">
            <div className="bg-card border p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-muted-foreground">站点</span>
                    <Globe className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold font-mono">{loading ? '-' : sites.length}</p>
            </div>
            <div className="bg-card border p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-muted-foreground">状态</span>
                    <Activity className="h-4 w-4 text-chart-3" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="status-dot status-dot-online" />
                    <span className="text-sm font-mono">运行中</span>
                </div>
            </div>
            <div className="bg-card border p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-muted-foreground">服务</span>
                    <Server className="h-4 w-4 text-accent" />
                </div>
                <p className="text-sm font-mono text-muted-foreground">Nginx</p>
            </div>
            <div className="bg-card border p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-muted-foreground">用户</span>
                    <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-mono truncate">{session?.user?.name}</p>
            </div>
        </div>
    );
}
