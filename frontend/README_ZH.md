# 医学聊天机器人前端应用

## 项目介绍

医学聊天机器人是一个基于React和TypeScript的Web应用，提供用户与AI助手进行医疗相关对话的功能。应用具有现代化的界面设计，支持多会话管理、医疗记录维护、用户关注点标记等功能。

## 技术栈

- **前端框架**: React 18, TypeScript
- **UI组件库**: Ant Design (antd)
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **HTTP客户端**: Axios
- **WebSocket**: 用于实时通信
- **路由**: React Router
- **Markdown渲染**: React Markdown

## 项目功能

- 多会话管理
- 医疗记录创建与更新
- 实时AI对话
- 用户关注点标记与导航
- 医疗进度跟踪
- 暗色/亮色主题支持

## 安装与运行

### 环境要求

- Node.js 14.0+
- npm 6.0+ 或 yarn 1.22+

### 安装依赖

```bash
# 使用npm
cd frontend
npm install

# 或使用yarn
yarn
```

### 后端地址配置

项目的后端API地址配置位于 `src/config/apiConfig.ts` 文件中。默认配置指向本地开发服务器：

```typescript
// 基础URL
export const BASE_URL = 'http://localhost:8000/api';
```

要修改后端地址，请编辑此文件中的 `BASE_URL` 常量。例如，要指向生产环境的后端服务：

```typescript
// 基础URL
export const BASE_URL = 'https://your-production-backend.com/api';
```

### 开发模式

在开发模式下运行应用，支持热重载：

```bash
# 使用npm
npm run dev

# 或使用yarn
yarn dev
```

开发服务器将启动在 `http://localhost:5173`

### 生产模式

#### 构建应用

```bash
# 使用npm
npm run build

# 或使用yarn
yarn build
```

构建后的文件将生成在 `dist` 目录中。

#### 预览生产构建

```bash
# 使用npm
npm run preview

# 或使用yarn
yarn preview
```

### 环境变量

可以通过创建以下文件来定制不同环境的配置：

- `.env`: 默认环境变量
- `.env.development`: 开发环境变量
- `.env.production`: 生产环境变量

例如，可以创建 `.env.production` 文件，内容如下：

```
VITE_API_BASE_URL=https://your-production-backend.com/api
```

然后在 `apiConfig.ts` 中使用：

```typescript
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
```

## 项目结构

```
src/
├── api/          # API服务和通信
├── assets/       # 静态资源
├── components/   # 可复用组件
│   ├── chat/     # 聊天相关组件
│   ├── layout/   # 布局组件
│   └── medical/  # 医疗记录相关组件
├── config/       # 配置文件
├── context/      # React上下文
├── hooks/        # 自定义Hooks
├── pages/        # 页面组件
├── types/        # TypeScript类型定义
└── utils/        # 工具函数
```

## 开发注意事项

- 确保后端服务已启动并可访问
- WebSocket连接需要后端支持

## 许可证

[MIT License](LICENSE)
