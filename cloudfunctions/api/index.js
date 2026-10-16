/**
 * api/index.js —— 所有业务的唯一入口（路由 + 鉴权）
 *
 * 为什么要这么设计：
 *   开源项目里常见的做法是"每个功能一个云函数"，然后你要在开发者工具里
 *   右键上传 8 次，漏传一个就静默失败。这个项目只上传 1 个：
 *   加新功能时，只要在 actions/ 里加一个文件、在下面 ROUTES 里加一行，
 *   然后重新上传 api 这一个云函数即可。
 *
 * 调用约定（小程序端 utils/api.js 已封装好了，页面不用直接调）：
 *   wx.cloud.callFunction({ name: 'api', data: { action: 'dish.list', payload: {...} } })
 *   成功 → { ok: true, data: ... }
 *   失败 → { ok: false, code: 'XXX', msg: '给人看的话' }
 *
 * 权限模型：
 *   read  所有身份都能调（包括访客）
 *   bind  同上，但允许首次调用时补写自己的 openid（只用于 auth.whoami）
 *   user  需要是"你"或"她"（有身份的两个人）
 *   admin 只有"你"能调（管理页相关）
 *   any   不做身份校验（只给 initData 用，它内部有自己的保护）
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { ok, fail } = require('./lib/res');
const { collections } = require('./lib/db');

/** 路由表：action → { handler, scope } */
const ROUTES = {
  // ---------- 身份（谁都能问自己是谁；首次会顺带完成 openid 绑定）----------
  'auth.whoami': { handler: require('./actions/auth.whoami'), scope: 'bind' },

  // ---------- 读（谁都能看菜单，访客也行）----------
  'dish.list': { handler: require('./actions/dish.list'), scope: 'read' },
  'dish.detail': { handler: require('./actions/dish.detail'), scope: 'read' },

  // ---------- 她和你都能用 ----------
  'order.create': { handler: require('./actions/order.create'), scope: 'user' },
  'order.mine': { handler: require('./actions/order.mine'), scope: 'user' },
  'recipe.step.done': { handler: require('./actions/recipe.step.done'), scope: 'user' }, // M2
  'recipe.note.save': { handler: require('./actions/recipe.note.save'), scope: 'user' }, // M2

  // ---------- 只有你（大厨）能用 ----------
  'dish.save': { handler: require('./actions/dish.save'), scope: 'admin' },
  'dish.toggle': { handler: require('./actions/dish.toggle'), scope: 'admin' },
  'dish.remove': { handler: require('./actions/dish.remove'), scope: 'admin' },
  'order.remove': { handler: require('./actions/order.remove'), scope: 'admin' },
  'config.save': { handler: require('./actions/config.save'), scope: 'admin' },
  'migrate': { handler: require('./actions/migrate'), scope: 'admin' },
  'order.listAll': { handler: require('./actions/order.listAll'), scope: 'admin' },
  'config.listOrders': { handler: require('./actions/order.listAll'), scope: 'admin' }, // 别名，保持向后兼容
  'notify.test': { handler: require('./actions/notify.test'), scope: 'admin' },
  'auth.reassign': { handler: require('./actions/auth.reassign'), scope: 'admin' },

  // ---------- 初始化（用你自己的身份跑一次即可）----------
  'initData': { handler: require('./actions/initData'), scope: 'any' }};

exports.main = async (event) => {
  const action = event && event.action;
  const payload = (event && event.payload) || {};
  const { OPENID } = cloud.getWXContext();

  if (!action) {
    return fail('NO_ACTION', '没有指定 action');
  }

  const route = ROUTES[action];
  if (!route) {
    return fail('UNKNOWN_ACTION', `不认识的 action：${action}`);
  }

  // ---- 身份判定 ----
  const ctx = {
    openid: OPENID,
    action,
    payload,
    db: cloud.database(),
    collections
  };

  try {
    const loaded = await loadConfig(ctx.db);
    ctx.config = loaded.config;
    ctx.configExists = loaded.exists; // auth.whoami 用它决定要不要建 config 文档
    ctx.role = resolveRole(ctx.config, OPENID);

    // ---- 鉴权 ----
    // bind 和 read 都是"谁都能调"；区别只在语义（bind 允许补写自己的 openid）
    if (route.scope === 'admin' && ctx.role !== 'me') {
      return fail('NO_PERMISSION', '这个操作只有大厨（你）能做');
    }
    if (route.scope === 'user' && ctx.role !== 'me' && ctx.role !== 'her') {
      return fail('NO_IDENTITY', '这台设备还没有绑定身份，请让大厨先把小程序发给她打开一次');
    }

    const data = await route.handler(ctx);
    return ok(data);
  } catch (err) {
    console.error(`[api] ${action} 出错：`, err && err.stack ? err.stack : err);
    return wrapError(err);
  }
};

/** 把异常翻译成给用户看的提示 */
function wrapError(err) {
  const msg = String((err && err.message) || err);
  if (/DATABASE_COLLECTION_NOT_EXIST|-502003/i.test(msg)) {
    return fail('NO_COLLECTION', '数据库集合不存在，请按 SETUP.md 第 4 步创建 config / dishes / orders');
  }
  if (/permission denied|-502001/i.test(msg)) {
    return fail('DB_PERMISSION', '数据库权限不足（集合权限请设为「仅创建者可读写」，云函数内部读写不受限制）');
  }
  if (err && err.bizCode) {
    return fail(err.bizCode, err.bizMsg || '操作失败');
  }
  return fail('INTERNAL', '服务端出错了：' + msg);
}

/** 读 config/app；读不到就用默认值（不是错误） */
async function loadConfig(db) {
  const { normalizeConfig, defaultConfig } = require('./lib/defaultConfig');
  try {
    const res = await db.collection(collections.config).doc('app').get();
    return { config: normalizeConfig(res.data), exists: true };
  } catch (e) {
    // 集合还没建 / 文档还不存在，都属于"第一次运行"的正常情况
    console.warn('[api] 读不到 config/app，使用默认配置：', e && e.message);
    return { config: normalizeConfig(defaultConfig()), exists: false };
  }
}

function resolveRole(config, openid) {
  if (!openid) return 'guest';
  if (config.couple && config.couple.meOpenid === openid) return 'me';
  if (config.couple && config.couple.herOpenid === openid) return 'her';
  return 'guest';
}
