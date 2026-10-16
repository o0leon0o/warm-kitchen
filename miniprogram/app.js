/**
 * app.js —— 小程序入口
 *
 * 这个文件只做两件必须"全局只做一次"的事：
 *   1. 初始化云开发环境
 *   2. 请求一次身份（谁是大厨、谁是点菜的人），并缓存给页面用
 *
 * 业务逻辑不写在这里。业务都在云函数的 api/actions/ 下面。
 */

// ============================================================
// ★ cloudEnv：你的云开发环境 ID（已填好）
// 在哪找：微信开发者工具 → 点顶部「云开发」按钮 → 控制台左上角
// 改完这个值之后，需要点一次「编译」才会生效。
// ============================================================
const CLOUD_ENV = 'cloud1-d4gbr8gkwecbf15ab';

const api = require('./utils/api.js');

App({
  globalData: {
    /** 云环境 ID，方便排查问题时打印出来看 */
    cloudEnv: CLOUD_ENV,

    /** 云开发是否初始化完成 */
    cloudReady: false,

    /** 初始化失败的原因（诊断用） */
    cloudInitError: '',

    /**
     * 身份信息，由 login 云函数返回：
     * { openid, role, meName, herName, config }
     *
     * role 的含义：
     *   me      = 你（大厨），能进管理页
     *   her     = 她，主要用户
     *   guest   = 既不是你也不是她的其他微信号
     */
    user: null
  },

  onLaunch() {
    this.initCloud();
  },

  initCloud() {
    const g = this.globalData;

    // ---------- 前置检查 1：基础库是否支持云开发 ----------
    if (!wx.cloud) {
      g.cloudInitError = '当前微信基础库版本过低，不支持云开发。请升级微信客户端。';
      console.error('[app] ' + g.cloudInitError);
      return;
    }

    // ---------- 前置检查 2：环境 ID 是否还是占位符 ----------
    if (!CLOUD_ENV || CLOUD_ENV.indexOf('REPLACE_WITH') === 0) {
      g.cloudInitError = 'CLOUD_ENV 还是占位符，没填云环境 ID（miniprogram/app.js 第 17 行）';
      console.error('[app] ' + g.cloudInitError);
      return;
    }

    // ---------- 真正初始化 ----------
    //
    // ⚠️ 只在有多个云环境时才需要传 env。这里我们只有一个环境，
    //    传 env 是为了明确，但也保留兜底：万一 env 字符串有问题，
    //    再试一次不带参数的初始化（SDK 会取默认环境）。
    let inited = false;
    try {
      wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
      inited = true;
    } catch (err) {
      console.warn('[app] wx.cloud.init({env}) 失败，尝试不带 env 兜底：', err && err.message);
      try {
        wx.cloud.init({ traceUser: true });
        inited = true;
        g.cloudEnv = '(默认环境)';
      } catch (err2) {
        g.cloudInitError = 'wx.cloud.init 失败：' + ((err2 && err2.message) || err2);
        console.error('[app] ' + g.cloudInitError);
        return;
      }
    }

    if (!inited) return;

    // ---------- 把状态告诉 api.js ----------
    //
    // 注意：这里刻意把状态存在 api.js 的模块变量里，而不是让 api.js 去 getApp()。
    // 原因：在 onLaunch 阶段 getApp() 有可能返回 undefined（App 实例还没注册完），
    //      那样"云是否就绪"会被误判成 false，所有云调用都会被拦掉。
    api.init(g.cloudEnv);
    g.cloudReady = true;

    console.log(
      `[app] 云开发初始化完成 ✓  env = ${g.cloudEnv}\n` +
        `（如果下面报"环境不存在"，说明这串 ID 和云开发控制台左上角显示的不一致）`
    );

    // ---------- 识别身份 ----------
    this.ready = api
      .call('auth.whoami', {})
      .then((res) => {
        g.user = res;
        api.setUser(res);
        console.log('[app] 身份识别完成：', res.role, res.openid);
        return res;
      })
      .catch((err) => {
        // 失败了不阻塞页面渲染：页面会显示错误提示，用户下拉可以重试。
        g.cloudInitError = (err && err.message) || String(err);
        console.error('[app] 身份识别失败：', err);
        throw err;
      });
  }
});
