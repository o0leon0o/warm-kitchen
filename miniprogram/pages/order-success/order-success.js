// pages/order-success/order-success.js —— 提交成功后的庆祝页
//
// 数据来源：order.create 的返回值（存在 app.globalData.lastOrder），
// 所以这个页面**不需要再查一次数据库**，她点完立刻就能看到结果。

const { toRelative } = require('../../utils/format');
const api = require('../../utils/api');

Page({
  data: {
    order: null,
    copy: {
      successTitle: '今晚有口福啦 ❤',
      successSubtitle: '我们马上开火 🔥'
    },
    herName: '你',
    timeText: '',
    // 入场动画的状态
    showTitle: false,
    showList: false
  },

  onLoad() {
    const app = getApp();
    const order = app.globalData.lastOrder;

    if (!order) {
      // 直接进入这个页面（比如从历史记录点进来的旧链接），回点菜页
      wx.redirectTo({ url: '/pages/order/order' });
      return;
    }

    const user = api.getUser() || {};
    const cfg = user.config || {};

    this.setData({
      order,
      herName: (cfg.couple && cfg.couple.herName) || user.herName || '你',
      copy: Object.assign({}, this.data.copy, cfg.ui || {}),
      timeText: toRelative(new Date())
    });

    // 分两拍做入场动画：先出标题，再出清单，比一次性全亮更有仪式感
    setTimeout(() => this.setData({ showTitle: true }), 60);
    setTimeout(() => this.setData({ showList: true }), 320);
  },

  /** 继续点菜（回到点菜页，购物车已经清空了） */
  onContinue() {
    wx.reLaunch({ url: '/pages/order/order' });
  },

  /** 看历史订单 */
  onViewOrders() {
    wx.redirectTo({ url: '/pages/orders/orders' });
  },

  /** 长按可以看看通知发出去没有（排查"群里怎么没响"用） */
  onLongPressHint() {
    const n = this.data.order && this.data.order.notify;
    if (!n) return;
    const text =
      n.status === 'sent'
        ? '通知已经发到你们的群里了 ✓'
        : n.status === 'skipped'
        ? `没有发送通知：${n.error || '未启用'}`
        : `通知发送失败：${n.error || '未知原因'}\n（订单本身是成功的，不影响）`;
    wx.showModal({ title: '通知状态', content: text, showCancel: false });
  }
});
