/**
 * actions/auth.whoami.js —— "现在打开小程序的这个人是谁？"
 *
 * 这是小程序启动时第一个被调用的动作。它做两件事：
 *   1. **绑定身份**：如果 config 里还没有人绑定过，把当前 openid 绑成 me（大厨）；
 *      已经有 me 但没有 her，就把当前 openid 绑成 her（她）；都不是就是 guest。
 *   2. 返回身份 + 界面要用的配置（文案、分类、昵称）。
 *
 * ⚠️ 为什么绑定逻辑放在这里，而不是单独一个 login 云函数：
 *    因为前端启动时只调这一个 action。如果绑定逻辑在别的函数里，
 *    那个函数永远不会被执行，"谁是第一个打开的人"就永远绑不上，
 *    结果所有人都是访客。（这个坑我们踩过一次。）
 *
 * 出参：
 *   { openid, role, isAdmin, meName, herName, config: { ui, categories, couple } }
 *
 * role 说明：
 *   me    你（大厨）
 *   her   她
 *   guest 其他微信号（能看到菜单，但下单会被记为 guest）
 */

const { collections } = require('../lib/db');
const { defaultConfig } = require('../lib/defaultConfig');

module.exports = async function authWhoami(ctx) {
  const { db, config, openid, role, configExists } = ctx;

  const couple = config.couple || {};
  const ui = config.ui || {};
  const categories = config.categories || [];

  // ---------- 身份绑定 ----------
  // 全部是"只在需要时才写库"：正常情况下（已经是 me / her）这里一次写操作都不做。
  await bindIdentityIfNeeded(db, config, openid, configExists);

  // 绑定后重新判断身份（第一次打开的那一刻，上面刚把 openid 写进去，
  // 如果直接用 index.js 传进来的 role，界面会慢一拍显示成"访客"）
  let finalRole = role;
  if (couple.meOpenid === openid) finalRole = 'me';
  else if (couple.herOpenid === openid) finalRole = 'her';

  return {
    openid: openid || '',
    role: finalRole,
    isAdmin: finalRole === 'me',
    roleLabel: finalRole === 'me' ? '大厨（你）' : finalRole === 'her' ? '点菜的人' : '访客',
    meName: couple.meName || '大厨',
    herName: couple.herName || '你',

    // 只下发前端要用的部分：
    // webhook 地址、对方的 openid 这类敏感信息**不下发**。
    config: {
      ui: ui,
      categories: categories.filter((c) => c && c.enabled !== false),
      couple: {
        meName: couple.meName || '大厨',
        herName: couple.herName || '你',
        anniversary: couple.anniversary || ''
      }
    }
  };
};

/**
 * 身份绑定。规则：
 *   谁都没绑过 → 当前的人绑成 me（所以你**第一个打开小程序**就是对的）
 *   已绑 me 且当前就是 me → 什么都不做
 *   已绑 me 但还没绑 her → 当前的人绑成 her（她第二次打开时自动完成）
 *   两个都绑了 → 别的微信号就是 guest，不写任何东西
 *
 * 注意：这里会尝试写 config，所以路由的 scope 不能是纯读权限 ——
 * 见 api/index.js 里给 auth.whoami 的 scope: 'bind'。
 */
async function bindIdentityIfNeeded(db, config, openid, configExists) {
  if (!openid) return;

  const coll = db.collection(collections.config);

  // ---------- 情况 A：config 文档还不存在 → 建一个，并把当前的人绑成大厨 ----------
  if (configExists === false) {
    const fresh = defaultConfig();
    fresh.couple.meOpenid = openid;
    config.couple.meOpenid = openid;
    // 顺手把默认昵称也带上，省得你去控制台手改
    fresh.couple.meName = fresh.couple.meName || '大厨';
    try {
      await coll.add({
        data: Object.assign({ _id: 'app' }, fresh, {
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        })
      });
      console.log('[auth.whoami] config 文档不存在，已创建并把首位访问者绑定为 me');
    } catch (e) {
      // 并发情况：两个请求同时到达，另一个已经建好了 → 退化成"补写 openid"
      console.warn('[auth.whoami] 创建 config 失败，改走补写：', e && e.message);
      try {
        await coll.doc('app').update({ data: { 'couple.meOpenid': openid, updatedAt: db.serverDate() } });
      } catch (e2) {
        console.error('[auth.whoami] 兜底也失败了（这次按访客处理）：', e2 && e2.message);
      }
    }
    return;
  }

  // ---------- 情况 B：文档存在，按规则绑定 ----------
  const couple = config.couple || {};
  const hasMe = !!couple.meOpenid;
  const hasHer = !!couple.herOpenid;

  if (hasMe && hasHer) return; // 两个都有人了 → 第三方，什么都不做
  if (couple.meOpenid === openid || couple.herOpenid === openid) return; // 已经是本人

  const patch = { updatedAt: db.serverDate() };

  if (!hasMe) {
    patch['couple.meOpenid'] = openid;
    config.couple.meOpenid = openid;
  } else if (!hasHer) {
    patch['couple.herOpenid'] = openid;
    config.couple.herOpenid = openid;
  }

  try {
    await coll.doc('app').update({ data: patch });
    console.log('[auth.whoami] 已绑定身份：', JSON.stringify(Object.keys(patch)));
  } catch (e) {
    // 绑定失败不该让启动流程崩掉：退化成"访客"，下次打开会再试一次。
    console.error('[auth.whoami] 绑定身份失败（这次按访客处理）：', e && e.message);
  }
}
