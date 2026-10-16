// pages/orders/orders.js —— 历史订单 + 一键「再来一次」
//
// 「再来一次」的实现方式（对应设计里的决定）：
//   不是"重新提交同一单"，而是把那次点的菜**灌回购物车**，
//   她可以在点菜页删掉不想要的、再加两个，然后自己提交。
//   这样这个功能才有用 —— 每次想吃的其实都不会完全一样。

const api = require('../../utils/api');
const cart = require('../../utils/cart');
const { toDateStr } = require('../../utils/format');

Page({
  data: {
    loading: true,
    errMsg: '',
    orders: []
  },

  onLoad() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },

  load() {
    this.setData({ loading: true, errMsg: '' });
    return api
      .call('order.mine', { limit: 30 })
      .then((res) => {
        const orders = (res.orders || []).map((o) => ({
          _id: o._id,
          items: o.items,
          count: o.count,
          remark: o.remark,
          dateText: o.mealDate || (o.createdAt ? toDateStr(o.createdAt) : '')
        }));
        this.setData({ loading: false, orders });
      })
      .catch((err) => {
        this.setData({ loading: false, errMsg: (err && err.message) || '加载失败' });
      });
  },

  /** 把历史订单灌进购物车 */
  onReorder(e) {
    const order = this.data.orders.find((o) => o._id === e.currentTarget.dataset.id);
    if (!order || !order.items.length) return;

    wx.showModal({
      title: '把这一单放进购物车？',
      content: `会清空当前已选的菜，换成这 ${order.items.length} 道。之后你可以再改。`,
      confirmText: '好',
      success: (res) => {
        if (!res.confirm) return;
        cart.replaceAll(order.items);
        wx.showToast({ title: '已放进购物车', icon: 'success' });
        setTimeout(() => wx.reLaunch({ url: '/pages/order/order' }), 700);
      }
    });
  },

  /** 看某道菜的做法 */
  onTapItem(e) {
    const dishId = e.currentTarget.dataset.id;
    if (!dishId) return;
    wx.navigateTo({ url: `/pages/dish-detail/dish-detail?dishId=${dishId}` });
  },

  goOrder() {
    wx.reLaunch({ url: '/pages/order/order' });
  }
});
