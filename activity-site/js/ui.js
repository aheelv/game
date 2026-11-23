/* ============================================================
   ui.js — 通用 UI 组件与工具函数
   ============================================================ */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function nowStr(d) {
    var x = d ? new Date(d) : new Date();
    return x.toLocaleTimeString('zh-CN', { hour12: false });
  }
  function dateStr(d) {
    var x = d ? new Date(d) : new Date();
    return x.toLocaleDateString('zh-CN') + ' ' + x.toLocaleTimeString('zh-CN', { hour12: false });
  }
  function toast(msg, type) {
    var stack = $('#toastStack'); if (!stack) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; setTimeout(function () { el.remove(); }, 300); }, 3000);
  }
  function download(name, content, mime) {
    try {
      var blob = new Blob(['\ufeff' + content], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
      toast('已导出：' + name, 'ok');
    } catch (e) { toast('导出失败：' + e.message, 'err'); }
  }
  function toCSV(header, rows) {
    function cell(v) { var s = String(v == null ? '' : v); return '"' + s.replace(/"/g, '""') + '"'; }
    return [header.map(cell).join(',')].concat(rows.map(function (r) { return r.map(cell).join(','); })).join('\r\n');
  }
  function exportStudents() {
    var rows = Store.state.students.map(function (s) {
      return [s.name, s.sid, s.className, s.task, s.completed ? '已完成' : '未完成', dateStr(s.time), s.recheck ? '是' : '否'];
    });
    download('签到与任务完成记录_' + Date.now() + '.csv', toCSV(['姓名', '学号', '班级', '完成任务项', '是否完成', '签到时间', '复核'], rows), 'text/csv;charset=utf-8');
  }
  function exportScores() {
    var rows = Store.state.scores.map(function (s) { return [s.name, s.sid, s.className, s.task, s.score, s.trace || '', s.time || '']; });
    download('第二课堂加分汇总_' + Date.now() + '.csv', toCSV(['姓名', '学号', '班级', '完成任务项', '加分', '操作留痕', '时间'], rows), 'text/csv;charset=utf-8');
  }

  function icon(name) {
    var paths = {
      home: '<path d="M3 11 12 4l9 7v9H3zM9 20v-6h6v6"/>',
      screen: '<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>',
      check: '<path d="M20 6 9 17l-5-5"/><circle cx="12" cy="12" r="9"/>',
      sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      camera: '<path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="3.5"/>',
      box: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/>',
      board: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M9 9v12M15 9v12"/>',
      alert: '<path d="M12 3 2 20h20zM12 9v5M12 17h.01"/>',
      crown: '<path d="m3 7 4 4 5-6 5 6 4-4-2 12H5z"/>',
      scan: '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M3 12h18"/>',
      download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
      upload: '<path d="M12 17V5M7 10l5-5 5 5M4 21h16"/>',
      print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 15h12v6H6z"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
      edit: '<path d="m4 20 4-1 11-11-3-3L5 16zM14 6l3 3"/>',
      music: '<path d="M9 18V5l10-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>',
      spark: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.info) + '</svg>';
  }

  function statCard(o) {
    return '<article class="card stat ' + (o.tone || '') + '">' +
      '<div class="stat-top"><span>' + esc(o.label) + '</span><span class="stat-icon">' + icon(o.icon) + '</span></div>' +
      '<div class="stat-val">' + o.value + (o.unit ? '<small>' + esc(o.unit) + '</small>' : '') + '</div>' +
      '<div class="stat-foot">' + esc(o.foot || '') + '</div>' +
      (o.bar !== undefined ? '<div class="bar-track"><div class="bar-fill" data-bar="' + o.bar + '"></div></div>' : '') +
      '</article>';
  }

  function animateBars(root) {
    setTimeout(function () {
      $$('[data-bar]', root || document).forEach(function (el) { el.style.width = Math.max(0, Math.min(100, +el.getAttribute('data-bar'))) + '%'; });
    }, 60);
  }

  function pageHead(o) {
    return '<div class="page-head fade-in"><div>' +
      '<div class="eyebrow">' + esc(o.eyebrow) + '</div>' +
      '<h1 class="page-title">' + o.title + '</h1>' +
      '<p class="page-desc">' + (o.desc || '') + '</p>' +
      '</div>' + (o.actions ? '<div class="page-actions">' + o.actions + '</div>' : '') + '</div>';
  }

  /* ---------- 轻音乐（Web Audio 生成柔和氛围音，无需外部文件） ---------- */
  var audio = { ctx: null, nodes: [], on: false, vol: 0.12 };
  function toggleMusic(force) {
    var want = force === undefined ? !audio.on : !!force;
    if (want && !audio.ctx) {
      try {
        var AC = global.AudioContext || global.webkitAudioContext;
        audio.ctx = new AC();
        var master = audio.ctx.createGain();
        master.gain.value = audio.vol;
        master.connect(audio.ctx.destination);
        var notes = [261.63, 329.63, 392.00, 523.25, 440.00, 349.23];
        notes.forEach(function (f, i) {
          var osc = audio.ctx.createOscillator();
          var g = audio.ctx.createGain();
          osc.type = i % 2 ? 'sine' : 'triangle'; osc.frequency.value = f;
          g.gain.value = 0;
          osc.connect(g); g.connect(master); osc.start();
          audio.nodes.push({ osc: osc, g: g, base: f });
        });
        audio.master = master;
        var t = 0;
        audio.timer = setInterval(function () {
          if (!audio.ctx) return;
          var now = audio.ctx.currentTime;
          var pick = audio.nodes[Math.floor(Math.random() * audio.nodes.length)];
          pick.g.gain.cancelScheduledValues(now);
          pick.g.gain.setValueAtTime(0, now);
          pick.g.gain.linearRampToValueAtTime(0.22, now + 1.6);
          pick.g.gain.linearRampToValueAtTime(0, now + 5.5);
        }, 2600);
      } catch (e) { toast('音频不可用：' + e.message, 'err'); return false; }
    }
    if (audio.ctx) {
      if (want) { audio.ctx.resume(); audio.master.gain.setTargetAtTime(audio.vol, audio.ctx.currentTime, .3); }
      else { audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, .2); }
    }
    audio.on = want;
    $('#btnMusic') && $('#btnMusic').classList.toggle('on', want);
    Store.setSetting('music', want);
    toast(want ? '轻音乐已开启（低音量氛围）' : '轻音乐已关闭', 'info');
    return want;
  }
  function setVolume(v) {
    audio.vol = v;
    if (audio.ctx && audio.master) audio.master.gain.setTargetAtTime(audio.on ? v : 0, audio.ctx.currentTime, .2);
  }

  global.UI = {
    esc: esc, $: $, $$: $$, nowStr: nowStr, dateStr: dateStr, toast: toast,
    download: download, toCSV: toCSV, exportStudents: exportStudents, exportScores: exportScores,
    icon: icon, statCard: statCard, pageHead: pageHead, animateBars: animateBars,
    toggleMusic: toggleMusic, setVolume: setVolume
  };
})(window);
