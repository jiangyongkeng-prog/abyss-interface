# Abyss Interface

一个基于 Vite + React + React Three Fiber 的深空/深海 3D 交互网页。后端使用 Node.js 代理中转站 API，API Key 不暴露给浏览器。

## 初始化命令

如果从零创建同类项目，可以使用：

```bash
npm create vite@latest abyss-interface -- --template react
cd abyss-interface
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing
```

本项目已经初始化好，换电脑后只需要：

```bash
npm install
npm start
```

然后打开：

```text
http://localhost:5181
```

## 项目结构

```text
index.html
vite.config.js
server.js
src/
  App.jsx
  main.jsx
  styles.css
  components/
    ExperienceCanvas.jsx
    GlassInterface.jsx
    ChatPanel.jsx
  lib/
    chatApi.js
public/
  assets/
```

## 组件说明

- `ExperienceCanvas.jsx`：R3F 主场景，包含粒子星空、鱼群、玻璃核心、Bloom、Depth of Field、Vignette。
- `GlassInterface.jsx`：右侧玻璃拟态状态卡片。
- `ChatPanel.jsx`：聊天窗口，调用后端 `/api/chat`。
- `chatApi.js`：解析流式返回内容。
- `server.js`：托管前端打包文件，并代理中转站接口。

## 环境变量

复制 `.env.example` 为 `.env`，然后填写：

```env
PORT=5181
RELAY_API_BASE=https://ai.lalakunaozi.fun
RELAY_API_KEY=你的中转站完整令牌
RELAY_MODEL=gpt-4-all
```

## Render 部署

当前 Render 可以继续使用 Web Service。

推荐配置：

```text
Build Command: npm install
Start Command: npm start
```

`npm start` 会先执行 Vite 构建，再启动 Node 服务。

如果以后要换模型，只需要在 Render 的 Environment Variables 里修改：

```text
RELAY_MODEL=新的模型名
```

保存后重新部署即可。
