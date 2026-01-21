import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Settings,
    ChevronLeft,
    Loader2,
    Save,
    KeyRound,
    Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getConfig, updateAuthConfig, type AuthConfig } from '@/api/config';

export default function SettingsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // 认证配置
    const [authConfig, setAuthConfig] = useState<AuthConfig>({
        proxyLoginURL: '',
        proxyCookieDomain: '',
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const config = await getConfig();
            setAuthConfig(config.auth);
        } catch (err) {
            toast.error('加载配置失败', {
                description: (err as Error).message,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await updateAuthConfig({
                proxyLoginURL: authConfig.proxyLoginURL,
                proxyCookieDomain: authConfig.proxyCookieDomain,
            });

            if (result.success) {
                toast.success('配置已保存');
            } else {
                toast.error('保存失败', {
                    description: result.error,
                });
            }
        } catch (err) {
            toast.error('保存失败', {
                description: (err as Error).message,
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="px-4 lg:px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => navigate('/')}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="w-px h-6 bg-border" />

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
                                <Settings className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="font-medium text-sm">系统设置</h1>
                                <p className="text-xs text-muted-foreground">
                                    配置全局参数
                                </p>
                            </div>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="gap-2 font-mono text-xs"
                    >
                        {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Save className="h-3.5 w-3.5" />
                        )}
                        保存
                    </Button>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 p-4 lg:p-6">
                <div className="max-w-2xl mx-auto space-y-4">
                    {/* 反向代理认证配置 */}
                    <div className="bg-card border p-4 space-y-4 animate-fade-up opacity-0 stagger-2">
                        <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-orange-500" />
                            <h2 className="font-semibold text-sm">反向代理认证</h2>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            配置反向代理站点的统一认证参数。当站点启用访问认证时，将使用这些全局配置。
                        </p>

                        {/* 登录页面 URL */}
                        <div className="space-y-1.5">
                            <Label htmlFor="proxyLoginURL" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                登录页面 URL
                            </Label>
                            <Input
                                id="proxyLoginURL"
                                value={authConfig.proxyLoginURL}
                                onChange={(e) => setAuthConfig({ ...authConfig, proxyLoginURL: e.target.value })}
                                placeholder="https://hop.example.com/auth/login"
                            />
                            <p className="text-xs text-muted-foreground">
                                未登录用户访问启用认证的站点时，将被重定向到此页面
                            </p>
                        </div>

                        {/* Cookie 域名 */}
                        <div className="space-y-1.5">
                            <Label htmlFor="proxyCookieDomain" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                Cookie 域名（可选）
                            </Label>
                            <Input
                                id="proxyCookieDomain"
                                value={authConfig.proxyCookieDomain}
                                onChange={(e) => setAuthConfig({ ...authConfig, proxyCookieDomain: e.target.value })}
                                placeholder=".example.com"
                            />
                            <p className="text-xs text-muted-foreground">
                                用于跨子域名共享登录状态。留空则自动从每个站点的域名提取。
                            </p>
                        </div>

                        {/* 提示信息 */}
                        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <div className="text-xs text-blue-500 space-y-1">
                                <p>
                                    <strong>登录页面 URL</strong> 通常是 Hop 控制台的认证登录地址，
                                    格式为: <code className="bg-blue-500/20 px-1 rounded">https://你的域名/auth/login</code>
                                </p>
                                <p>
                                    <strong>Cookie 域名</strong> 设置为 <code className="bg-blue-500/20 px-1 rounded">.example.com</code> 
                                    可以让 <code className="bg-blue-500/20 px-1 rounded">a.example.com</code> 和 
                                    <code className="bg-blue-500/20 px-1 rounded">b.example.com</code> 共享登录状态。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
