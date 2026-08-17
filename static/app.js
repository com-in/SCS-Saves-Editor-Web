/* 诈骗园区模拟器 - 存档修改器 (Web版) 前端逻辑
   镜像桌面版 main.py 的处理逻辑：ES3 顶层 key -> {__type, value} 结构 */

(function () {
  "use strict";

  /* ==================== 基础工具 ==================== */
  function $id(id) { return document.getElementById(id); }
  function safeFloat(v, dflt) {
    var n = parseFloat(v);
    return isNaN(n) ? dflt : n;
  }
  function safeInt(v, dflt) {
    var n = parseInt(parseFloat(v), 10);
    return isNaN(n) ? dflt : n;
  }
  function safeBool(v) {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return ["true", "1", "yes", "on"].indexOf(v.toLowerCase()) >= 0;
    return !!v;
  }

  /* ==================== 状态 ==================== */
  var State = {
    data: null,        // 解析后的完整 dict
    original: null,    // 加载时的原始副本（用于恢复）
    fileName: null,
    workers: [],       // Workers value 数组
    currentWorker: null
  };

  /* ==================== ES3 取值/写值 ==================== */
  function es3Get(key) {
    var node = State.data && State.data[key];
    if (node && typeof node === "object" && "value" in node) return node.value;
    return undefined;
  }
  function es3Set(key, value) {
    var node = State.data && State.data[key];
    if (node && typeof node === "object" && "value" in node) node.value = value;
  }

  /* ==================== 提示 Toast ==================== */
  function toast(msg, type) {
    var el = document.createElement("div");
    el.className = "toast " + (type || "ok");
    el.textContent = msg;
    $id("toast-wrap").appendChild(el);
    setTimeout(function () { el.remove(); }, 4000);
  }

  /* ==================== 页面切换 ==================== */
  var PAGES = ["home", "basic", "workers", "crypto", "items", "placed", "upgrade", "other"];
  function showPage(name) {
    document.querySelectorAll(".page").forEach(function (p) { p.classList.remove("active"); });
    var target = document.getElementById("page-" + name);
    if (target) target.classList.add("active");
    document.querySelectorAll(".nav-item[data-page]").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-page") === name);
    });
  }

  /* ==================== 侧边栏折叠 ==================== */
  function toggleSidebar() {
    var sb = $id("sidebar");
    var collapsed = sb.classList.toggle("collapsed");
    $id("fold-item").textContent = collapsed ? "▶" : "◀ 折叠侧边栏";
  }

  /* ==================== 主题切换 ==================== */
  var dark = false;
  function applyTheme() {
    document.body.classList.toggle("dark", dark);
    var icon = $id("theme-icon"), label = $id("theme-label");
    if (icon) icon.textContent = dark ? "☀️" : "🌙";
    if (label) label.textContent = dark ? "亮色模式" : "暗色模式";
    try { localStorage.setItem("scs-theme", dark ? "dark" : "light"); } catch (e) { /* 忽略存储异常 */ }
  }

  /* ==================== 加载进界面 ==================== */
  function loadView() {
    // 基础数据
    $id("b-currency").value = es3Get("Currency") || 0;
    $id("b-level").value = es3Get("Level") || 1;
    $id("b-exp").value = es3Get("Exp") || 0;
    $id("b-days").value = es3Get("Day") || 0;
    $id("b-electricity").value = es3Get("Electricity") || 0;
    $id("b-shopname").value = es3Get("ShopName") || "";
    var cd = es3Get("CallData");
    $id("b-calldata").value = cd !== undefined && cd !== null ? cd : -1;
    $id("b-difficulty").value = es3Get("Difficulty") || 1;

    // 加密货币
    loadCrypto();
    // 升级
    loadUpgrade();
    // JSON 页
    setJson($id("t-items"), es3Get("Items"));
    setJson($id("t-placed"), es3Get("PlaceItems"));
    // 其他（只读整结构）
    $id("t-other").value = JSON.stringify(State.data, null, "\t");

    // 工人
    loadWorkers();

    showPage("basic");
  }

  function setJson(textarea, val) {
    textarea.value = (val !== undefined && val !== null)
      ? JSON.stringify(val, null, "\t")
      : "// 无数据";
  }

  function loadCrypto() {
    var arr = es3Get("CryptoData");
    var tbody = $id("crypto-table").querySelector("tbody");
    tbody.innerHTML = "";
    if (!Array.isArray(arr)) return;
    arr.forEach(function (c) {
      if (!c || typeof c !== "object") return;
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><input data-k='cryptoName' type='text' value=''></td>" +
        "<td><input data-k='currentPrice' type='text' value=''></td>" +
        "<td><input data-k='coinAmount' type='text' value=''></td>" +
        "<td><input data-k='avgBuyPrice' type='text' value=''></td>";
      var ins = tr.querySelectorAll("input");
      ins[0].value = c.cryptoName || "";
      ins[1].value = c.currentPrice || 0;
      ins[2].value = c.coinAmount || 0;
      ins[3].value = c.avgBuyPrice || 0;
      ins.forEach(function (inp) {
        inp.addEventListener("change", function () { c[inp.dataset.k] = inp.value; });
      });
      tbody.appendChild(tr);
    });
  }

  function loadUpgrade() {
    var arr = es3Get("Upgrade");
    var tbody = $id("upgrade-table").querySelector("tbody");
    tbody.innerHTML = "";
    if (!Array.isArray(arr)) return;
    arr.forEach(function (u) {
      if (!u || typeof u !== "object") return;
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><input data-k='name' type='text' value=''></td>" +
        "<td><input data-k='level' type='text' value=''></td>";
      var ins = tr.querySelectorAll("input");
      ins[0].value = u.name || "";
      ins[1].value = u.level || 0;
      ins.forEach(function (inp) {
        inp.addEventListener("change", function () { u[inp.dataset.k] = inp.value; });
      });
      tbody.appendChild(tr);
    });
  }

  /* ==================== 工人 ==================== */
  function workerDisplay(w, idx) {
    if (w && typeof w === "object") {
      var npc = w.npcDataRole;
      if (npc && npc.npcName) return npc.npcName;
    }
    return "工人 #" + idx;
  }

  function loadWorkers() {
    var arr = es3Get("Workers");
    State.workers = Array.isArray(arr) ? arr : [];
    State.currentWorker = null;
    refreshWorkerList();
  }

  function refreshWorkerList() {
    var list = $id("w-list");
    list.innerHTML = "";
    var query = $id("w-search").value.trim().toLowerCase();
    State.workers.forEach(function (w, i) {
      if (query && workerDisplay(w, i).toLowerCase().indexOf(query) < 0) return;
      var div = document.createElement("div");
      div.className = "list-item";
      div.textContent = workerDisplay(w, i);
      div.addEventListener("click", function () { selectWorker(i); });
      if (State.currentWorker === i) div.classList.add("active");
      list.appendChild(div);
    });
    $id("w-count").textContent = "共 " + State.workers.length + " 个工人";
  }

  function selectWorker(i) {
    if (i < 0 || i >= State.workers.length) { State.currentWorker = null; return; }
    State.currentWorker = i;
    loadWorkerToUI(State.workers[i]);
    Array.prototype.forEach.call($id("w-list").children, function (d, idx) {
      d.classList.toggle("active", idx === i);
    });
  }

  function loadWorkerToUI(worker) {
    var npc = (worker && typeof worker === "object" && worker.npcDataRole &&
      typeof worker.npcDataRole === "object") ? worker.npcDataRole : {};
    var name = npc.npcName || ("工人 #" + (worker._index || ""));
    $id("w-title").textContent = "👤 " + name;

    $id("w-money").value = npc.money || 0;

    var abilities = Array.isArray(npc.abilities) ? npc.abilities : [];
    var abMap = {};
    abilities.forEach(function (ab) {
      if (ab && typeof ab === "object") abMap[String(ab.abilityName || "").toLowerCase()] = ab;
    });
    $id("w-intelligence").value = (abMap.intelligence && abMap.intelligence.value) || 0;
    $id("w-strength").value = (abMap.strength && abMap.strength.value) || 0;
    $id("w-focus").value = (abMap.focus && abMap.focus.value) || 0;

    $id("w-sick").value = worker.sickValue || 0;
    $id("w-starve").value = worker.starveValue || 0;
    $id("w-thirst").value = worker.thirstValue || 0;
    $id("w-sanity").value = worker.sanityValue || 0;
    $id("w-tame").value = worker.tameProgress || 0;

    var tamed = $id("w-tamed"), dead = $id("w-dead");
    tamed.checked = safeBool(worker.isTamed);
    dead.checked = safeBool(worker.isDead);
  }

  function currentWorker() {
    if (State.currentWorker === null || State.currentWorker >= State.workers.length) return null;
    return State.workers[State.currentWorker];
  }

  function onWorkerFieldChanged(key, val) {
    var w = currentWorker();
    if (!w) return;
    if (key === "money") {
      if (!w.npcDataRole || typeof w.npcDataRole !== "object") w.npcDataRole = {};
      w.npcDataRole.money = safeFloat(val, 0);
    } else if (key === "intelligence" || key === "strength" || key === "focus") {
      if (!w.npcDataRole || typeof w.npcDataRole !== "object") w.npcDataRole = {};
      var npc = w.npcDataRole;
      if (!Array.isArray(npc.abilities)) npc.abilities = [];
      var abMap = {};
      npc.abilities.forEach(function (a) {
        if (a && typeof a === "object") abMap[String(a.abilityName || "").toLowerCase()] = a;
      });
      var cap = key.charAt(0).toUpperCase() + key.slice(1);
      if (abMap[key]) abMap[key].value = safeFloat(val, 0);
      else npc.abilities.push({ abilityName: cap, minValue: 1, maxValue: 4, value: safeFloat(val, 0) });
    } else if (key === "sick" || key === "starve" || key === "thirst" || key === "sanity" || key === "tame") {
      var dataKey = { sick: "sickValue", starve: "starveValue", thirst: "thirstValue", sanity: "sanityValue", tame: "tameProgress" }[key];
      w[dataKey] = safeFloat(val, 0);
    }
  }

  function onWorkerCheckboxChanged() {
    var w = currentWorker();
    if (!w) return;
    w.isTamed = $id("w-tamed").checked;
    w.isDead = $id("w-dead").checked;
  }

  function maxAllWorkers() {
    State.workers.forEach(function (w) {
      if (!w || typeof w !== "object") return;
      if (!w.npcDataRole || typeof w.npcDataRole !== "object") w.npcDataRole = {};
      var npc = w.npcDataRole;
      if (!Array.isArray(npc.abilities)) npc.abilities = [];
      var abMap = {};
      npc.abilities.forEach(function (a) {
        if (a && typeof a === "object") abMap[String(a.abilityName || "").toLowerCase()] = a;
      });
      ["Intelligence", "Strength", "Focus"].forEach(function (name) {
        var key = name.toLowerCase();
        if (abMap[key]) abMap[key].value = 9999;
        else npc.abilities.push({ abilityName: name, minValue: 1, maxValue: 4, value: 9999 });
      });
      w.sickValue = 0;
      w.starveValue = 0;
      w.thirstValue = 0;
      w.sanityValue = 999;
      w.tameProgress = 100;
      w.isTamed = true;
      w.isDead = false;
    });
    toast("✅ 已全部加满所有工人属性");
    refreshWorkerList();
    if (State.currentWorker !== null) loadWorkerToUI(State.workers[State.currentWorker]);
  }

  function resetWorkersStatus() {
    State.workers.forEach(function (w) {
      if (!w || typeof w !== "object") return;
      w.sickValue = 0;
      w.thirstValue = 0;
      w.starveValue = 0;
    });
    toast("✅ 已重置所有工人状态（疾病/饥饿/口渴清零）");
    if (State.currentWorker !== null) loadWorkerToUI(State.workers[State.currentWorker]);
  }

  /* ==================== 保存前收集视图改动 ==================== */
  function collectToData() {
    es3Set("Currency", safeFloat($id("b-currency").value, 0));
    es3Set("Level", safeInt($id("b-level").value, 1));
    es3Set("Exp", safeInt($id("b-exp").value, 0));
    es3Set("Day", safeInt($id("b-days").value, 0));
    es3Set("Electricity", safeInt($id("b-electricity").value, 0));
    es3Set("ShopName", $id("b-shopname").value);
    es3Set("CallData", safeInt($id("b-calldata").value, -1));
    es3Set("Difficulty", safeInt($id("b-difficulty").value, 1));
    if (State.workers.length) es3Set("Workers", State.workers);

    // 合并 JSON 页（物品 / 放置物品）
    mergeJson($id("t-items"), "Items");
    mergeJson($id("t-placed"), "PlaceItems");
  }

  function mergeJson(textarea, key) {
    var raw = textarea.value.trim();
    if (!raw || raw.indexOf("//") === 0) return;
    try {
      es3Set(key, JSON.parse(raw));
    } catch (e) { /* 不中断，交由下载时统一校验提示 */ }
  }

  function validateJsonEditors() {
    ["t-items", "t-placed"].forEach(function (id) {
      var raw = $id(id).value.trim();
      if (!raw || raw.indexOf("//") === 0) return;
      try { JSON.parse(raw); }
      catch (e) {
        throw new Error("JSON 页格式错误: " + (id === "t-items" ? "物品" : "放置物品") + "\n" + e.message);
      }
    });
  }

  /* ==================== 下载 ==================== */
  function downloadFile() {
    if (!State.data) { toast("请先加载存档文件！", "warn"); return; }
    try {
      validateJsonEditors();
      collectToData();
    } catch (e) {
      toast(e.message, "err");
      return;
    }
    // 写回 Workers（菜单实时改动已同步到 State.workers）
    var text = JSON.stringify(State.data, null, "\t");
    var blob = new Blob([text], { type: "application/json;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = State.fileName || "save.es3";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("✅ 已生成修改后存档，请下载保存到游戏目录");
  }

  /* ==================== 加载存档（上传/本地通用） ==================== */
  function applyLoaded(payload) {
    State.data = payload.data;
    State.original = JSON.parse(JSON.stringify(payload.data));
    State.fileName = payload.fileName;
    $id("file-info").textContent = "已加载: " + payload.fileName;
    loadView();
    toast("✅ 存档已加载: " + payload.fileName);
  }

  /* ==================== 事件绑定 ==================== */
  function bindEvents() {
    // 导航
    document.querySelectorAll(".nav-item[data-page]").forEach(function (a) {
      a.addEventListener("click", function () { showPage(a.getAttribute("data-page")); });
    });
    $id("fold-item").addEventListener("click", toggleSidebar);
    $id("theme-btn").addEventListener("click", function () { dark = !dark; applyTheme(); });

    // 上传
    $id("btn-open").addEventListener("click", function () { $id("file-input").click(); });
    $id("file-input").addEventListener("change", function () {
      var file = this.files[0];
      if (!file) return;
      var fd = new FormData();
      fd.append("file", file);
      fetch("/api/upload", { method: "POST", body: fd })
        .then(function (res) { return res.json(); })
        .then(function (j) {
          if (j.ok) { applyLoaded(j); }
          else { toast("上传失败: " + j.error, "err"); }
        })
        .catch(function (e) { toast("网络错误: " + e, "err"); });
      this.value = "";
    });

    // 查找本地存档
    $id("btn-find").addEventListener("click", openFindDialog);

    // 恢复原档
    $id("btn-restore").addEventListener("click", function () {
      if (!State.original) { toast("尚未加载存档", "warn"); return; }
      State.data = JSON.parse(JSON.stringify(State.original));
      loadView();
      toast("🔄 已恢复为加载时的原始数据");
    });

    // 下载
    $id("btn-download").addEventListener("click", downloadFile);

    // 工人
    $id("w-search").addEventListener("input", refreshWorkerList);
    var wFields = [
      ["w-money", "money"], ["w-intelligence", "intelligence"],
      ["w-strength", "strength"], ["w-focus", "focus"],
      ["w-sick", "sick"], ["w-starve", "starve"], ["w-thirst", "thirst"],
      ["w-sanity", "sanity"], ["w-tame", "tame"]
    ];
    wFields.forEach(function (pair) {
      $id(pair[0]).addEventListener("input", function () {
        onWorkerFieldChanged(pair[1], this.value);
      });
    });
    $id("w-tamed").addEventListener("change", onWorkerCheckboxChanged);
    $id("w-dead").addEventListener("change", onWorkerCheckboxChanged);
    $id("w-max").addEventListener("click", maxAllWorkers);
    $id("w-reset").addEventListener("click", resetWorkersStatus);

    // 查找弹窗关闭
    $id("find-close").addEventListener("click", closeFindDialog);
    $id("modal-mask").addEventListener("click", function (e) {
      if (e.target === this) closeFindDialog();
    });
  }

  /* ==================== 查找本地存档弹窗 ==================== */
  function openFindDialog() {
    var scanInfo = $id("find-scan-info");
    var list = $id("find-list");
    list.innerHTML = "";
    scanInfo.textContent = "正在扫描本地存档...";
    $id("modal-mask").classList.add("show");

    fetch("/api/scan_saves")
      .then(function (res) { return res.json(); })
      .then(function (j) {
        if (!j.ok) { scanInfo.textContent = "扫描失败"; return; }
        var part1 = j.game_dir_exist ? "已找到游戏存档目录。" : "未找到游戏存档目录。";
        scanInfo.textContent = part1 + (j.saves.length ? "找到 " + j.saves.length + " 个存档：" : "未找到本地存档（远程服务器可能无游戏存档，请改用上传）。");
        list.innerHTML = "";
        j.saves.forEach(function (s) {
          var div = document.createElement("div");
          div.className = "list-item";
          div.textContent = s.name + "   ——   " + s.path;
          div.title = s.path;
          div.addEventListener("click", function () { loadLocal(s.path); });
          list.appendChild(div);
        });
      })
      .catch(function (e) { scanInfo.textContent = "扫描出错: " + e; });
  }

  function loadLocal(path) {
    fetch("/api/load_local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: path })
    })
      .then(function (res) { return res.json(); })
      .then(function (j) {
        if (j.ok) {
          closeFindDialog();
          applyLoaded(j);
        } else {
          toast("加载失败: " + j.error, "err");
        }
      })
      .catch(function (e) { toast("网络错误: " + e, "err"); });
  }

  function closeFindDialog() { $id("modal-mask").classList.remove("show"); }

  /* ==================== 初始化 ==================== */
  function init() {
    dark = localStorage.getItem("scs-theme") === "dark";
    bindEvents();          // 先绑定事件，确保折叠等交互不受后续渲染异常影响
    try { applyTheme(); } catch (e) { /* 忽略主题渲染异常 */ }
    showPage("home");
  }

  document.addEventListener("DOMContentLoaded", init);
})();