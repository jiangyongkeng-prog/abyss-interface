# Abyss Interface

一个前后端分离的本地 AI 聊天/图片生成展示项目。

## 结构

- `public/`：前端页面和图片资源
- `server.js`：后端静态服务和 `/api/chat` 中转接口
- `.env`：本地私密配置，不要上传

## 在 IDEA 里打开

1. 打开 IntelliJ IDEA。
2. 选择 `Open`。
3. 打开这个目录：
   `C:\Users\EDY\Documents\Codex\2026-06-22\deepseek-api-i\outputs\deepseek-cinema-console`
4. 在 IDEA 终端执行：
   `npm start`
5. 浏览器打开：
   `http://localhost:5181`

不要把项目放到 `D:\idea\bin`。那里是 IDEA 程序目录，不是项目目录。

## 配置 API

复制 `.env.example` 为 `.env`，然后填写：

```env
PORT=5181
RELAY_API_BASE=https://ai.lalakunaozi.fun
RELAY_API_KEY=你的中转站完整令牌
RELAY_MODEL=gpt-4-all
```

如果要生成图片，可以把前端模型改成 `gpt-4o-image`，或者把 `.env` 里的 `RELAY_MODEL` 改成它。

## 安全注意

API Key 只放后端 `.env`。前端不会再保存 Key，也不会把 Key 暴露给浏览器。
