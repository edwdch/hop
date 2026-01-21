import { useNavigate } from 'react-router-dom';
import {
    Terminal,
    User,
    LogOut,
    Loader2,
    Settings,
    Shield,
    CheckCircle2,
    RefreshCw,
    Plus,
    Network,
    Cog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

interface Session {
    user?: {
        name?: string;
        email?: string;
    };
}

interface AppHeaderProps {
    session: Session | null;
    testing: boolean;
    reloading: boolean;
    onTest: () => void;
    onReload: () => void;
    onLogout: () => void;
}

export function AppHeader({
    session,
    testing,
    reloading,
    onTest,
    onReload,
    onLogout,
}: AppHeaderProps) {
    const navigate = useNavigate();

    return (
        <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 animate-fade-in opacity-0 stagger-1">
            <div className="flex h-14 items-center justify-between px-4 lg:px-6">
                <div className="flex items-center gap-6">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary flex items-center justify-center">
                            <Terminal className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="text-lg font-bold tracking-tight font-mono hidden sm:block">HOP</span>
                    </div>

                    {/* Separator */}
                    <div className="w-px h-6 bg-border hidden md:block" />

                    {/* Quick nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        <Button
                            size="sm"
                            onClick={() => navigate('/nginx/proxy')}
                            className="gap-2 font-mono text-xs uppercase tracking-wider"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            新建
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/nginx/edit?type=main')}
                            className="gap-2 font-mono text-xs uppercase tracking-wider"
                        >
                            <Settings className="h-3.5 w-3.5 text-primary" />
                            主配置
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/ssl')}
                            className="gap-2 font-mono text-xs uppercase tracking-wider"
                        >
                            <Shield className="h-3.5 w-3.5 text-chart-3" />
                            SSL
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/stream')}
                            className="gap-2 font-mono text-xs uppercase tracking-wider"
                        >
                            <Network className="h-3.5 w-3.5 text-chart-4" />
                            分流
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/settings')}
                            className="gap-2 font-mono text-xs uppercase tracking-wider"
                        >
                            <Cog className="h-3.5 w-3.5 text-muted-foreground" />
                            设置
                        </Button>
                    </nav>
                </div>

                <div className="flex items-center gap-2">
                    {/* Nginx controls */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onTest}
                            disabled={testing}
                            className="gap-2 font-mono text-xs mr-1"
                        >
                            {testing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden sm:inline">测试</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onReload}
                            disabled={reloading}
                            className="gap-2 font-mono text-xs"
                        >
                            {reloading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden sm:inline">重载</span>
                        </Button>
                    </div>

                    <div className="w-px h-6 bg-border" />

                    <ThemeToggle />

                    <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="hidden lg:flex gap-2 font-mono text-xs"
                    >
                        <User className="h-3.5 w-3.5" />
                        {session?.user?.name || session?.user?.email}
                    </Button>

                    <Button variant="ghost" size="icon-sm" onClick={onLogout} className="text-muted-foreground hover:text-foreground">
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
