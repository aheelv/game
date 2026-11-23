/* ============================================================
   store.js — 本地数据层（localStorage，离线可用）
   数据模型：学生签到 / 加分 / 成果 / 照片 / 看板任务 / 设置
   ============================================================ */
(function (global) {
  'use strict';

  var KEY = 'glxy_activity_v1';

  var SEED = {
    students: [],
    scores: [],
    archives: [],
    photos: [],
    tasks: [
      { id: 't1', group: '会前对接', title: '找到管理学院钉钉群11月13日文件及附件，确认模板格式与栏目要求', owner: '负责人', status: 'todo', note: '模板栏目：姓名/学号/班级/完成任务项/第二课堂加分/操作留痕' },
      { id: 't2', group: '会前对接', title: '与许跃雯对接：全程参与、明确分工、领导巡视配合方式', owner: '负责人', status: 'todo', note: '' },
      { id: 't3', group: '会前对接', title: '向智广老师确认项目材料导出形式与存档方式', owner: '负责人', status: 'todo', note: '' },
      { id: 't4', group: '会前对接', title: '团队调研开发签到统计小工具并完成调试与兜底方案', owner: '技术组', status: 'doing', note: '签到/完成大屏/导出/成果佐证关联' },
      { id: 't5', group: '表格制作', title: '按群文件模板制作学生任务完成登记表（打印约200行）', owner: '负责人', status: 'todo', note: '' },
      { id: 't6', group: '表格制作', title: '确定登记栏目便于现场填写与后续统一录入加分', owner: '负责人', status: 'todo', note: '' },
      { id: 't7', group: '现场执行', title: '全程在场：签到、表格发放回收、引导填表、大屏展示', owner: '全体', status: 'todo', note: '纸质为正式材料，大屏仅展示，二者一致' },
      { id: 't8', group: '现场执行', title: '完成任务学生填表并留存项目成果材料作为积分佐证', owner: '全体', status: 'todo', note: '' },
      { id: 't9', group: '现场执行', title: '收集佐证照片（学号+姓名，拍到本人+电脑项目界面）', owner: '全体', status: 'todo', note: '一人一张' },
      { id: 't10', group: '现场执行', title: '播放轻音乐并调小音量，巡视时提前调好氛围', owner: '负责人', status: 'todo', note: '' },
      { id: 't11', group: '应急预案', title: '人少：提前告知石主任安排固定学生全程在场', owner: '负责人', status: 'todo', note: '' },
      { id: 't12', group: '应急预案', title: '人多：与许跃雯从104搬椅子到103，分批上机', owner: '负责人', status: 'todo', note: '' },
      { id: 't13', group: '应急预案', title: '工具故障：立即停用，完全依靠纸质登记表', owner: '技术组', status: 'todo', note: '' },
      { id: 't14', group: '领导巡视', title: '保证学生真实操作、屏幕有内容、大屏展示数据与成果照片', owner: '全体', status: 'todo', note: '' }
    ],
    settings: { paperMode: false, music: false, volume: 0.12, lastPage: 'home' },
    meta: { updatedAt: '', eventName: '大数据与人工智能实践教学活动' }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { var s = clone(SEED); save(s); return s; }
      var data = JSON.parse(raw);
      // 补齐字段，兼容旧版本
      Object.keys(SEED).forEach(function (k) { if (data[k] === undefined) data[k] = clone(SEED[k]); });
      return data;
    } catch (e) {
      console.warn('store load failed, using seed', e);
      return clone(SEED);
    }
  }

  function save(data) {
    try {
      data.meta.updatedAt = new Date().toISOString();
      localStorage.setItem(KEY, JSON.stringify(data));
      if (global.dispatchEvent) global.dispatchEvent(new CustomEvent('store:changed'));
      return true;
    } catch (e) {
      console.error('store save failed', e);
      return false;
    }
  }

  var state = load();

  var Store = {
    get state() { return state; },
    reload: function () { state = load(); return state; },
    commit: function (fn) { var r = fn(state); save(state); return r; },
    reset: function () { state = clone(SEED); save(state); return state; },
    clearStudents: function () { return this.commit(function (s) { s.students = []; s.scores = []; }); },

    // ---- 签到 ----
    addStudent: function (rec) {
      var self = this;
      return this.commit(function (s) {
        var exist = s.students.filter(function (x) { return x.sid === rec.sid; })[0];
        if (exist) {
          exist.name = rec.name; exist.className = rec.className;
          exist.task = rec.task || exist.task;
          exist.completed = rec.completed !== undefined ? rec.completed : exist.completed;
          exist.time = rec.time || exist.time;
          return { ok: true, updated: true, record: exist };
        }
        var item = {
          id: 's' + Date.now() + Math.floor(Math.random() * 1000),
          name: rec.name, sid: rec.sid, className: rec.className,
          task: rec.task || '', completed: !!rec.completed,
          time: rec.time || new Date().toISOString(),
          recheck: false
        };
        s.students.unshift(item);
        return { ok: true, updated: false, record: item };
      });
    },
    toggleDone: function (id) {
      return this.commit(function (s) {
        var x = s.students.filter(function (v) { return v.id === id; })[0];
        if (x) { x.completed = !x.completed; x.recheck = true; }
        return x;
      });
    },
    removeStudent: function (id) {
      return this.commit(function (s) { s.students = s.students.filter(function (v) { return v.id !== id; }); });
    },
    stats: function () {
      var s = state.students;
      var done = s.filter(function (x) { return x.completed; }).length;
      var classes = {}; s.forEach(function (x) { classes[x.className || '未填'] = 1; });
      var tasks = {};
      s.forEach(function (x) { if (x.task) tasks[x.task] = (tasks[x.task] || 0) + 1; });
      return {
        total: s.length, done: done,
        rate: s.length ? Math.round(done / s.length * 100) : 0,
        classes: Object.keys(classes).length,
        byTask: tasks,
        byClass: (function () {
          var m = {};
          s.forEach(function (x) { var c = x.className || '未填'; if (!m[c]) m[c] = { total: 0, done: 0 }; m[c].total++; if (x.completed) m[c].done++; });
          return m;
        })()
      };
    },

    // ---- 加分 ----
    upsertScore: function (rec) {
      return this.commit(function (s) {
        var exist = s.scores.filter(function (x) { return x.sid === rec.sid; })[0];
        if (exist) { Object.keys(rec).forEach(function (k) { exist[k] = rec[k]; }); return exist; }
        s.scores.unshift(clone(rec)); return rec;
      });
    },
    syncScoresFromStudents: function (rule) {
      var self = this;
      return this.commit(function (s) {
        var added = 0;
        s.students.forEach(function (st) {
          if (!st.completed) return;
          var sc = s.scores.filter(function (x) { return x.sid === st.sid; })[0];
          if (!sc) { added++; s.scores.unshift({ sid: st.sid, name: st.name, className: st.className, task: st.task, score: rule, trace: '系统同步（签到完成）', time: new Date().toISOString() }); }
        });
        return added;
      });
    },
    removeScore: function (sid) {
      return this.commit(function (s) { s.scores = s.scores.filter(function (x) { return x.sid !== sid; }); });
    },

    // ---- 成果 / 照片 ----
    addArchive: function (rec) {
      return this.commit(function (s) {
        var exist = s.archives.filter(function (x) { return x.sid === rec.sid && x.title === rec.title; })[0];
        if (exist) { Object.keys(rec).forEach(function (k) { exist[k] = rec[k]; }); return exist; }
        s.archives.unshift(clone(rec)); return rec;
      });
    },
    removeArchive: function (id) {
      return this.commit(function (s) { s.archives = s.archives.filter(function (x) { return x.id !== id; }); });
    },
    setPhotos: function (list) { return this.commit(function (s) { s.photos = list; }); },

    // ---- 任务看板 ----
    setTaskStatus: function (id, status) {
      return this.commit(function (s) {
        var t = s.tasks.filter(function (x) { return x.id === id; })[0];
        if (t) t.status = status;
        return t;
      });
    },
    addTask: function (rec) {
      return this.commit(function (s) {
        s.tasks.push({ id: 't' + Date.now(), group: rec.group || '自定义', title: rec.title, owner: rec.owner || '负责人', status: 'todo', note: rec.note || '' });
      });
    },
    removeTask: function (id) { return this.commit(function (s) { s.tasks = s.tasks.filter(function (x) { return x.id !== id; }); }); },

    // ---- 设置 ----
    setSetting: function (k, v) { return this.commit(function (s) { s.settings[k] = v; }); },

    // ---- 工具 ----
    nextSid: function () { return '2026' + String(Math.floor(Math.random() * 900000) + 100000); },
    exportJSON: function () { return JSON.stringify(state, null, 2); },
    importJSON: function (text) {
      try {
        var d = JSON.parse(text);
        if (!d || typeof d !== 'object') throw new Error('格式错误');
        Object.keys(SEED).forEach(function (k) { if (d[k] === undefined) d[k] = clone(SEED[k]); });
        state = d; save(state); return { ok: true };
      } catch (e) { return { ok: false, msg: e.message }; }
    }
  };

  global.Store = Store;
})(window);
