/* ============================================================
   data-source.js — 统一数据接入层
   本地 / API / 混合 / 演示 · Schema 校验 · 分级兜底 · 双驱动刷新
   对外输出统一 DataSnapshot：meta / records / config / diagnostics
   ============================================================ */
(function (global) {
  'use strict';

  var SNAPSHOT_CACHE_KEY = 'dcc_openlab_snapshot_v1';
  var USER_CFG_KEY = 'dcc_openlab_config_override_v1';

  /* 内置默认配置：与 config/dashboard.config.json 保持一致，离线时兜底 */
  var DEFAULTS = {
    schemaVersion: 1,
    eventId: 'dcc-openlab-2026-11-25',
    event: {
      labName: '用友新道大数据实训室',
      location: '至学楼D103',
      theme: 'AI游戏奇遇记：零代码创作实战',
      openDayTheme: '开放共享，实践求真',
      taskBrief: '根据操作步骤，借助AI工具零代码完成小游戏作品并现场提交即完成任务',
      creditNote: '完成任意项目任务可加第二课堂 1 学时。'
    },
    targets: { attendance: 80, classes: 6, workTypes: 8 },
    window: { hours: [8, 9, 10, 11, 12, 13, 14, 15, 16] },
    topN: { works: 6, feed: 8 },
    rules: { hoursPerWork: 1, scorePerWork: 2, heatmapStep: 2 },
    refresh: { intervalMs: 15000, timeoutMs: 5000, retry: 3, debounceMs: 300 },
    carousel: { intervalMs: 4200 },
    theme: { colors: ['#00e6d2', '#7c4dff', '#ff5c9d', '#2ee6a8', '#ff8a3d', '#3d7dff'] },
    source: { mode: 'local', endpoint: '' },
    highlights: [
      { icon: 'spark', tag: 'ACTIVITY THEME', title: 'AI游戏奇遇记 · 零代码创作实战',
        desc: '借助AI工具，零代码完成小游戏作品并现场提交。让创意即刻成真，让每个想法都能跑起来。',
        k: '实战', v: 'AI 工具 · 小游戏创作 · 现场提交' },
      { icon: 'box', tag: 'PROFESSIONAL BACKGROUND', title: '用友新道大数据实训室',
        desc: '面向大数据与人工智能实践教学，承接实验室开放日真实项目任务，融合校企协同育人场景。',
        k: '场地', v: '至学楼D103 · 开放共享，实践求真' },
      { icon: 'screen', tag: 'PROFESSIONAL FEATURES', title: '零代码 · 可视化 · 全过程留痕',
        desc: '操作可视化、成果可展示、过程可追溯。纸质登记与现场大屏双轨一致，数据本地保存、离线可用。',
        k: '特色', v: '零代码创作 · 双轨一致 · 离线可用' },
      { icon: 'crown', tag: 'ACHIEVEMENT HIGHLIGHTS', title: '作品提交 · 第二课堂认定',
        desc: '完成任意项目任务可加第二课堂 1 学时，优秀作品现场轮播展示，形成可复制的开放共享实践模式。',
        k: '成果', v: '第二课堂 1 学时 · 成果归档展示' }
    ],
    guidelines: [
      { icon: 'info', title: '任务说明', text: '根据操作步骤，借助AI工具零代码完成小游戏作品并现场提交即完成任务。', tone: '' },
      { icon: 'check', title: '双轨一致', text: '纸质登记表为正式上报材料，大屏数据仅用于现场展示，二者保持一致。', tone: '' },
      { icon: 'alert', title: '兜底方案', text: '工具故障立即停用，完全依靠纸质登记表完成到场与作品登记。', tone: 'warn' }
    ]
  };

  var config = clone(DEFAULTS);
  var state = {
    snapshot: null,
    timer: null,
    debounce: null,
    pending: null,
    listeners: [],
    diag: { lastError: '', retryCount: 0, latencyMs: 0, lastSuccessAt: '' }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function merge(base, extra) {
    if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return base;
    Object.keys(extra).forEach(function (k) {
      var v = extra[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        merge(base[k], v);
      } else if (v !== undefined && v !== null) {
        base[k] = clone(v);
      }
    });
    return base;
  }

  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }

  /* ---------- Schema 校验与字段归一化 ---------- */
  function normalizeRecord(raw, fallbackSource) {
    if (!raw || typeof raw !== 'object') return null;
    var sid = String(raw.sid == null ? '' : raw.sid).trim();
    if (!sid) return null;
    var dt = raw.time ? new Date(raw.time) : new Date();
    var time = isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
    var done = raw.completed === true || raw.completed === 1 ||
      raw.completed === '1' || raw.completed === 'true';
    var recheck = raw.recheck === true || raw.recheck === 1 || raw.recheck === 'true';
    return {
      id: String(raw.id || ('r_' + sid)),
      name: String(raw.name == null ? '' : raw.name).trim() || '未填姓名',
      sid: sid,
      className: String(raw.className == null ? '' : raw.className).trim() || '未填',
      counselor: String(raw.counselor == null ? '' : raw.counselor).trim() || '未填辅导员',
      task: String(raw.task == null ? '' : raw.task).trim(),
      completed: done,
      time: time,
      recheck: recheck,
      source: String(raw.source || fallbackSource || 'local')
    };
  }

  /* 以学号为唯一键去重，同一学号保留时间最新的一条 */
  function normalizeList(list, fallbackSource) {
    var map = {};
    (list || []).forEach(function (raw) {
      var x = normalizeRecord(raw, fallbackSource);
      if (!x) return;
      var prev = map[x.sid];
      if (!prev || new Date(x.time).getTime() >= new Date(prev.time).getTime()) map[x.sid] = x;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function localRecords() {
    try {
      return normalizeList((global.Store && Store.state.students) || [], 'local');
    } catch (e) {
      return [];
    }
  }

  /* 演示数据：确定性生成，仅用于人工预览或最终降级 */
  function demoRecords() {
    var classes = ['大数据2301', '大数据2302', '人工智能2301', '人工智能2302', '金融科技2301', '数据科学2301'];
    var counselors = ['张老师', '李老师', '王老师', '陈老师', '刘老师', '赵老师'];
    var works = ['AI贪吃蛇', 'AI Flappy Bird', 'AI 2048', 'AI 打砖块', 'AI 记忆翻牌', 'AI 迷宫探险', 'AI 飞机大战', 'AI 拼图'];
    var sn = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴', '徐', '孙', '马', '朱', '胡', '林'];
    var gn = ['子涵', '雨桐', '浩然', '思远', '梓萱', '一鸣', '嘉怡', '宇轩', '欣妍', '泽宇', '可欣', '明哲', '佳宁', '文博'];
    var seed = 20261125;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var arr = [];
    for (var i = 0; i < 72; i++) {
      var hr = 9 + Math.floor(rnd() * 7), mi = Math.floor(rnd() * 60);
      arr.push({
        id: 'demo' + i,
        name: sn[Math.floor(rnd() * sn.length)] + gn[Math.floor(rnd() * gn.length)],
        sid: '2026' + String(100000 + Math.floor(rnd() * 899999)),
        className: classes[Math.floor(rnd() * classes.length)],
        counselor: counselors[i % counselors.length],
        task: works[Math.floor(rnd() * works.length)],
        completed: rnd() < 0.74,
        time: new Date(2026, 10, 25, hr, mi).toISOString(),
        recheck: rnd() < 0.15
      });
    }
    return normalizeList(arr, 'demo');
  }

  function readCache() {
    var raw = lsGet(SNAPSHOT_CACHE_KEY);
    if (!raw) return null;
    try {
      var s = JSON.parse(raw);
      if (!s || s.meta && s.meta.schemaVersion !== config.schemaVersion) return null;
      s.records = normalizeList(s.records || [], s.meta && s.meta.source || 'local');
      return s;
    } catch (e) {
      return null;
    }
  }

  function writeCache(s) {
    lsSet(SNAPSHOT_CACHE_KEY, JSON.stringify({
      meta: s.meta,
      records: s.records
    }));
  }

  function buildSnapshot(records, source, stale, reason) {
    return {
      meta: {
        schemaVersion: config.schemaVersion,
        eventId: config.eventId,
        generatedAt: new Date().toISOString(),
        source: source || 'local',
        stale: !!stale,
        staleReason: reason || ''
      },
      records: records || [],
      config: config,
      diagnostics: state.diag
    };
  }

  function emit(s) {
    state.listeners.forEach(function (fn) {
      try { fn(s); } catch (e) { console.warn('data-source listener failed', e); }
    });
  }

  function commit(records, source, stale, reason) {
    var prev = state.snapshot;
    var next = buildSnapshot(records, source, stale, reason);
    var unchanged = prev && !stale && !prev.meta.stale &&
      prev.meta.source === next.meta.source &&
      JSON.stringify(prev.records) === JSON.stringify(next.records);
    state.snapshot = next;
    if (!stale) writeCache(next);
    if (!unchanged) emit(next);
    return next;
  }

  /* ---------- 远程接入：REST GET，支持超时与响应结构兼容 ---------- */
  function remoteRecords() {
    var endpoint = config.source.endpoint;
    if (!endpoint) return Promise.reject(new Error('未配置数据接口地址'));
    if (typeof global.fetch !== 'function') return Promise.reject(new Error('当前环境不支持 fetch'));

    var ctrl = typeof global.AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, Math.max(1000, +config.refresh.timeoutMs || 5000));
    var opts = { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' };
    if (ctrl) opts.signal = ctrl.signal;

    return global.fetch(endpoint, opts).then(function (resp) {
      if (!resp.ok) throw new Error('接口返回 ' + resp.status);
      return resp.json();
    }).then(function (payload) {
      var arr = Array.isArray(payload) ? payload : (payload && payload.records) || [];
      if (!Array.isArray(arr)) throw new Error('接口数据结构不符合 DataSnapshot 约定');
      return normalizeList(arr, 'api');
    }).then(function (v) {
      clearTimeout(timer);
      return v;
    }, function (err) {
      clearTimeout(timer);
      state.diag.latencyMs = +config.refresh.timeoutMs || 5000;
      throw err;
    });
  }

  function applyRemote(remote, mode, attempt) {
    var records = mode === 'hybrid' ? normalizeList(localRecords().concat(remote)) : remote;
    state.diag.retryCount = attempt;
    state.diag.lastError = '';
    state.diag.lastSuccessAt = new Date().toISOString();
    return commit(records, mode, false, '');
  }

  function attemptFetch(n, mode) {
    var t0 = Date.now();
    return remoteRecords().then(function (remote) {
      state.diag.latencyMs = Date.now() - t0;
      return applyRemote(remote, mode, n);
    }, function (err) {
      state.diag.lastError = String(err && err.message || err);
      if (n < (Math.max(0, +config.refresh.retry || 0))) {
        state.diag.retryCount = n + 1;
        return new Promise(function (resolve) { setTimeout(resolve, 1000 * Math.pow(2, n)); })
          .then(function () { return attemptFetch(n + 1, mode); });
      }
      return Promise.resolve(degrade());
    });
  }

  /* 分级兜底：上一帧 → 缓存 → 本地 → 空快照（DEMO 仅人工启用） */
  function degrade() {
    var reason = state.diag.lastError || '数据源暂时不可用';
    var records = null, source = 'local';
    if (state.snapshot && state.snapshot.records && state.snapshot.records.length) {
      records = state.snapshot.records;
      source = state.snapshot.meta.source;
    }
    if (!records) {
      var cache = readCache();
      if (cache && cache.records && cache.records.length) {
        records = cache.records;
        source = (cache.meta && cache.meta.source) || 'local';
      }
    }
    if (!records) {
      var local = localRecords();
      if (local.length) { records = local; source = 'local'; }
    }
    if (!records) records = [];
    return commit(records, source, true, reason);
  }

  function refresh() {
    if (state.pending) return state.pending;
    var paper = global.Store && Store.state.settings && Store.state.settings.paperMode;
    if (paper) {
      stopPolling();
      var snap = state.snapshot || buildSnapshot([], 'local', true, '纸质应急模式');
      return Promise.resolve(commit(snap.records, snap.meta.source, true, '纸质应急模式'));
    }
    var mode = config.source.mode;
    if (mode === 'demo') return Promise.resolve(commit(demoRecords(), 'demo', false, ''));
    if (mode === 'local') return Promise.resolve(commit(localRecords(), 'local', false, ''));
    state.pending = attemptFetch(0, mode).then(function (s) {
      state.pending = null;
      return s;
    }, function (e) {
      state.pending = null;
      throw e;
    });
    return state.pending;
  }

  function stopPolling() {
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
  }

  function startPolling() {
    stopPolling();
    var ms = Math.max(3000, +config.refresh.intervalMs || 15000);
    var jitter = Math.round((Math.random() * 6 - 3) * 1000);
    state.timer = setInterval(function () {
      if (global.document && document.visibilityState === 'hidden') return;
      refresh();
    }, ms + jitter);
  }

  function applyUrlParams() {
    var modeSet = false;
    try {
      var q = new URLSearchParams(global.location.search);
      var mode = q.get('src');
      if (mode && /^(local|api|demo|hybrid)$/.test(mode)) { config.source.mode = mode; modeSet = true; }
      var sec = q.get('refresh');
      if (sec && +sec > 0) config.refresh.intervalMs = Math.max(3000, Math.round(+sec * 1000));
      var ep = q.get('endpoint');
      if (ep) config.source.endpoint = ep;
      if (q.get('demo') === '0' && config.source.mode === 'demo') { config.source.mode = 'local'; modeSet = true; }
    } catch (e) { /* 老浏览器忽略 URL 覆盖 */ }
    return modeSet;
  }

  function loadConfig() {
    if (typeof global.fetch !== 'function' || !global.location || global.location.protocol === 'file:') {
      return Promise.resolve(null);
    }
    return global.fetch('config/dashboard.config.json', { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('config ' + r.status);
      return r.json();
    }).then(function (remote) {
      merge(config, remote);
      return remote;
    }, function () {
      return null;
    });
  }

  function bindEvents() {
    function scheduleRefresh() {
      clearTimeout(state.debounce);
      state.debounce = setTimeout(function () {
        refresh();
        /* 退出纸质模式后需要恢复轮询（refresh 内纸质分支只负责停止） */
        var paper = global.Store && Store.state.settings && Store.state.settings.paperMode;
        if (!paper && !state.timer) startPolling();
      }, Math.max(50, +config.refresh.debounceMs || 300));
    }
    global.addEventListener('store:changed', scheduleRefresh);
    /* 跨标签页同步：签到页与数据大屏常在不同浏览器标签/窗口打开。
       localStorage 写入会在「其他」标签页触发 storage 事件，这里让大屏即时重载 Store 并刷新快照，
       保证提交后统计与列表在两个页面状态一致。 */
    global.addEventListener('storage', function (e) {
      if (!e) return;
      if (e.key === 'dcc_openlab_v2' || e.key === SNAPSHOT_CACHE_KEY || e.key === USER_CFG_KEY) {
        if (global.Store && Store.reload) Store.reload();
        scheduleRefresh();
      }
    });
    if (global.document) {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') stopPolling();
        else { startPolling(); refresh(); }
      });
    }
  }

  function setMode(mode) {
    if (!/^(local|api|demo|hybrid)$/.test(mode)) return config.source.mode;
    config.source.mode = mode;
    var override = {};
    try { override = JSON.parse(lsGet(USER_CFG_KEY) || '{}') || {}; } catch (e) { override = {}; }
    override.source = override.source || {};
    override.source.mode = mode;
    lsSet(USER_CFG_KEY, JSON.stringify(override));
    refresh();
    return mode;
  }

  function getSnapshot() {
    return state.snapshot || (state.snapshot = buildSnapshot(localRecords(), 'local', false, ''));
  }

  function init() {
    /* 本地模式（默认）以真实签到数据为准，避免旧缓存导致刷新后统计不一致；
       只有本地无数据时才回退到上一帧缓存。API/演示模式仍以各自 refresh 结果为准。 */
    var mode = config.source.mode;
    var cache = readCache();
    var local = localRecords();
    var records, src;
    if (mode === 'local') {
      records = local;
      src = 'local';
    } else {
      records = cache && cache.records && cache.records.length ? cache.records : (local.length ? local : []);
      src = (cache && cache.meta && cache.meta.source) || (local.length ? 'local' : 'local');
    }
    state.snapshot = buildSnapshot(records, src, false, '');

    var override = null;
    try { override = JSON.parse(lsGet(USER_CFG_KEY) || 'null'); } catch (e) { override = null; }
    bindEvents();

    /* 配置优先级（后者覆盖前者）：内置默认 → config.json → localStorage 用户覆盖 → URL 参数。
       URL 置于最高优先级，保证现场临时用 ?src=&endpoint= 调整时一定能生效；
       config.json 必须在最后重新合并，否则其 source.mode/endppoint 会被早先写入的值覆盖。 */
    loadConfig().then(function () {
      if (override) merge(config, override);
      applyUrlParams();
      return refresh();
    }).then(function () {
      startPolling();
    }, function () {
      startPolling();
    });
    return state.snapshot;
  }

  global.DataSource = {
    init: init,
    getSnapshot: getSnapshot,
    refresh: refresh,
    subscribe: function (fn) {
      if (typeof fn === 'function') state.listeners.push(fn);
      return function () {
        var i = state.listeners.indexOf(fn);
        if (i >= 0) state.listeners.splice(i, 1);
      };
    },
    setMode: setMode,
    getConfig: function () { return config; },
    diagnostics: function () { return clone(state.diag); },
    normalizeList: normalizeList,
    demoRecords: demoRecords
  };

  global.DataSource.init();
})(window);
