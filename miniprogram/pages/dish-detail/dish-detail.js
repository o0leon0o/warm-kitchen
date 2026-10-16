// pages/dish-detail/dish-detail.js —— 菜品详情 + 菜谱（她能看到的版本）
//
// 她看的是"精简版菜谱"：配料表 + 步骤 + 小贴士 + 你抄的攻略链接。
// 你的复盘笔记（recipe.note）不会下发到她的手机上（见云函数 stripForRole）。

const api = require('../../utils/api');
const cart = require('../../utils/cart');
const { spicyLabel, toast } = require('../../utils/format');

Page({
  data: {
    dishId: '',
    dish: null,
    loading: true,
    errMsg: '',
    spicyText: '',
    inCart: false,
    isAdmin: false
  },

  onLoad(options) {
    const dishId = (options && options.dishId) || '';
    if (!dishId) {
      this.setData({ loading: false, errMsg: '没有指定是哪道菜' });
      return;
    }
    this.setData({ dishId, inCart: cart.has(dishId), isAdmin: !!(api.getUser() || {}).isAdmin });
    this.load();
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },

  load() {
    this.setData({ loading: true, errMsg: '' });
    return api
      .call('dish.detail', { dishId: this.data.dishId })
      .then((dish) => {
        this.setData({
          loading: false,
          dish,
          spicyText: spicyLabel(dish.spicy),
          inCart: cart.has(dish._id)
        });
        wx.setNavigationBarTitle({ title: dish.name || '做法' });
      })
      .catch((err) => {
        this.setData({ loading: false, errMsg: (err && err.message) || '打不开这道菜' });
      });
  },

  /** 加入 / 移出购物车 */
  onToggleCart() {
    const dish = this.data.dish;
    if (!dish) return;
    cart.toggle({
      dishId: dish._id,
      name: dish.name,
      category: dish.category,
      coverImage: dish.coverImage
    });
    const now = cart.has(dish._id);
    this.setData({ inCart: now });
    toast(now ? '已加入今晚的菜单' : '已移出');
  },

  /** 看攻略原文（你当初抄的那个链接） */
  onOpenSource() {
    const recipe = (this.data.dish && this.data.dish.recipe) || {};
    const url = recipe.sourceUrl;
    if (!url) return;
    // 小程序里不能直接打开外部网页：复制链接让她自己在浏览器打开
    wx.setClipboardData({
      data: url,
      success: () => toast('链接已复制，去浏览器打开就能看')
    });
  },

  /** 进入做菜模式（厨师端分包里的页面） */
  onStartCooking() {
    const dish = this.data.dish;
    if (!dish) return;
    const steps = (dish.recipe && dish.recipe.steps) || [];
    if (steps.length === 0) {
      toast('这道菜还没有写做法');
      return;
    }
    wx.navigateTo({ url: `/package-chef/pages/cook/cook?dishId=${dish._id}` });
  },

  /** 你（大厨）从这里直接进编辑页 */
  onEdit() {
    const dish = this.data.dish;
    if (!dish) return;
    wx.navigateTo({ url: `/package-chef/pages/dish-edit/dish-edit?dishId=${dish._id}` });
  }
});
