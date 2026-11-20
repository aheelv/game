/* 20 款游戏的统一元数据、默认参数与参数化提示词模板 */
(function () {
  const A = (window.Arcade = window.Arcade || {});

  /* 所有模板统一使用以下参数名，便于二次修改与批量替换 */
  A.PARAM_KEYS = [
    'gameName', 'gameMode', 'difficulty', 'themeStyle', 'levelCount',
    'timeLimit', 'speed', 'scoringRules', 'sound', 'mobileAdaptation',
    'gameplayFocus', 'controls', 'extraNotes',
  ];

  A.PARAM_LABELS = {
    gameName: '游戏名称', gameMode: '玩法模式', difficulty: '难度',
    themeStyle: '主题风格', levelCount: '关卡数量', timeLimit: '时间限制',
    speed: '速度', scoringRules: '计分规则', sound: '音效',
    mobileAdaptation: '移动端适配', gameplayFocus: '核心玩法',
    controls: '操作方式', extraNotes: '附加要求',
  };

  const def = (o) => Object.assign({
    mode: '经典模式', difficulty: 'normal', theme: '经典', levelCount: 3,
    timeLimit: 0, speed: 5, scoring: '按游戏规则累计得分', sound: true, mobile: true,
  }, o);

  A.GAMES = [
    {
      id: 'snake', name: '贪吃蛇', en: 'SNAKE', category: '街机动作', icon: '蛇', color: '#5b5bd6',
      tagline: '在网格中蜿蜒前行，吃掉食物不断变长。',
      rules: '控制蛇吃到食物后身体变长并获得分数。\n撞到墙壁或自己的身体即游戏结束。\n随着难度提升，移动速度会逐步加快。',
      controls: '方向键 / WASD 改变方向，不能立即反向。\n移动端可滑动棋盘或使用屏幕方向键。\nP 或 Esc 暂停。',
      defaultParams: def({ mode: '经典生存', theme: '霓虹夜市', levelCount: 3, speed: 5, scoring: '食物 +10 分；长度每增加 5 节额外 +20 分；撞墙结束' }),
      promptFocus: '网格贪吃蛇生存玩法，蛇身按队列跟随头部，食物随机生成，碰撞判定与速度递增是核心。',
      mechanics: ['维护蛇身坐标队列，移动时尾部跟随，吃食物后增长一节', '食物只在空闲格生成，难度越高食物刷新越频繁', '转向需过滤 180 度掉头，避免瞬间自撞', '随关卡或分数提高移动频率，提供清晰的死亡反馈'],
    },
    {
      id: 'tetris', name: '俄罗斯方块', en: 'TETRIS', category: '数字益智', icon: '方块', color: '#7c5cff',
      tagline: '旋转下落方块，填满整行获得连消快感。',
      rules: '七种方块从上方下落，可左右移动、旋转与加速下落。\n填满一整行即消除，上方方块下落。\n堆叠触顶则游戏结束。',
      controls: '← → 移动，↑ 旋转，↓ 软降，空格硬降。\n移动端使用按钮或点击屏幕左右半区旋转/加速。',
      defaultParams: def({ mode: '经典消除', theme: '像素霓虹', levelCount: 5, speed: 5, scoring: '单行 100 / 双行 300 / 三行 500 / 四行 800，连消额外加成' }),
      promptFocus: '经典俄罗斯方块堆叠消除，7 种四格骨牌、碰撞检测、旋转踢墙、行消除与下落加速。',
      mechanics: ['使用 7-bag 随机序列保证方块分布公平', '实现碰撞检测、旋转与贴墙旋转修正', '满行消除后上方方块下落，并支持连消计分', '硬降立即落底，软降持续加速，触顶结束游戏'],
    },
    {
      id: '2048', name: '2048', en: '2048', category: '数字益智', icon: '2048', color: '#ff8a59',
      tagline: '滑动合并相同数字，一步步逼近 2048。',
      rules: '每次移动所有方块沿方向滑动，相同数字相遇则合并翻倍。\n每次移动后随机出现一个 2 或 4。\n棋盘填满且无法合并时结束。',
      controls: '方向键 / WASD 或手指滑动控制移动方向。\n达到 2048 即通关，仍可继续挑战更高分。',
      defaultParams: def({ mode: '经典合并', theme: '奶油卡片', levelCount: 1, speed: 3, scoring: '每次合并后分值累加，达到 2048 额外奖励 2000 分' }),
      promptFocus: '2048 数字合并玩法，四方向压缩、相同数字合并、新块生成与无路可走判定。',
      mechanics: ['按方向逐行压缩非零方块并合并相同值，一次移动中每个方块只合并一次', '移动成功后在空位生成 2（90%）或 4（10%）', '合成 2048 时提示胜利并允许继续', '同时检测空格与相邻相同数字，均无则结束'],
    },
    {
      id: 'minesweeper', name: '扫雷', en: 'MINESWEEPER', category: '策略推理', icon: '雷', color: '#16a37a',
      tagline: '根据数字推理雷区位置，安全翻开所有格子。',
      rules: '左键翻开格子，数字表示周围 8 格的地雷数量。\n右键标记地雷，翻到地雷即失败。\n翻开所有非雷格子即获胜。',
      controls: '左键翻开，右键插旗；移动端长按插旗。\n首击保证安全，难度改变棋盘与雷数。',
      defaultParams: def({ mode: '经典推理', theme: '清爽桌面', levelCount: 3, speed: 3, scoring: '翻开安全格 +10，正确插旗 +30，通关 +500' }),
      promptFocus: '经典扫雷推理游戏，首击安全、数字提示、 flags 标记、递归展开空白区域与胜负判定。',
      mechanics: ['按难度设置棋盘尺寸与雷数，保证首次点击及周围安全', '计算每格周围雷数，翻开空白格时递归展开相邻空白', '右键/长按切换旗子，旗子格不可翻开', '翻开所有安全格即胜利，踩雷显示全部地雷'],
    },
    {
      id: 'linkmatch', name: '连连看', en: 'LINK MATCH', category: '休闲竞技', icon: '连', color: '#ef6c8a',
      tagline: '寻找相同图案，用不超过两次转折的路线连接。',
      rules: '点击两个相同图案且路径转折不超过两次即可消除。\n路径可以经过棋盘外的空白边缘。\n在时间结束前清空棋盘即获胜。',
      controls: '鼠标或手指依次点击两张相同图案。\n选中后可再次点击取消选择。',
      defaultParams: def({ mode: '限时挑战', theme: '水果盛宴', levelCount: 4, timeLimit: 120, speed: 4, scoring: '每对 +100，连击每级 +20；超时结束' }),
      promptFocus: '连连看配对消除，路径搜索限制两次转折，支持棋盘外绕行，关卡逐层增加图案种类。',
      mechanics: ['生成偶数配对并随机打乱，确保有解', '实现 0/1/2 次转折的通路检测，允许沿棋盘外边框绕行', '匹配成功后清除方块并播放连线动画', '提供提示与重排能力，超时或清空时结算'],
    },
    {
      id: 'memory', name: '记忆翻牌', en: 'MEMORY', category: '休闲竞技', icon: '记', color: '#4e9bd8',
      tagline: '翻开卡牌记住位置，用最少步数完成配对。',
      rules: '每次翻开两张卡牌，图案相同则消除。\n图案不同会在短暂延迟后翻回。\n全部配对完成即通关。',
      controls: '鼠标点击或手指轻触卡牌翻开。\n支持自定义关卡与限时模式。',
      defaultParams: def({ mode: '记忆挑战', theme: '星空卡牌', levelCount: 4, timeLimit: 90, speed: 3, scoring: '每对 +100，剩余步数奖励，时间奖励 300' }),
      promptFocus: '记忆翻牌配对，翻牌动画、短暂回看、配对判定、步数与用时统计。',
      mechanics: ['根据关卡生成 N 对卡牌并洗牌', '翻开两张后延迟比对， mismatch 时自动翻回', '记录步数、用时与连击，匹配成功播放反馈', '全部配对后结算并允许进入下一关'],
    },
    {
      id: 'match3', name: '消消乐', en: 'MATCH 3', category: '数字益智', icon: '消', color: '#f2994a',
      tagline: '交换相邻元素凑成三连，触发连锁消除。',
      rules: '交换相邻两个元素，若形成三个及以上同色连线则消除。\n消除后上方元素下落并补充新元素。\n连锁消除获得额外分数。',
      controls: '点击一个元素再点击相邻元素完成交换；移动端直接点选。\n无效交换会自动换回。',
      defaultParams: def({ mode: '限步闯关', theme: '糖果花园', levelCount: 5, speed: 4, scoring: '三消 150 / 四消 300 / 五消 500，连锁倍率递增' }),
      promptFocus: '三消游戏，交换检测、匹配扫描、重力下落、补充与连锁反应，限步闯关。',
      mechanics: ['实现横向与纵向三连以上匹配检测', '无效交换回弹，有效交换后清除并下落补位', '支持连锁 combo 与分数倍率显示', '按关卡设置目标分数或步数限制'],
    },
    {
      id: 'sudoku', name: '数独', en: 'SUDOKU', category: '策略推理', icon: '数', color: '#3f8f83',
      tagline: '用逻辑填满网格，每行每列每宫都不重复。',
      rules: '在空格中填入数字，使每行、每列与每宫数字不重复。\n系统校验输入，错误会提示。\n完成全部空格即通关。',
      controls: '点击格子后使用数字键或屏幕数字面板填入。\n退格键清除当前格。',
      defaultParams: def({ mode: '逻辑填数', theme: '纸质书页', levelCount: 3, speed: 2, scoring: '正确填入 +20，完成一关 +1000，错误 -10' }),
      promptFocus: '数独逻辑填数，支持 4x4 与 9x9，题目生成、唯一解校验、候选数标记与错误检测。',
      mechanics: ['使用回溯法生成完整棋盘并按难度挖空', '校验行、列、宫冲突并高亮错误', '支持笔记模式记录候选数字', '完成棋盘后计时结算并进入下一关'],
    },
    {
      id: 'game24', name: '24 点', en: 'GAME 24', category: '策略推理', icon: '24', color: '#c26bb3',
      tagline: '四张牌四则运算，算出 24 点。',
      rules: '使用四张牌的数字各一次，通过加减乘除和括号得到 24。\n点击数字与运算符组成表达式。\n点击等号提交答案。',
      controls: '依次点击数字、运算符与括号构建表达式。\n支持退格与清空，回车提交。',
      defaultParams: def({ mode: '限时速算', theme: '扑克牌室', levelCount: 5, timeLimit: 60, speed: 4, scoring: '首次答对 +500，按剩余时间加成；答错 -50' }),
      promptFocus: '24 点速算游戏，随机发牌、表达式构建、安全求值、答案唯一性与限时挑战。',
      mechanics: ['生成保证有解的四个 1-13 数字', '支持点击式表达式构建，避免直接输入恶意代码', '使用安全的表达式解析器计算结果并判断是否等于 24', '答对后进入下一题，答错给出提示并扣分'],
    },
    {
      id: 'mastermind', name: '猜数字', en: 'MASTERMIND', category: '策略推理', icon: '猜', color: '#6d7ce0',
      tagline: '破解隐藏的四位数字密码，每次反馈都是线索。',
      rules: '系统生成 4 位互不重复的数字。\n每次猜测反馈 A（数字位置都对）和 B（数字对但位置错）。\n在限定次数内猜中即获胜。',
      controls: '点击数字面板输入四位数字，点击提交猜测。\n支持退格修改，历史记录保留。',
      defaultParams: def({ mode: '推理挑战', theme: '侦探档案', levelCount: 3, speed: 3, scoring: '每猜一次 -50，猜中 +1000，剩余次数奖励 100' }),
      promptFocus: '猜数字 Mastermind 推理玩法，隐藏密码、A/B 反馈、历史记录、尝试次数限制。',
      mechanics: ['生成 4 位不重复数字且首位不为零', '正确计算 A/B 数量并展示彩色提示点', '保留全部历史猜测与反馈，支持键盘输入', '次数耗尽显示答案并结束游戏'],
    },
    {
      id: 'sokoban', name: '推箱子', en: 'SOKOBAN', category: '策略推理', icon: '推', color: '#b07d4b',
      tagline: '在狭窄仓库中把每个箱子推到目标点。',
      rules: '推动箱子到达所有目标点即通关。\n只能推不能拉，箱子不可重叠或推出边界。\n步数越少评价越高。',
      controls: '方向键 / WASD 移动，移动端使用方向键或滑动。\n按 R 重置当前关卡。',
      defaultParams: def({ mode: '关卡解谜', theme: '仓库夜话', levelCount: 5, speed: 3, scoring: '每个箱子归位 +200，通关 +500，超出目标步数扣分' }),
      promptFocus: '推箱子解谜，地图瓦片系统、玩家与箱子移动、目标点判定、关卡重置与步数统计。',
      mechanics: ['使用字符地图定义墙体、地板、目标、箱子与玩家', '移动时检测墙与箱子，箱子后方可通行才推动', '箱子全部位于目标点时过关', '支持撤销上一步与一键重置关卡'],
    },
    {
      id: 'sliding', name: '数字华容道', en: 'SLIDING PUZZLE', category: '数字益智', icon: '滑', color: '#7b8c9e',
      tagline: '移动空白格旁边的方块，按顺序还原数字。',
      rules: '利用唯一空位滑动方块，最终按从左到右、从上到下排列数字。\n只能移动与空位相邻的方块。\n步数越少越好。',
      controls: '点击与空位相邻的方块移动；支持方向键与滑动手势。',
      defaultParams: def({ mode: '顺序还原', theme: '极简瓷砖', levelCount: 3, speed: 2, scoring: '完成 +1500，步数少于基准额外奖励 500' }),
      promptFocus: '数字华容道滑块拼图，3x3/4x4 网格、可解随机打乱、相邻移动与完成检测。',
      mechanics: ['从已完成状态执行大量合法随机移动保证有解', '只允许空位上下左右相邻方块滑动', '点击方块或按方向键移动，提供滑动动画', '按步数评价并支持难度切换尺寸'],
    },
    {
      id: 'maze', name: '迷宫探索', en: 'MAZE RUNNER', category: '策略推理', icon: '迷', color: '#4f9e69',
      tagline: '在随机生成的迷宫中找到唯一出口。',
      rules: '使用方向控制角色穿过通道到达终点。\n墙壁不可穿越，可开启限时挑战。\n到达终点即通关。',
      controls: '方向键 / WASD 或屏幕方向键移动。\n移动端可滑动控制方向。',
      defaultParams: def({ mode: '限时寻路', theme: '森林地图', levelCount: 4, timeLimit: 120, speed: 4, scoring: '到达终点 +1000，剩余时间每秒 +10，撞墙不扣分' }),
      promptFocus: '迷宫寻路游戏，深度优先生成迷宫、角色移动碰撞、终点检测与限时挑战。',
      mechanics: ['使用递归回溯或并查集生成完美迷宫', '按难度增加迷宫尺寸与复杂度', '角色移动带动画，撞墙有明确反馈', '显示小地图或路径提示，计时归零失败'],
    },
    {
      id: 'breakout', name: '打砖块', en: 'BREAKOUT', category: '街机动作', icon: '砖', color: '#e05c76',
      tagline: '控制挡板反弹小球，清空所有砖块。',
      rules: '移动挡板让小球反弹击碎砖块。\n小球掉落损失一条生命，生命耗尽结束。\n清空砖块进入下一关。',
      controls: '鼠标移动 / ← → 控制挡板，空格发球。\n移动端触摸拖动挡板。',
      defaultParams: def({ mode: '经典闯关', theme: '霓虹弹幕', levelCount: 5, speed: 5, scoring: '每块砖 +50，连续击碎 combo 加成，过关 +500' }),
      promptFocus: '打砖块街机玩法，挡板控制、小球物理反弹、砖块碰撞、生命与多关卡。',
      mechanics: ['实现小球与墙、挡板、砖块的碰撞检测与反弹角度调整', '挡板位置随鼠标/触摸/键盘变化', '砖块被击碎后计分并更新剩余数量', '生命耗尽失败，清空砖块后进入下一关并加速'],
    },
    {
      id: 'flappy', name: '小鸟飞行', en: 'FLAPPY', category: '街机动作', icon: '飞', color: '#f2a93b',
      tagline: '轻点振翅穿越管道，别让小鸟坠落。',
      rules: '点击或按空格让小鸟向上飞，松开后受重力下落。\n撞到管道或地面即结束。\n每通过一组管道得分。',
      controls: '空格 / 点击 / 触摸振翅。\n保持节奏穿过管道缝隙。',
      defaultParams: def({ mode: '无尽穿越', theme: '云端日落', levelCount: 1, speed: 5, scoring: '每通过一组管道 +100，极限贴边额外 +50' }),
      promptFocus: 'Flappy Bird 飞行穿越，重力与振翅物理、管道生成、碰撞检测与得分。',
      mechanics: ['使用简单重力积分模拟小鸟运动', '按固定间距生成上下管道，缝隙随难度缩小', '矩形碰撞检测，撞击立即结束', '相机视角随小鸟前进，背景视差滚动'],
    },
    {
      id: 'shooter', name: '星际射击', en: 'SPACE SHOOTER', category: '街机动作', icon: '射', color: '#3aa7c9',
      tagline: '驾驶飞船躲避弹幕，击落来袭敌机。',
      rules: '移动飞船自动射击，击落敌机得分。\n敌机会发射子弹，被击中损失护盾。\n护盾耗尽即失败，定期出现 Boss。',
      controls: '← → 或鼠标/触摸拖动移动飞船，空格可释放护盾冲刺。\nP 暂停。',
      defaultParams: def({ mode: '生存射击', theme: '深空舰队', levelCount: 5, speed: 6, scoring: '普通敌机 +100，精英 +300，Boss +1000' }),
      promptFocus: '纵向卷轴射击游戏，玩家飞船、敌机波次、子弹碰撞、护盾与 Boss 战。',
      mechanics: ['玩家自动开火，敌机按波次生成并带有不同移动轨迹', '实现子弹与敌机、敌弹与玩家的矩形/圆形碰撞', '护盾与生命值系统，受击闪烁无敌帧', '分数阈值触发 Boss 与关卡提升'],
    },
    {
      id: 'runner', name: '无尽跑酷', en: 'ENDLESS RUNNER', category: '街机动作', icon: '跑', color: '#8c6bd6',
      tagline: '跳跃与滑铲躲避障碍，挑战最远距离。',
      rules: '角色自动向前奔跑，遇到障碍需跳跃或滑铲。\n碰到障碍即结束。\n距离越远速度越快。',
      controls: '空格 / ↑ / 点击跳跃，↓ / 双击滑铲。\n移动端点击上半屏跳跃、下半屏滑铲。',
      defaultParams: def({ mode: '无尽挑战', theme: '赛博城市', levelCount: 1, speed: 5, scoring: '每米 +1 分，速度加成与连续躲避奖励' }),
      promptFocus: '横版无尽跑酷，自动前进、跳跃/滑铲、障碍生成、速度递增与距离计分。',
      mechanics: ['角色在地面奔跑，跳跃具备重力与二段跳可选', '随机生成不同高度障碍并控制最小间距', '跳跃越过矮障碍，滑铲穿过高障碍', '速度随距离增长，背景多层视差滚动'],
    },
    {
      id: 'whack', name: '打地鼠', en: 'WHACK A MOLE', category: '反应技巧', icon: '鼠', color: '#c9784f',
      tagline: '眼疾手快敲冒头的地鼠，别误伤伙伴。',
      rules: '地鼠会从洞中随机冒出，点击击中得分。\n金色地鼠分值更高，误击小动物扣分。\n时间结束结算总分。',
      controls: '鼠标点击或手指轻触冒出的目标。\n支持连击提示与音效反馈。',
      defaultParams: def({ mode: '限时反应', theme: '田园农场', levelCount: 3, timeLimit: 60, speed: 5, scoring: '普通地鼠 +100，金色 +300，误击 -50，连击加成' }),
      promptFocus: '打地鼠反应游戏，随机洞口、不同目标类型、出现时长、连击与时间限制。',
      mechanics: ['按难度控制同时出现的目标数量与停留时间', '普通/金色/陷阱目标有不同分值和视觉', '击中播放动画与音效，未击中目标自动消失', '倒计时结束展示评级与最高分'],
    },
    {
      id: 'rhythm', name: '节奏点击', en: 'RHYTHM TAP', category: '反应技巧', icon: '律', color: '#d8569b',
      tagline: '音符落到判定线时点击，跟上节拍拿高分。',
      rules: '音符从上方下落，到达判定线时按对应轨道键。\n判定分为 Perfect / Great / Good / Miss。\n连击越高分数倍率越高。',
      controls: 'D F J K 对应四条轨道；移动端点击底部四个按键。',
      defaultParams: def({ mode: '四轨节奏', theme: '电音舞台', levelCount: 3, speed: 6, scoring: 'Perfect 300 / Great 200 / Good 100 / Miss 0，连击倍率最高 x4' }),
      promptFocus: '下落式节奏游戏，四轨音符、判定窗口、连击倍率、谱面生成与视觉律动。',
      mechanics: ['按 BPM 生成音符谱面并同步下落', '根据时间差给出 Perfect/Great/Good/Miss 判定', '连击提升倍率，断连重置', '背景随节拍脉冲，轨道按键有高亮反馈'],
    },
    {
      id: 'typing', name: '打字速战', en: 'TYPING RUSH', category: '文字技能', icon: '字', color: '#4b8bb5',
      tagline: '输入下落单词将其击落，提升你的手速。',
      rules: '单词从上方下落，输入正确字母即可消除。\n单词落到底部会损失生命。\n连续正确输入形成连击。',
      controls: '直接键盘输入字母，回车确认或自动匹配。\n移动端使用软键盘输入。',
      defaultParams: def({ mode: '生存打字', theme: '打字机书房', levelCount: 3, speed: 5, scoring: '每个字母 10 分，单词长度奖励，连击倍率 x1-x3' }),
      promptFocus: '打字生存游戏，单词下落、逐字匹配、输入缓冲、连击与生命值。',
      mechanics: ['从词库随机生成单词并按难度控制长度与速度', '输入字符与当前目标单词前缀匹配，完全输入后消除', '单词触底扣除生命，生命耗尽结束', '显示 WPM 与准确率统计，支持音效开关'],
    },
  ];

  /* 为每款游戏构建独立的参数化提示词模板；模板中的占位符与 PARAM_KEYS 一一对应 */
  function buildPromptTemplate(game) {
    const mechanics = (game.mechanics || []).map((m, i) => `   ${i + 1}. ${m}`).join('\n');
    return [
      `# 角色与目标`,
      `你是一名资深前端游戏工程师兼交互设计师。请从零实现一个完整可运行、界面精美、可直接部署为静态站点的单网页游戏：**{{gameName}}**。`,
      `交付物必须是一个 HTML 文件（可内联或分离 CSS/JS），零外部付费资源，打开即可游玩。`,
      ``,
      `# 游戏规格（请严格遵守以下参数）`,
      `- 游戏名称：{{gameName}}`,
      `- 玩法模式：{{gameMode}}`,
      `- 难度：{{difficulty}}（请据此调整节奏、数量与容错）`,
      `- 主题风格：{{themeStyle}}（配色、字体、装饰元素需统一）`,
      `- 关卡数量：{{levelCount}}（每关需有明确变化，不是简单重复）`,
      `- 时间限制：{{timeLimit}}（0 表示不限时；非 0 时必须有倒计时与结束提示）`,
      `- 速度：{{speed}} / 10（数值越大节奏越快，需平滑映射到动画与逻辑）`,
      `- 计分规则：{{scoringRules}}`,
      `- 音效：{{sound}}（使用 WebAudio 或轻量合成音，不依赖外部音频文件）`,
      `- 移动端适配：{{mobileAdaptation}}（触摸、手势、虚拟按键与安全区域）`,
      ``,
      `# 本作核心玩法`,
      `{{gameplayFocus}}`,
      ``,
      `# 关键机制（逐条实现）`,
      mechanics,
      ``,
      `# 操作方式`,
      `{{controls}}`,
      ``,
      `# 交互与状态要求`,
      `1. 必须包含：开始、暂停、继续、重新开始、玩法说明、计分、难度选择。`,
      `2. 状态机覆盖 idle / playing / paused / over，暂停时冻结计时与物理更新。`,
      `3. 分数与最高分显示在 HUD；最高分持久化到 localStorage。`,
      `4. 失败与胜利都要有明确结算面板，展示本局得分、最佳成绩与用时。`,
      `5. 页面失焦或切换标签时自动暂停，返回后不丢失进度。`,
      ``,
      `# 视觉与音频要求`,
      `- 采用「{{themeStyle}}」主题，主色、强调色、背景层次统一；关键元素有 hover / active 反馈。`,
      `- 使用 Canvas 或 CSS 动画实现流畅过渡，目标 60 FPS，避免布局抖动。`,
      `- 音效开关必须可用：{{sound}}；所有音效由代码合成，首次用户交互后再初始化音频上下文。`,
      ``,
      `# 工程与交付标准`,
      `- 单一页面结构清晰：HTML 语义化、CSS 变量统一、JS 模块化函数拆分。`,
      `- 所有可调参数集中为 CONFIG 对象，便于二次修改；注释使用中文。`,
      `- 不使用任何第三方游戏引擎或需要联网的 CDN 资源。`,
      `- 代码需包含必要的输入边界处理（重复点击、快速按键、页面缩放、横竖屏切换）。`,
      `{{extraNotes}}`,
      ``,
      `# 验收清单（输出前自检）`,
      `- [ ] 开始 / 暂停 / 重开 / 说明 / 难度切换全部可用`,
      `- [ ] 计分与最高分持久化正确`,
      `- [ ] {{timeLimit}} 秒限制逻辑正确（0 时不限制）`,
      `- [ ] 速度 {{speed}} 对游戏节奏有可感知影响`,
      `- [ ] 桌面键盘与移动端触摸均可完整游玩`,
      `- [ ] 音效开关与主题风格生效`,
    ].join('\n');
  }

  A.PROMPT_TEMPLATES = {};
  A.GAMES.forEach((g) => {
    A.PROMPT_TEMPLATES[g.id] = buildPromptTemplate(g);
  });
  A.buildPromptTemplate = buildPromptTemplate;

  /* 将参数对象渲染进模板 */
  A.renderPrompt = function (template, params) {
    const p = Object.assign({}, params);
    const fallback = {
      gameName: '未命名游戏', gameMode: '经典模式', difficulty: 'normal',
      themeStyle: '经典', levelCount: 3, timeLimit: 0, speed: 5,
      scoringRules: '按游戏规则累计得分', sound: true, mobileAdaptation: true,
      gameplayFocus: '', controls: '', extraNotes: '',
    };
    Object.keys(fallback).forEach((k) => {
      if (p[k] === undefined || p[k] === null || p[k] === '') p[k] = fallback[k];
    });
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(p, key) ? String(p[key]) : match
    ));
  };
})();
