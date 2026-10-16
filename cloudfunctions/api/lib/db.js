/**
 * lib/db.js —— 集合名集中定义
 *
 * 集合名写错是新手最常见的问题之一（大小写差一个字母就报"集合不存在"），
 * 所以全项目只在**这里**写一次，其他地方一律引用常量。
 */

const collections = {
  /** 你俩的身份、界面文案、webhook、分类（单文档，_id = 'app'） */
  config: 'config',
  /** 菜品 + 内嵌菜谱 */
  dishes: 'dishes',
  /** 订单 */
  orders: 'orders'
};

/** 分页默认值：一次最多取多少条 */
const PAGE_SIZE = 20;

module.exports = { collections, PAGE_SIZE };
