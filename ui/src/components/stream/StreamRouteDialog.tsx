import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { type StreamRoute } from '@/api/stream';

interface StreamRouteDialogProps {
    open: boolean;
    route: StreamRoute | null; // null 表示新建
    saving: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (route: StreamRoute) => void;
}

function generateId(): string {
    return `route-${Date.now().toString(36)}`;
}

// 内部表单组件，通过 key 来重置状态
function StreamRouteForm({
    route,
    saving,
    onCancel,
    onSave,
}: {
    route: StreamRoute | null;
    saving: boolean;
    onCancel: () => void;
    onSave: (route: StreamRoute) => void;
}) {
    const isEditing = route !== null;

    const [formData, setFormData] = useState<StreamRoute>(() => {
        if (route) {
            return route;
        }
        return {
            id: generateId(),
            name: '',
            domain: '',
            backend: '',
            enabled: true,
        };
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.domain.trim()) {
            newErrors.domain = '域名不能为空';
        } else if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(formData.domain)) {
            newErrors.domain = '请输入有效的域名';
        }

        if (!formData.backend.trim()) {
            newErrors.backend = '后端地址不能为空';
        } else if (!/^[\w.-]+:\d+$/.test(formData.backend)) {
            newErrors.backend = '请输入有效的地址，格式: host:port';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>
                    {isEditing ? '编辑 SNI 路由' : '添加 SNI 路由'}
                </DialogTitle>
                <DialogDescription>
                    根据 TLS 握手时的 SNI（Server Name Indication）将流量转发到指定后端
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 名称/备注 */}
                <div className="space-y-2">
                    <Label htmlFor="name">名称 / 备注</Label>
                    <Input
                        id="name"
                        placeholder="如: Forward Proxy"
                        value={formData.name}
                        onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                        }
                        className="font-mono"
                    />
                </div>

                {/* 域名 */}
                <div className="space-y-2">
                    <Label htmlFor="domain">域名 (SNI)</Label>
                    <Input
                        id="domain"
                        placeholder="如: proxy.example.com"
                        value={formData.domain}
                        onChange={(e) =>
                            setFormData({ ...formData, domain: e.target.value })
                        }
                        className="font-mono"
                    />
                    {errors.domain && (
                        <p className="text-xs text-destructive">{errors.domain}</p>
                    )}
                </div>

                {/* 后端地址 */}
                <div className="space-y-2">
                    <Label htmlFor="backend">后端地址</Label>
                    <Input
                        id="backend"
                        placeholder="如: 127.0.0.1:10080"
                        value={formData.backend}
                        onChange={(e) =>
                            setFormData({ ...formData, backend: e.target.value })
                        }
                        className="font-mono"
                    />
                    {errors.backend && (
                        <p className="text-xs text-destructive">{errors.backend}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        格式: host:port，流量将直接转发到此地址
                    </p>
                </div>

                {/* 启用状态 */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                        <Label>启用状态</Label>
                        <p className="text-xs text-muted-foreground">
                            启用后此规则将参与 SNI 分流
                        </p>
                    </div>
                    <Switch
                        checked={formData.enabled}
                        onCheckedChange={(checked) =>
                            setFormData({ ...formData, enabled: checked })
                        }
                    />
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={saving}
                    >
                        取消
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        保存
                    </Button>
                </DialogFooter>
            </form>
        </>
    );
}

export function StreamRouteDialog({
    open,
    route,
    saving,
    onOpenChange,
    onSave,
}: StreamRouteDialogProps) {
    // 使用 key 来重置表单状态
    const formKey = route?.id ?? 'new';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <StreamRouteForm
                    key={formKey}
                    route={route}
                    saving={saving}
                    onCancel={() => onOpenChange(false)}
                    onSave={onSave}
                />
            </DialogContent>
        </Dialog>
    );
}
