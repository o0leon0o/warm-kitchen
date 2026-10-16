// package-chef/pages/cook/cook.js —— 做菜模式
//
// 这是为"手上是油、厨房离手机有点远"的场景设计的页面，所以：
//   · 两种视图可切换：一屏清单（心里有底）⇄ 一步一屏（大字、大按钮）
//   · 屏幕常亮：做菜时手是湿的，手机自动锁屏最烦
//   · 每步可勾掉，勾选状态存在数据库里 → 关掉小程序再打开还在，你俩进度同步
//
// 勾选状态是共享的：你在厨房勾掉第 3 步，她那边刷新也是勾掉的。

const api = require('../../../utils/api');
const { toast } = require('../../../utils/format');

Page({
  data: {
    dishId: '',
    dish: null,
    steps: [],
    ingredients: [],
    loading: true,
    errMsg: '',

    view: 'list',        // 'list' 一屏清单 | 'step' 一步一屏
    current: 1,          // 一步一屏时的当前步
    currentStep: null,   // 当前步对象（提前算好，省得 wxml 里做运算）
    doneCount: 0,
    total: 0,
    progressText: '0 / 0',
    ingredientsOpen: false
  },

  onLoad(options) {
    const dishId = (options && options.dishId) || '';
    if (!dishId) {
      this.setData({ loading: false, errMsg: '没有指定是哪道菜' });
      return;
    }
    this.setData({ dishId });
    this.load();
    // 进做菜模式就一直亮着
    wx.setKeepScreenOn({ keepScreenOn: true, fail: () => {} });
  },

  onUnload() {
    // 离开页面恢复系统默认（省电）
    wx.setKeepScreenOn({ keepScreenOn: false, fail: () => {} });
  },

  load() {
    return api
      .call('dish.detail', { dishId: this.data.dishId })
      .then((dish) => {
        const steps = (dish.recipe && dish.recipe.steps) || [];
        const firstUndone = steps.find((s) => !s.done);

        this.setData({
          loading: false,
          dish,
          steps,
          ingredients: (dish.recipe && dish.recipe.ingredients) || [],
          total: steps.length,
          doneCount: steps.filter((s) => s.done).length,
          current: firstUndone ? firstUndone.order : 1
        });
        this.recalc();
        wx.setNavigationBarTitle({ title: dish.name || '做菜' });
      })
      .catch((err) => this.setData({ loading: false, errMsg: (err && err.message) || '打不开' }));
  },

  /** 统一重算派生数据（避免在 wxml 里写复杂表达式） */
  recalc() {
    const steps = this.data.steps;
    const total = steps.length;
    const doneCount = steps.filter((s) => s.done).length;
    const current = Math.max(1, Math.min(this.data.current, total || 1));
    const currentStep = steps.find((s) => s.order === current) || null;

    this.setData({
      total,
      doneCount,
      current,
      currentStep,
      progressText: `${doneCount} / ${total}`
    });
  },

  onSwitchView(e) {
    const view = e.currentTarget.dataset.view;
    this.setData({ view }, () => this.recalc());
  },

  toggleIngredients() {
    this.setData({ ingredientsOpen: !this.data.ingredientsOpen });
  },

  /** 勾掉 / 取消某一步（先本地更新，再同步到云端，保证点下去立刻有反馈） */
  onToggleStep(e) {
    const order = Number(e.currentTarget.dataset.order);
    const step = this.data.steps.find((s) => s.order === order);
    if (!step) return;

    const nextDone = !step.done;
    const steps = this.data.steps.map((s) =>
      s.order === order ? Object.assign({}, s, { done: nextDone }) : s
    );

    this.setData({ steps }, () => this.recalc());
    wx.vibrateShort({ type: 'light', fail: () => {} });

    // 一步一屏模式下，勾完自动走到下一步
    if (nextDone && this.data.view === 'step' && order < this.data.total) {
      setTimeout(() => this.setData({ current: order + 1 }, () => this.recalc()), 260);
    }

    // 同步云端；失败就把界面改回来，避免"看起来勾了其实没存上"
    api
      .call('recipe.step.done', { dishId: this.data.dishId, stepOrder: order, done: nextDone }, { silent: true })
      .catch((err) => {
        const rollback = this.data.steps.map((s) =>
          s.order === order ? Object.assign({}, s, { done: !nextDone }) : s
        );
        this.setData({ steps: rollback }, () => this.recalc());
        toast((err && err.message) || '这一步没同步上，再试一次');
      });
  },

  onPrev() {
    if (this.data.current <= 1) return;
    this.setData({ current: this.data.current - 1 }, () => this.recalc());
  },

  onNext() {
    if (this.data.current >= this.data.total) return;
    this.setData({ current: this.data.current + 1 }, () => this.recalc());
  },

  /** 全部重来（下次再做这道菜时用） */
  onResetAll() {
    wx.showModal({
      title: '重新开始？',
      content: '所有步骤的勾选会清空。',
      success: (res) => {
        if (!res.confirm) return;
        const steps = this.data.steps.map((s) => Object.assign({}, s, { done: false }));
        this.setData({ steps, current: 1 }, () => this.recalc());
        // 逐步同步（步骤数量很小，不用担心请求太多）
        steps.forEach((s) => {
          api.call('recipe.step.done', { dishId: this.data.dishId, stepOrder: s.order, done: false }, { silent: true }).catch(() => {});
        });
        this.setData({ ingredientsOpen: false });
      }
    });
  },

  /**
   * 记一笔复盘 —— 直接在这里改，不用跳去编辑页。
   * 这是"做完这道菜趁着记忆还在，赶紧记下来"的场景。
   */
  onGoNote() {
    const current = (this.data.dish && this.data.dish.recipe && this.data.dish.recipe.note) || '';
    wx.showModal({
      title: '这次的复盘',
      editable: true,
      placeholderText: '比如：这次火大了 / 盐少了，下次减半',
      content: current, // 带上已有内容，可以续写
      confirmText: '记下',
      success: (res) => {
        if (!res.confirm) return;
        const note = (res.content || '').trim();
        api
          .call('recipe.note.save', { dishId: this.data.dishId, note }, { silent: true })
          .then(() => toast('记下了，只有你能看到'))
          .catch((err) => toast((err && err.message) || '没记上，再试一次'));
      }
    });
  },

  onOpenSource() {
    const url = (this.data.dish && this.data.dish.recipe && this.data.dish.recipe.sourceUrl) || '';
    if (!url) return;
    wx.setClipboardData({ data: url, success: () => toast('链接已复制') });
  }
});
