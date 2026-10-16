/**
 * actions/auth.reassign.js —— 交换你俩的身份绑定（只有你能调）
 *
 * 什么时候用：
 *   如果她比你更早打开小程序，她会被绑成 me（大厨），你变成 her。
 *   这时候用这个接口把两个 openid 换回来，不用去控制台手改。
 *
 * 入参：{ swap: true }   ← 必须显式传 true，防手滑
 * 出参：{ ok, meOpenid, herOpenid }
 */

const { collections } = require('../lib/db');
const { badRequest } = require('../lib/res');

module.exports = async function authReassign(ctx) {
  const { db, payload, config, openid } = ctx;

  if (!(payload && payload.swap === true)) {
    throw badRequest(
      '这个操作会交换你俩的身份，需要显式确认。请传 { swap: true } 再试一次。',
      'NEED_CONFIRM'
    );
  }

  const couple = (config && config.couple) || {};
  const me = couple.meOpenid || '';
  const her = couple.herOpenid || '';

  if (!me || !her) {
    throw badRequest(
      '现在只有一个人绑定过，不需要交换。' +
        '（如果她还没打开过小程序，先让她打开一次，再回来交换）',
      'NOT_ENOUGH_USERS'
    );
  }

  await db.collection(collections.config).doc('app').update({
    data: {
      'couple.meOpenid': her,
      'couple.herOpenid': me,
      updatedAt: db.serverDate()
    }
  });

  console.log(`[auth.reassign] 身份已交换（由 ${openid} 触发）`);
  return { ok: true, meOpenid: her, herOpenid: me };
};
