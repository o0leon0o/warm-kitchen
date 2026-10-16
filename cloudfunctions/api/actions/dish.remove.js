/**
 * actions/dish.remove.js —— 删除一道菜（只有你能调）
 *
 * 入参：{ dishId }
 *
 * ⚠️ 建议优先用「下架」（dish.toggle 的 enabled=false）而不是删除：
 *    下架后她看不到，但历史订单和菜谱还在；删除就真的没了。
 *    如果这道菜已经被点过（cookCount > 0），默认会拒绝删除，
 *    需要显式传 force: true 才允许 —— 防手滑。
 *
 * 入参补充：{ force?: true }
 */

const { collections } = require('../lib/db');
const { badRequest, bizError } = require('../lib/res');

module.exports = async function dishRemove(ctx) {
  const { db, payload } = ctx;
  const dishId = payload && payload.dishId;
  const force = !!(payload && payload.force);

  if (!dishId) throw badRequest('没有指定要删哪道菜');

  let dish = null;
  try {
    const res = await db.collection(collections.dishes).doc(dishId).get();
    dish = res.data;
  } catch (e) {
    return { removed: dishId, alreadyGone: true };
  }

  if (dish && Number(dish.cookCount) > 0 && !force) {
    throw bizError(
      `「${dish.name}」已经被点过 ${dish.cookCount} 次，确定要彻底删掉吗？建议改成"下架"。`,
      'NEED_FORCE'
    );
  }

  await db.collection(collections.dishes).doc(dishId).remove();
  return { removed: dishId, name: (dish && dish.name) || '' };
};
