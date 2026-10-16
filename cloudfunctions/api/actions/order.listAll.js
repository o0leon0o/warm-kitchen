/**
 * actions/order.listAll.js —— 订单管理（只有你能调）
 *
 * 入参：{ limit?: number, includeRemoved?: false }
 * 出参：{ orders: [...] }
 *
 * 和 order.mine 的区别：这里返回**所有人**的订单，并且带通知状态，
 * 方便你排查"为什么群里没响"。
 */

const { collections } = require('../lib/db');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

module.exports = async function orderListAll(ctx) {
  const { db, payload, config } = ctx;
  const limit = Math.min(Number(payload && payload.limit) || DEFAULT_LIMIT, MAX_LIMIT);

  const res = await db
    .collection(collections.orders)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  const couple = (config && config.couple) || {};

  const orders = (res.data || []).map((o) => ({
    _id: o._id,
    openid: o.openid,
    who:
      o.openid === couple.herOpenid
        ? couple.herName || '她'
        : o.openid === couple.meOpenid
        ? couple.meName || '大厨'
        : '其他人',
    items: Array.isArray(o.items) ? o.items : [],
    count: Array.isArray(o.items) ? o.items.length : 0,
    remark: o.remark || '',
    mealDate: o.mealDate || '',
    createdAt: o.createdAt || null,
    notifyStatus: o.notifyStatus || '',
    notifyError: o.notifyError || ''
  }));

  return { orders };
};
