import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { checkNeedInit, useSession } from '@/api/auth';
import InitPage from '@/pages/InitPage';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import NginxEditPage from '@/pages/nginx/EditPage';
import NginxBrowsePage from '@/pages/nginx/BrowsePage';

// 需要登录才能访问的路由守卫
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">验证登录状态...</p>
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [needInit, setNeedInit] = useState(false);

  useEffect(() => {
    checkNeedInit()
      .then((res) => {
        setNeedInit(res.needInit);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* 初始化页面 - 仅当没有用户时可访问 */}
        <Route
          path="/init"
          element={needInit ? <InitPage /> : <Navigate to="/login" replace />}
        />
        {/* 登录页面 */}
        <Route
          path="/login"
          element={needInit ? <Navigate to="/init" replace /> : <LoginPage />}
        />
        {/* 主页面 - 需要登录 */}
        <Route
          path="/"
          element={
            needInit ? (
              <Navigate to="/init" replace />
            ) : (
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            )
          }
        />
        {/* Nginx 配置编辑 - 需要登录 */}
        <Route
          path="/nginx/edit"
          element={
            <ProtectedRoute>
              <NginxEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nginx/browse"
          element={
            <ProtectedRoute>
              <NginxBrowsePage />
            </ProtectedRoute>
          }
        />
        {/* 其他路由重定向到首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
