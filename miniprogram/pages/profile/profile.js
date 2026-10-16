// pages/profile/profile.js —— 「我的」页
//
// 两个作用：
//   1. 她自己看：身份、点过多少单、快捷入口（历史订单）
//   2. 你的隐藏入口：**连点标题 5 次**后出现「管理」板块
//
// 为什么用连点而不是显式按钮：
//   她每天看到的就是这个页面，多一个"管理"按钮会让她觉得这个东西有一半不是给她的。
//   藏起来之后，她看到的界面 100% 是"点菜的"，而你的管理入口一直都在（解锁状态记在本地）。
//
// ⚠️ 注意：这只是"界面上的隐藏"，真正的权限校验在云函数里（只有你的 openid 能调管理接口）。
//    就算她自己解锁了这个入口，点进去也只会看到"这个操作只有大厨能做"。

const api = require('../../utils/api');

const UNLOCK_KEY = 'adminUnlocked';
const TAP_NEEDED = 5;
const TAP_WINDOW_MS = 2500;

Page({
  data: {
    role: '',
    roleText: '',
    meName: '大厨',
    herName: '你',
    isAdmin: false,
    adminUnlocked: false,
    tapCount: 0,
    openidShort: '',
    myOrderCount: 0,
    loading: true
  },

  onLoad() {
    this.setData({ adminUnlocked: !!wx.getStorageSync(UNLOCK_KEY) });
    this.loadIdentity();
    this.loadStats();
  },

  onShow() {
    // 从管理页回来时可能身份变了（比如交换过绑定）
    this.loadIdentity();
  },

  loadIdentity() {
    const apply = (user) => {
      if (!user) {
        this.setData({ loading: false });
        return;
      }
      const cfg = user.config || {};
      const couple = cfg.couple || {};
      this.setData({
        loading: false,
        role: user.role,
        isAdmin: !!user.isAdmin,
        meName: couple.meName || user.meName || '大厨',
        herName: couple.herName || user.herName || '你',
        openidShort: user.openid ? user.openid.slice(-6) : '',
        roleText: user.role === 'me' ? '大厨（你）' : user.role === 'her' ? '点菜的人' : '访客'
      });
    };

    const cached = api.getUser();
    if (cached) {
      apply(cached);
    } else {
      api.readyUser().then(apply);
    }
  },

  loadStats() {
    api
      .call('order.mine', { limit: 100 }, { silent: true })
      .then((res) => this.setData({ myOrderCount: (res.orders || []).length }))
      .catch(() => {});
  },

  /** 连点标题 5 次解锁管理入口 */
  onTapTitle() {
    const now = Date.now();
    if (!this._lastTap || now - this._lastTap > TAP_WINDOW_MS) {
      this._tapCount = 0;
    }
    this._lastTap = now;
    this._tapCount = (this._tapCount || 0) + 1;

    const left = TAP_NEEDED - this._tapCount;

    if (left > 0) {
      if (left <= 2) wx.showToast({ title: `再点 ${left} 下`, icon: 'none', duration: 600 });
      return;
    }

    this._tapCount = 0;
    wx.setStorageSync(UNLOCK_KEY, true);
    this.setData({ adminUnlocked: true });
    wx.showToast({ title: '管理入口已出现', icon: 'none' });
  },

  /** 隐藏管理入口（她自己不可能点到，主要给你用） */
  onLockAdmin() {
    wx.showModal({
      title: '藏起来？',
      content: '管理入口会消失，再连点标题 5 次就能重新出现。',
      success: (res) => {
        if (!res.confirm) return;
        wx.removeStorageSync(UNLOCK_KEY);
        this.setData({ adminUnlocked: false });
      }
    });
  },

  // ---------- 导航 ----------
  go(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.navigateTo({ url });
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  },

  goOrder() {
    wx.switchTab({ url: '/pages/order/order' });
  }
});
