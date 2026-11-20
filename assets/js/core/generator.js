/* 提示词生成器：参数表单 → 实时渲染 → 复制 / 导出 / 模板编辑 */
(function () {
  const A = window.Arcade;
  const $ = (id) => document.getElementById(id);
  const editedTemplates = {};

  const fields = [
    'gameName', 'gameMode', 'difficulty', 'themeStyle', 'levelCount',
    'timeLimit', 'speed', 'scoringRules', 'sound', 'mobileAdaptation', 'extraNotes',
  ];

  let current = null;

  function init() {
    const select = $('gameSelect');
    select.innerHTML = A.GAMES.map((g) => `<option value="${g.id}">${g.name} · ${g.en}</option>`).join('');
    const requested = new URLSearchParams(location.search).get('game');
    const initial = A.getGame(requested) || A.GAMES[0];
    select.value = initial.id;
    select.addEventListener('change', () => loadGame(A.getGame(select.value)));
    fields.forEach((key) => {
      const el = $(key);
      if (!el) return;
      const evt = el.type === 'range' || el.type === 'checkbox' ? 'input' : 'input';
      el.addEventListener(evt, render);
    });
    $('resetParams').addEventListener('click', () => loadGame(current));
    $('goPlay').addEventListener('click', () => { location.href = 'game.html?id=' + current.id; });
    $('copyBtn').addEventListener('click', copyPrompt);
    $('exportBtn').addEventListener('click', exportPrompt);
    $('downloadTemplateBtn').addEventListener('click', exportTemplate);
    $('templateEditor').addEventListener('input', () => {
      editedTemplates[current.id] = $('templateEditor').value;
      render();
    });
    $('resetTemplateBtn').addEventListener('click', () => {
      delete editedTemplates[current.id];
      $('templateEditor').value = A.PROMPT_TEMPLATES[current.id];
      render();
      status('模板已还原为内置版本');
    });
    loadGame(initial);
  }

  function loadGame(game) {
    current = game;
    const d = game.defaultParams;
    $('gameName').value = game.name;
    $('gameMode').value = d.mode;
    $('difficulty').value = (A.DIFFICULTY[d.difficulty] || A.DIFFICULTY.normal).label;
    $('themeStyle').value = d.theme;
    $('levelCount').value = d.levelCount;
    $('timeLimit').value = d.timeLimit;
    $('speed').value = d.speed;
    $('scoringRules').value = d.scoring;
    $('sound').checked = !!d.sound;
    $('mobileAdaptation').checked = !!d.mobile;
    $('extraNotes').value = '';
    $('templateEditor').value = editedTemplates[game.id] || A.PROMPT_TEMPLATES[game.id];
    render();
    status('已载入「' + game.name + '」的默认参数');
  }

  function collectParams() {
    return {
      gameName: $('gameName').value.trim(),
      gameMode: $('gameMode').value.trim(),
      difficulty: $('difficulty').value,
      themeStyle: $('themeStyle').value.trim(),
      levelCount: $('levelCount').value || 1,
      timeLimit: $('timeLimit').value || 0,
      speed: $('speed').value,
      scoringRules: $('scoringRules').value.trim(),
      sound: $('sound').checked ? '开启（需提供开关）' : '关闭（保留开关接口）',
      mobileAdaptation: $('mobileAdaptation').checked
        ? '完整支持，含触摸/手势/虚拟按键与安全区域'
        : '仅桌面端，保证键鼠体验',
      gameplayFocus: current.promptFocus,
      controls: current.controls,
      extraNotes: $('extraNotes').value.trim()
        ? '\n- 附加要求：' + $('extraNotes').value.trim()
        : '- 附加要求：无',
    };
  }

  function render() {
    const params = collectParams();
    const template = $('templateEditor').value || A.PROMPT_TEMPLATES[current.id];
    const output = A.renderPrompt(template, params);
    $('promptOutput').value = output;
    $('speedOutput').textContent = $('speed').value;
    $('outputMeta').textContent = output.length + ' 字符 · 实时更新';
    $('paramChips').innerHTML = [
      params.gameName, params.gameMode, params.difficulty, params.themeStyle,
      params.levelCount + ' 关', Number(params.timeLimit) > 0 ? params.timeLimit + ' 秒' : '不限时',
      '速度 ' + params.speed, params.sound === '开启（需提供开关）' ? '音效开' : '音效关',
    ].map((t) => `<span class="param-chip">${escapeHtml(t)}</span>`).join('');
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function status(msg) {
    $('actionStatus').textContent = msg;
  }

  async function copyPrompt() {
    const text = $('promptOutput').value;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        $('promptOutput').select();
        document.execCommand('copy');
      }
      status('提示词已复制到剪贴板');
    } catch (e) {
      status('复制失败，请手动全选文本后复制');
    }
  }

  function download(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportPrompt() {
    const name = ($('gameName').value.trim() || current.name).replace(/[\\/:*?"<>|]/g, '_');
    download(name + '_提示词.txt', $('promptOutput').value);
    status('已导出：' + name + '_提示词.txt');
  }

  function exportTemplate() {
    const name = ($('gameName').value.trim() || current.name).replace(/[\\/:*?"<>|]/g, '_');
    download(name + '_模板.txt', $('templateEditor').value);
    status('已导出当前模板');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
