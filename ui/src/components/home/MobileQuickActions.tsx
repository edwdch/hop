import { Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileQuickActionsProps {
    onNavigate: (path: string) => void;
}

export function MobileQuickActions({ onNavigate }: MobileQuickActionsProps) {
    return (
        <div className="grid grid-cols-2 gap-2 md:hidden animate-fade-up opacity-0 stagger-6">
            <Button
                variant="outline"
                onClick={() => onNavigate('/nginx/edit?type=main')}
                className="flex-col h-auto py-4 gap-2"
            >
                <Settings className="h-5 w-5 text-primary" />
                <span className="text-xs font-mono">主配置</span>
            </Button>
            <Button
                variant="outline"
                onClick={() => onNavigate('/ssl')}
                className="flex-col h-auto py-4 gap-2"
            >
                <Shield className="h-5 w-5 text-chart-3" />
                <span className="text-xs font-mono">SSL</span>
            </Button>
        </div>
    );
}
