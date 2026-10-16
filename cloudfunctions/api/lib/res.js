/**
 * lib/res.js —— 统一的返回信封
 *
 * 所有 action 都必须返回这两种形状之一，小程序端 utils/api.js 依赖它。
 */

function ok(data) {
  return { ok: true, data: data === undefined ? null : data };
}

function fail(code, msg, detail) {
  const res = { ok: false, code: code || 'ERROR', msg: msg || '操作失败' };
  if (detail !== undefined) res.detail = detail;
  return res;
}

/**
 * 参数校验失败：抛出去会被 index.js 捕获并转成 fail
 * 用法：if (!payload.dishId) throw badRequest('没有指定菜品');
 */
function badRequest(msg, code) {
  const e = new Error(msg);
  e.bizCode = code || 'BAD_REQUEST';
  e.bizMsg = msg;
  return e;
}

/** 业务错误：同上，但语意更明确（比如"这道菜已经不在菜单里了"） */
function bizError(msg, code) {
  const e = new Error(msg);
  e.bizCode = code || 'BIZ_ERROR';
  e.bizMsg = msg;
  return e;
}

module.exports = { ok, fail, badRequest, bizError };
