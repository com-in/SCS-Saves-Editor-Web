# 诈骗园区模拟器 - ES3 存档修改器 (Web版)

基于 **Flask** 的《诈骗园区模拟器》存档修改工具 **Web 版**。可上传、安全编辑并下载回写 Unity **ES3** 格式存档（JSON，顶层 key 为 `"__type"` / `"value"` 包装）。

> 原桌面版（PySide6 / main.py）仍保留，但本项目主推 Web 版；Web 版可部署到公网服务器，任意设备通过浏览器使用。

## ✨ 功能特性

- **上传 / 下载**：浏览器上传 `.es3` / `.json` 存档，编辑完成后下载回本地，任何设备可用。
- **本地存档查找**：点击【查找本地存档】自动扫描服务器本机游戏存档目录（`C:\Users\<用户>\AppData\LocalLow\Jiao Games\...\slots`），**仅当 Web 运行在用户本机时可用**；远程服务器请用上传。
- **基础数据**：货币、等级、经验、天数、电力、店名、呼叫数据、难度一键编辑。
- **工人管理**：查看 / 修改金钱、能力值、状态，支持搜索、批量加满、重置状态。
- **加密货币 / 物品 / 放置物品 / 升级 / 其他**：表格或原始 JSON 编辑。
- **安全**：所有编辑都在浏览器内存中完成，仅在下载时才生成修改后文件；提供【恢复原档】一键还原加载时的原始数据，绝不动你的本地原档。
- **界面**：左右布局 + 可折叠侧边栏、亮 / 暗主题切换（自动记忆选择）。

## 📁 项目结构

```
app.py                       # Flask 后端（上传解析 / 本地存档扫描 / 加载）
templates/index.html         # 前端页面（还原桌面版布局）
static/app.css               # 前端样式（亮/暗主题）
static/app.js                # 前端逻辑（ES3 解析与编辑、下载）
main.py                      # （可选）原桌面版 PySide6 工具，需另装 PySide6
requirements.txt             # Web 版依赖
Dockerfile                   # 容器部署（可选）
```

## 🚀 本地运行

```bash
pip install -r requirements.txt
python app.py
```

打开浏览器访问 `http://127.0.0.1:8000`。本机运行时【查找本地存档】可自动扫描游戏存档目录。

## ☁️ 部署到服务器

### 方式一：直接运行（Python 3.10+）

```bash
pip install -r requirements.txt
# 监听所有网卡，暴露端口 8000
python app.py
```

通过环境变量可调整监听地址与端口：

```bash
set HOST=0.0.0.0
set PORT=8000
python app.py        # Windows / 也可在 Linux：export HOST=... && python app.py
```

### 方式二：Docker 部署

```bash
docker build -t scs-save-editor .
docker run -d -p 8000:8000 scs-save-editor
```

> 公网部署时请自行配置反向代理（如 Nginx）与 HTTPS。远程服务器无法访问访客本机的游戏存档，请使用【上传存档】功能。

## ⚠️ 使用提示

- 上传 → 编辑 → 点击【下载修改后存档】写回，浏览器保存到游戏存档目录即可。
- 修改前请手动备份原档；Web 版【恢复原档】可将界面恢复到本次加载的原始状态。
- 物品 / 放置物品为原始 JSON，仅在你了解结构时修改；下载前会校验 JSON 语法。

## 许可

仅供学习与存档修改交流使用，请勿用于破坏他人游戏体验。