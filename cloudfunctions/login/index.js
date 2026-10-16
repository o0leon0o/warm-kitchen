/**
 * login 云函数 —— 只负责一件事：搞清楚"现在打开小程序的这个人是谁"
 *
 * 为什么单独一个云函数（而不是塞进 api）：
 *   小程序的每次冷启动都要调它一次，需要它尽快返回；
 *   而且它的逻辑跟业务无关，出错原因也完全不同，单独放便于排查。
 *
 * 返回：
 *   {
 *     openid: 'oXXXX',
 *     role: 'me' | 'her' | 'guest' | 'unbound',
 *     meName, herName,
 *     isAdmin: true/false,
 *     config: { ui, categories, couple }   // 只返回前端需要的部分，webhook 这类敏感信息不返回
 *   }
 *
 * role 说明：
 *   me      你（大厨），能进管理页
 *   her     她，主要用户
 *   guest   其他微信号（能看到菜单，但下单会被标记为 guest）
 *   unbound 还没有人绑定过 —— 通常是你第一次打开，此时把 meOpenid 补上
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const CONFIG_COLL = 'config';
const CONFIG_ID = 'app';

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) {
    return fail('NO_OPENID', '拿不到你的微信身份，请重新打开小程序');
  }

  try {
    const coll = db.collection(CONFIG_COLL);
    let doc = null;

    try {
      const res = await coll.doc(CONFIG_ID).get();
      doc = res.data;
    } catch (e) {
      // 记录不存在是正常情况（第一次运行时），不是错误
      doc = null;
    }

    const isFirstTime = !doc;
    const config = doc ? normalizeConfig(doc) : defaultConfig();
    const couple = config.couple;
    const patch = {};

    // ---- 判定身份，并在需要时补写 openid ----
    if (!couple.meOpenid && !couple.herOpenid) {
      // 谁都没绑过：第一个人（你）绑成 me
      couple.meOpenid = OPENID;
      patch['couple.meOpenid'] = OPENID;
    } else if (couple.meOpenid === OPENID) {
      // 就是你，什么都不用做
    } else if (!couple.herOpenid) {
      // 已经绑过你了，第二个出现的人（她）绑成 her
      couple.herOpenid = OPENID;
      patch['couple.herOpenid'] = OPENID;
    } else if (couple.herOpenid === OPENID) {
      // 就是她
    }
    // 其他情况：第三方微信号，不写任何东西，role 会是 guest

    // ---- 落库 ----
    if (isFirstTime) {
      await coll.add({
        data: Object.assign({ _id: CONFIG_ID }, config, {
          createdAt: new Date(),
          updatedAt: new Date()
        })
      });
      console.log('[login] 首次运行，已创建 config/app，并把首位访问者绑定为 me');
    } else if (Object.keys(patch).length) {
      patch.updatedAt = new Date();
      await coll.doc(CONFIG_ID).update({ data: patch });
      console.log('[login] 已补写身份绑定：', JSON.stringify(patch));
    }

    let role = 'guest';
    if (couple.meOpenid === OPENID) role = 'me';
    else if (couple.herOpenid === OPENID) role = 'her';

    return {
      ok: true,
      data: {
        openid: OPENID,
        role,
        isAdmin: role === 'me',
        meName: couple.meName || '大厨',
        herName: couple.herName || '你',
        config: publicConfig(config),
        isFirstTime
      }
    };
  } catch (err) {
    console.error('[login] 失败：', err);
    // 集合不存在是最常见的失败原因，给它一句人话
    if (/collection|DATABASE_COLLECTION_NOT_EXIST|-502003/i.test(String(err && err.message))) {
      return fail('NO_COLLECTION', '数据库里没有 config 集合，请先按 SETUP.md 第 4 步创建三个集合');
    }
    return fail('LOGIN_FAILED', '身份识别失败：' + ((err && err.message) || err));
  }
};

function fail(code, msg) {
  return { ok: false, code, msg };
}

/** 补齐缺失字段：即使你在控制台手改 config 时删了某个字段，程序也不会崩 */
function normalizeConfig(doc) {
  const base = defaultConfig();
  const c = Object.assign({}, base, doc);
  c.couple = Object.assign({}, base.couple, doc.couple || {});
  c.ui = Object.assign({}, base.ui, doc.ui || {});
  c.notify = Object.assign({}, base.notify, doc.notify || {});
  // 分类以数据库为准（允许你自由增删），空了才用默认
  if (!Array.isArray(doc.categories) || doc.categories.length === 0) {
    c.categories = base.categories;
  }
  return c;
}

/** 只给前端看的字段：企微 webhook、对方的 openid 这类敏感信息不下发 */
function publicConfig(config) {
  return {
    ui: config.ui,
    categories: config.categories.filter((x) => x && x.enabled !== false),
    couple: {
      meName: config.couple.meName,
      herName: config.couple.herName,
      anniversary: config.couple.anniversary || ''
    }
  };
}

function defaultConfig() {
  return {
    couple: {
      meOpenid: '',
      meName: '大厨',
      herOpenid: '',
      herName: '你',
      anniversary: ''
    },
    ui: {
      appTitle: '小厨房',
      emptyMenuText: '菜单还在准备中～',
      orderButton: '就吃这些',
      successTitle: '今晚有口福啦 ❤',
      successSubtitle: '我们马上开火 🔥',
      cartBarCount: '已选 {n} 道菜',
      remarkPlaceholder: '想说的话（可不写）：比如少放辣～'
    },
    notify: {
      wecomWebhook: '',
      enabled: false,
      atMobiles: []
    },
    categories: [
      { key: 'main', name: '主菜', icon: '🍗', enabled: true },
      { key: 'veg', name: '素菜', icon: '🥗', enabled: true },
      { key: 'soup', name: '汤', icon: '🍲', enabled: true },
      { key: 'staple', name: '主食', icon: '🍜', enabled: true },
      { key: 'dessert', name: '甜品', icon: '🍰', enabled: true }
    ],
    subCategories: [
      { key: 'pork', name: '猪肉', icon: '🐷' },
      { key: 'beef', name: '牛肉', icon: '🐮' },
      { key: 'lamb', name: '羊肉', icon: '🐑' },
      { key: 'chicken', name: '鸡肉', icon: '🐔' },
      { key: 'fish', name: '鱼虾', icon: '🦐' },
      { key: 'egg', name: '蛋类', icon: '🥚' },
      { key: 'other', name: '其他', icon: '🍽' }
    ],
    seeded: false
  };
}
