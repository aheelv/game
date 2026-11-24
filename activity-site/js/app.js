/* ============================================================
   app.js — 路由 / 导航 / 全部功能模块
   ============================================================ */
(function (global) {
  'use strict';
  var E = UI.esc, $ = UI.$, $$ = UI.$$, ic = UI.icon;

  /* 仅保留两个入口：学生签到登记 + AI创作大屏 */
  var NAV = [
    { group: '现场应用', items: [
      { id: 'checkin', name: '学生签到登记', icon: 'check' },
      { id: 'dashboard', name: 'AI创作大屏', icon: 'screen', badge: 'LIVE' }
    ]}
  ];

  var PAGES = {};
  var DEFAULT_PAGE = 'checkin';
  var current = DEFAULT_PAGE;

  /* ---------------- 路由 ---------------- */
  function go(id, refreshing) {
    /* refreshing=true 表示同一大屏的数据刷新：清理定时器但保留全屏沉浸状态 */
    if (global.__dashCleanup) { global.__dashCleanup(!!refreshing); global.__dashCleanup = null; }
    if (!refreshing && global.__ldTimer) { global.__ldTimer(); global.__ldTimer = null; }
    if (!PAGES[id]) id = DEFAULT_PAGE;
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
    setInterval(function () { $('#clock').textContent = UI.nowStr(); }, 1000);
    $('#clock').textContent = UI.nowStr();
    global.addEventListener('hashchange', function () {
      var id = location.hash.replace('#', '');
      if ((id === 'checkin' || id === 'dashboard') && id !== current) go(id);
    });
  }

  /* =====================================================
     1. AI创作数据大屏（多维可视化版）
     ===================================================== */

  /* 大屏卡片组件 */
  function kpi(icon, label, value, unit, foot, tone, sparkData) {
    return '<div class="db-kpi t' + tone + '"><div class="dk-top"><span class="dk-ico">' + ic(icon) + '</span><span class="dk-label">' + E(label) + '</span></div>' +
      '<div class="dk-mid"><b>' + value + '</b><small>' + E(unit) + '</small></div>' +
      '<div class="dk-foot">' + E(foot) + '</div>' +
      '<div class="dk-spark">' + (global.Viz && sparkData ? global.Viz.spark(sparkData, ['#00e6d2', '#7c4dff', '#2ee6a8', '#ff8a3d', '#ff5c9d', '#3d7dff'][{'a':0,'b':1,'c':2,'d':3}[tone] || 0]) : '') + '</div></div>';
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
    var byClass = {}, byCollege = {}, byTask = {}, heat = {}, hourTotal = {}, hourDone = {};
    hours.forEach(function (h) { hourTotal[h] = 0; hourDone[h] = 0; });
    list.forEach(function (x) {
      var c = x.className || '未填';
      if (!byClass[c]) byClass[c] = { total: 0, done: 0 };
      byClass[c].total++; if (x.completed) byClass[c].done++;
      var col = x.college || '未填学院';
      if (!byCollege[col]) byCollege[col] = { total: 0, done: 0 };
      byCollege[col].total++; if (x.completed) byCollege[col].done++;
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
      byClass: byClass, cls: cls, byCollege: byCollege, colleges: Object.keys(byCollege).sort(),
      heat: heat, workList: workList, radar: radar, rechecks: rechecks,
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
    /* 登记页：只刷新现场记录表格与计数，不重建表单，避免打断正在填写的内容 */
    if (current === 'checkin') {
      var body = $('#ckBody');
      if (body) body.innerHTML = ckRows();
      var head = $('.record-head .mini-head');
      if (head) head.textContent = '到场记录（' + Store.state.students.length + ' 条）';
      var clear = $('#ckClearAll');
      if (clear) clear.disabled = !Store.state.students.length;
      return;
    }
    if (current !== 'dashboard') return;
    var app = $('#app');
    if (!app) return;
    var top = app.scrollTop;
    go('dashboard', true);
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
      var colors = (cfg.theme && cfg.theme.colors) || ['#00e6d2', '#7c4dff', '#ff5c9d', '#2ee6a8', '#ff8a3d', '#3d7dff'];
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
        desc: '管理学院章鱼大数据实验室（至学楼D103）现场数据全景。展示到场趋势、作品提交、班级分布、参与热度与成果亮点。',
        actions: '<button class="btn" id="dashRefresh">' + ic('spark') + '刷新数据</button>' +
                 '<button class="btn" id="dashDemo">' + ic('board') + (usingDemo ? '查看现场数据' : '演示数据预览') + '</button>' +
                 '<button class="btn" id="dashScroll">' + ic('board') + '自动巡屏</button>' +
                 '<button class="btn" id="dashExport">' + ic('download') + '导出数据</button>' +
                 '<button class="btn primary" id="dashFull">' + ic('screen') + '全屏展示</button>'
      }) +
      '<div class="dash-banner fade-in">' +
        '<div class="db-main"><span class="db-live"><span class="pulse-dot"></span> LIVE · <b class="open-day">实验室开放日</b></span>' +
          '<h2>' + E(ev.labName || '管理学院章鱼大数据实验室') + ' · ' + E(ev.theme || 'AI游戏奇遇记：零代码创作实战') + '</h2>' +
          '<p>地点 ' + E(ev.location || '至学楼D103') + ' · ' + E(ev.openDayTheme || '开放共享，实践求真') + ' · ' + E(ev.taskBrief || '') + '</p></div>' +
        '<div class="db-side"><div class="db-clock" id="dashClock">--:--:--</div><div class="db-date">' + UI.dateStr() +
          '<span class="db-updated" id="dbUpdated">更新于 ' + UI.nowStr(snap.meta.generatedAt) + '</span></div>' + badge + '</div>' +
      '</div>' +
      '<div class="dash-kpis">' +
        kpi('check', '到场学生', d.total, '人', '累计到场记录', 'a', d.arrT) +
        kpi('spark', '作品提交', d.done, '人', '完成零代码创作', 'c', d.arrD) +
        kpi('screen', '提交率', d.rate, '%', '提交 / 到场', 'b', d.arrD) +
        kpi('board', '专业班级', d.classes, '个', '到场覆盖专业班级', 'd', d.arrT) +
        kpi('box', '作品类型', d.works, '类', '小游戏作品种类', 'a', d.arrD) +
        kpi('info', '第二课堂', d.done * hoursPerWork, '学时', '按 ' + hoursPerWork + ' 学时 / 人计', 'c', d.arrD) +
      '</div>' +
      '<div class="dash-grid">' +
        panel('到场与提交累计趋势', 'TREND ANALYSIS', V.lineChart(d.labels, [
          { name: '累计到场', color: colors[0], data: d.arrT },
          { name: '累计提交', color: colors[1], data: d.arrD }
        ]), 'span2') +
        panel('作品提交构成', 'COMPLETION', V.donut(d.rate, { label: '作品提交率', color: colors[0] }) +
          '<div class="vz-donut-legend"><div><i style="background:#2ee6a8"></i>已提交 <b>' + d.done + '</b> 人</div>' +
          '<div><i style="background:#ff8a3d"></i>待提交 <b>' + (d.total - d.done) + '</b> 人</div>' +
          '<div><i style="background:#7c4dff"></i>复核记录 <b>' + d.rechecks + '</b> 条</div></div>', '') +
        panel('专业班级到场 / 提交对比', 'BY CLASS', V.bars(d.cls.map(function (c) { return { label: c, a: d.byClass[c].total, b: d.byClass[c].done }; })), '') +
        panel('参与维度画像', 'MULTI-DIMENSIONAL', V.radar(['到场规模', '提交完成', '班级覆盖', '作品多样', '过程规范'], d.radar), '') +
        panel('专业班级 × 时段参与热度', 'HEATMAP', V.heatmap(d.cls.length ? d.cls : ['暂无专业班级'], d.labels, d.cls.length ? d.cls.map(function (c) {
          return d.hours.map(function (h) { return d.heat[c][h] || 0; });
        }) : [d.hours.map(function () { return 0; })], heatStep), 'span2') +
        panel('到场时段分布', 'HISTOGRAM', V.histogram(d.hours.map(function (h) {
          return { label: (h < 10 ? '0' : '') + h + ':00', v: Object.keys(d.heat).reduce(function (s, c) { return s + (d.heat[c][h] || 0); }, 0) };
        })), '') +
        panel('小游戏作品类型占比', 'WORK MIX', V.shares(d.workList, d.done, colors), 'span2') +
        '<section class="card chart-box dash-panel span2"><div class="chart-title"><span>活动信息与任务口径</span><small>EVENT BRIEF</small></div>' +
          '<div class="event-grid">' +
            '<div class="event-item"><span>实验室名称</span><b>' + E(ev.labName || '管理学院章鱼大数据实验室') + '</b></div>' +
            '<div class="event-item"><span>活动地点</span><b>' + E(ev.location || '至学楼D103') + '</b></div>' +
            '<div class="event-item"><span>活动主题</span><b>' + E(ev.theme || 'AI游戏奇遇记：零代码创作实战') + '</b></div>' +
            '<div class="event-item"><span>开放日主题</span><b>' + E(ev.openDayTheme || '开放共享，实践求真') + '</b></div>' +
            '<div class="event-item"><span>覆盖学院</span><b>' + d.colleges.length + ' 个' + (d.colleges.length ? ' · ' + E(d.colleges.join('、')) : '') + '</b></div>' +
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
              '<div class="who"><b>' + E(x.name) + '</b><span>' + E(x.college || '未填学院') + ' · ' + E(x.className) + ' · ' + E(x.counselor || '未填辅导员') + ' · ' + E(x.task || 'AI小游戏作品') + '</span></div>' +
              '<time>' + UI.nowStr(x.time) + '</time></div>';
          }).join('') : '<div class="empty">等待学生提交作品</div>') + '</div></section>' +
        '<section class="card chart-box"><div class="chart-title">现场执行口径 <small>GUIDELINES</small></div>' + guideHtml + '</section>' +
      '</div>';
    },
    init: function (root) {
      clearInterval(dashTimer); clearInterval(scrollTimer);
      dashTimer = scrollTimer = null;
      var cfg = DataSource.getConfig();
      $('#dashRefresh').addEventListener('click', function () {
        /* 主动重新读取签到数据并刷新快照；local 模式下同步生效，随后重绘大屏 */
        if (global.DataSource && DataSource.refresh) DataSource.refresh();
        go('dashboard', true);
        UI.toast('已刷新：大屏数据已与最新签到信息同步', 'ok');
      });
      $('#dashExport').addEventListener('click', UI.exportStudents);

      /* 全屏展示：进入时隐藏左侧导航并铺满内容；再次点击或按 ESC 退出并恢复原布局 */
      var dashFull = $('#dashFull');
      function setFullBtn(on) {
        if (!dashFull) return;
        dashFull.innerHTML = ic('screen') + (on ? '退出全屏' : '全屏展示');
        dashFull.classList.toggle('on', on);
      }
      function enterImmersive() {
        document.body.classList.add('dash-immersive');
        $('#sidebar').classList.remove('open');
        $('#overlay').classList.remove('show');
        setFullBtn(true);
      }
      function exitImmersive() {
        document.body.classList.remove('dash-immersive');
        setFullBtn(false);
      }
      function onFsChange() {
        if (!document.fullscreenElement) exitImmersive();
      }
      document.addEventListener('fullscreenchange', onFsChange);
      dashFull.addEventListener('click', function () {
        if (document.body.classList.contains('dash-immersive')) {
          if (document.fullscreenElement && document.exitFullscreen) {
            var q = document.exitFullscreen();
            if (q && q.then) q.then(exitImmersive, exitImmersive); else exitImmersive();
          } else exitImmersive();
          UI.toast('已退出全屏，恢复原布局', 'info');
          return;
        }
        var el = document.documentElement;
        if (el.requestFullscreen) {
          var p = el.requestFullscreen();
          if (p && p.then) p.then(enterImmersive, function () {
            UI.toast('浏览器阻止了原生全屏，已切换为沉浸展示', 'warn');
            enterImmersive();
          });
          else enterImmersive();
        } else {
          enterImmersive();
          UI.toast('当前浏览器不支持原生全屏，已切换为沉浸展示', 'info');
        }
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
      /* 重建按钮后同步沉浸态文案，保证刷新大屏时按钮与实际状态一致 */
      setFullBtn(document.body.classList.contains('dash-immersive'));
      global.__dashCleanup = function (keepImmersive) {
        stop(); clearInterval(scrollTimer); clearInterval(ct); scrollTimer = null;
        document.removeEventListener('fullscreenchange', onFsChange);
        /* 仅真正离开大屏页时退出沉浸布局；同页刷新保留全屏，避免数据更新打断展示 */
        if (!keepImmersive && document.body.classList.contains('dash-immersive')) {
          if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
          exitImmersive();
        }
      };
    }
  };

  /* =====================================================
     2. 学生签到登记
     ===================================================== */
  var lastCheckinResult = null;

  /* 提交成功反馈面板：明确告知学生签到结果与数据已同步 */
  function ckSuccessHtml(r) {
    var status = r.completed ? '<span class="tag ok">作品已提交</span>' : '<span class="tag warn">作品未提交</span>';
    return '<div class="checkin-success fade-in" id="ckSuccess" role="status">' +
      '<div class="cs-mark">' + ic('check') + '</div>' +
      '<div class="cs-body"><div class="cs-title">' + (r.updated ? '签到信息已更新' : '签到提交成功') + '</div>' +
        '<div class="cs-name">' + E(r.name) + '</div>' +
        '<div class="cs-meta"><span class="mono">' + E(r.sid) + '</span><span>' + E(r.college || '未填学院') + ' · ' + E(r.className) + '</span>' +
          '<span>辅导员 ' + E(r.counselor || '—') + '</span>' + status + '</div>' +
        '<div class="cs-sync"><span class="pulse-dot"></span> 信息已保存并实时同步至 AI 创作大屏</div>' +
      '</div>' +
      '<div class="cs-actions"><button class="btn primary" data-go="dashboard">' + ic('screen') + '查看实时大屏</button>' +
        '<button class="btn" id="ckAgain">' + ic('plus') + '继续签到</button></div>' +
    '</div>';
  }

  PAGES.checkin = {
      title: '学生签到登记',
    render: function () {
      var s = Store.state;
      var success = lastCheckinResult ? ckSuccessHtml(lastCheckinResult) : '';
      return UI.pageHead({
        eyebrow: 'CHECK-IN · STUDENT REGISTRATION',
        title: '学生到场与作品登记',
        desc: '采集姓名、学号、学院、专业班级、辅导员姓名与到场时间。作品提交情况初始为“未完成”，完成创作后由老师在右侧到场记录中改为“已完成”；数据实时汇入大屏。',
        actions: '<button class="btn" id="ckExport">' + ic('download') + '导出记录</button>' +
          '<button class="btn danger" id="ckClearAll"' + (s.students.length ? '' : ' disabled') + '>' + ic('trash') + '清空全部</button>'
      }) +
      success +
      '<div class="grid g-1-2">' +
        '<section class="card card-pad"><div class="mini-head">扫码自助签到</div>' +
          '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">' +
            '<div class="qr-box" id="qrBox"></div>' +
            '<div style="flex:1;min-width:140px"><b style="font-size:15px">移动端扫码填报</b>' +
            '<p class="hint">学生用手机扫描二维码进入签到表单。<b class="hl">点击二维码可放大查看</b>，便于远距离扫码；可部署到局域网后使用。</p>' +
            '<div class="mono" style="font-size:12px;color:var(--txt-3);word-break:break-all" id="shareUrl"></div></div>' +
          '</div>' +
          '<div class="divider"></div>' +
          '<form id="ckForm">' +
            '<div class="field-row">' +
              '<div class="field"><label>姓名 <span class="req">*</span></label><input class="input" name="name" placeholder="请输入姓名" required></div>' +
              '<div class="field"><label>学号 <span class="req">*</span></label><input class="input" name="sid" placeholder="请输入学号" required></div>' +
            '</div>' +
            '<div class="field-row">' +
              '<div class="field"><label>学院 <span class="req">*</span></label><input class="input" name="college" placeholder="如：管理学院" required></div>' +
              '<div class="field"><label>专业班级 <span class="req">*</span></label><input class="input" name="className" placeholder="如：大数据管理与应用2201班" required></div>' +
            '</div>' +
            '<div class="field"><label>辅导员姓名 <span class="req">*</span></label><input class="input" name="counselor" placeholder="请输入辅导员姓名" required></div>' +
            '<div class="field"><label>小游戏作品名称</label><input class="input" name="task" placeholder="如：AI生成的小游戏作品名称"></div>' +
            '<div class="notice info mt12">' + ic('info') + '<div>作品提交情况由系统在登记时设为<b>未完成</b>，学生完成创作后由老师在右侧到场记录中修改，无需在此填写。</div></div>' +
            '<button class="btn primary block" type="submit">' + ic('check') + '提交到场登记</button>' +
          '</form>' +
        '</section>' +
        '<section class="card card-pad"><div class="record-head"><div class="mini-head" style="margin:0">到场记录（' + s.students.length + ' 条）</div>' +
          (s.students.length ? '<span class="record-hint">老师可点编辑修改作品提交情况；删除或清空后大屏同步更新</span>' : '') + '</div>' +
          '<div class="table-wrap"><table><thead><tr><th>姓名</th><th>学号</th><th>学院</th><th>专业班级</th><th>辅导员姓名</th><th>任务项</th><th>作品提交情况</th><th>签到时间</th><th>操作</th></tr></thead>' +
          '<tbody id="ckBody">' + ckRows() + '</tbody></table></div>' +
        '</section>' +
      '</div>';
    },
    init: function (root) {
      renderQR($('#qrBox'), location.href.split('#')[0] + '#checkin');
      $('#shareUrl').textContent = location.href.split('#')[0] + '#checkin';
      $('#ckForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var form = e.target, f = form.elements, rec = {
          name: f.name.value.trim(), sid: f.sid.value.trim(),
          college: f.college.value.trim(), className: f.className.value.trim(),
          counselor: f.counselor.value.trim(), task: f.task.value.trim()
        };
        if (!rec.name || !rec.sid || !rec.college || !rec.className || !rec.counselor) { UI.toast('请填写姓名、学号、学院、专业班级与辅导员姓名', 'err'); return; }
        var r = Store.addStudent(rec);
        /* 立即同步数据源（不等防抖），保证随后切换/刷新大屏读到的是最新签到数据 */
        if (global.DataSource && DataSource.refresh) DataSource.refresh();
        /* 记录本次提交结果，重渲染后显示成功反馈面板；完成状态取实际记录（老师可能已认定完成） */
        lastCheckinResult = {
          name: rec.name, sid: rec.sid, college: rec.college, className: rec.className, counselor: rec.counselor,
          task: rec.task, completed: !!(r.record && r.record.completed), updated: !!r.updated
        };
        UI.toast(r.updated ? '已更新 ' + rec.name + ' 的签到信息' : '签到成功：' + rec.name, 'ok');
        go('checkin');
        /* 成功后滚动到反馈面板，学生在手机上也能立刻看到结果 */
        var fb = $('#ckSuccess');
        if (fb && fb.scrollIntoView) fb.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      bindCkActions();
      $('#ckExport').addEventListener('click', UI.exportStudents);
      var again = $('#ckAgain');
      if (again) again.addEventListener('click', function () { lastCheckinResult = null; go('checkin'); });
      $$('[data-go]', root).forEach(function (b) { b.addEventListener('click', function () { go(b.getAttribute('data-go')); }); });
    }
  };
  function ckRows() {
    var list = Store.state.students;
    if (!list.length) return '<tr><td colspan="9"><div class="empty">' + ic('check') + '暂无到场记录，请在左侧提交第一条</div></td></tr>';
    return list.map(function (x) {
      return '<tr><td><b style="color:var(--txt)">' + E(x.name) + '</b></td><td class="mono">' + E(x.sid) + '</td>' +
        '<td>' + E(x.college || '—') + '</td><td>' + E(x.className) + '</td>' +
        '<td>' + E(x.counselor || '—') + '</td><td>' + E(x.task || '—') + '</td>' +
        '<td><span class="tag ' + (x.completed ? 'ok' : 'warn') + '">' + (x.completed ? '已完成' : '未完成') + '</span></td>' +
        '<td class="mono">' + UI.nowStr(x.time) + '</td>' +
        '<td><div style="display:flex;gap:5px"><button class="btn sm ghost" data-toggle="' + x.id + '" title="由老师修改作品提交情况">' + ic('edit') + '</button>' +
        '<button class="btn sm danger" data-del="' + x.id + '" title="删除该条签到记录">' + ic('trash') + '</button></div></td></tr>';
    }).join('');
  }
  /* 删除/清空后统一同步：刷新数据源 → 快照更新 → 大屏随事件重绘 → 列表重渲染 */
  function afterCheckinMutation(msg) {
    if (global.DataSource && DataSource.refresh) DataSource.refresh();
    UI.toast(msg, 'info');
    go('checkin');
  }
  function bindCkActions() {
    $$('[data-toggle]').forEach(function (b) { b.addEventListener('click', function () { Store.toggleDone(b.getAttribute('data-toggle')); afterCheckinMutation('作品提交情况已更新（老师认定）'); }); });
    $$('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-del');
        var rec = Store.state.students.filter(function (x) { return x.id === id; })[0];
        if (!rec) { UI.toast('记录不存在或已被删除', 'err'); go('checkin'); return; }
        UI.confirm({
          danger: true,
          title: '删除签到记录',
          message: '将删除 <b>' + E(rec.name) + '</b>（学号 <span class="mono">' + E(rec.sid) + '</span>）的签到记录，其关联的第二课堂加分也会一并移除。',
          tip: '删除后该记录将从名单与 AI 创作大屏中消失，且无法恢复。',
          okText: '确认删除',
          cancelText: '取消'
        }).then(function (ok) {
          if (!ok) return;
          var r = Store.removeStudent(id);
          afterCheckinMutation(r.ok ? '已删除 ' + rec.name + ' 的签到记录' : '删除失败，请重试');
        });
      });
    });
    var clearAll = $('#ckClearAll');
    if (clearAll) clearAll.addEventListener('click', function () {
      var n = Store.state.students.length;
      if (!n) { UI.toast('当前没有签到记录', 'info'); return; }
      UI.confirm({
        danger: true,
        title: '清空全部签到记录',
        message: '将一次性删除当前全部 <b>' + n + '</b> 条签到记录，并清空由其派生的第二课堂加分数据。',
        tip: '此操作不可恢复。建议先点击「导出记录」备份；清空后名单与 AI 创作大屏统计将归零。',
        okText: '清空全部',
        cancelText: '取消'
      }).then(function (ok) {
        if (!ok) return;
        var r = Store.clearStudents();
        afterCheckinMutation('已清空全部 ' + r.count + ' 条签到记录');
      });
    });
  }

  /* 真实可扫描二维码（本地 qrcodejs，离线可用）；生成后用 canvas 数据展示，保证清晰 */
  function renderQR(el, text) {
    if (!el) return;
    el.innerHTML = '';
    if (!global.QRCode) { el.innerHTML = '<div class="qr-fallback">二维码组件未加载</div>'; return; }
    try {
      new global.QRCode(el, {
        text: text,
        width: 220,
        height: 220,
        colorDark: '#091126',
        colorLight: '#ffffff',
        correctLevel: global.QRCode.CorrectLevel.H
      });
      el.classList.add('qr-clickable');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('title', '点击放大二维码');
      var open = function (e) { if (e && e.preventDefault) e.preventDefault(); openQR(text); };
      el.addEventListener('click', open);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') open(e); });
    } catch (err) {
      el.innerHTML = '<div class="qr-fallback">二维码生成失败</div>';
      console.warn('QR render failed', err);
    }
  }

  /* 点击放大查看：大尺寸真实二维码 + 链接文本，方便手机扫码 */
  function openQR(text) {
    var old = $('#qrModal');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var mask = document.createElement('div');
    mask.className = 'qr-modal';
    mask.id = 'qrModal';
    mask.innerHTML =
      '<div class="qr-modal-box" role="dialog" aria-modal="true" aria-label="放大二维码">' +
        '<button class="qr-modal-close" type="button" aria-label="关闭">&times;</button>' +
        '<h3 class="qr-modal-title">扫码进入学生签到</h3>' +
        '<div class="qr-modal-code" id="qrModalCode"></div>' +
        '<p class="qr-modal-tip">请用手机相机或微信扫描上方二维码</p>' +
        '<div class="qr-modal-url" id="qrModalUrl"></div>' +
      '</div>';
    document.body.appendChild(mask);
    void mask.offsetWidth;
    mask.classList.add('show');
    try {
      new global.QRCode($('#qrModalCode'), {
        text: text, width: 460, height: 460,
        colorDark: '#091126', colorLight: '#ffffff',
        correctLevel: global.QRCode.CorrectLevel.H
      });
    } catch (err) { $('#qrModalCode').innerHTML = '<div class="qr-fallback">二维码生成失败</div>'; }
    $('#qrModalUrl').textContent = text;
    function close() {
      mask.classList.remove('show');
      setTimeout(function () { if (mask.parentNode) mask.parentNode.removeChild(mask); }, 180);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape' || e.keyCode === 27) close(); }
    mask.querySelector('.qr-modal-close').addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    document.addEventListener('keydown', onKey);
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
    var hash = location.hash.replace('#', '');
    /* 只保留签到与大屏两个有效页面；旧书签/失效 hash 一律回落到默认页 */
    var initial = (hash === 'checkin' || hash === 'dashboard') ? hash : DEFAULT_PAGE;
    go(initial);
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
