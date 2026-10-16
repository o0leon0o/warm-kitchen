/**
 * cart.js —— 购物车（存在手机本地，不在云端）
 *
 * 为什么放本地而不是云数据库：
 *   购物车是"还没提交的临时选择"，不是业务数据。
 *   如果每点一道菜都要调云函数，她每选一个菜都得等网络转圈 —— 体验会很差。
 *   放本地则点一下立刻有反馈，断网也能选。
 *   （菜品和订单仍然全部走云函数，见 api.js）
 *
 * 数据结构（存在 wx storage 的 'cart' 键里）：
 *   {
 *     items: [{ dishId, name, category, coverImage }],
 *     remarkDraft: '少放辣～',
 *     savedAt: 1760000000000        // 最后一次修改的时间戳
 *   }
 *
 * 注意：**没有份量字段**。你们的约定是"点一份"，两个人吃多少靠手感。
 */

const STORAGE_KEY = 'cart';

/** 购物车有效期：超过这么久没用过就自动清空，避免"昨天想吃红烧肉，今天还在车里" */
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 小时

/** 读原始数据；一起处理掉"过期"这件事 */
function read() {
  let raw = null;
  try {
    raw = wx.getStorageSync(STORAGE_KEY);
  } catch (e) {
    console.warn('[cart] 读取本地购物车失败：', e);
    return emptyCart();
  }

  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) {
    return emptyCart();
  }

  // 过期就丢掉（注意：这里不立刻写回磁盘，等下次写入时自然覆盖）
  if (raw.savedAt && Date.now() - raw.savedAt > MAX_AGE_MS) {
    console.log('[cart] 购物车已超过 12 小时，自动清空');
    return emptyCart();
  }

  return {
    items: raw.items,
    remarkDraft: typeof raw.remarkDraft === 'string' ? raw.remarkDraft : '',
    savedAt: raw.savedAt || Date.now()
  };
}

function emptyCart() {
  return { items: [], remarkDraft: '', savedAt: 0 };
}

/** 写回本地。每次写入都会刷新 savedAt，所以"边选边聊"不会让购物车过期。 */
function write(cart) {
  cart.savedAt = Date.now();
  try {
    wx.setStorageSync(STORAGE_KEY, cart);
  } catch (e) {
    console.error('[cart] 保存本地购物车失败：', e);
  }
  return cart;
}

/** 返回给页面用的购物车 + 一些现成算好的字段 */
function get() {
  const cart = read();
  return {
    items: cart.items,
    remarkDraft: cart.remarkDraft,
    count: cart.items.length,
    dishIds: cart.items.map((it) => it.dishId)
  };
}

/** 这道菜在不在车里 */
function has(dishId) {
  return read().items.some((it) => it.dishId === dishId);
}

/**
 * 加入购物车（已在车里就忽略，不会重复）
 * @param {object} dish 只需要 dishId / name / category / coverImage 这几个字段
 * @returns {object} 更新后的购物车摘要
 */
function add(dish) {
  const cart = read();
  if (!dish || !dish.dishId) return get();

  const exists = cart.items.some((it) => it.dishId === dish.dishId);
  if (!exists) {
    cart.items.push({
      dishId: dish.dishId,
      name: dish.name || '',
      category: dish.category || '',
      coverImage: dish.coverImage || ''
    });
  }
  write(cart);
  return get();
}

/** 从购物车移除 */
function remove(dishId) {
  const cart = read();
  cart.items = cart.items.filter((it) => it.dishId !== dishId);
  write(cart);
  return get();
}

/** 有则删、无则加（点卡片时用这个，一个函数搞定两种行为） */
function toggle(dish) {
  return has(dish.dishId) ? remove(dish.dishId) : add(dish);
}

/** 清空车辆（提交成功后调用） */
function clear() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch (e) {
    console.error('[cart] 清空购物车失败：', e);
  }
}

/** 记下她正在写的备注（还没提交时也要保留，否则退出小程序就丢了） */
function setRemarkDraft(text) {
  const cart = read();
  cart.remarkDraft = String(text || '');
  write(cart);
  return get();
}

/**
 * 用一批菜覆盖购物车 —— 「再来一次」用这个。
 * 传入的是历史订单的 items（含 dishId / name / category）。
 */
function replaceAll(items) {
  const cart = read();
  cart.items = (items || [])
    .filter((it) => it && it.dishId)
    .map((it) => ({
      dishId: it.dishId,
      name: it.name || '',
      category: it.category || '',
      coverImage: it.coverImage || ''
    }));
  write(cart);
  return get();
}

module.exports = {
  MAX_AGE_MS,
  get,
  has,
  add,
  remove,
  toggle,
  clear,
  setRemarkDraft,
  replaceAll
};
