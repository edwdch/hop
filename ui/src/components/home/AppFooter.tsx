export function AppFooter() {
    return (
        <footer className="border-t bg-muted/30 p-4 animate-fade-in opacity-0 stagger-7">
            <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground font-mono">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="status-dot status-dot-online" />
                        <span>系统正常</span>
                    </div>
                </div>
                <span>Hop · Nginx Configuration Manager</span>
            </div>
        </footer>
    );
}
