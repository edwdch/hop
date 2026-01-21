import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Terminal, Mail, Lock, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { useSession } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLoginPage() {
    const [searchParams] = useSearchParams();
    const { data: session, isPending } = useSession();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 从 URL 获取参数
    const redirectUri = searchParams.get('redirect_uri') || '/';
    const cookieDomain = searchParams.get('cookie_domain') || '';

    // 如果已经登录，直接重定向
    useEffect(() => {
        if (!isPending && session?.user) {
            // 跨域需要用 window.location
            window.location.href = redirectUri;
        }
    }, [session, isPending, redirectUri]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 构建登录 URL，如果有 cookie_domain 则添加到查询参数
            const queryParams = cookieDomain ? `?cookie_domain=${encodeURIComponent(cookieDomain)}` : '';
            
            const res = await fetch(`/api/auth/sign-in/email${queryParams}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                setError(data.error || '邮箱或密码错误');
                return;
            }

            // 登录成功，重定向到原始页面
            setTimeout(() => {
                window.location.href = redirectUri;
            }, 300);

        } catch {
            setError('连接错误，请检查网络');
        } finally {
            setLoading(false);
        }
    };

    // 加载中状态
    if (isPending) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">验证登录状态...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Decorative */}
            <div className="hidden lg:flex lg:w-1/2 bg-card relative overflow-hidden">
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 industrial-grid" />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    {/* Logo */}
                    <div className="animate-fade-up opacity-0 stagger-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary flex items-center justify-center">
                                <Terminal className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight font-mono">HOP</span>
                        </div>
                    </div>

                    {/* Center decoration */}
                    <div className="flex-1 flex items-center justify-center">
                        <div className="relative animate-fade-up opacity-0 stagger-3">
                            {/* Large terminal icon with corner marks */}
                            <div className="corner-marks p-8 bg-muted/30">
                                <div className="font-mono text-sm text-muted-foreground space-y-2">
                                    <p><span className="text-primary">$</span> hop auth validate</p>
                                    <p className="text-muted-foreground/60">Checking credentials...</p>
                                    <p className="text-success">Authentication successful</p>
                                    <p><span className="text-primary">$</span> hop proxy access --site app.example.com</p>
                                    <p className="text-success">Access granted</p>
                                    <p><span className="text-primary">$</span> <span className="terminal-cursor"></span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom info */}
                    <div className="space-y-4 animate-fade-up opacity-0 stagger-5">
                        <div className="h-px bg-gradient-to-r from-border via-primary/30 to-border" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                            <span>HOP AUTHENTICATION CENTER</span>
                            <span>UNIFIED SSO</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex flex-col">
                {/* Top bar */}
                <div className="flex items-center justify-between p-4 border-b animate-fade-in opacity-0 stagger-1">
                    <div className="flex items-center gap-2 lg:hidden">
                        <div className="w-8 h-8 bg-primary flex items-center justify-center">
                            <Terminal className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <span className="font-bold font-mono">HOP</span>
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                        <span className="text-xs text-muted-foreground font-mono hidden sm:block">
                            UNIFIED AUTH
                        </span>
                        <ThemeToggle />
                    </div>
                </div>

                {/* Form container */}
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-sm space-y-8">
                        {/* Header */}
                        <div className="space-y-2 animate-fade-up opacity-0 stagger-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                                <div className="w-2 h-2 bg-orange-500" />
                                <span>Proxy Authentication</span>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                统一认证登录
                            </h1>
                            <p className="text-muted-foreground">
                                使用您的 Hop 账户登录以访问此站点
                            </p>
                        </div>

                        {/* Redirect info */}
                        {redirectUri !== '/' && (
                            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 animate-fade-up opacity-0 stagger-3">
                                <ExternalLink className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="text-blue-500 font-medium">登录后将返回</p>
                                    <p className="text-blue-400/80 font-mono text-xs break-all mt-1">{redirectUri}</p>
                                </div>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2 animate-fade-up opacity-0 stagger-3">
                                    <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                        邮箱地址
                                    </Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            autoComplete="email"
                                            className="pl-10 h-12 bg-muted/50 border-border/50 font-mono text-sm focus:border-primary focus:bg-muted/80 transition-all"
                                            placeholder="admin@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 animate-fade-up opacity-0 stagger-4">
                                    <Label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                        密码
                                    </Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoComplete="current-password"
                                            className="pl-10 h-12 bg-muted/50 border-border/50 font-mono text-sm focus:border-primary focus:bg-muted/80 transition-all"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 animate-fade-up">
                                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                                    <span className="text-sm text-destructive font-mono">{error}</span>
                                </div>
                            )}

                            <div className="animate-fade-up opacity-0 stagger-5">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 text-sm font-mono uppercase tracking-wider"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>正在验证...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>验证身份</span>
                                            <span className="text-primary-foreground/60">→</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="pt-4 border-t border-border/50 animate-fade-up opacity-0 stagger-6">
                            <p className="text-xs text-muted-foreground font-mono text-center">
                                SECURE CONNECTION · TLS 1.3 · AES-256
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom status bar */}
                <div className="p-4 border-t bg-muted/30 animate-fade-in opacity-0 stagger-6">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="status-dot status-dot-online" />
                                <span>认证服务在线</span>
                            </div>
                        </div>
                        <span className="hidden sm:block">Hop · Unified Authentication</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
