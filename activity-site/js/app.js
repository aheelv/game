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
      { id: 'dashboard', name: '签到数据大屏', icon: 'screen', badge: 'LIVE' },
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
      var st = Store.stats(), s = Store.state;
      var doneTasks = s.tasks.filter(function (t) { return t.status === 'done'; }).length;
      var launches = [
        { id: 'checkin', icon: 'check', t: '学生签到登记', d: '采集姓名、学号、班级、签到时间、任务完成情况，作为大屏数据源。' },
        { id: 'dashboard', icon: 'screen', t: '签到数据大屏', d: '实时可视化签到人数、完成率、班级分布与任务进度，支持导出。' },
        { id: 'registry', icon: 'sheet', t: '登记表生成打印', d: '按模板栏目生成约200行正式纸质登记表，A4 横版直接打印。' },
        { id: 'leader', icon: 'crown', t: '领导巡视展示', d: '一键进入展示模式：可视化数据 + 学生成果照片轮播。' }
      ];
      return UI.pageHead({
        eyebrow: 'SMART MANAGEMENT · EVENT HUB',
        title: '大数据与人工智能 <em>实践教学活动</em>',
        desc: '管理学院第二课堂实践活动一体化工作台。覆盖会前对接、表格制作、现场执行、应急预案与领导巡视全流程，纸质材料与现场大屏数据保持一致。',
        actions: '<button class="btn primary" data-go="dashboard">' + ic('screen') + '打开签到大屏</button>' +
                 '<button class="btn" data-go="registry">' + ic('print') + '生成登记表</button>'
      }) +
      '<div class="grid g4 stagger">' +
        UI.statCard({ tone: 'a', label: '签到学生', value: st.total, unit: '人', foot: '现场实时累计', icon: 'check' }) +
        UI.statCard({ tone: 'c', label: '任务完成', value: st.done, unit: '人', foot: '完成率 ' + st.rate + '%', icon: 'spark', bar: st.rate }) +
        UI.statCard({ tone: 'b', label: '覆盖班级', value: st.classes, unit: '个', foot: '参与班级数量', icon: 'board' }) +
        UI.statCard({ tone: 'd', label: '筹备进度', value: doneTasks + '/' + s.tasks.length, foot: '任务看板完成项', icon: 'board', bar: Math.round(doneTasks / s.tasks.length * 100) }) +
      '</div>' +
      '<div class="grid g-2-1 mt20">' +
        '<section class="card card-pad"><div class="mini-head">活动五阶段流程</div>' +
          '<div class="timeline">' +
          [['会前对接', '模板确认 · 许跃雯分工 · 智广老师归档口径 · 签到工具开发'],
           ['表格制作', '按模板制作约200行登记表，含姓名/学号/班级/任务项/加分/留痕'],
           ['现场执行', '签到录入 · 表格发放回收 · 成果留存 · 佐证照片 · 氛围音乐'],
           ['应急预案', '人少固定学生 · 人多搬椅分批 · 工具故障切纸质'],
           ['领导巡视', '真实操作 · 屏幕有内容 · 大屏数据 + 成果照片展示']].map(function (x, i) {
            return '<div class="tl-item ' + (i === 0 ? 'done' : '') + '"><h4>0' + (i + 1) + ' · ' + E(x[0]) + '</h4><p>' + E(x[1]) + '</p></div>';
          }).join('') + '</div>' +
        '</section>' +
        '<section class="card card-pad"><div class="mini-head">关键口径</div>' +
          '<div class="notice">' + ic('info') + '<div><b>双轨一致</b><br>纸质登记表为正式上报材料，大屏数据仅用于现场展示，二者信息保持一致。</div></div>' +
          '<div class="notice warn mt16">' + ic('alert') + '<div><b>故障兜底</b><br>签到工具卡顿即停用，完全依靠纸质表完成签到与登记，不影响第二课堂佐证收集。</div></div>' +
          '<div class="divider"></div>' +
          '<dl class="kv"><dt>地点</dt><dd>103 实验室（备用椅子来自 104）</dd>' +
          '<dt>照片命名</dt><dd class="mono">学号+姓名</dd>' +
          '<dt>照片内容</dt><dd>本人 + 电脑项目界面</dd>' +
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
     2. 签到数据大屏
     ===================================================== */
  PAGES.dashboard = {
    title: '签到数据大屏',
    render: function () {
      var st = Store.stats(), s = Store.state;
      var circ = 2 * Math.PI * 60;
      var off = circ * (1 - st.rate / 100);
      var classes = Object.keys(st.byClass);
      var maxC = Math.max.apply(null, classes.map(function (c) { return st.byClass[c].total; }).concat([1]));
      var tasks = Object.keys(st.byTask);
      return UI.pageHead({
        eyebrow: 'LIVE ANALYTICS · CHECK-IN DASHBOARD',
        title: '签到与任务完成 <em>实时大屏</em>',
        desc: '大屏数据仅用于现场展示，正式上报以纸质登记表为准。数据保存在本机浏览器，刷新不丢失。',
        actions: '<button class="btn" id="dashExport">' + ic('download') + '导出签到数据</button>' +
                 '<button class="btn primary" id="dashFull">' + ic('screen') + '全屏展示</button>'
      }) +
      '<div class="dash-hero fade-in"><h2>管理学院 · 大数据与人工智能实践活动</h2>' +
        '<p>现场签到与任务完成进度 · 数据更新于 ' + UI.dateStr() + ' · 纸质材料为准</p></div>' +
      '<div class="grid g4 mt16">' +
        UI.statCard({ tone: 'a', label: '已签到', value: st.total, unit: '人', foot: '累计签到记录', icon: 'check' }) +
        UI.statCard({ tone: 'c', label: '已完成任务', value: st.done, unit: '人', foot: '任务完成人数', icon: 'spark' }) +
        UI.statCard({ tone: 'b', label: '完成率', value: st.rate, unit: '%', foot: '完成 / 签到', icon: 'screen', bar: st.rate }) +
        UI.statCard({ tone: 'd', label: '参与班级', value: st.classes, unit: '个', foot: '签到覆盖班级', icon: 'board' }) +
      '</div>' +
      '<div class="grid g-2-1 mt16">' +
        '<section class="card chart-box"><div class="chart-title">班级签到与完成情况 <small>BY CLASS</small></div>' +
          '<div class="bars">' + (classes.length ? classes.map(function (c) {
            var v = st.byClass[c];
            return '<div class="bar-row"><span>' + E(c) + '</span><div class="bg"><div class="bf" data-bar="' + Math.round(v.total / maxC * 100) + '"></div></div>' +
              '<span class="bn">' + v.done + '/' + v.total + '</span></div>';
          }).join('') : '<div class="empty">暂无签到数据</div>') + '</div>' +
          '<div class="mt20 mini-head">任务项分布</div>' +
          '<div class="bars">' + (tasks.length ? tasks.map(function (t) {
            var mx = Math.max.apply(null, tasks.map(function (k) { return st.byTask[k]; }).concat([1]));
            return '<div class="bar-row"><span title="' + E(t) + '">' + E(t.length > 6 ? t.slice(0, 6) + '…' : t) + '</span>' +
              '<div class="bg"><div class="bf" data-bar="' + Math.round(st.byTask[t] / mx * 100) + '" style="background:linear-gradient(90deg,#8b5cf6,#ec4899)"></div></div>' +
              '<span class="bn">' + st.byTask[t] + '</span></div>';
          }).join('') : '<div class="empty">暂无任务数据</div>') + '</div>' +
        '</section>' +
        '<section class="card chart-box"><div class="chart-title">任务完成率 <small>COMPLETION</small></div>' +
          '<div class="donut-wrap"><div class="donut">' +
            '<svg viewBox="0 0 140 140"><defs><linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs>' +
            '<circle class="track" cx="70" cy="70" r="60"/><circle class="val" cx="70" cy="70" r="60" stroke-dasharray="' + circ + '" stroke-dashoffset="' + off + '"/></svg>' +
            '<div class="donut-center"><b>' + st.rate + '%</b><span>已完成</span></div></div>' +
            '<div class="legend"><div><i style="background:#34d399"></i>已完成 ' + st.done + ' 人</div>' +
            '<div><i style="background:#8b5cf6"></i>签到 ' + st.total + ' 人</div>' +
            '<div><i style="background:#fbbf24"></i>未完成 ' + (st.total - st.done) + ' 人</div></div></div>' +
          '<div class="divider"></div>' +
          '<div class="mini-head">最近签到</div><div class="live-list">' +
            (s.students.length ? s.students.slice(0, 8).map(function (x) {
              return '<div class="live-item"><div class="avatar">' + E(x.name.slice(0, 1)) + '</div>' +
                '<div class="who"><b>' + E(x.name) + '</b><span>' + E(x.sid) + ' · ' + E(x.className) + '</span></div>' +
                '<time>' + UI.nowStr(x.time) + '</time></div>';
            }).join('') : '<div class="empty">等待学生签到</div>') + '</div>' +
        '</section>' +
      '</div>';
    },
    init: function (root) {
      $('#dashExport').addEventListener('click', UI.exportStudents);
      $('#dashFull').addEventListener('click', function () {
        var el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen(); else UI.toast('当前浏览器不支持全屏', 'warn');
      });
    }
  };

  /* =====================================================
     3. 学生签到登记
     ===================================================== */
  PAGES.checkin = {
    title: '学生签到登记',
    render: function () {
      var s = Store.state;
      return UI.pageHead({
        eyebrow: 'CHECK-IN · STUDENT REGISTRATION',
        title: '学生签到与任务登记',
        desc: '采集姓名、学号、班级、签到时间与任务完成情况。支持扫码自助填写或现场代录，数据实时汇入大屏。',
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
            '<div class="field"><label>完成任务项</label><input class="input" name="task" placeholder="如：完成数据看板搭建 / Python数据分析项目"></div>' +
            '<div class="field"><label>任务完成情况</label><div class="seg" id="ckSeg">' +
              '<button type="button" data-v="0" class="on">未完成</button><button type="button" data-v="1">已完成</button></div></div>' +
            '<button class="btn primary block" type="submit">' + ic('check') + '提交签到</button>' +
          '</form>' +
        '</section>' +
        '<section class="card card-pad"><div class="mini-head">签到记录（' + s.students.length + ' 条）</div>' +
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
    if (!list.length) return '<tr><td colspan="7"><div class="empty">' + ic('check') + '暂无签到记录，请在左侧提交第一条</div></td></tr>';
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
    el.innerHTML = '<svg viewBox="-1 -1 23 23" style="fill:#0b1129;stroke:none">' + cells + '</svg>';
  }

  /* 后续模块在下一节追加 */
  global.__PAGES = PAGES;
  global.__go = go;
  global.__NAV = NAV;

  /* ---------------- 启动 ---------------- */
  function boot() {
    bindGlobal();
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
    go: go, esc: E, icon: ic
  };
})(window);
