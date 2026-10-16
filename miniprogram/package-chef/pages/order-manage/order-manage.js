// package-chef/pages/order-manage/order-manage.js —— 所有订单（你的视角）
//
// 跟她的「点过的菜」页的区别：
//   · 这里显示**所有人**点的单，并标注是谁点的
//   · 每单带 notifyStatus，方便排查"群里怎么没响"
//   · 可以删掉测试订单

const api = require('../../../utils/api');
const { toRelative, toast } = require('../../../utils/format');

Page({
  data: {
    loading: true,
    errMsg: '',
    orders: [],
    failedCount: 0
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
      .call('order.listAll', { limit: 100 })
      .then((res) => {
        const orders = (res.orders || []).map((o) => ({
          _id: o._id,
          who: o.who,
          items: o.items,
          count: o.count,
          remark: o.remark,
          mealDate: o.mealDate,
          timeText: o.createdAt ? toRelative(o.createdAt) : '',
          notifyStatus: o.notifyStatus,
          notifyText:
            o.notifyStatus === 'sent'
              ? '群里已通知 ✓'
              : o.notifyStatus === 'skipped'
              ? '未启用通知'
              : o.notifyStatus === 'failed'
              ? '通知失败：' + (o.notifyError || '未知')
              : '通知状态未知'
        }));

        this.setData({
          loading: false,
          orders,
          failedCount: orders.filter((o) => o.notifyStatus === 'failed').length
        });
      })
      .catch((err) => this.setData({ loading: false, errMsg: (err && err.message) || '加载失败' }));
  },

  onShowNotify(e) {
    const id = e.currentTarget.dataset.id;
    const order = this.data.orders.find((o) => o._id === id);
    if (!order) return;
    wx.showModal({
      title: '通知状态',
      content: order.notifyText + '\n\n（通知失败不影响订单本身，她那边永远显示点菜成功）',
      showCancel: false
    });
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删掉这条订单记录？',
      content: '删了就不在列表里了（菜的"做过次数"不受影响）。',
      confirmColor: '#E45B5B',
      success: (res) => {
        if (!res.confirm) return;
        api
          .call('order.remove', { orderId: id })
          .then(() => {
            toast('已删除');
            this.load();
          })
          .catch(() => {});
      }
    });
  },

  onTapItem(e) {
    const dishId = e.currentTarget.dataset.id;
    if (!dishId) return;
    wx.navigateTo({ url: `/pages/dish-detail/dish-detail?dishId=${dishId}` });
  }
});
