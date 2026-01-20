import { useNavigate } from 'react-router-dom';
import { Rocket, User, LogOut, Construction, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession, logout } from '@/api/auth';

export default function HomePage() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Hop 代理管理</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-sm">{session?.user?.name || session?.user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <Construction className="mx-auto h-16 w-16 mb-4 opacity-50" />
          <h2 className="text-xl font-medium text-foreground mb-2">功能开发中</h2>
          <p>代理管理功能即将上线，敬请期待！</p>
        </div>
      </main>
    </div>
  );
}
