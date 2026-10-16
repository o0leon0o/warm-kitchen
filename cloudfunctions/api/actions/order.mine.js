/**
 * actions/order.mine.js —— 她的历史订单（也能看自己点过的）
 *
 * 入参：{ limit?: number }
 * 出参：{ orders: [ { _id, items, remark, mealDate, createdAt, notifyStatus } ] }
 *
 * 只返回"自己点的"订单：
 *   她 → 她自己的
 *   你 → 你自己的（你要看全部订单用「订单管理」页，那是 order.listAll）
 */

const { collections } = require('../lib/db');

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

module.exports = async function orderMine(ctx) {
  const { db, payload, openid } = ctx;

  const limit = Math.min(Number(payload && payload.limit) || DEFAULT_LIMIT, MAX_LIMIT);

  const res = await db
    .collection(collections.orders)
    .where({ openid: openid || '' })
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  const orders = (res.data || []).map((o) => ({
    _id: o._id,
    items: Array.isArray(o.items) ? o.items : [],
    remark: o.remark || '',
    mealDate: o.mealDate || '',
    createdAt: o.createdAt || null,
    count: Array.isArray(o.items) ? o.items.length : 0
  }));

  return { orders };
};
