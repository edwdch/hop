import { createAuthClient } from 'better-auth/react';

// 创建 Better Auth 客户端
// baseURL 指向后端 auth 挂载点，使用相对路径走 Vite 代理
export const authClient = createAuthClient({
  baseURL: window.location.origin + '/api/auth',
});

// 导出常用方法
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

export interface NeedInitResponse {
  needInit: boolean;
}

// 检查是否需要初始化
export async function checkNeedInit(): Promise<NeedInitResponse> {
  const res = await fetch('/api/auth/need-init');
  return res.json();
}

// 注册用户 (使用 Better Auth)
export async function register(email: string, password: string, name: string) {
  return signUp.email({
    email,
    password,
    name,
  });
}

// 登录 (使用 Better Auth)
export async function login(email: string, password: string) {
  return signIn.email({
    email,
    password,
  });
}

// 登出
export async function logout() {
  return signOut();
}
