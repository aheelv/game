/* 游戏注册表：元数据在 data/games.js，运行逻辑在 games/*.js */
(function () {
  const A = (window.Arcade = window.Arcade || {});

  A.GAMES = A.GAMES || [];
  A.RUNTIMES = A.RUNTIMES || {};

  A.registerRuntime = function (id, runtime) {
    A.RUNTIMES[id] = runtime;
  };

  A.getGame = function (id) {
    return A.GAMES.find((g) => g.id === id) || null;
  };

  A.getRuntime = function (id) {
    return A.RUNTIMES[id] || null;
  };
})();
