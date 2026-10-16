/**
 * actions/order.create.js —— 她提交点菜
 *
 * 这是整个项目最关键的一个动作，处理流程（顺序不能变）：
 *   1. 校验：购物车里的菜是否还在架上（她可能把购物车放了一晚上，菜中途被你下架了）
 *   2. 落库：订单先写进数据库 —— 这一步成功了，对她来说就是"点菜成功"
 *   3. 计数：每道菜 cookCount +1（"这道菜做过几次"最诚实的信号）
 *   4. 推送：发企业微信通知（失败只记录状态，绝不影响订单）
 *
 * 入参：
 *   { items: [{ dishId, name }], remark: '少放辣～' }
 * 出参：
 *   { orderId, items, remark, mealDate, skipped, notify: {status, error} }
 */

const { collections } = require('../lib/db');
const { normalizeDish } = require('../lib/dishUtil');
const { badRequest } = require('../lib/res');
const { sendOrderNotify } = require('../lib/notify');

const MAX_ITEMS = 20;
const MAX_REMARK_LEN = 100;

module.exports = async function orderCreate(ctx) {
  const { db, payload, config, role, openid } = ctx;
  const _ = db.command;

  // ---------- 1. 校验入参 ----------
  const rawItems = Array.isArray(payload && payload.items) ? payload.items : [];
  if (rawItems.length === 0) {
    throw badRequest('购物车是空的，先选几个菜吧', 'EMPTY_CART');
  }
  if (rawItems.length > MAX_ITEMS) {
    throw badRequest(`一次最多点 ${MAX_ITEMS} 道菜，分两顿吃吧 😄`, 'TOO_MANY_ITEMS');
  }

  const dishIds = [];
  rawItems.forEach((it) => {
    const id = it && it.dishId;
    if (id && dishIds.indexOf(id) === -1) dishIds.push(id);
  });
  if (dishIds.length === 0) {
    throw badRequest('购物车里的菜数据不对，请重新选一次', 'BAD_ITEMS');
  }

  const remark = String((payload.remark) || '').slice(0, MAX_REMARK_LEN).trim();

  // ---------- 2. 逐个校验菜品依然可点 ----------
  const validItems = [];
  const skipped = [];

  for (const id of dishIds) {
    let dish = null;
    try {
      const res = await db.collection(collections.dishes).doc(id).get();
      dish = normalizeDish(res.data);
    } catch (e) {
      dish = null;
    }

    if (!dish || !dish.enabled) {
      // 找不到 或 已下架：跳过它，不让整单失败（她辛苦选的菜不能白选）
      const fallback = rawItems.find((x) => x && x.dishId === id);
      skipped.push({ dishId: id, name: (dish && dish.name) || (fallback && fallback.name) || '某道菜', reason: dish ? '已下架' : '已被删除' });
      continue;
    }

    validItems.push({
      dishId: dish._id,
      name: dish.name,
      category: dish.category,
      coverImage: dish.coverImage
    });
  }

  if (validItems.length === 0) {
    const names = skipped.map((s) => s.name).join('、');
    throw badRequest(`你选的菜都不在菜单里了（${names}），重新选一下吧`, 'ALL_INVALID');
  }

  // ---------- 3. 落库（北京时间）----------
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const mealDate = now.toISOString().slice(0, 10);

  const orderDoc = {
    openid: openid || '',
    userRole: role === 'her' ? 'girlfriend' : role,
    items: validItems,
    remark,
    mealDate,
    createdAt: db.serverDate(),
    notifyStatus: 'pending',
    notifyError: ''
  };

  const addRes = await db.collection(collections.orders).add({ data: orderDoc });
  const orderId = addRes._id;
  console.log(`[order.create] 订单已创建 ${orderId}，共 ${validItems.length} 道菜`);

  // ---------- 4. cookCount +1（失败不影响下单结果）----------
  await Promise.all(
    validItems.map((it) =>
      db
        .collection(collections.dishes)
        .doc(it.dishId)
        .update({ data: { cookCount: _.inc(1), lastCookedAt: db.serverDate() } })
        .catch((e) => {
          console.warn(`[order.create] 更新 ${it.name} 的 cookCount 失败（不影响订单）：`, e && e.message);
        })
    )
  );

  // ---------- 5. 推送通知（失败只记录）----------
  const notify = await sendOrderNotify(config.notify, orderDoc, config);
  try {
    await db
      .collection(collections.orders)
      .doc(orderId)
      .update({ data: { notifyStatus: notify.status, notifyError: notify.error || '' } });
  } catch (e) {
    console.warn('[order.create] 回写通知状态失败：', e && e.message);
  }

  return {
    orderId,
    items: validItems,
    remark,
    mealDate,
    skipped,
    notify
  };
};
