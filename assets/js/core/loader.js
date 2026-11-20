/* 游戏页启动器：根据 URL 参数加载对应游戏 */
(function () {
  const A = window.Arcade;
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || params.get('game') || '';
  const meta = A.getGame(id);
  const runtime = A.getRuntime(id);

  if (!meta || !runtime) {
    document.getElementById('gameTitle').textContent = '未找到游戏';
    document.getElementById('gameTagline').textContent = '请从游戏大厅选择一个有效的游戏。';
    const overlay = document.getElementById('overlay');
    document.getElementById('overlayKicker').textContent = '404';
    document.getElementById('overlayTitle').textContent = '游戏不存在';
    document.getElementById('overlayBody').innerHTML = '<p class="overlay-lead">链接中的游戏标识无效。</p>';
    document.getElementById('overlayActions').innerHTML = '<a class="btn btn-primary" href="index.html">返回游戏大厅</a>';
    overlay.hidden = false;
    overlay.classList.add('is-visible');
    return;
  }

  document.title = meta.name + ' · 星集游戏舱';
  document.getElementById('gameTitle').textContent = meta.name;
  document.getElementById('gameCategory').textContent = meta.category;
  document.getElementById('gameTagline').textContent = meta.tagline;
  document.getElementById('timeLabel').textContent = meta.defaultParams.timeLimit > 0 ? '剩余' : '用时';

  window.arcadeGame = new A.GameBase(meta, runtime);
})();
