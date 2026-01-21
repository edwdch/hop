import { useState } from 'react';
import { Terminal, Mail, User, Lock, AlertTriangle, Loader2, Zap } from 'lucide-react';
import { register } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';

export default function InitPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('密码确认不匹配');
      return;
    }

    if (name.length < 2) {
      setError('名称至少需要2个字符');
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }

    setLoading(true);
    try {
      const res = await register(email, password, name);
      if (res.error) {
        setError(res.error.message || '初始化失败');
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

          {/* Center - Feature highlights */}
          <div className="flex-1 flex items-center">
            <div className="space-y-8 animate-fade-up opacity-0 stagger-3">
              <div>
                <h2 className="text-3xl font-bold mb-4">系统初始化</h2>
                <p className="text-muted-foreground text-lg">
                  配置您的管理员账户以开始使用
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { icon: Zap, text: '可视化 Nginx 配置管理' },
                  { icon: Terminal, text: '实时语法检测与验证' },
                  { icon: Lock, text: '安全的文件操作权限' },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center gap-4 p-4 bg-muted/30 border border-border/50 animate-fade-up opacity-0 stagger-${i + 4}`}
                  >
                    <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom info */}
          <div className="space-y-4 animate-fade-up opacity-0 stagger-7">
            <div className="h-px bg-gradient-to-r from-border via-primary/30 to-border" />
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>FIRST RUN SETUP</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Init Form */}
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
              INITIALIZATION
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-sm space-y-6">
            {/* Header */}
            <div className="space-y-2 animate-fade-up opacity-0 stagger-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                <div className="w-2 h-2 bg-accent" />
                <span>First Run Setup</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                创建管理员
              </h1>
              <p className="text-muted-foreground">
                设置您的管理员账户凭证
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2 animate-fade-up opacity-0 stagger-3">
                  <Label htmlFor="name" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    管理员名称
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      className="pl-10 h-11 bg-muted/50 border-border/50 font-mono text-sm focus:border-primary focus:bg-muted/80 transition-all"
                      placeholder="Administrator"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 animate-fade-up opacity-0 stagger-4">
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
                      className="pl-10 h-11 bg-muted/50 border-border/50 font-mono text-sm focus:border-primary focus:bg-muted/80 transition-all"
                      placeholder="admin@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 animate-fade-up opacity-0 stagger-5">
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
                      autoComplete="new-password"
                      className="pl-10 h-11 bg-muted/50 border-border/50 font-mono text-sm focus:border-primary focus:bg-muted/80 transition-all"
                      placeholder="至少6个字符"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 animate-fade-up opacity-0 stagger-6">
                  <Label htmlFor="confirmPassword" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    确认密码
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="pl-10 h-11 bg-muted/50 border-border/50 font-mono text-sm focus:border-primary focus:bg-muted/80 transition-all"
                      placeholder="再次输入密码"
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

              <div className="animate-fade-up opacity-0 stagger-7">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-sm font-mono uppercase tracking-wider"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>正在初始化...</span>
                    </>
                  ) : (
                    <>
                      <span>完成初始化</span>
                      <span className="text-primary-foreground/60">→</span>
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Security notice */}
            <div className="pt-4 border-t border-border/50 animate-fade-up opacity-0 stagger-8">
              <p className="text-xs text-muted-foreground font-mono text-center">
                请妥善保管您的凭证 · 此账户拥有完全控制权限
              </p>
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="p-4 border-t bg-muted/30 animate-fade-in opacity-0 stagger-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="status-dot status-dot-warning" />
                <span>等待配置</span>
              </div>
            </div>
            <span className="hidden sm:block">Hop · Nginx Configuration Manager</span>
          </div>
        </div>
      </div>
    </div>
  );
}
