/* ============================================================
   viz.js — 纯前端可视化图表库（无外部依赖，离线可用）
   折线 / 饼环 / 热力 / 雷达 / 分组柱 / 直方 / 迷你走势
   ============================================================ */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- 折线图（支持多条序列 + 面积） ---------- */
  function lineChart(labels, series) {
    var W = 660, H = 250, pad = { l: 44, r: 18, t: 20, b: 36 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var max = 1;
    series.forEach(function (s) { s.data.forEach(function (v) { if (v > max) max = v; }); });
    max = Math.ceil(max / 5) * 5 || 5;
    var n = labels.length || 1;
    function X(i) { return pad.l + (n <= 1 ? iw / 2 : i * iw / (n - 1)); }
    function Y(v) { return pad.t + ih - (v / max) * ih; }
    var grid = '';
    for (var g = 0; g <= 4; g++) {
      var gy = pad.t + ih * g / 4;
      grid += '<line x1="' + pad.l + '" y1="' + gy + '" x2="' + (W - pad.r) + '" y2="' + gy + '" stroke="rgba(130,175,255,.13)" stroke-dasharray="4 5"/>';
      grid += '<text x="' + (pad.l - 9) + '" y="' + (gy + 4) + '" text-anchor="end" class="vz-axis">' + Math.round(max * (4 - g) / 4) + '</text>';
    }
    var paths = '';
    series.forEach(function (s) {
      if (!s.data.length) return;
      var pts = s.data.map(function (v, i) { return X(i) + ',' + Y(v); }).join(' ');
      var area = 'M' + X(0) + ',' + (pad.t + ih) + ' L' + s.data.map(function (v, i) { return X(i) + ',' + Y(v); }).join(' L') + ' L' + X(s.data.length - 1) + ',' + (pad.t + ih) + ' Z';
      paths += '<path d="' + area + '" fill="' + s.color + '" opacity=".09"/>';
      paths += '<polyline points="' + pts + '" fill="none" stroke="' + s.color + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';
      s.data.forEach(function (v, i) {
        paths += '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="3.4" fill="' + s.color + '" stroke="#091126" stroke-width="1.6"><title>' + esc(labels[i] || '') + ' · ' + esc(s.name) + '：' + v + '</title></circle>';
      });
    });
    var xlab = labels.map(function (l, i) {
      return '<text x="' + X(i) + '" y="' + (H - 10) + '" text-anchor="middle" class="vz-axis">' + esc(l) + '</text>';
    }).join('');
    var legend = series.map(function (s) {
      return '<span class="vz-lg"><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>';
    }).join('');
    return '<div class="vz-legend">' + legend + '</div><svg class="vz-svg" viewBox="0 0 ' + W + ' ' + H + '">' + grid + paths + xlab + '</svg>';
  }

  /* ---------- 圆环 / 饼图 ---------- */
  function donut(percent, opts) {
    opts = opts || {};
    var r = 58, c = 2 * Math.PI * r;
    var p = Math.max(0, Math.min(100, +percent || 0));
    var off = c * (1 - p / 100);
    var color = opts.color || '#00e6d2';
    var gid = 'vzDonut' + Math.random().toString(36).slice(2, 7);
    return '<div class="vz-donut">' +
      '<svg viewBox="0 0 150 150">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' + color + '"/><stop offset="100%" stop-color="#7c4dff"/></linearGradient></defs>' +
      '<circle cx="75" cy="75" r="' + r + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="14"/>' +
      '<circle cx="75" cy="75" r="' + r + '" fill="none" stroke="url(#' + gid + ')" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" transform="rotate(-90 75 75)"/>' +
      '</svg><div class="vz-donut-c"><b>' + p + '<small>%</small></b><span>' + esc(opts.label || '完成率') + '</span></div></div>';
  }

  /* ---------- 热力图 ---------- */
  function heatmap(rows, cols, matrix, step) {
    step = Math.max(1, +step || 2);
    var html = '<div class="vz-heat"><div class="vz-heat-row vz-heat-head"><span>班级 / 时段</span>';
    cols.forEach(function (c) { html += '<span>' + esc(c) + '</span>'; });
    html += '</div>';
    rows.forEach(function (r, ri) {
      html += '<div class="vz-heat-row"><span class="vz-heat-label">' + esc(r) + '</span>';
      cols.forEach(function (c, ci) {
        var v = (matrix[ri] && matrix[ri][ci]) || 0;
        var lv = Math.min(5, Math.ceil(v / step));
        html += '<span class="vz-heat-cell h' + lv + '" title="' + esc(r + ' · ' + c + '：' + v + ' 人次') + '">' + (v || '') + '</span>';
      });
      html += '</div>';
    });
    return html + '</div>';
  }

  /* ---------- 雷达图 ---------- */
  function radar(axes, values) {
    var cx = 150, cy = 142, R = 94, n = axes.length || 1;
    function pt(i, r) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    }
    var rings = '';
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      var p = axes.map(function (_, i) { return pt(i, R * f).join(','); }).join(' ');
      rings += '<polygon points="' + p + '" fill="none" stroke="rgba(120,200,220,.16)"/>';
    });
    var spokes = '', labels = '';
    axes.forEach(function (a, i) {
      var q = pt(i, R);
      spokes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + q[0] + '" y2="' + q[1] + '" stroke="rgba(120,200,220,.16)"/>';
      var lp = pt(i, R + 22);
      labels += '<text x="' + lp[0] + '" y="' + lp[1] + '" text-anchor="middle" dominant-baseline="middle" class="vz-axis">' + esc(a) + '</text>';
    });
    var poly = values.map(function (v, i) { return pt(i, R * Math.max(0.05, Math.min(1, v / 100))).join(','); }).join(' ');
    var dots = values.map(function (v, i) {
      var q = pt(i, R * Math.max(0.05, Math.min(1, v / 100)));
      return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3.2" fill="#00e6d2" stroke="#091126" stroke-width="1"/>';
    }).join('');
    return '<svg class="vz-svg vz-radar" viewBox="0 0 300 285">' + rings + spokes +
      '<polygon points="' + poly + '" fill="rgba(0,230,210,.24)" stroke="#00e6d2" stroke-width="2"/>' + dots + labels + '</svg>';
  }

  /* ---------- 分组柱状图（到场 / 提交） ---------- */
  function bars(groups) {
    var max = 1;
    groups.forEach(function (g) { max = Math.max(max, g.a || 0, g.b || 0); });
    return '<div class="vz-bars">' + (groups.length ? groups.map(function (g) {
      var ha = Math.max(2, (g.a || 0) / max * 100), hb = Math.max(2, (g.b || 0) / max * 100);
      return '<div class="vz-bar-g">' +
        '<div class="vz-bar-pair">' +
          '<div class="vz-bar ba" style="height:' + ha + '%" title="到场 ' + (g.a || 0) + '"><em>' + (g.a || 0) + '</em></div>' +
          '<div class="vz-bar bb" style="height:' + hb + '%" title="提交 ' + (g.b || 0) + '"><em>' + (g.b || 0) + '</em></div>' +
        '</div><span class="vz-bar-label">' + esc(g.label) + '</span></div>';
    }).join('') : '<div class="empty">暂无班级数据</div>') + '</div>';
  }

  /* ---------- 直方图 ---------- */
  function histogram(bins) {
    var W = 560, H = 208, pad = { l: 34, r: 14, t: 16, b: 34 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var max = 1;
    bins.forEach(function (b) { if (b.v > max) max = b.v; });
    max = Math.ceil(max / 5) * 5 || 5;
    var bw = iw / (bins.length || 1);
    var grid = '';
    for (var g = 0; g <= 4; g++) {
      var gy = pad.t + ih * g / 4;
      grid += '<line x1="' + pad.l + '" y1="' + gy + '" x2="' + (W - pad.r) + '" y2="' + gy + '" stroke="rgba(130,175,255,.13)" stroke-dasharray="4 5"/>';
      grid += '<text x="' + (pad.l - 8) + '" y="' + (gy + 4) + '" text-anchor="end" class="vz-axis">' + Math.round(max * (4 - g) / 4) + '</text>';
    }
    var rects = bins.map(function (b, i) {
      var h = (b.v / max) * ih;
      var x = pad.l + i * bw + 4, w = Math.max(2, bw - 8);
      return '<rect x="' + x + '" y="' + (pad.t + ih - h) + '" width="' + w + '" height="' + h + '" rx="3" fill="url(#vzHistG)"><title>' + esc(b.label) + '：' + b.v + ' 人</title></rect>' +
        (b.v ? '<text x="' + (x + w / 2) + '" y="' + (pad.t + ih - h - 5) + '" text-anchor="middle" class="vz-val">' + b.v + '</text>' : '') +
        '<text x="' + (x + w / 2) + '" y="' + (H - 10) + '" text-anchor="middle" class="vz-axis">' + esc(b.label) + '</text>';
    }).join('');
    return '<svg class="vz-svg" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<defs><linearGradient id="vzHistG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7c4dff"/><stop offset="100%" stop-color="#00e6d2"/></linearGradient></defs>' +
      grid + rects + '</svg>';
  }

  /* ---------- 占比横条 ---------- */
  function shares(items, total, palette) {
    if (!items.length) return '<div class="empty">暂无作品数据</div>';
    var colors = (palette && palette.length) ? palette : ['#00e6d2', '#7c4dff', '#ff5c9d', '#2ee6a8', '#ff8a3d', '#3d7dff'];
    return '<div class="vz-shares">' + items.map(function (it, i) {
      var pct = total ? Math.round(it.v / total * 100) : 0;
      return '<div class="vz-share"><span class="sn" title="' + esc(it.label) + '">' + esc(it.label) + '</span>' +
        '<span class="sb"><i style="width:' + pct + '%;background:' + colors[i % colors.length] + '"></i></span>' +
        '<span class="sp">' + pct + '%</span></div>';
    }).join('') + '</div>';
  }

  /* ---------- 迷你走势线 ---------- */
  function spark(values, color) {
    var mx = Math.max.apply(null, values.concat([1])), mn = Math.min.apply(null, values.concat([0]));
    var rg = mx - mn || 1;
    var pts = values.map(function (v, i) {
      return (i * 84 / (values.length - 1 || 1)).toFixed(1) + ',' + (24 - (v - mn) / rg * 20).toFixed(1);
    }).join(' ');
    return '<svg class="vz-spark" viewBox="0 0 84 26"><polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  global.Viz = {
    esc: esc,
    lineChart: lineChart,
    donut: donut,
    heatmap: heatmap,
    radar: radar,
    bars: bars,
    histogram: histogram,
    shares: shares,
    spark: spark
  };
})(window);
