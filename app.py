#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
诈骗园区模拟器 - ES3存档修改器 (Web版 / Flask)
功能: 上传并安全编辑 Unity ES3 JSON 存档(真实ES3结构，顶层 key -> {"__type":..., "value":...})，
      所有编辑在浏览器内存中完成，下载时写回文件。
说明:
  - 存档来源为「上传文件」或通过「查找本地存档」扫描服务器本机游戏目录(仅本机运行 Flask 时可用)。
  - 可部署到公网服务器：远程环境无法访问访客本机游戏存档，请使用上传功能。
"""
import os
import json

from flask import Flask, render_template, jsonify, request

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0


@app.after_request
def _no_cache(resp):
    """禁用缓存，确保前端改动即时生效，避免浏览器加载旧版 JS/CSS。"""
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp

# ==================== 页面 ====================
@app.route("/")
def index():
    return render_template("index.html")


# ==================== API ====================
@app.route("/api/upload", methods=["POST"])
def api_upload():
    """上传 .es3 / .json 存档并解析，返回可编辑的完整数据。"""
    file = request.files.get("file")
    if file is None or not file.filename:
        return jsonify({"ok": False, "error": "未收到存档文件。"}), 400
    if not file.filename.lower().endswith((".es3", ".json")):
        return jsonify({"ok": False, "error": "仅支持 .es3 / .json 存档文件。"}), 400

    try:
        content = file.read().decode("utf-8")
    except UnicodeDecodeError as e:
        return jsonify({"ok": False, "error": f"文件编码不是 UTF-8：{e}"}), 400

    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        return jsonify({"ok": False, "error": f"文件不是标准 JSON 格式！错误: {e}"}), 400

    if not isinstance(data, dict):
        return jsonify({"ok": False, "error": "存档顶层结构不是 JSON 对象（应为真实 ES3 结构）。"}), 400

    return jsonify({"ok": True, "fileName": file.filename, "data": data})


@app.route("/api/health")
def api_health():
    return jsonify({"ok": True, "service": "SCS 存档修改器 Web 版"})


if __name__ == "__main__":
    # 生产建议使用 waitress 运行，见 README
    from waitress import serve
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    print(f"SCS 存档修改器 Web 版 启动: http://{host}:{port}")
    serve(app, host=host, port=port)