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

# ==================== 工具 ====================
# 游戏本机存档目录结构（与桌面版一致）
# LocalLow 是 Local 的兄弟目录，不能直接 LOCALAPPDATA + "Low"
LOCAL_LOW = os.path.join(
    os.path.dirname(os.environ.get("LOCALAPPDATA", "")), "LocalLow")
GAME_SLOTS = os.path.join(
    LOCAL_LOW, "Jiao Games",
    "Scam Center Simulator_ UnderKingdom", "slots")
APP_DIR = os.path.dirname(os.path.abspath(__file__))


def _scan_saves():
    """扫描两个默认位置，返回找到的存档路径(去重、按路径排序)。
    仅当 Flask 运行在用户本机时才可能命中游戏存档。"""
    found = set()
    for d in (GAME_SLOTS, APP_DIR):
        if os.path.isdir(d):
            for root, _, files in os.walk(d):
                for fn in files:
                    if fn.lower().endswith((".es3", ".json")):
                        found.add(os.path.join(root, fn))
    return sorted(found)


def _read_parse(path):
    """读取并解析存档，返回 (data, error_msg)。失败时 data 为 None。"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except OSError as e:
        return None, f"读取文件失败: {e}"
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        return None, f"文件不是标准 JSON 格式！错误: {e}"
    if not isinstance(data, dict):
        return None, "存档顶层结构不是 JSON 对象（应为真实 ES3 结构）。"
    return data, None


# ==================== 页面 ====================
@app.route("/")
def index():
    return render_template("index.html")


# ==================== API ====================
@app.route("/api/scan_saves", methods=["GET"])
def api_scan_saves():
    """查找本地默认位置的存档（仅本机运行可用）。
    返回: {ok, saves:[{name, path}], app_dir, game_dir_exist}"""
    saves = _scan_saves()
    return jsonify({
        "ok": True,
        "saves": [{"name": os.path.basename(p), "path": p} for p in saves],
        "app_dir": APP_DIR,
        "game_dir_exist": os.path.isdir(GAME_SLOTS),
        "game_dir": GAME_SLOTS,
    })


@app.route("/api/load_local", methods=["POST"])
def api_load_local():
    """加载本机扫到的存档。仅允许读取 _scan_saves() 返回的路径，防止任意文件读取。"""
    req = request.get_json(silent=True) or {}
    path = (req.get("path") or "").strip()
    allowed = set(_scan_saves())
    if path not in allowed:
        return jsonify({"ok": False, "error": "该路径不在可用的本地存档列表中。"}), 400
    data, err = _read_parse(path)
    if err:
        return jsonify({"ok": False, "error": err}), 400
    return jsonify({
        "ok": True,
        "fileName": os.path.basename(path),
        "data": data,
    })


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