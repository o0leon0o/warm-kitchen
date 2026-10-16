/**
 * actions/recipe.step.done.js —— 勾掉 / 取消某一步（M2「做菜模式」用）
 *
 * 为什么现在就把接口写好：
 *   数据模型里的 steps[].done / doneAt 字段现在就已经存在（见 dishUtil.js），
 *   M2 做做菜模式时不需要改动数据库结构，直接调这个接口即可。
 *
 * 入参：{ dishId, stepOrder, done }
 * 出参：{ dishId, stepOrder, done, progress: { doneCount, total } }
 *
 * 实现说明（诚实交代一个取舍）：
 *   微信云数据库的数组更新用法比较绕（`steps.$.done` 这种写法会把字面量字段
 *   名写进去而不是嵌套字段），所以这里采用最直白可靠的做法：
 *   **读出整个菜谱 → 在内存里改 → 整组写回**。
 *   代价是你俩恰好同时勾同一步时会"后写覆盖先写"——但两人一起做饭的进度
 *   本来就以最后一个动作为准，不会造成数据损坏。
 */

const { collections } = require('../lib/db');
const { normalizeDish } = require('../lib/dishUtil');
const { badRequest, bizError } = require('../lib/res');

module.exports = async function recipeStepDone(ctx) {
  const { db, payload } = ctx;
  const dishId = payload && payload.dishId;
  const stepOrder = Number(payload && payload.stepOrder);
  const done = !!(payload && payload.done);

  if (!dishId) throw badRequest('没有指定是哪道菜');
  if (!stepOrder) throw badRequest('没有指定是第几步');

  let doc = null;
  try {
    const res = await db.collection(collections.dishes).doc(dishId).get();
    doc = res.data;
  } catch (e) {
    throw bizError('这道菜找不到了', 'DISH_NOT_FOUND');
  }

  const dish = normalizeDish(doc);
  const idx = dish.recipe.steps.findIndex((s) => s.order === stepOrder);
  if (idx === -1) {
    throw bizError(`这道菜没有第 ${stepOrder} 步（一共 ${dish.recipe.steps.length} 步）`, 'STEP_NOT_FOUND');
  }

  dish.recipe.steps[idx].done = done;
  dish.recipe.steps[idx].doneAt = done ? new Date() : null;

  await db
    .collection(collections.dishes)
    .doc(dishId)
    .update({
      data: {
        'recipe.steps': dish.recipe.steps,
        'recipe.updatedAt': new Date(),
        updatedAt: db.serverDate()
      }
    });

  const doneCount = dish.recipe.steps.filter((s) => s.done).length;
  return {
    dishId,
    stepOrder,
    done,
    progress: { doneCount, total: dish.recipe.steps.length }
  };
};
