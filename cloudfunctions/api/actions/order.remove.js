/**
 * actions/order.remove.js —— 删掉一条订单（只有你能调）
 *
 * 入参：{ orderId }
 *
 * ⚠️ 这是**物理删除**，删了就没了。用途是清掉测试订单、或者你俩都觉得
 *    某条记录没意义。历史订单本身不影响任何统计（cookCount 已经加过了）。
 */

const { collections } = require('../lib/db');
const { badRequest } = require('../lib/res');

module.exports = async function orderRemove(ctx) {
  const { db, payload } = ctx;
  const orderId = payload && payload.orderId;

  if (!orderId) throw badRequest('没有指定要删哪条订单');

  await db.collection(collections.orders).doc(orderId).remove();
  return { removed: orderId };
};
