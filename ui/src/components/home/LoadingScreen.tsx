import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-fade-up">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm font-mono text-muted-foreground">正在加载系统...</span>
            </div>
        </div>
    );
}
