/**
 * [INPUT]: 本地 JSON 值与可定位的字段路径。
 * [OUTPUT]: 内容和三树编译共用的类型、字段、日期、地址及引用守卫。
 * [POS]: 数据边界的基础检查；只报错，不修改输入，也不推断领域事实。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
export function string(value, path, minimum = 1) {
  if (typeof value !== 'string' || value.trim().length < minimum) fail(path, `需要至少 ${minimum} 个字符的说明`);
}
export function array(value, path) {
  if (!Array.isArray(value)) fail(path, '需要数组');
}
export function object(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, '需要对象');
}
export function validDate(value, path) {
  if (value === undefined) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value) fail(path, '核对日期应是有效的 YYYY-MM-DD');
}
export function validUrl(value, path) {
  let url;
  try { url = new URL(value); } catch { fail(path, '需要完整资料地址'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) fail(path, '只接受普通 HTTP(S) 资料链接');
}
export function shape(value, path, specification) {
  object(value, path);
  const fields = specification.split(/\s+/).filter(Boolean);
  const allowed = fields.map(field => field.replace(/\?$/, ''));
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(path, `不允许字段：${key}`);
  for (const field of fields) if (!field.endsWith('?') && !Object.hasOwn(value, field)) fail(path, `缺少字段：${field}`);
}
export function validateContract(value,path) {
  if(value===undefined) return;
  shape(value,path,'INPUT OUTPUT POS PROTOCOL');
  for(const [key,text] of Object.entries(value)) string(text,`${path}.${key}`);
  if(value.PROTOCOL!=='变更时更新此头部，然后检查 CLAUDE.md') fail(path,'PROTOCOL 固定契约不匹配');
}
export function identity(value, path) {
  string(value, path);
  if (!/^[A-Za-z][A-Za-z0-9._:-]*$/.test(value) || ['constructor','prototype','__proto__'].includes(value)) fail(path, 'ID 格式无效');
}
export function oneOf(value, allowed, path) {
  if (!allowed.includes(value)) fail(path, `只接受 ${allowed.join(' / ')}`);
}
export function strings(value, path, minimum = 0) {
  array(value, path);
  if (value.length < minimum) fail(path, `至少需要 ${minimum} 项`);
  value.forEach((item, index) => string(item, `${path}[${index}]`));
  if (new Set(value).size !== value.length) fail(path, '引用重复');
}
export function positive(value, path) {
  if (!Number.isInteger(value) || value < 1) fail(path, '需要正整数修订');
}
export function reference(value, table, path) {
  string(value, path);
  if (!Object.hasOwn(table, value)) fail(path, `引用不存在：${value}`);
  return table[value];
}
export function references(values, table, path, minimum = 0) {
  strings(values, path, minimum);
  return values.map(id => reference(id, table, path));
}
export function indexRecords(records, path) {
  array(records, path);
  const result = Object.create(null);
  for (const record of records) {
    object(record, path); identity(record.id, `${path}.id`);
    if (Object.hasOwn(result, record.id)) fail(path, `ID 重复：${record.id}`);
    result[record.id] = structuredClone(record);
  }
  return result;
}
