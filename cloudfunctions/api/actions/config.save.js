/**
 * actions/config.save.js —— 改配置（只有你能调）
 *
 * 入参：{ patch: { 'ui.successTitle': '今晚吃好的 ❤', 'notify.wecomWebhook': 'https://...' } }
 *
 * 用"点号路径"格式，只写你明确要改的字段，不会覆盖其他内容。
 * 你也可以完全不用这个接口，直接在云开发控制台改 config 文档 —— 效果一样。
 *
 * 出参：{ updated: ['ui.successTitle', ...] }
 */

const { collections } = require('../lib/db');
const { badRequest } = require('../lib/res');

/**
 * 允许通过接口修改的字段（白名单）
 *
 * ⚠️ 注意这里**只放名字**，不放 openid。
 *    改名字只是改显示文案，改错了她自己改回来就行；
 *    但改 openid 会把你俩的权限绑定弄坏 —— 那个只能在控制台动。
 */
const ALLOWED_PREFIXES = ['ui.', 'notify.', 'categories', 'subCategories', 'couple.herName', 'couple.meName'];

module.exports = async function configSave(ctx) {
  const { db, payload } = ctx;
  const patch = (payload && payload.patch) || {};

  const keys = Object.keys(patch);
  if (keys.length === 0) throw badRequest('没有要修改的内容', 'EMPTY_PATCH');

  // 身份绑定（couple.*）故意**不允许**从接口改：
  // 改错了你俩就互相进不了自己的界面，只能去控制台手改，不如一开始就堵住。
  const illegal = keys.filter((k) => !ALLOWED_PREFIXES.some((p) => k === p || k.indexOf(p) === 0));
  if (illegal.length) {
    throw badRequest(
      `这些字段不允许通过接口修改：${illegal.join('、')}。` +
        `（身份绑定请直接在云开发控制台的 config 文档里改）`,
      'FIELD_NOT_ALLOWED'
    );
  }

  // 备注一下：categories 是数组，整组替换
  await db.collection(collections.config).doc('app').update({
    data: Object.assign({}, patch, { updatedAt: db.serverDate() })
  });

  return { updated: keys };
};
