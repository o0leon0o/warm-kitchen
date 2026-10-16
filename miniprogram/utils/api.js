/**
 * api.js —— 所有和云端通信的唯一出口
 *
 * 设计原则：页面里**不允许**出现 wx.cloud.callFunction 或 wx.cloud.database()。
 * 页面只写：const data = await api.call('dish.list', {...});
 *
 * 好处：
 *   - 后端怎么实现，跟页面无关（以后换成自建服务器，只改这一个文件）
 *   - 错误提示、loading、超时全部在这里统一处理，页面代码不用重复写
 *
 * 云函数的返回约定（所有 action 都遵守）：
 *   成功 → { ok: true, data: <结果> }
 *   失败 → { ok: false, code: 'XXX', msg: '给人看的话' }
 */

// ------------------------------------------------------------
// 云开发状态与身份缓存
//
// ⚠️ 这里刻意**不用 getApp()** 来判断"云是否就绪"。
//    在 App 的 onLaunch 阶段调用 getApp() 有可能返回 undefined
//    （App 实例还没注册完成），会导致所有云调用被误拦。
//    这个坑我们踩过一次，所以状态显式记录在模块变量里。
// ------------------------------------------------------------
let cloudInited = false; // 云开发是否初始化完成
let envValue = '';       // 云环境 ID（诊断用）
let cachedUser = null;   // 身份缓存（app.js 启动时写进来）

/** 由 app.js 在云开发初始化完成后调用 */
function init(env) {
  cloudInited = true;
  envValue = env || '';
}

/** 查询云是否就绪（诊断用） */
function isCloudReady() {
  return cloudInited;
}

/** 由 app.js 在身份识别成功后调用，缓存一份给页面用 */
function setUser(user) {
  cachedUser = user || null;
  return cachedUser;
}

/** 拿到当前身份（页面通常直接用它，不发请求） */
function getUser() {
  return cachedUser;
}

/** 等身份就绪（页面 onLoad 里可以 await 它）；拿不到就返回 null，不阻塞渲染 */
function readyUser() {
  const app = safeApp();
  if (!app || !app.ready) return Promise.resolve(cachedUser);
  return app.ready
    .then(() => app.globalData.user)
    .catch(() => cachedUser);
}

/**
 * 调用云函数 api。
 * @param {string} action  业务名，例如 'dish.list'、'order.create'
 * @param {object} payload 参数
 * @param {object} options
 *   - loading: true 时显示"加载中"转圈（默认 false）
 *   - silent : true 时失败不弹提示（默认 false）
 */
function call(action, payload, options) {
  const opts = options || {};
  if (opts.loading) {
    wx.showLoading({ title: '稍等…', mask: true });
  }

  return callRaw(action, payload)
    .then((result) => {
      if (opts.loading) wx.hideLoading();
      return result;
    })
    .catch((err) => {
      if (opts.loading) wx.hideLoading();
      if (!opts.silent) {
        showFriendlyError(err, action);
      }
      // 继续抛出，让页面自己决定要不要显示空状态
      throw err;
    });
}

/** 真正发请求，并把云函数的返回信封拆开 */
function callRaw(action, payload) {
  if (!cloudInited) {
    return Promise.reject(makeError('NOT_READY', buildNotReadyMessage()));
  }

  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'api',
      data: { action: action, payload: payload || {} },
      success: (res) => {
        const envelope = res && res.result;

        // 云函数自身崩了（语法错误、超时、内存超限等），拿不到我们的返回信封
        if (!envelope || typeof envelope !== 'object') {
          reject(makeError('BAD_RESPONSE', '云端没有返回数据，可能云函数 api 还没上传成功'));
          return;
        }

        if (envelope.ok) {
          resolve(envelope.data);
        } else {
          const e = makeError(envelope.code || 'BIZ_ERROR', envelope.msg || '操作失败');
          e.detail = envelope.detail;
          reject(e);
        }
      },
      fail: (err) => {
        reject(makeError('NETWORK', translateCallFail(err), err));
      }
    });
  });
}

// ------------------------------------------------------------
// 内部工具
// ------------------------------------------------------------

/** 安全地取 App 实例（onLaunch 阶段 getApp() 可能返回 undefined） */
function safeApp() {
  try {
    return getApp() || null;
  } catch (e) {
    return null;
  }
}

function makeError(code, msg, raw) {
  const e = new Error(msg);
  e.code = code;
  e.raw = raw;
  return e;
}

function buildNotReadyMessage() {
  return (
    `云开发还没初始化好。\n\n` +
    `env = ${envValue || '未传到 api.init()'}\n` +
    `说明：app.js 的 initCloud() 没有走到最后一步。\n` +
    `\n请把上面这几行发给 AI。`
  );
}

/** 把底层报错翻译成人话 */
function translateCallFail(err) {
  const msg = (err && (err.errMsg || err.message)) || '';

  if (/FunctionName parameter could not be found|function not found|-501000/i.test(msg)) {
    return '云函数 api 不存在，可能还没上传成功（见 SETUP.md 第 5 步）';
  }
  if (/env check invalid|environment not found|INVALID_ENV|env.*not.*exist/i.test(msg)) {
    return `云环境 ID 不对：${envValue}\n请跟云开发控制台左上角显示的 ID 逐字对比`;
  }
  if (/timeout|超时/i.test(msg)) {
    return '请求超时了，检查一下网络';
  }
  if (/collection|DATABASE_COLLECTION_NOT_EXIST|-502003/i.test(msg)) {
    return '数据库集合不存在，请检查是否建了 config / dishes / orders 三个集合';
  }
  if (/cloud.*not.*init|未初始化/i.test(msg)) {
    return '云开发未初始化（app.js 里的 CLOUD_ENV 或 wx.cloud.init 有问题）';
  }
  return '网络不太顺，待会儿再试试' + (msg ? `\n(${msg})` : '');
}

/** 统一的失败提示：出错时把技术细节也打出来，方便你复制给 AI 排查 */
function showFriendlyError(err, action) {
  const msg = (err && err.message) || '操作失败了';
  console.error(`[api] ${action} 失败：`, err);
  wx.showModal({
    title: '出错了',
    content: `${msg}\n\n(动作：${action})`,
    showCancel: false,
    confirmText: '知道了'
  });
}

module.exports = {
  init,
  setUser,
  getUser,
  readyUser,
  isCloudReady,
  call,
  translateCallFail
};
