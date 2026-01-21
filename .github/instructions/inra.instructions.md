---
applyTo: '**'
---

# Hop 项目指南

## 项目架构

```
hop/
├── dom/                 # 后端 (Bun + Elysia)
│   ├── data/            # SQLite 数据库存储
│   └── src/
│       ├── auth.ts      # 认证逻辑 (better-auth)
│       ├── index.ts     # 入口文件
│       └── lib/
│           └── logger.ts # 日志工具 (consola)
└── ui/                  # 前端 (React + Vite)
    └── src/
        ├── App.tsx      # 应用入口组件
        ├── main.tsx     # React 挂载入口
        ├── api/
        │   └── auth.ts  # 认证 API 客户端
        ├── components/
        │   └── ui/      # UI 组件 (shadcn/ui 风格)
        │       ├── button.tsx
        │       ├── card.tsx
        │       ├── input.tsx
        │       └── label.tsx
        ├── lib/
        │   └── utils.ts # 工具函数
        └── pages/       # 页面组件
            ├── HomePage.tsx
            ├── InitPage.tsx
            └── LoginPage.tsx
```

## 运行注意

前后端均已配置热重载，修改代码后保存即可看到效果，无需手动启动或者重启服务。
- 前端开发: http://localhost:5173
- 后端 API: http://localhost:3000

后端仅提供 API 服务，前端需独立运行开发服务器。

## 后端技术栈 (dom/)

- **运行时**: Bun
- **框架**: Elysia
- **数据库**: SQLite (bun:sqlite)
- **认证**: better-auth
- **日志**: consola
- **依赖**:
  - `elysia` - Web 框架
  - `@elysiajs/cors` - 跨域支持
  - `better-auth` - 认证框架
  - `consola` - 日志工具

## 前端技术栈 (ui/)

- **框架**: React 19 + TypeScript
- **构建**: Vite (rolldown-vite)
- **样式**: Tailwind CSS v4
- **UI 组件**: shadcn/ui 风格组件
- **图标**: Lucide React
- **路由**: React Router DOM v7
- **认证**: better-auth 客户端
- **核心依赖**:
  - `react`, `react-dom` - React 核心
  - `react-router-dom` - 路由管理
  - `tailwindcss`, `@tailwindcss/vite` - 样式框架
  - `lucide-react` - 图标库
  - `better-auth` - 认证客户端
  - `@radix-ui/react-*` - 无障碍组件原语
  - `class-variance-authority`, `clsx`, `tailwind-merge` - 样式工具

## 安装 UI 包

使用以下命令安装前端依赖包：

```bash
bunx --bun shadcn@latest add button
```

## 开发约定

- 前端使用 `@/` 路径别名指向 `src/`
- UI 组件放在 `components/ui/` 目录，遵循 shadcn/ui 风格
- API 请求封装在 `api/` 目录
- 前后端独立开发，通过 CORS 跨域访问 API
- 认证使用 better-auth，前后端共享类型

## 类型检查

前端和后端均使用 TypeScript 进行类型检查。确保运行 `tsc --noEmit` 检查类型错误。