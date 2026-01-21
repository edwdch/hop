import { Loader2, Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type StreamRoute } from '@/api/stream';

interface DeleteRouteDialogProps {
    open: boolean;
    route: StreamRoute | null;
    deleting: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function DeleteRouteDialog({
    open,
    route,
    deleting,
    onOpenChange,
    onConfirm,
}: DeleteRouteDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>确认删除路由</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <span>确定要删除以下 SNI 路由规则吗？此操作无法撤销。</span>
                        {route && (
                            <code className="block mt-2 p-2 bg-muted text-sm font-mono rounded">
                                {route.domain} → {route.backend}
                            </code>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={deleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {deleting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        删除
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
