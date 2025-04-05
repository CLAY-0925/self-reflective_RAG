# MedicalChatbot Frontend

这是一个基于 React、TypeScript 和 Material UI 构建的智能医疗对话前端应用。它允许用户与 AI 助手进行对话，获取医疗建议，并管理病例信息。

## 主要特性

*   实时聊天界面
*   会话管理 (创建、选择、删除)
*   支持 WebSocket 和 HTTP API 通信
*   医疗病例信息展示 (诊疗进度、患者信息、待确认信息)
*   相关问题建议
*   可配置的功能开关 (例如：病例总结、联网搜索)
*   明/暗主题切换

## 环境要求

*   [Node.js](https://nodejs.org/) (建议使用 v18.x 或更高版本)
*   [npm](https://www.npmjs.com/) 或 [yarn](https://yarnpkg.com/)

## 安装步骤

1.  **克隆仓库:**
    ```bash
    git clone https://github.com/CLAY-0925/medical_chatbot.git
    cd <project-directory-name>    # 替换为项目目录名
    ```

2.  **安装依赖:**
    ```bash
    npm install --legacy-peer-deps # 忽略一些package未更新，而识别的依赖冲突，这些冲突并不会导致问题
    # 或者
    yarn install
    ```

## 配置

应用需要连接到后端 API。请确保后端服务正在运行。

默认情况下，前端会尝试连接到 `http://localhost:8000/api`。如果您的后端 API 地址不同，您需要修改配置文件：

*   打开 `src/utils/config.ts` 文件。
*   找到 `config.apiBaseUrl` 变量。
*   将其值修改为您的实际后端 API 地址。

```typescript
// src/utils/config.ts
export const config = {
  // ... 其他配置
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://your-backend-api-url', // 修改这里
  // ... 其他配置
};
```

或者，您可以通过设置环境变量 `REACT_APP_API_BASE_URL` 来配置 API 地址，这在部署时更常用。

## 启动项目

1.  **确保后端服务已启动并运行在配置的地址上。**

2.  **启动前端开发服务器:**
    ```bash
    npm start
    # 或者
    yarn start
    ```

3.  在浏览器中打开 `http://localhost:3000` (或者您终端提示的其他地址)。

## 贡献

欢迎提交 Pull Requests 或 Issues！

## 许可证

(可选) 请在此处添加您的项目许可证信息，例如 MIT、Apache 2.0 等。
