import { useState } from 'react';
import { Terminal, Mail, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { login } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.error) {
        setError(res.error.message || '认证失败');
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('连接错误，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex industrial-grid">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-card relative overflow-hidden">
        {/* Scan lines effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent opacity-50" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 industrial-grid opacity-30" />
        
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
                  <p><span className="text-primary">$</span> nginx -t</p>
                  <p className="text-success">nginx: configuration file syntax is ok</p>
                  <p className="text-success">nginx: configuration file test is successful</p>
                  <p><span className="text-primary">$</span> systemctl reload nginx</p>
                  <p className="text-muted-foreground/60">Reloading nginx configuration...</p>
                  <p className="text-success">Done.</p>
                  <p><span className="text-primary">$</span> <span className="terminal-cursor"></span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom info */}
          <div className="space-y-4 animate-fade-up opacity-0 stagger-5">
            <div className="h-px bg-gradient-to-r from-border via-primary/30 to-border" />
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>NGINX CONFIGURATION MANAGER</span>
              <span>v1.0.0</span>
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
              SYSTEM ACCESS
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
                <div className="w-2 h-2 bg-primary" />
                <span>Authentication Required</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                系统登录
              </h1>
              <p className="text-muted-foreground">
                输入凭证以访问控制面板
              </p>
            </div>

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
                      <span>执行登录</span>
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
                <span>系统在线</span>
              </div>
            </div>
            <span className="hidden sm:block">Hop · Nginx Configuration Manager</span>
          </div>
        </div>
      </div>
    </div>
  );
}
