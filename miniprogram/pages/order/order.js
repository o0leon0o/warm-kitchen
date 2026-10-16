// pages/order/order.js —— 点菜首页（她最常用的页面）
//
// 一屏里从下往上有四层：
//   1. 问候语
//   2. 搜索框        ← 菜单超过 20 道之后，它比分类更常用
//   3. 一级分类 tab   ← 主菜 / 素菜 / 汤 / 主食 / 甜品
//   4.（只有主菜才有）二级筛选：猪肉 / 牛肉 / 鸡肉 / 鱼虾 / 其他
//   然后才是菜品卡片 + 底部购物车浮条
//
// 设计取舍（重要）：
//   分类只做 5 个，主菜用"二级筛选"而不是"二级分类"——
//   后者会让数据结构变成树，录菜/改分类/迁移都多一层；
//   前者只是在结果里再滤一下，成本低得多。
//
// 购物车在本地（utils/cart.js），所以点卡片零延迟。

const api = require('../../utils/api');
const cart = require('../../utils/cart');
const { defaultSubCategories, CAT_SCROLL_THRESHOLD } = require('../../utils/theme');

Page({
  data: {
    loading: true,
    errMsg: '',

    // 菜单
    categories: [],
    activeKey: '',
    currentDishes: [],
    currentCategory: null,
    debugTotal: 0,

    // 布局：分类少于等于 5 个时等分铺满一行，超过才可滚动
    catsScrollable: false,

    // 主菜二级筛选
    subCategoriesAll: [], // 云端配置里的全部二级项（原始数据）
    subCategories: [],    // 只包含"当前分类里真的有的"二级项
    activeSub: '',        // '' = 不筛
    hasSub: false,        // 当前分类是否需要显示二级筛选

    // 搜索
    searching: false,
    keyword: '',
    searchResults: [],
    allDishes: [],       // 摊平的全部菜品（搜索用，不再发请求）

    // 文案（来自云端 config，可在数据库里改，不用改代码）
    copy: {
      appTitle: '小厨房',
      emptyMenuText: '菜单还在准备中～',
      cartBarCount: '已选 {n} 道菜',
      remarkPlaceholder: '想说的话（可不写）：比如少放辣～',
      orderButton: '就吃这些'
    },
    herName: '你',

    // 购物车（本地）
    cartItems: [],
    cartCount: 0,
    cartOpen: false,
    remark: '',
    submitting: false
  },

  onLoad() {
    // 先把本地购物车读出来，界面立刻有内容，不等网络
    this.syncCart();
    this.loadIdentity();
    // 菜单交给 onShow 加载（首次进入也会走 onShow，避免重复请求两次）
  },

  onShow() {
    // 从「再来一次」或其他页面回来时，购物车可能变了
    this.syncCart();

    // ⚠️ 这里也要重新拉菜单。
    // 典型场景：在「设置」里灌完预置菜品，返回点菜页 ——
    // 如果只在 onLoad 拉一次，页面会一直停在"菜单还在准备中"，
    // 让人以为灌数据失败了（这个坑我们踩过一次）。
    this.loadMenu();
  },

  onPullDownRefresh() {
    this.loadMenu().then(() => wx.stopPullDownRefresh());
  },

  // ============================================================
  // 身份与购物车
  // ============================================================

  /** 把本地购物车同步到 data */
  syncCart() {
    const c = cart.get();
    this._cartIdSet = {}; // 用对象做集合，O(1) 判断"这道菜在不在车里"
    c.dishIds.forEach((id) => {
      this._cartIdSet[id] = true;
    });

    this.setData({
      cartItems: c.items,
      cartCount: c.count,
      remark: c.remarkDraft || ''
    });

    // 刷新菜品列表上的"已选中"标记
    this.markSelected();
  },

  /**
   * 给列表里的每道菜打上 selected 标记。
   *
   * ⚠️ 为什么不在 WXML 里写 `cartIds.indexOf(item._id) > -1`：
   *    微信 WXML 的表达式解析器**不支持数组方法调用**，写 indexOf 会被静默
   *    当成 undefined，圆圈和高亮永远不出现（这个 bug 我们踩过一次）。
   *    所以判断一律在 JS 里做完，WXML 只读一个布尔字段。
   */
  markSelected() {
    const set = this._cartIdSet || {};
    const apply = (list) => (list || []).map((d) => Object.assign({}, d, { selected: !!set[d._id] }));

    const categories = (this.data.categories || []).map((c) =>
      Object.assign({}, c, { dishes: apply(c.dishes) })
    );

    this.setData({
      categories,
      currentDishes: apply(this.data.currentDishes),
      searchResults: apply(this.data.searchResults)
    });
  },

  /** 读取身份与文案（app.js 启动时已经请求过一次，这里只用缓存） */
  loadIdentity() {
    const user = api.getUser();
    if (user) {
      this.applyIdentity(user);
      return;
    }
    api.readyUser().then((u) => u && this.applyIdentity(u));
  },

  applyIdentity(user) {
    const cfg = user.config || {};
    this.setData({
      herName: (cfg.couple && cfg.couple.herName) || user.herName || '你',
      subCategoriesAll: (cfg.subCategories && cfg.subCategories.length
        ? cfg.subCategories
        : defaultSubCategories
      ).slice(),
      copy: Object.assign({}, this.data.copy, cfg.ui || {}, {
        appTitle: (cfg.ui && cfg.ui.appTitle) || this.data.copy.appTitle
      })
    });
    wx.setNavigationBarTitle({ title: this.data.copy.appTitle || '小厨房' });
  },

  // ============================================================
  // 菜单
  // ============================================================

  loadMenu() {
    this.setData({ loading: true, errMsg: '' });
    return api
      .call('dish.list', {})
      .then((res) => {
        const categories = res.categories || [];
        const activeKey = this.pickActiveKey(categories);

        // 摊平一份全部菜品，给搜索用（搜索不发请求，直接在本地过滤）
        const allDishes = [];
        categories.forEach((c) => {
          (c.dishes || []).forEach((d) =>
            allDishes.push(Object.assign({}, d, { categoryName: c.name, categoryIcon: c.icon }))
          );
        });

        console.log(
          `[点菜页] 服务端返回：菜品总数 ${res.total || 0}，分类数 ${categories.length}` +
            (categories.length ? `（${categories.map((c) => `${c.name}:${c.count}`).join(' ')}）` : '')
        );

        this.setData(
          {
            loading: false,
            debugTotal: res.total || 0,
            allDishes,
            categories,
            catsScrollable: categories.length > CAT_SCROLL_THRESHOLD
          },
          () => {
            this.selectCategory(activeKey, '');
          }
        );
      })
      .catch((err) => {
        this.setData({ loading: false, errMsg: (err && err.message) || '菜单加载失败' });
      });
  },

  /** 保持当前选中的分类（刷新后不要跳回第一个） */
  pickActiveKey(categories) {
    if (!categories.length) return '';
    const stillThere = categories.some((c) => c.key === this.data.activeKey);
    return stillThere ? this.data.activeKey : categories[0].key;
  },

  /**
   * 切换一级分类：算出这个分类的菜品 + 它有哪些二级项
   * @param {string} key        分类 key
   * @param {string} keepSub    '' 表示重置二级筛选；传当前值则保留
   */
  selectCategory(key, keepSub) {
    const cat = (this.data.categories || []).find((c) => c.key === key) || null;
    const dishes = cat ? cat.dishes || [] : [];

    // 这个分类里真的有菜的二级项（没菜的按钮不显示，避免点进去是空的）
    const order = (this.data.subCategoriesAll || defaultSubCategories).map((s) => s.key);
    const present = [];
    dishes.forEach((d) => {
      if (d.subCategory && present.indexOf(d.subCategory) === -1) present.push(d.subCategory);
    });
    const subCategories = order
      .filter((k) => present.indexOf(k) > -1)
      .map((k) => {
        const def = (this.data.subCategoriesAll || defaultSubCategories).find((s) => s.key === k);
        const count = dishes.filter((d) => d.subCategory === k).length;
        return {
          key: k,
          name: (def && def.name) || k,
          icon: (def && def.icon) || '🍽',
          count
        };
      });

    const activeSub = subCategories.some((s) => s.key === keepSub) ? keepSub : '';

    this.setData({
      activeKey: key,
      currentCategory: cat,
      hasSub: subCategories.length > 1, // 只有一项时不显示筛选（没意义）
      subCategories,
      activeSub
    });

    this.applySubFilter();
  },

  applySubFilter() {
    const cat = this.data.currentCategory;
    const dishes = cat ? cat.dishes || [] : [];
    const sub = this.data.activeSub;

    const list = sub ? dishes.filter((d) => d.subCategory === sub) : dishes;
    this.setData({ currentDishes: list });
  },

  onSwitchCategory(e) {
    const key = e.currentTarget.dataset.key;
    if (key === this.data.activeKey) return;
    this.selectCategory(key, '');
    wx.pageScrollTo({ scrollTop: 0, duration: 150 });
  },

  onSwitchSub(e) {
    const key = e.currentTarget.dataset.key || '';
    // 点当前选中的那个 = 取消筛选（回到全部）
    const next = key === this.data.activeSub ? '' : key;
    this.setData({ activeSub: next });
    this.applySubFilter();
    wx.pageScrollTo({ scrollTop: 0, duration: 150 });
  },

  // ============================================================
  // 搜索
  // ============================================================

  onSearchInput(e) {
    const kw = (e.detail.value || '').trim();
    this.setData({ keyword: e.detail.value });

    if (!kw) {
      this.setData({ searching: false, searchResults: [] });
      return;
    }

    const lower = kw.toLowerCase();
    const results = (this.data.allDishes || []).filter((d) => {
      return (
        (d.name || '').toLowerCase().indexOf(lower) > -1 ||
        (d.intro || '').toLowerCase().indexOf(lower) > -1 ||
        (d.tags || []).some((t) => String(t).toLowerCase().indexOf(lower) > -1)
      );
    });

    this.setData({ searching: true, searchResults: results });
    this.markSelected();
  },

  onClearSearch() {
    this.setData({ keyword: '', searching: false, searchResults: [] });
  },

  // ============================================================
  // 菜品操作
  // ============================================================

  /** 点卡片 = 切换购物车状态 */
  onTapDish(e) {
    const dish = e.currentTarget.dataset.dish;
    if (!dish || !dish._id) return;

    cart.toggle({
      dishId: dish._id,
      name: dish.name,
      category: dish.category,
      coverImage: dish.coverImage
    });

    this.syncCart();
    wx.vibrateShort({ type: 'light', fail: () => {} });
  },

  onOpenDetail(e) {
    const dish = e.currentTarget.dataset.dish;
    if (!dish || !dish._id) return;
    wx.navigateTo({ url: `/pages/dish-detail/dish-detail?dishId=${dish._id}` });
  },

  onLongPressDish(e) {
    this.onOpenDetail(e);
  },

  // ============================================================
  // 购物车半屏列表
  // ============================================================

  openCart() {
    if (this.data.cartCount === 0) return;
    this.setData({ cartOpen: true });
  },

  closeCart() {
    this.setData({ cartOpen: false });
  },

  /** 挡住点击：防止点弹层内部时冒泡到遮罩把弹层关掉 */
  noop() {},

  onRemoveFromCart(e) {
    const dishId = e.currentTarget.dataset.id;
    if (!dishId) return;
    cart.remove(dishId);
    this.syncCart();
    if (this.data.cartCount === 0) this.setData({ cartOpen: false });
  },

  /** 她在写备注：本地暂存，退出小程序再回来还在 */
  onRemarkInput(e) {
    const value = e.detail.value;
    this.setData({ remark: value });
    if (this._remarkTimer) clearTimeout(this._remarkTimer);
    this._remarkTimer = setTimeout(() => cart.setRemarkDraft(value), 400);
  },

  // ============================================================
  // 提交
  // ============================================================

  onSubmit() {
    if (this.data.submitting) return;

    if (this.data.cartCount === 0) {
      wx.showToast({ title: '先选几个菜吧', icon: 'none' });
      return;
    }

    const items = this.data.cartItems.map((it) => ({ dishId: it.dishId, name: it.name }));
    const remark = this.data.remark || '';

    this.setData({ submitting: true });
    wx.showLoading({ title: '正在告诉大厨…', mask: true });

    api
      .call(
        'order.create',
        { items, remark },
        { silent: true } // 自己处理错误，因为要顺便提示"哪道菜没了"
      )
      .then((res) => {
        wx.hideLoading();
        this.setData({ submitting: false, cartOpen: false });

        cart.clear();
        this.syncCart();

        if (res.skipped && res.skipped.length) {
          const names = res.skipped.map((s) => s.name).join('、');
          wx.showModal({
            title: '有几道菜没点上',
            content: `${names} 已经不在菜单里了，其他菜已经点好啦。`,
            showCancel: false
          });
        }

        getApp().globalData.lastOrder = res;
        wx.navigateTo({ url: '/pages/order-success/order-success' });
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ submitting: false });

        wx.showModal({
          title: '没能点上',
          content: (err && err.message) || '再试一次吧',
          showCancel: false,
          confirmText: '好'
        });

        if (err && (err.code === 'ALL_INVALID' || err.code === 'BAD_ITEMS')) {
          cart.clear();
          this.syncCart();
          this.loadMenu();
        }
      });
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  }
});
