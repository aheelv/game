/* ============================================================
   modules.js — 扩展功能模块（登记表/OCR/加分/照片/成果/看板/应急/巡视）
   ============================================================ */
(function (global) {
  'use strict';
  var E = App.esc, $ = UI.$, $$ = UI.$$, ic = UI.icon, reg = App.register;
  var COLS = ['姓名', '学号', '班级', '辅导员姓名', '小游戏作品名称', '第二课堂加分', '操作留痕'];

  /* =====================================================
     4. 登记表生成打印
     ===================================================== */
  reg('registry', '登记表生成打印', {
    render: function () {
      return UI.pageHead({
        eyebrow: 'PRINTABLE FORM · OFFICIAL RECORD',
        title: '学生作品提交 <em>登记表</em>',
        desc: '按实验室开放日模板栏目生成正式纸质登记表。栏目完整覆盖姓名、学号、班级、辅导员姓名、小游戏作品名称、第二课堂加分与操作留痕，便于现场填写与后续统一录入。A4 横版打印。',
        actions: '<button class="btn primary" id="rgPrint">' + ic('print') + '打印表格</button>' +
                 '<button class="btn" id="rgExport">' + ic('download') + '导出CSV模板</button>'
      }) +
      '<div class="card card-pad"><div class="grid g4" style="align-items:end">' +
        '<div class="field" style="margin:0"><label>打印行数</label><input class="input" id="rgRows" type="number" min="20" max="500" value="200"></div>' +
        '<div class="field" style="margin:0"><label>表格标题</label><input class="input" id="rgTitle" value="管理学院章鱼大数据实验室 作品提交登记表"></div>' +
        '<div class="field" style="margin:0"><label>每页行数（A4横版）</label><input class="input" id="rgPer" type="number" min="8" max="30" value="18"></div>' +
        '<div class="field" style="margin:0"><label>加分说明</label><input class="input" id="rgNote" value="第二课堂加分由学院统一认定"></div>' +
      '</div><div class="notice mt16">' + ic('info') + '<div>打印前请与实验室开放日模板栏目逐项核对；本表为正式上报材料，现场大屏数据须与纸质填写保持一致。完成任意项目任务可加第二课堂 1 学时。</div></div></div>' +
      '<div class="card mt16" style="padding:18px"><div id="rgPreview"></div></div>';
    },
    init: function () {
      function build() {
        var n = Math.max(20, Math.min(500, +$('#rgRows').value || 200));
        var per = Math.max(8, Math.min(30, +$('#rgPer').value || 18));
        var title = E($('#rgTitle').value || '学生任务完成登记表');
        var note = E($('#rgNote').value || '');
        var html = '<div class="screen-only" style="text-align:center;margin-bottom:12px"><b style="font-size:15px">' + title + '</b>' +
          '<div class="hint">共 ' + n + ' 行 · 预计 ' + Math.ceil(n / per) + ' 页 · 每页 ' + per + ' 行</div></div>';
        html += '<table class="print-table"><thead><tr><th style="width:42px">序号</th>' +
          COLS.map(function (c) { return '<th>' + E(c) + '</th>'; }).join('') + '<th style="width:80px">学生签字</th></tr></thead><tbody>';
        for (var i = 1; i <= n; i++) {
          html += '<tr><td class="mono" style="text-align:center">' + i + '</td>' +
            '<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>';
        }
        html += '</tbody></table>';
        html += '<div class="screen-only hint" style="margin-top:10px">备注：' + note + '　|　填写要求：一人一行，任务项写明具体内容，操作留痕记录系统录入情况。</div>';
        $('#rgPreview').innerHTML = html;
      }
      ['rgRows', 'rgPer', 'rgTitle', 'rgNote'].forEach(function (id) { $('#' + id).addEventListener('input', build); });
      build();
      $('#rgPrint').addEventListener('click', function () { UI.toast('正在打开打印窗口，请选择 A4 横向', 'info'); setTimeout(function () { global.print(); }, 250); });
      $('#rgExport').addEventListener('click', function () {
        var rows = []; for (var i = 1; i <= 200; i++) rows.push([i, '', '', '', '', '', '', '', '']);
        UI.download('学生任务完成登记表模板.csv', UI.toCSV(['序号'].concat(COLS).concat(['学生签字']), rows), 'text/csv;charset=utf-8');
      });
    }
  });

  /* =====================================================
     5. 纸质表识别录入（OCR 辅助）
     ===================================================== */
  reg('ocr', '纸质表识别录入', {
    render: function () {
      return UI.pageHead({
        eyebrow: 'OCR ASSIST · DATA CAPTURE',
        title: '纸质登记表 <em>识别录入</em>',
        desc: '上传纸质表照片作为留档，并将识别/整理后的学生信息批量录入。可粘贴从 AI 识别工具得到的文本，自动按行解析姓名、学号、班级、辅导员姓名、任务项。',
        actions: '<button class="btn" id="ocClear">' + ic('trash') + '清空输入</button>'
      }) +
      '<div class="grid g2">' +
        '<section class="card card-pad"><div class="mini-head">01 · 上传纸质表照片</div>' +
          '<label class="btn block" style="cursor:pointer">' + ic('upload') + '选择照片（可多选）' +
          '<input type="file" id="ocFile" accept="image/*" multiple style="display:none"></label>' +
          '<div class="photo-grid mt16" id="ocThumbs"><div class="empty">尚未上传照片</div></div>' +
          '<div class="notice warn mt16">' + ic('alert') + '<div>照片仅在本机预览，不上传服务器。识别建议：使用 AI 图片识别工具提取表格文字，再粘贴到右侧文本框批量导入。</div></div>' +
        '</section>' +
        '<section class="card card-pad"><div class="mini-head">02 · 粘贴识别文本并解析</div>' +
          '<div class="hint" style="margin-bottom:8px">每行一名学生，字段用逗号 / 制表符 / 空格分隔：<br>姓名,学号,班级,辅导员姓名,任务项,是否完成(1/0)<br>兼容旧格式：姓名,学号,班级,任务项,是否完成(1/0)</div>' +
          '<textarea class="input" id="ocText" style="min-height:180px" placeholder="张三,20260001,工商管理2201班,李老师,AI生成的小游戏作品,1"></textarea>' +
          '<div class="field-row mt16"><div class="field"><label>默认任务项（可选）</label><input class="input" id="ocTask" placeholder="未填写时使用"></div>' +
          '<div class="field"><label>完成状态</label><select class="input" id="ocDone"><option value="1">按文本中的标记</option><option value="0">全部未完成</option></select></div></div>' +
          '<button class="btn primary block" id="ocParse">' + ic('spark') + '解析并预览</button>' +
          '<div id="ocPreview" class="mt16"></div>' +
          '<button class="btn block mt16" id="ocImport" style="display:none">' + ic('check') + '确认导入签到记录</button>' +
        '</section>' +
      '</div>';
    },
    init: function () {
      var files = [];
      $('#ocFile').addEventListener('change', function (e) {
        files = Array.prototype.slice.call(e.target.files || []);
        $('#ocThumbs').innerHTML = files.length ? files.map(function (f) {
          var url = URL.createObjectURL(f);
          return '<div class="photo-item"><div class="photo-thumb"><img src="' + url + '" alt="' + E(f.name) + '"></div>' +
            '<div class="photo-meta"><b>' + E(f.name) + '</b><span>' + (f.size / 1024).toFixed(0) + ' KB</span></div></div>';
        }).join('') : '<div class="empty">尚未上传照片</div>';
        if (files.length) UI.toast('已载入 ' + files.length + ' 张照片（仅本地预览）', 'ok');
      });
      var parsed = [];
      $('#ocParse').addEventListener('click', function () {
        var text = $('#ocText').value.trim();
        if (!text) { UI.toast('请先粘贴识别文本', 'err'); return; }
        var defTask = $('#ocTask').value.trim(), mode = $('#ocDone').value;
        parsed = [];
        text.split(/\r?\n/).forEach(function (line) {
          line = line.trim(); if (!line) return;
          var p = line.split(/[,，\t]+|\s{2,}/).map(function (x) { return x.trim(); }).filter(Boolean);
          if (p.length < 4) return;
          var isNew = p.length >= 6;
          var counselor = isNew ? (p[3] || '') : '';
          var task = (isNew ? p[4] : p[3]) || defTask;
          var flag = isNew ? p[5] : p[4];
          var done = mode === '0' ? false : (/^(1|是|已完成|完成|Y|y|true)$/i.test(flag || ''));
          parsed.push({ name: p[0], sid: p[1], className: p[2] || '未填班级', counselor: counselor, task: task, completed: done });
        });
        if (!parsed.length) { UI.toast('未解析出有效记录，请检查分隔格式', 'err'); return; }
        $('#ocPreview').innerHTML = '<div class="table-wrap"><table><thead><tr><th>姓名</th><th>学号</th><th>班级</th><th>辅导员姓名</th><th>任务项</th><th>完成</th></tr></thead><tbody>' +
          parsed.map(function (p) { return '<tr><td>' + E(p.name) + '</td><td class="mono">' + E(p.sid) + '</td><td>' + E(p.className) + '</td><td>' + E(p.counselor || '—') + '</td><td>' + E(p.task || '—') + '</td><td>' + (p.completed ? '<span class="tag ok">是</span>' : '<span class="tag warn">否</span>') + '</td></tr>'; }).join('') +
          '</tbody></table></div><div class="hint mt8">共解析 ' + parsed.length + ' 条</div>';
        $('#ocImport').style.display = 'block';
      });
      $('#ocImport').addEventListener('click', function () {
        parsed.forEach(function (p) { Store.addStudent(p); });
        UI.toast('已导入 ' + parsed.length + ' 条签到记录', 'ok');
        parsed = []; $('#ocImport').style.display = 'none'; $('#ocPreview').innerHTML = ''; $('#ocText').value = '';
      });
      $('#ocClear').addEventListener('click', function () { $('#ocText').value = ''; $('#ocPreview').innerHTML = ''; $('#ocImport').style.display = 'none'; files = []; $('#ocThumbs').innerHTML = '<div class="empty">尚未上传照片</div>'; });
    }
  });

  /* =====================================================
     6. 第二课堂加分
     ===================================================== */
  reg('scores', '第二课堂加分', {
    render: function () {
      var list = Store.state.scores;
      var total = list.reduce(function (a, b) { return a + (+b.score || 0); }, 0);
      return UI.pageHead({
        eyebrow: 'CREDIT MANAGEMENT · SECOND CLASSROOM',
        title: '第二课堂 <em>加分汇总</em>',
        desc: '登记每位完成任务学生的加分，保留操作留痕，便于统一上报。可从签到记录一键同步已完成任务的学生。',
        actions: '<button class="btn" id="scExport">' + ic('download') + '导出加分表</button>'
      }) +
      '<div class="grid g3">' +
        UI.statCard({ tone: 'a', label: '加分记录', value: list.length, unit: '条', foot: '已登记学生', icon: 'plus' }) +
        UI.statCard({ tone: 'c', label: '加分合计', value: total, unit: '分', foot: '累计第二课堂加分', icon: 'spark' }) +
        UI.statCard({ tone: 'b', label: '待同步', value: Math.max(0, Store.state.students.filter(function (s) { return s.completed; }).length - list.length), unit: '人', foot: '已完成任务未登记加分', icon: 'info' }) +
      '</div>' +
      '<div class="grid g-1-2 mt16">' +
        '<section class="card card-pad"><div class="mini-head">新增 / 同步加分</div>' +
          '<form id="scForm">' +
          '<div class="field-row"><div class="field"><label>姓名</label><input class="input" name="name" required></div>' +
          '<div class="field"><label>学号</label><input class="input" name="sid" required></div></div>' +
          '<div class="field"><label>班级</label><input class="input" name="className"></div>' +
          '<div class="field"><label>辅导员姓名</label><input class="input" name="counselor"></div>' +
          '<div class="field"><label>完成任务项</label><input class="input" name="task"></div>' +
          '<div class="field-row"><div class="field"><label>加分分值</label><input class="input" name="score" type="number" step="0.5" value="2"></div>' +
          '<div class="field"><label>操作留痕</label><input class="input" name="trace" placeholder="如：现场登记 / 会后补录"></div></div>' +
          '<button class="btn primary block" type="submit">' + ic('plus') + '登记加分</button></form>' +
          '<div class="divider"></div>' +
          '<div class="mini-head">从签到记录同步</div>' +
          '<div class="field"><label>同步加分分值</label><input class="input" id="scRule" type="number" step="0.5" value="2"></div>' +
          '<button class="btn block" id="scSync">' + ic('spark') + '同步已完成任务学生</button>' +
        '</section>' +
        '<section class="card card-pad"><div class="mini-head">加分记录（' + list.length + ' 条）</div>' +
          '<div class="table-wrap"><table><thead><tr><th>姓名</th><th>学号</th><th>班级</th><th>辅导员姓名</th><th>任务项</th><th>加分</th><th>操作留痕</th><th></th></tr></thead><tbody id="scBody">' + scRows() + '</tbody></table></div>' +
        '</section>' +
      '</div>';
    },
    init: function () {
      $('#scForm').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target.elements;
        var rec = { name: f.name.value.trim(), sid: f.sid.value.trim(), className: f.className.value.trim(), counselor: f.counselor.value.trim(), task: f.task.value.trim(), score: +f.score.value || 0, trace: f.trace.value.trim(), time: new Date().toISOString() };
        Store.upsertScore(rec); UI.toast('已登记：' + rec.name, 'ok'); go('scores');
      });
      $('#scSync').addEventListener('click', function () {
        var n = Store.syncScoresFromStudents(+$('#scRule').value || 2);
        UI.toast(n ? '已同步 ' + n + ' 条加分记录' : '没有需要同步的新记录', n ? 'ok' : 'info'); go('scores');
      });
      $('#scExport').addEventListener('click', UI.exportScores);
      $$('[data-sc-del]').forEach(function (b) { b.addEventListener('click', function () { Store.removeScore(b.getAttribute('data-sc-del')); UI.toast('已删除加分记录', 'info'); go('scores'); }); });
    }
  });
  function scRows() {
    var l = Store.state.scores;
    if (!l.length) return '<tr><td colspan="8"><div class="empty">' + ic('plus') + '暂无加分记录</div></td></tr>';
    return l.map(function (s) {
      return '<tr><td><b style="color:var(--txt)">' + E(s.name) + '</b></td><td class="mono">' + E(s.sid) + '</td><td>' + E(s.className || '—') + '</td>' +
        '<td>' + E(s.counselor || '—') + '</td><td>' + E(s.task || '—') + '</td><td><span class="tag ok">' + E(s.score) + ' 分</span></td><td>' + E(s.trace || '—') + '</td>' +
        '<td><button class="btn sm danger" data-sc-del="' + E(s.sid) + '">' + ic('trash') + '</button></td></tr>';
    }).join('');
  }

  /* =====================================================
     7. 佐证照片核查
     ===================================================== */
  reg('photos', '佐证照片核查', {
    render: function () {
      var students = Store.state.students, photos = Store.state.photos;
      var have = {}; photos.forEach(function (p) { have[p.sid] = 1; });
      var missing = students.filter(function (s) { return !have[s.sid]; });
      return UI.pageHead({
        eyebrow: 'EVIDENCE PHOTOS · AUDIT',
        title: '佐证照片 <em>批量核查</em>',
        desc: '照片命名规范：学号+姓名；内容需拍到本人与电脑项目界面。上传后按规范重命名，并与签到名单自动比对，列出缺失照片的学生。',
        actions: '<button class="btn" id="phRule">' + ic('info') + '命名规范说明</button>'
      }) +
      '<div class="grid g3">' +
        UI.statCard({ tone: 'a', label: '已收照片', value: photos.length, unit: '张', foot: '按一人一张统计', icon: 'camera' }) +
        UI.statCard({ tone: 'c', label: '签到学生', value: students.length, unit: '人', foot: '应提交照片人数', icon: 'check' }) +
        UI.statCard({ tone: 'd', label: '缺失照片', value: missing.length, unit: '人', foot: '需现场补拍', icon: 'alert' }) +
      '</div>' +
      '<div class="grid g-1-2 mt16">' +
        '<section class="card card-pad"><div class="mini-head">上传并规范化命名</div>' +
          '<label class="btn block">' + ic('upload') + '选择照片（可多选）' +
          '<input type="file" id="phFile" accept="image/*" multiple style="display:none"></label>' +
          '<div class="field mt16"><label>命名规则</label><div class="seg" id="phSeg">' +
          '<button class="on" data-v="sidname">学号+姓名</button><button data-v="keep">保留原文件名</button></div></div>' +
          '<div class="hint">若文件名以学号开头（如 20260001_张三.jpg），将自动匹配签到名单补全姓名。</div>' +
          '<div class="notice mt16">' + ic('spark') + '<div>上传后在右侧照片墙查看缩略图，可人工核验是否同时拍到<b>本人</b>与<b>电脑项目界面</b>。</div></div>' +
        '</section>' +
        '<section class="card card-pad"><div class="mini-head">照片墙（' + photos.length + '）</div>' +
          '<div class="photo-grid" id="phWall">' + (photos.length ? photos.map(function (p, i) {
            return '<div class="photo-item"><div class="photo-thumb">' + (p.url ? '<img src="' + p.url + '" alt="">' : ic('camera')) + '</div>' +
              '<div class="photo-meta"><b>' + E(p.name) + '</b><span class="mono">' + E(p.sid || '未匹配') + '</span>' +
              '<button class="btn sm danger mt8" data-ph-del="' + i + '">移除</button></div></div>';
          }).join('') : '<div class="empty">尚未上传照片</div>') + '</div>' +
        '</section>' +
      '</div>' +
      '<section class="card card-pad mt16"><div class="mini-head">缺失照片名单（' + missing.length + ' 人）</div>' +
        (missing.length ? '<div style="display:flex;flex-wrap:wrap;gap:8px">' + missing.map(function (s) {
          return '<span class="tag warn">' + E(s.name) + ' · ' + E(s.sid) + (s.counselor ? ' · ' + E(s.counselor) : '') + '</span>';
        }).join('') + '</div>' : '<div class="empty">' + ic('check') + '所有签到学生均已提交照片</div>') + '</section>';
    },
    init: function () {
      var mode = 'sidname';
      $$('#phSeg button').forEach(function (b) { b.addEventListener('click', function () { $$('#phSeg button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); mode = b.getAttribute('data-v'); }); });
      $('#phFile').addEventListener('change', function (e) {
        var fs = Array.prototype.slice.call(e.target.files || []), list = Store.state.photos.slice();
        fs.forEach(function (f) {
          var base = f.name.replace(/\.[^.]+$/, '');
          var sid = (base.match(/\d{6,}/) || [''])[0];
          var found = Store.state.students.filter(function (s) { return s.sid === sid; })[0];
          var nm = found ? found.name : base.replace(/^\d+[_-]?/, '');
          var newName = mode === 'sidname' && found ? (found.sid + '+' + found.name) : base;
          list.push({ sid: found ? found.sid : sid, name: newName, url: URL.createObjectURL(f), time: new Date().toISOString() });
        });
        Store.setPhotos(list); UI.toast('已添加 ' + fs.length + ' 张照片', 'ok'); go('photos');
      });
      $$('[data-ph-del]').forEach(function (b) { b.addEventListener('click', function () { var l = Store.state.photos.slice(); l.splice(+b.getAttribute('data-ph-del'), 1); Store.setPhotos(l); go('photos'); }); });
      $('#phRule').addEventListener('click', function () { UI.toast('规范：学号+姓名.jpg，照片需包含本人与电脑项目界面', 'info'); });
    }
  });

  /* =====================================================
     8. 学生成果归档
     ===================================================== */
  reg('archive', '学生成果归档', {
    render: function () {
      var list = Store.state.archives;
      return UI.pageHead({
        eyebrow: 'PROJECT ARCHIVE · EVIDENCE',
        title: '学生成果 <em>材料归档</em>',
        desc: '按学号归档学生完成的项目材料与导出文件，作为第二课堂积分佐证。支持登记成果标题、类型、存放链接/路径与说明，并可在巡视展示中轮播。',
        actions: '<button class="btn" id="arExport">' + ic('download') + '导出成果清单</button>'
      }) +
      '<div class="grid g-1-2">' +
        '<section class="card card-pad"><div class="mini-head">登记成果材料</div>' +
          '<form id="arForm">' +
          '<div class="field-row"><div class="field"><label>姓名</label><input class="input" name="name" required></div>' +
          '<div class="field"><label>学号</label><input class="input" name="sid" required></div></div>' +
          '<div class="field"><label>成果标题</label><input class="input" name="title" required placeholder="如：基于Python的校园数据可视化看板"></div>' +
          '<div class="field"><label>材料类型</label><select class="input" name="type"><option>项目源文件</option><option>数据看板</option><option>报告文档</option><option>演示视频</option><option>其他</option></select></div>' +
          '<div class="field"><label>存放链接 / 路径</label><input class="input" name="link" placeholder="网盘链接或本地路径"></div>' +
          '<div class="field"><label>说明</label><textarea class="input" name="desc" placeholder="完成内容、技术要点等"></textarea></div>' +
          '<button class="btn primary block" type="submit">' + ic('plus') + '归档成果</button></form>' +
        '</section>' +
        '<section class="card card-pad"><div class="mini-head">成果列表（' + list.length + '）</div>' +
          (list.length ? '<div class="grid g2">' + list.map(function (a, i) {
            return '<article class="card" style="padding:14px"><b style="font-size:13.5px">' + E(a.title) + '</b>' +
              '<div class="hint mt8">' + E(a.name) + ' · <span class="mono">' + E(a.sid) + '</span></div>' +
              '<div class="mt8"><span class="tag info">' + E(a.type) + '</span></div>' +
              '<p class="hint mt8" style="min-height:34px">' + E(a.desc || '—') + '</p>' +
              (a.link ? '<a class="hint" href="' + E(a.link) + '" target="_blank" rel="noopener">查看材料 ↗</a>' : '') +
              '<div class="mt8"><button class="btn sm danger" data-ar-del="' + i + '">' + ic('trash') + '删除</button></div></article>';
          }).join('') + '</div>' : '<div class="empty">' + ic('box') + '暂无归档成果</div>') +
        '</section>' +
      '</div>';
    },
    init: function () {
      $('#arForm').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target.elements;
        Store.addArchive({ id: 'a' + Date.now(), name: f.name.value.trim(), sid: f.sid.value.trim(), title: f.title.value.trim(), type: f.type.value, link: f.link.value.trim(), desc: f.desc.value.trim(), time: new Date().toISOString() });
        UI.toast('成果已归档', 'ok'); go('archive');
      });
      $$('[data-ar-del]').forEach(function (b) { b.addEventListener('click', function () { var l = Store.state.archives.slice(); l.splice(+b.getAttribute('data-ar-del'), 1); Store.state.archives = l; Store.commit(function (s) { s.archives = l; }); go('archive'); }); });
      $('#arExport').addEventListener('click', function () {
        var rows = Store.state.archives.map(function (a) { return [a.name, a.sid, a.title, a.type, a.link, a.desc]; });
        UI.download('学生成果归档清单.csv', UI.toCSV(['姓名', '学号', '成果标题', '类型', '链接/路径', '说明'], rows), 'text/csv;charset=utf-8');
      });
    }
  });

  /* =====================================================
     9. 任务分工看板
     ===================================================== */
  reg('kanban', '任务分工看板', {
    render: function () {
      var t = Store.state.tasks;
      var groups = [['todo', '待办'], ['doing', '进行中'], ['done', '已完成']];
      var q = ['会前对接', '表格制作', '现场执行', '应急预案', '领导巡视'];
      return UI.pageHead({
        eyebrow: 'TASK BOARD · COORDINATION',
        title: '任务分工 <em>看板</em>',
        desc: '把活动清单拆成可执行任务，明确负责人与状态。会前逐项核对，确保模板、分工、归档口径与工具调试全部落实。',
        actions: '<button class="btn primary" id="kbAdd">' + ic('plus') + '新增任务</button>'
      }) +
      '<div class="card card-pad" id="kbAddBox" style="display:none">' +
        '<div class="field-row"><div class="field"><label>任务标题</label><input class="input" id="kbTitle" placeholder="输入任务内容"></div>' +
        '<div class="field"><label>阶段</label><select class="input" id="kbGroup">' + q.map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="field"><label>负责人</label><input class="input" id="kbOwner" placeholder="如：负责人 / 讲解员 / 技术组"></div>' +
        '<button class="btn primary" id="kbSave">' + ic('check') + '保存任务</button></div>' +
      '<div class="grid g3 mt16">' + groups.map(function (g) {
        var items = t.filter(function (x) { return x.status === g[0]; });
        return '<div class="kb-col"><h4>' + g[1] + ' <span class="tag">' + items.length + '</span></h4>' +
          items.map(function (x) {
            return '<div class="kb-card"><b>' + E(x.title) + '</b><p>' + E(x.note || '') + '</p>' +
              '<div class="kb-meta"><span class="tag pp">' + E(x.group) + '</span><span>' + E(x.owner) + '</span></div>' +
              '<div class="kb-actions">' +
                (g[0] !== 'todo' ? '<button class="btn sm ghost" data-move="' + x.id + '" data-to="' + (g[0] === 'done' ? 'doing' : 'todo') + '">← 退回</button>' : '') +
                (g[0] !== 'done' ? '<button class="btn sm" data-move="' + x.id + '" data-to="' + (g[0] === 'todo' ? 'doing' : 'done') + '">推进 →</button>' : '') +
                '<button class="btn sm danger" data-kb-del="' + x.id + '">' + ic('trash') + '</button>' +
              '</div></div>';
          }).join('') + (items.length ? '' : '<div class="empty">暂无任务</div>') + '</div>';
      }).join('') + '</div>';
    },
    init: function () {
      $('#kbAdd').addEventListener('click', function () { var b = $('#kbAddBox'); b.style.display = b.style.display === 'none' ? 'block' : 'none'; });
      $('#kbSave').addEventListener('click', function () {
        var title = $('#kbTitle').value.trim(); if (!title) { UI.toast('请填写任务标题', 'err'); return; }
        Store.addTask({ title: title, group: $('#kbGroup').value, owner: $('#kbOwner').value.trim() || '负责人' });
        UI.toast('任务已新增', 'ok'); go('kanban');
      });
      $$('[data-move]').forEach(function (b) { b.addEventListener('click', function () { Store.setTaskStatus(b.getAttribute('data-move'), b.getAttribute('data-to')); go('kanban'); }); });
      $$('[data-kb-del]').forEach(function (b) { b.addEventListener('click', function () { Store.removeTask(b.getAttribute('data-kb-del')); go('kanban'); }); });
    }
  });

  /* =====================================================
     10. 应急预案
     ===================================================== */
  reg('emergency', '应急预案', {
    render: function () {
      var plans = [
        { t: '人少 · 空场风险', icon: 'info', tone: '', steps: ['提前安排一批固定学生全程在场进行AI创作', '确保任意时段都有学生真实操作、屏幕有作品', '大屏同步展示到场与作品提交可视化数据'] },
        { t: '人多 · 座位不足', icon: 'board', tone: 'warn', steps: ['从相邻教室搬椅子到至学楼D103', '先让大家坐着听讲解，避免拥挤', '上一波做完电脑空出，下一波接着上，分批轮换'] },
        { t: '工具故障', icon: 'alert', tone: 'warn', steps: ['工具调试失败或现场卡顿，立即停用网页工具', '完全依靠纸质登记表完成到场与作品登记', '大屏停止展示，不影响第二课堂材料与佐证收集'] }
      ];
      var paper = Store.state.settings.paperMode;
      return UI.pageHead({
        eyebrow: 'CONTINGENCY PLAN · ON-SITE',
        title: '现场 <em>应急预案</em>',
        desc: '三种典型场景的快速处置卡。任何情况下，纸质登记表都是正式材料与最终兜底手段。',
        actions: '<button class="btn ' + (paper ? '' : 'primary') + '" id="emPaper">' + ic('sheet') + (paper ? '退出纸质模式' : '一键切换纸质应急模式') + '</button>'
      }) +
      '<div class="grid g3 stagger">' + plans.map(function (p) {
        return '<article class="card card-pad"><div class="stat-icon" style="margin-bottom:14px">' + ic(p.icon) + '</div>' +
          '<h3 style="margin:0 0 14px;font-size:17px">' + E(p.t) + '</h3>' +
          '<div class="timeline">' + p.steps.map(function (s, i) {
            return '<div class="tl-item ' + (i === 0 ? 'done' : '') + '"><p style="color:var(--txt-2);font-size:12.5px">' + E((i + 1) + '. ' + s) + '</p></div>';
          }).join('') + '</div></article>';
      }).join('') + '</div>' +
      '<section class="card card-pad mt16"><div class="mini-head">现场联络与物资清单</div>' +
        '<dl class="kv"><dt>场地</dt><dd>至学楼D103 · 管理学院章鱼大数据实验室</dd>' +
        '<dt>固定学生</dt><dd>提前协调安排，保证全程在场创作</dd>' +
        '<dt>搬运支援</dt><dd>相邻教室 → D103 椅子</dd>' +
        '<dt>引导讲解</dt><dd>先集中讲解，再分批上机</dd>' +
        '<dt>兜底材料</dt><dd>纸质登记表（约200行）足够备用</dd>' +
        '<dt>氛围</dt><dd>轻音乐低音量，巡视前提前调好</dd></dl></section>';
    },
    init: function () {
      $('#emPaper').addEventListener('click', function () { $('#btnPaper').click(); go('emergency'); });
    }
  });

  /* =====================================================
     11. 领导巡视展示
     ===================================================== */
  reg('leader', '领导巡视展示', {
    render: function () {
      var d = App.currentStats(), s = Store.state;
      var st = { total: d.total, done: d.done, rate: d.rate, byClass: d.byClass };
      var arc = s.archives;
      return UI.pageHead({
        eyebrow: 'LEADERSHIP TOUR · SHOWCASE MODE',
        title: '领导巡视 <em>展示模式</em>',
        desc: '巡视专用：左侧实时可视化到场与作品提交数据，右侧轮播学生AI小游戏作品与佐证照片。地点 至学楼D103，确保现场学生真实创作、屏幕有作品、氛围到位。',
        actions: '<button class="btn primary" id="ldFull">' + ic('screen') + '全屏展示</button>' +
                 '<button class="btn" id="ldMusic">' + ic('music') + '氛围音乐</button>' +
                 '<button class="btn" id="ldRotate">' + ic('spark') + '开始轮播</button>'
      }) +
      '<div class="dash-hero"><h2>管理学院章鱼大数据实验室 · AI游戏奇遇记：零代码创作实战</h2>' +
        '<p>地点 至学楼D103 · ' + UI.dateStr() + ' · 学生AI创作进行中 · 大屏数据与纸质登记一致</p></div>' +
      '<div class="grid g4 mt16">' +
        UI.statCard({ tone: 'a', label: '现场到场', value: st.total, unit: '人', foot: '实时统计', icon: 'check' }) +
        UI.statCard({ tone: 'c', label: '作品提交', value: st.done, unit: '人', foot: '提交率 ' + st.rate + '%', icon: 'spark', bar: st.rate }) +
        UI.statCard({ tone: 'b', label: '成果归档', value: arc.length, unit: '份', foot: '项目材料佐证', icon: 'box' }) +
        UI.statCard({ tone: 'd', label: '佐证照片', value: s.photos.length, unit: '张', foot: '一人一张', icon: 'camera' }) +
      '</div>' +
      '<div class="grid g2 mt16">' +
        '<section class="card chart-box"><div class="chart-title">班级作品提交进度 <small>REAL-TIME</small></div>' +
          '<div class="bars">' + (Object.keys(st.byClass).length ? Object.keys(st.byClass).map(function (c) {
            var v = st.byClass[c]; return '<div class="bar-row"><span>' + E(c) + '</span><div class="bg"><div class="bf" data-bar="' + (v.total ? Math.round(v.done / v.total * 100) : 0) + '"></div></div><span class="bn">' + v.done + '/' + v.total + '</span></div>';
          }).join('') : '<div class="empty">等待到场数据</div>') + '</div>' +
          '<div class="divider"></div><div class="mini-head">最近提交动态</div><div class="live-list">' +
            (s.students.length ? s.students.slice(0, 6).map(function (x) {
              return '<div class="live-item"><div class="avatar">' + E(x.name.slice(0, 1)) + '</div><div class="who"><b>' + E(x.name) + '</b><span>' + E(x.className) + ' · ' + E(x.counselor || '未填辅导员') + ' · ' + E(x.task || '项目中') + '</span></div><time>' + UI.nowStr(x.time) + '</time></div>';
            }).join('') : '<div class="empty">暂无动态</div>') + '</div>' +
        '</section>' +
        '<section class="card chart-box"><div class="chart-title">学生成果与佐证照片 <small id="ldSlideInfo">0 / ' + arc.length + '</small></div>' +
          '<div id="ldStage" style="min-height:330px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(0,230,210,.06),rgba(124,77,255,.06));border:1px solid var(--line);border-radius:12px;padding:20px;text-align:center">' +
            ldSlide(0) + '</div>' +
          '<div style="display:flex;gap:8px;justify-content:center;margin-top:14px">' +
            '<button class="btn sm" id="ldPrev">← 上一项</button><button class="btn sm" id="ldNext">下一项 →</button></div>' +
        '</section>' +
      '</div>' +
      '<section class="card card-pad mt16"><div class="mini-head">巡视前检查清单</div>' +
        '<div class="grid g3">' + [['学生创作', '每人屏幕有AI小游戏作品或操作步骤，非空白桌面'], ['氛围', '轻音乐低音量，讲解与操作有序'], ['材料', '纸质登记表就位，大屏数据同步一致']].map(function (x) {
          return '<div class="notice">' + ic('check') + '<div><b>' + x[0] + '</b><br>' + x[1] + '</div></div>';
        }).join('') + '</div></section>';
    },
    init: function () {
      var arc = Store.state.archives, photos = Store.state.photos, idx = 0, timer = null;
      var slides = arc.map(function (a) { return { t: a.title, s: a.name + ' · ' + a.sid, k: '成果', d: a.desc || a.type }; })
        .concat(photos.map(function (p) { return { t: p.name, s: p.sid || '未匹配学号', k: '照片', d: '佐证照片 · 本人 + 电脑项目界面' }; }));
      function show(i) {
        idx = (i + slides.length) % slides.length;
        $('#ldStage').innerHTML = slides.length ? ldSlide(idx, slides[idx]) : ldSlide(0);
        $('#ldSlideInfo').textContent = slides.length ? (idx + 1) + ' / ' + slides.length : '0 / 0';
      }
      $('#ldPrev').addEventListener('click', function () { show(idx - 1); });
      $('#ldNext').addEventListener('click', function () { show(idx + 1); });
      $('#ldRotate').addEventListener('click', function () {
        if (timer) { clearInterval(timer); timer = null; UI.toast('轮播已停止', 'info'); }
        else { timer = setInterval(function () { show(idx + 1); }, 4500); UI.toast('成果轮播已开始', 'ok'); }
        $('#ldRotate').classList.toggle('on', !!timer);
      });
      $('#ldMusic').addEventListener('click', function () { UI.toggleMusic(); });
      $('#ldFull').addEventListener('click', function () { var el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen(); });
      global.__ldTimer = function () { if (timer) { clearInterval(timer); timer = null; } };
    }
  });
  function ldSlide(i, s) {
    if (!s) return '<div><div style="width:70px;height:70px;margin:0 auto 14px;opacity:.4">' + ic('box') + '</div><b>暂无成果与照片</b><div class="hint">请先在成果归档或照片核查模块登记</div></div>';
    return '<div class="fade-in" style="max-width:520px"><span class="tag info">' + E(s.k) + '</span>' +
      '<h2 style="margin:14px 0 8px;font-size:22px">' + E(s.t) + '</h2>' +
      '<div class="mono" style="color:var(--cyan);font-size:12px">' + E(s.s) + '</div>' +
      '<p style="color:var(--txt-2);font-size:13px;margin-top:12px">' + E(s.d) + '</p></div>';
  }

  /* 扩展模块已在 app.js 的 boot（DOMContentLoaded 后）之前完成注册 */
})(window);
