/* ============================================================
   app.js — 路由 / 导航 / 全部功能模块
   ============================================================ */
(function (global) {
  'use strict';
  var E = UI.esc, $ = UI.$, $$ = UI.$$, ic = UI.icon;

  var NAV = [
    { group: '总览', items: [
      { id: 'home', name: '活动总览', icon: 'home' }
    ]},
    { group: '现场工具', items: [
      { id: 'dashboard', name: 'AI创作大屏', icon: 'screen', badge: 'LIVE' },
      { id: 'checkin', name: '学生签到登记', icon: 'check' },
      { id: 'registry', name: '登记表生成打印', icon: 'sheet' },
      { id: 'ocr', name: '纸质表识别录入', icon: 'scan' }
    ]},
    { group: '数据管理', items: [
      { id: 'scores', name: '第二课堂加分', icon: 'plus' },
      { id: 'photos', name: '佐证照片核查', icon: 'camera' },
      { id: 'archive', name: '学生成果归档', icon: 'box' }
    ]},
    { group: '组织与保障', items: [
      { id: 'kanban', name: '任务分工看板', icon: 'board' },
      { id: 'emergency', name: '应急预案', icon: 'alert' },
      { id: 'leader', name: '领导巡视展示', icon: 'crown' }
    ]}
  ];

  var PAGES = {};
  var current = 'home';

  /* ---------------- 路由 ---------------- */
  function go(id) {
    if (global.__dashCleanup) { global.__dashCleanup(); global.__dashCleanup = null; }
    if (global.__ldTimer) { global.__ldTimer(); global.__ldTimer = null; }
    if (!PAGES[id]) id = 'home';
    current = id;
    location.hash = id;
    renderNav();
    var app = $('#app');
    app.innerHTML = PAGES[id].render();
    $('#crumbCurrent').textContent = PAGES[id].title;
    if (PAGES[id].init) PAGES[id].init(app);
    UI.animateBars(app);
    app.scrollTop = 0; global.scrollTo(0, 0);
    Store.setSetting('lastPage', id);
    $('#sidebar').classList.remove('open'); $('#overlay').classList.remove('show');
  }
  function renderNav() {
    var html = NAV.map(function (g) {
      return '<div class="nav-group"><div class="nav-group-title">' + E(g.group) + '</div>' +
        g.items.map(function (it) {
          return '<button class="nav-item ' + (it.id === current ? 'active' : '') + '" data-page="' + it.id + '">' +
            ic(it.icon) + '<span>' + E(it.name) + '</span>' + (it.badge ? '<span class="nav-badge">' + it.badge + '</span>' : '') + '</button>';
        }).join('') + '</div>';
    }).join('');
    $('#nav').innerHTML = html;
    $$('#nav .nav-item').forEach(function (b) { b.addEventListener('click', function () { go(b.getAttribute('data-page')); }); });
  }

  function bindGlobal() {
    $('#menuToggle').addEventListener('click', function () { $('#sidebar').classList.add('open'); $('#overlay').classList.add('show'); });
    $('#overlay').addEventListener('click', function () { $('#sidebar').classList.remove('open'); $('#overlay').classList.remove('show'); });
    $('#btnMusic').addEventListener('click', function () { UI.toggleMusic(); });
    $('#btnPaper').addEventListener('click', function () {
      var v = !Store.state.settings.paperMode;
      Store.setSetting('paperMode', v);
      document.body.classList.toggle('paper-mode', v);
      $('#btnPaper').classList.toggle('on', v);
      $('#sysStatusText').textContent = v ? '纸质应急模式 · 网页工具已停用' : '系统就绪 · 本地离线可用';
      UI.toast(v ? '已切换纸质应急模式：以纸质登记表为准' : '已退出纸质应急模式', v ? 'warn' : 'ok');
    });
    setInterval(function () { $('#clock').textContent = UI.nowStr(); }, 1000);
    $('#clock').textContent = UI.nowStr();
    var paper = Store.state.settings.paperMode;
    document.body.classList.toggle('paper-mode', paper);
    $('#btnPaper').classList.toggle('on', paper);
    global.addEventListener('hashchange', function () {
      var id = location.hash.replace('#', '') || 'home';
      if (id !== current) go(id);
    });
  }

  /* =====================================================
     1. 活动总览
     ===================================================== */
  PAGES.home = {
    title: '活动总览',
    render: function () {
      var d = currentStats(), s = Store.state;
      var st = { total: d.total, done: d.done, rate: d.rate, classes: d.classes };
      var doneTasks = s.tasks.filter(function (t) { return t.status === 'done'; }).length;
      var launches = [
        { id: 'checkin', icon: 'check', t: '学生到场登记', d: '采集姓名、学号、班级、到场时间与作品提交情况，作为大屏数据源。' },
        { id: 'dashboard', icon: 'screen', t: 'AI创作数据大屏', d: '实时可视化到场人数、作品提交率、班级分布与任务进度，支持导出。' },
        { id: 'registry', icon: 'sheet', t: '登记表生成打印', d: '按模板栏目生成约200行正式纸质登记表，A4 横版直接打印。' },
        { id: 'leader', icon: 'crown', t: '领导巡视展示', d: '一键进入展示模式：可视化数据 + 学生小游戏作品与照片轮播。' }
      ];
      return UI.pageHead({
        eyebrow: 'AI GAME CREATION · ZERO-CODE WORKSHOP',
        title: 'AI游戏奇遇记 · <em>零代码创作实战</em>',
        desc: '用友新道大数据实训室（至学楼D103）实验室开放日工作台。借助AI工具零代码完成小游戏作品并现场提交，覆盖到场登记、登记表打印、现场执行与巡视展示全流程，纸质材料与现场大屏数据保持一致。',
        actions: '<button class="btn primary" data-go="dashboard">' + ic('screen') + '打开创作大屏</button>' +
                 '<button class="btn" data-go="registry">' + ic('print') + '生成登记表</button>'
      }) +
      '<div class="grid g4 stagger">' +
        UI.statCard({ tone: 'a', label: '到场学生', value: st.total, unit: '人', foot: '现场实时累计', icon: 'check' }) +
        UI.statCard({ tone: 'c', label: '作品提交', value: st.done, unit: '人', foot: '提交率 ' + st.rate + '%', icon: 'spark', bar: st.rate }) +
        UI.statCard({ tone: 'b', label: '覆盖班级', value: st.classes, unit: '个', foot: '参与班级数量', icon: 'board' }) +
        UI.statCard({ tone: 'd', label: '筹备进度', value: doneTasks + '/' + s.tasks.length, foot: '任务看板完成项', icon: 'board', bar: Math.round(doneTasks / s.tasks.length * 100) }) +
      '</div>' +
      '<div class="grid g-2-1 mt20">' +
        '<section class="card card-pad"><div class="mini-head">活动五阶段流程</div>' +
          '<div class="timeline">' +
          [['会前对接', '操作步骤确认 · AI工具与账号准备 · 场地布置 · 登记表与工具开发'],
           ['表格制作', '按模板制作约200行登记表，含姓名/学号/班级/作品/加分/留痕'],
           ['现场执行', '到场签到 · AI零代码创作 · 作品现场提交 · 佐证照片 · 氛围音乐'],
           ['应急预案', '人少固定学生 · 人多搬椅分批 · 工具故障切纸质'],
           ['领导巡视', '真实创作 · 屏幕有作品 · 大屏数据 + 成果照片展示']].map(function (x, i) {
            return '<div class="tl-item ' + (i === 0 ? 'done' : '') + '"><h4>0' + (i + 1) + ' · ' + E(x[0]) + '</h4><p>' + E(x[1]) + '</p></div>';
          }).join('') + '</div>' +
        '</section>' +
        '<section class="card card-pad"><div class="mini-head">关键口径</div>' +
          '<div class="notice">' + ic('info') + '<div><b>双轨一致</b><br>纸质登记表为正式上报材料，大屏数据仅用于现场展示，二者信息保持一致。完成任意项目任务可加第二课堂 1 学时。</div></div>' +
          '<div class="notice warn mt16">' + ic('alert') + '<div><b>故障兜底</b><br>工具卡顿即停用，完全依靠纸质表完成到场与作品登记，不影响第二课堂佐证收集。</div></div>' +
          '<div class="divider"></div>' +
          '<dl class="kv"><dt>名称</dt><dd>用友新道大数据实训室</dd>' +
          '<dt>地点</dt><dd>至学楼D103</dd>' +
          '<dt>主题</dt><dd>AI游戏奇遇记：零代码创作实战</dd>' +
          '<dt>作品命名</dt><dd class="mono">学号+姓名</dd>' +
          '<dt>照片内容</dt><dd>本人 + 电脑上的小游戏作品界面</dd>' +
          '<dt>音乐</dt><dd>低音量，巡视前调好氛围</dd></dl>' +
        '</section>' +
      '</div>' +
      '<div class="mini-head mt24">快速进入</div>' +
      '<div class="grid g4 stagger">' + launches.map(function (l) {
        return '<article class="card launch" data-go="' + l.id + '"><span class="li">' + ic(l.icon) + '</span>' +
          '<h3>' + E(l.t) + '</h3><p>' + E(l.d) + '</p><span class="go">进入模块 ' + ic('arrow') + '</span></article>';
      }).join('') + '</div>';
    },
    init: function (root) {
      $$('[data-go]', root).forEach(function (b) { b.addEventListener('click', function () { go(b.getAttribute('data-go')); }); });
    }
  };

  /* =====================================================
     2. AI创作数据大屏（多维可视化版）
     ===================================================== */

  /* 大屏卡片组件 */
  function kpi(icon, label, value, unit, foot, tone, sparkData) {
    return '<div class="db-kpi t' + tone + '"><div class="dk-top"><span class="dk-ico">' + ic(icon) + '</span><span class="dk-label">' + E(label) + '</span></div>' +
      '<div class="dk-mid"><b>' + value + '</b><small>' + E(unit) + '</small></div>' +
      '<div class="dk-foot">' + E(foot) + '</div>' +
      '<div class="dk-spark">' + (global.Viz && sparkData ? global.Viz.spark(sparkData, ['#2de2e6', '#9b6dff', '#3ee0a0', '#ffb454', '#f472b6', '#4d7cfe'][{'a':0,'b':1,'c':2,'d':3}[tone] || 0]) : '') + '</div></div>';
  }
  function panel(title, en, body, cls) {
    return '<section class="card chart-box dash-panel ' + (cls || '') + '">' +
      '<div class="chart-title"><span>' + E(title) + '</span><small>' + E(en) + '</small></div>' + body + '</section>';
  }

  /* 由记录派生全部分析指标；输出结构与改造前完全一致 */
  function derive(list, cfg) {
    cfg = cfg || {};
    var hours = (cfg.window && cfg.window.hours && cfg.window.hours.length) ? cfg.window.hours.slice() : [8, 9, 10, 11, 12, 13, 14, 15, 16];
    var targets = cfg.targets || {};
    var topN = cfg.topN || {};
    var byClass = {}, byTask = {}, heat = {}, hourTotal = {}, hourDone = {};
    hours.forEach(function (h) { hourTotal[h] = 0; hourDone[h] = 0; });
    list.forEach(function (x) {
      var c = x.className || '未填';
      if (!byClass[c]) byClass[c] = { total: 0, done: 0 };
      byClass[c].total++; if (x.completed) byClass[c].done++;
      if (x.task) byTask[x.task] = (byTask[x.task] || 0) + 1;
      var hr = new Date(x.time).getHours();
      if (hourTotal[hr] === undefined) { hourTotal[hr] = 0; hourDone[hr] = 0; }
      hourTotal[hr]++;
      if (x.completed) hourDone[hr]++;
      if (!heat[c]) heat[c] = {};
      heat[c][hr] = (heat[c][hr] || 0) + 1;
    });
    var cls = Object.keys(byClass).sort();
    var total = list.length;
    var done = list.filter(function (x) { return x.completed; }).length;
    var rate = total ? Math.round(done / total * 100) : 0;
    var cumT = 0, cumD = 0;
    var labels = hours.map(function (h) { return (h < 10 ? '0' : '') + h + ':00'; });
    var arrT = [], arrD = [];
    hours.forEach(function (h) {
      cumT += hourTotal[h] || 0; cumD += hourDone[h] || 0;
      arrT.push(cumT); arrD.push(cumD);
    });
    var rechecks = list.filter(function (x) { return x.recheck; }).length;
    var radar = [
      Math.min(100, Math.round(total / (+targets.attendance || 80) * 100)),
      rate,
      Math.min(100, Math.round(cls.length / (+targets.classes || 6) * 100)),
      Math.min(100, Math.round(Object.keys(byTask).length / (+targets.workTypes || 8) * 100)),
      total ? Math.round((1 - rechecks / total) * 100) : 0
    ];
    var workList = Object.keys(byTask).map(function (k) { return { label: k, v: byTask[k] }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, +topN.works || 6);
    return {
      total: total, done: done, rate: rate, classes: cls.length,
      works: Object.keys(byTask).length,
      hours: hours, labels: labels, arrT: arrT, arrD: arrD,
      byClass: byClass, cls: cls, heat: heat, workList: workList,
      radar: radar, rechecks: rechecks,
      recent: list.slice().sort(function (a, b) { return new Date(b.time) - new Date(a.time); }).slice(0, +topN.feed || 8)
    };
  }

  var dashTimer = null, scrollTimer = null, hlIndex = 0, autoScroll = false;

  /* 统一快照消费：首页 / 大屏 / 巡视页共用同一套派生结果 */
  function currentStats() {
    var snap = DataSource.getSnapshot();
    return derive(snap.records, snap.config);
  }

  /* 数据源变化时重绘大屏：保留滚动位置与轮播页码，避免大屏跳动 */
  function onDataSourceChanged() {
    if (current !== 'dashboard') return;
    var app = $('#app');
    if (!app) return;
    var top = app.scrollTop;
    go('dashboard');
    var next = $('#app');
    if (next) next.scrollTop = top;
  }

  var lastLiveMode = 'local';

  PAGES.dashboard = {
    title: 'AI创作数据大屏',
    render: function () {
      var snap = DataSource.getSnapshot();
      var cfg = snap.config || {};
      var d = derive(snap.records, cfg);
      var V = global.Viz;
      var colors = (cfg.theme && cfg.theme.colors) || ['#2de2e6', '#9b6dff', '#f472b6', '#3ee0a0', '#ffb454', '#4d7cfe'];
      var usingDemo = snap.meta.source === 'demo';
      var stale = !!snap.meta.stale;
      var ev = cfg.event || {};
      var rules = cfg.rules || {};
      var hoursPerWork = +rules.hoursPerWork || 1;
      var heatStep = +rules.heatmapStep || 2;
      var highlights = cfg.highlights || [];
      var guidelines = cfg.guidelines || [];
      if (hlIndex >= highlights.length) hlIndex = 0;
      var badge = usingDemo ? '<span class="db-demo">DEMO · 演示数据</span>' :
        stale ? '<span class="db-stale">DELAY · 数据延迟</span>' :
        '<span class="db-real">LIVE · 现场数据</span>';
      var hl = highlights.map(function (x, i) {
        return '<div class="hl-slide' + (i === hlIndex ? ' on' : '') + '" data-hl="' + i + '">' +
          '<div class="hl-ico">' + ic(x.icon) + '</div><div class="hl-tag">' + E(x.tag) + '</div>' +
          '<h3>' + E(x.title) + '</h3><p>' + E(x.desc) + '</p>' +
          '<div class="hl-kv"><span>' + E(x.k) + '</span><b>' + E(x.v) + '</b></div></div>';
      }).join('');
      var dots = highlights.map(function (_, i) { return '<button class="hl-dot' + (i === hlIndex ? ' on' : '') + '" data-dot="' + i + '" aria-label="第' + (i + 1) + '张"></button>'; }).join('');
      var guideHtml = guidelines.map(function (g, i) {
        return '<div class="notice ' + (i ? 'mt12 ' : '') + (g.tone || '') + '">' + ic(g.icon) +
          '<div><b>' + E(g.title) + '</b><br>' + E(g.text) + '</div></div>';
      }).join('');
      return UI.pageHead({
        eyebrow: 'AI GAME CREATION · LIVE DASHBOARD',
        title: 'AI游戏奇遇记 · 零代码创作 <em>实时大屏</em>',
        desc: '用友新道大数据实训室（至学楼D103）现场数据全景。展示到场趋势、作品提交、班级分布、参与热度与成果亮点。',
        actions: '<button class="btn" id="dashDemo">' + ic('spark') + (usingDemo ? '查看现场数据' : '演示数据预览') + '</button>' +
                 '<button class="btn" id="dashScroll">' + ic('board') + '自动巡屏</button>' +
                 '<button class="btn" id="dashExport">' + ic('download') + '导出数据</button>' +
                 '<button class="btn primary" id="dashFull">' + ic('screen') + '全屏展示</button>'
      }) +
      '<div class="dash-banner fade-in">' +
        '<div class="db-main"><span class="db-live"><span class="pulse-dot"></span> LIVE · 实验室开放日</span>' +
          '<h2>' + E(ev.labName || '用友新道大数据实训室') + ' · ' + E(ev.theme || 'AI游戏奇遇记：零代码创作实战') + '</h2>' +
          '<p>地点 ' + E(ev.location || '至学楼D103') + ' · ' + E(ev.openDayTheme || '开放共享，实践求真') + ' · ' + E(ev.taskBrief || '') + '</p></div>' +
        '<div class="db-side"><div class="db-clock" id="dashClock">--:--:--</div><div class="db-date">' + UI.dateStr() +
          '<span class="db-updated" id="dbUpdated">更新于 ' + UI.nowStr(snap.meta.generatedAt) + '</span></div>' + badge + '</div>' +
      '</div>' +
      '<div class="dash-kpis">' +
        kpi('check', '到场学生', d.total, '人', '累计到场记录', 'a', d.arrT) +
        kpi('spark', '作品提交', d.done, '人', '完成零代码创作', 'c', d.arrD) +
        kpi('screen', '提交率', d.rate, '%', '提交 / 到场', 'b', d.arrD) +
        kpi('board', '参与班级', d.classes, '个', '到场覆盖班级', 'd', d.arrT) +
        kpi('box', '作品类型', d.works, '类', '小游戏作品种类', 'a', d.arrD) +
        kpi('info', '第二课堂', d.done * hoursPerWork, '学时', '按 ' + hoursPerWork + ' 学时 / 人计', 'c', d.arrD) +
      '</div>' +
      '<div class="dash-grid">' +
        panel('到场与提交累计趋势', 'TREND ANALYSIS', V.lineChart(d.labels, [
          { name: '累计到场', color: colors[0], data: d.arrT },
          { name: '累计提交', color: colors[1], data: d.arrD }
        ]), 'span2') +
        panel('作品提交构成', 'COMPLETION', V.donut(d.rate, { label: '作品提交率', color: colors[0] }) +
          '<div class="vz-donut-legend"><div><i style="background:#3ee0a0"></i>已提交 <b>' + d.done + '</b> 人</div>' +
          '<div><i style="background:#ffb454"></i>待提交 <b>' + (d.total - d.done) + '</b> 人</div>' +
          '<div><i style="background:#9b6dff"></i>复核记录 <b>' + d.rechecks + '</b> 条</div></div>', '') +
        panel('班级到场 / 提交对比', 'BY CLASS', V.bars(d.cls.map(function (c) { return { label: c, a: d.byClass[c].total, b: d.byClass[c].done }; })), '') +
        panel('参与维度画像', 'MULTI-DIMENSIONAL', V.radar(['到场规模', '提交完成', '班级覆盖', '作品多样', '过程规范'], d.radar), '') +
        panel('班级 × 时段参与热度', 'HEATMAP', V.heatmap(d.cls.length ? d.cls : ['暂无班级'], d.labels, d.cls.length ? d.cls.map(function (c) {
          return d.hours.map(function (h) { return d.heat[c][h] || 0; });
        }) : [d.hours.map(function () { return 0; })], heatStep), 'span2') +
        panel('到场时段分布', 'HISTOGRAM', V.histogram(d.hours.map(function (h) {
          return { label: (h < 10 ? '0' : '') + h + ':00', v: Object.keys(d.heat).reduce(function (s, c) { return s + (d.heat[c][h] || 0); }, 0) };
        })), '') +
        panel('小游戏作品类型占比', 'WORK MIX', V.shares(d.workList, d.done, colors), 'span2') +
        '<section class="card chart-box dash-panel span2"><div class="chart-title"><span>活动信息与任务口径</span><small>EVENT BRIEF</small></div>' +
          '<div class="event-grid">' +
            '<div class="event-item"><span>实验室名称</span><b>' + E(ev.labName || '用友新道大数据实训室') + '</b></div>' +
            '<div class="event-item"><span>活动地点</span><b>' + E(ev.location || '至学楼D103') + '</b></div>' +
            '<div class="event-item"><span>活动主题</span><b>' + E(ev.theme || 'AI游戏奇遇记：零代码创作实战') + '</b></div>' +
            '<div class="event-item"><span>开放日主题</span><b>' + E(ev.openDayTheme || '开放共享，实践求真') + '</b></div>' +
          '</div>' +
          '<div class="task-brief">' + ic('spark') + '<div><b>任务说明</b><br>' + E(ev.taskBrief || '') +
            (ev.creditNote ? ' ' + E(ev.creditNote) : '') + '</div></div>' +
        '</section>' +
      '</div>' +
      '<div class="hl-carousel"><div class="hl-head"><div class="mini-head">成果亮点 · HIGHLIGHTS</div>' +
        '<div class="hl-ctrl"><button id="hlPrev" aria-label="上一张">‹</button><button id="hlNext" aria-label="下一张">›</button></div></div>' +
        '<div class="hl-stage">' + hl + '</div><div class="hl-dots">' + dots + '</div></div>' +
      '<div class="dash-bottom">' +
        '<section class="card chart-box"><div class="chart-title">实时提交动态 <small>LIVE FEED</small></div><div class="live-list" id="dashFeed">' +
          (d.recent.length ? d.recent.map(function (x) {
            return '<div class="live-item"><div class="avatar">' + E(x.name.slice(0, 1)) + '</div>' +
              '<div class="who"><b>' + E(x.name) + '</b><span>' + E(x.className) + ' · ' + E(x.task || 'AI小游戏作品') + '</span></div>' +
              '<time>' + UI.nowStr(x.time) + '</time></div>';
          }).join('') : '<div class="empty">等待学生提交作品</div>') + '</div></section>' +
        '<section class="card chart-box"><div class="chart-title">现场执行口径 <small>GUIDELINES</small></div>' + guideHtml + '</section>' +
      '</div>';
    },
    init: function (root) {
      clearInterval(dashTimer); clearInterval(scrollTimer);
      dashTimer = scrollTimer = null;
      var cfg = DataSource.getConfig();
      $('#dashExport').addEventListener('click', UI.exportStudents);
      $('#dashFull').addEventListener('click', function () {
        var el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen(); else UI.toast('当前浏览器不支持全屏', 'warn');
      });
      $('#dashDemo').addEventListener('click', function () {
        if (DataSource.getSnapshot().meta.source === 'demo') DataSource.setMode(lastLiveMode);
        else { lastLiveMode = cfg.source.mode; DataSource.setMode('demo'); }
      });
      var sc = $('#dashScroll');
      function startScroll() {
        if (scrollTimer) return;
        sc.classList.add('on');
        var app = $('#app');
        scrollTimer = setInterval(function () {
          if (!app) return;
          if (app.scrollTop + app.clientHeight >= app.scrollHeight - 4) app.scrollTop = 0;
          else app.scrollTop += 2;
        }, 40);
      }
      function stopScroll() {
        clearInterval(scrollTimer); scrollTimer = null; sc.classList.remove('on');
      }
      sc.addEventListener('click', function () {
        if (scrollTimer) { stopScroll(); autoScroll = false; UI.toast('已停止自动巡屏', 'info'); }
        else { startScroll(); autoScroll = true; UI.toast('自动巡屏已开启', 'ok'); }
      });
      if (autoScroll) startScroll();
      var clock = $('#dashClock'), updated = $('#dbUpdated');
      function tick() {
        if (clock) clock.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        if (updated) updated.textContent = '更新于 ' + UI.nowStr(DataSource.getSnapshot().meta.generatedAt);
      }
      tick(); var ct = setInterval(tick, 1000);
      /* 成果亮点轮播 */
      var slides = $$('.hl-slide'), dots = $$('.hl-dot');
      var interval = Math.max(1200, +cfg.carousel.intervalMs || 4200);
      function show(i) {
        if (!slides.length) return;
        hlIndex = (i + slides.length) % slides.length;
        slides.forEach(function (s, j) { s.classList.toggle('on', j === hlIndex); });
        dots.forEach(function (d, j) { d.classList.toggle('on', j === hlIndex); });
      }
      function play() { clearInterval(dashTimer); dashTimer = setInterval(function () { show(hlIndex + 1); }, interval); }
      function stop() { clearInterval(dashTimer); dashTimer = null; }
      $('#hlPrev').addEventListener('click', function () { stop(); show(hlIndex - 1); play(); });
      $('#hlNext').addEventListener('click', function () { stop(); show(hlIndex + 1); play(); });
      dots.forEach(function (d) { d.addEventListener('click', function () { stop(); show(+d.getAttribute('data-dot')); play(); }); });
      var stage = $('.hl-stage');
      if (stage) { stage.addEventListener('mouseenter', stop); stage.addEventListener('mouseleave', play); }
      play();
      global.__dashCleanup = function () { stop(); clearInterval(scrollTimer); clearInterval(ct); scrollTimer = null; };
    }
  };

  /* =====================================================
     3. 学生签到登记
     ===================================================== */
  PAGES.checkin = {
      title: '学生到场登记',
    render: function () {
      var s = Store.state;
      return UI.pageHead({
        eyebrow: 'CHECK-IN · STUDENT REGISTRATION',
        title: '学生到场与作品登记',
        desc: '采集姓名、学号、班级、到场时间与作品提交情况。借助AI工具零代码完成小游戏作品并现场提交，数据实时汇入大屏。',
        actions: '<button class="btn" id="ckExport">' + ic('download') + '导出记录</button>'
      }) +
      '<div class="grid g-1-2">' +
        '<section class="card card-pad"><div class="mini-head">扫码自助签到</div>' +
          '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">' +
            '<div class="qr-box" id="qrBox"></div>' +
            '<div style="flex:1;min-width:140px"><b style="font-size:13px">移动端扫码填报</b>' +
            '<p class="hint">学生用手机扫描二维码，进入签到表单自助填写。二维码指向本页，可部署到局域网后使用。</p>' +
            '<div class="mono" style="font-size:10px;color:var(--txt-3);word-break:break-all" id="shareUrl"></div></div>' +
          '</div>' +
          '<div class="divider"></div>' +
          '<form id="ckForm">' +
            '<div class="field-row">' +
              '<div class="field"><label>姓名 <span class="req">*</span></label><input class="input" name="name" placeholder="请输入姓名" required></div>' +
              '<div class="field"><label>学号 <span class="req">*</span></label><input class="input" name="sid" placeholder="请输入学号" required></div>' +
            '</div>' +
            '<div class="field"><label>班级 <span class="req">*</span></label><input class="input" name="className" placeholder="如：工商管理2201班" required></div>' +
            '<div class="field"><label>小游戏作品名称</label><input class="input" name="task" placeholder="如：AI生成的小游戏作品名称"></div>' +
            '<div class="field"><label>作品提交情况</label><div class="seg" id="ckSeg">' +
              '<button type="button" data-v="0" class="on">未提交</button><button type="button" data-v="1">已提交</button></div></div>' +
            '<button class="btn primary block" type="submit">' + ic('check') + '提交到场登记</button>' +
          '</form>' +
        '</section>' +
        '<section class="card card-pad"><div class="mini-head">到场记录（' + s.students.length + ' 条）</div>' +
          '<div class="table-wrap"><table><thead><tr><th>姓名</th><th>学号</th><th>班级</th><th>任务项</th><th>完成情况</th><th>签到时间</th><th>操作</th></tr></thead>' +
          '<tbody id="ckBody">' + ckRows() + '</tbody></table></div>' +
        '</section>' +
      '</div>';
    },
    init: function (root) {
      renderQR($('#qrBox'), location.href.split('#')[0] + '#checkin');
      $('#shareUrl').textContent = location.href.split('#')[0] + '#checkin';
      var completed = 0;
      $$('#ckSeg button').forEach(function (b) {
        b.addEventListener('click', function () {
          $$('#ckSeg button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on'); completed = b.getAttribute('data-v') === '1';
        });
      });
      $('#ckForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var form = e.target, f = form.elements, rec = {
          name: f.name.value.trim(), sid: f.sid.value.trim(),
          className: f.className.value.trim(), task: f.task.value.trim(), completed: completed
        };
        if (!rec.name || !rec.sid || !rec.className) { UI.toast('请填写姓名、学号与班级', 'err'); return; }
        var r = Store.addStudent(rec);
        UI.toast(r.updated ? '已更新 ' + rec.name + ' 的签到信息' : '签到成功：' + rec.name, 'ok');
        form.reset(); completed = 0; $$('#ckSeg button')[0].classList.add('on'); $$('#ckSeg button')[1].classList.remove('on');
        go('checkin');
      });
      bindCkActions();
      $('#ckExport').addEventListener('click', UI.exportStudents);
    }
  };
  function ckRows() {
    var list = Store.state.students;
    if (!list.length) return '<tr><td colspan="7"><div class="empty">' + ic('check') + '暂无到场记录，请在左侧提交第一条</div></td></tr>';
    return list.map(function (x) {
      return '<tr><td><b style="color:var(--txt)">' + E(x.name) + '</b></td><td class="mono">' + E(x.sid) + '</td>' +
        '<td>' + E(x.className) + '</td><td>' + E(x.task || '—') + '</td>' +
        '<td><span class="tag ' + (x.completed ? 'ok' : 'warn') + '">' + (x.completed ? '已完成' : '未完成') + '</span></td>' +
        '<td class="mono">' + UI.nowStr(x.time) + '</td>' +
        '<td><div style="display:flex;gap:5px"><button class="btn sm ghost" data-toggle="' + x.id + '">' + ic('edit') + '</button>' +
        '<button class="btn sm danger" data-del="' + x.id + '">' + ic('trash') + '</button></div></td></tr>';
    }).join('');
  }
  function bindCkActions() {
    $$('[data-toggle]').forEach(function (b) { b.addEventListener('click', function () { Store.toggleDone(b.getAttribute('data-toggle')); UI.toast('完成状态已更新', 'ok'); go('checkin'); }); });
    $$('[data-del]').forEach(function (b) { b.addEventListener('click', function () { Store.removeStudent(b.getAttribute('data-del')); UI.toast('记录已删除', 'info'); go('checkin'); }); });
  }

  /* 简易二维码图案（装饰性，指向本页链接） */
  function renderQR(el, text) {
    if (!el) return;
    var n = 21, cells = '';
    var seed = 0; for (var i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
    function rnd(x, y) { var v = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + seed % 1000) * 43758.5453; return v - Math.floor(v) > .5; }
    function finder(x, y) {
      var inF = (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
      if (!inF) return null;
      var fx = x < 7 ? x : x - (n - 7), fy = y < 7 ? y : y - (n - 7);
      var edge = fx === 0 || fy === 0 || fx === 6 || fy === 6;
      var core = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4;
      return edge || core;
    }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var f = finder(x, y);
      var on = f === null ? rnd(x, y) : f;
      if (on) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    el.innerHTML = '<svg viewBox="-1 -1 23 23" style="fill:#0a1022;stroke:none">' + cells + '</svg>';
  }

  /* 后续模块在下一节追加 */
  global.__PAGES = PAGES;
  global.__go = go;
  global.__NAV = NAV;

  /* ---------------- 启动 ---------------- */
  function boot() {
    bindGlobal();
    function updateSysStatus(s) {
      var el = $('#sysStatusText');
      if (!el || (Store.state.settings && Store.state.settings.paperMode)) return;
      el.textContent = s.meta.stale ? ('数据延迟 · ' + (s.meta.staleReason || '等待恢复')) :
        s.meta.source === 'demo' ? '演示数据模式 · 非现场数据' :
        '现场数据同步中 · ' + Math.round(((s.config && s.config.refresh && s.config.refresh.intervalMs) || 15000) / 1000) + ' 秒刷新';
    }
    DataSource.subscribe(onDataSourceChanged);
    DataSource.subscribe(updateSysStatus);
    updateSysStatus(DataSource.getSnapshot());
    renderNav();
    var initial = location.hash.replace('#', '') || Store.state.settings.lastPage || 'home';
    go(PAGES[initial] ? initial : 'home');
  }
  // 延迟到 DOM 就绪后启动，确保后续扩展模块脚本已完成注册
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);
  }

  /* 暴露给后续脚本注入模块 */
  global.App = {
    register: function (id, title, page) { PAGES[id] = Object.assign({ title: title }, page); },
    refreshNav: renderNav,
    go: go, esc: E, icon: ic,
    derive: derive,
    currentStats: currentStats
  };
})(window);
