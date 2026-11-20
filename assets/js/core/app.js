/* 游戏大厅：分类筛选、搜索与卡片渲染 */
(function () {
  const A = window.Arcade;
  const grid = document.getElementById('gameGrid');
  const filters = document.getElementById('filters');
  const search = document.getElementById('searchInput');
  let activeCategory = '全部';
  let keyword = '';

  function renderFilters() {
    const cats = ['全部'].concat(Array.from(new Set(A.GAMES.map((g) => g.category))));
    filters.innerHTML = cats
      .map((c) => `<button type="button" class="filter-btn ${c === activeCategory ? 'active' : ''}" data-cat="${c}">${c}</button>`)
      .join('');
    filters.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        renderFilters();
        renderGames();
      });
    });
  }

  function renderGames() {
    const list = A.GAMES.filter((g) => {
      const hitCat = activeCategory === '全部' || g.category === activeCategory;
      const text = (g.name + ' ' + g.en + ' ' + g.tagline + ' ' + g.category).toLowerCase();
      return hitCat && text.includes(keyword.toLowerCase());
    });
    if (!list.length) {
      grid.innerHTML = '<div class="empty">没有找到匹配的游戏，换个关键词试试。</div>';
      return;
    }
    grid.innerHTML = list.map((g) => `
      <article class="game-card">
        <div class="game-card-top">
          <div class="game-icon" style="background:linear-gradient(135deg,${g.color},${g.color}bb)">${g.icon}</div>
          <div>
            <h3>${g.name}</h3>
            <div class="en">${g.en}</div>
          </div>
        </div>
        <div class="tagline">${g.tagline}</div>
        <div class="game-card-bottom">
          <span class="tag tag-brand">${g.category}</span>
          <span class="tag">${g.defaultParams.mode}</span>
        </div>
        <div class="game-card-bottom">
          <a class="btn btn-primary btn-sm" href="game.html?id=${g.id}">开始游戏</a>
          <a class="btn btn-ghost btn-sm" href="generator.html?game=${g.id}">提示词</a>
        </div>
      </article>
    `).join('');
  }

  search.addEventListener('input', () => {
    keyword = search.value.trim();
    renderGames();
  });

  renderFilters();
  renderGames();
})();
