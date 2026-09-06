/**
 * [INPUT]: 读取 content.json 的真实样板，调用 validate.mjs 的内容边界校验。
 * [OUTPUT]: 可直接运行的机械检查；报告通过数量，失败时以断言错误结束，不写内容或产物。
 * [POS]: design 的回归入口，在内存变异真实数据，检查身份、引用、关联投影与三条入口共享内容的约束。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateContent} from './validate.mjs';

const original = readFileSync(new URL('./content.json', import.meta.url), 'utf8');
const fixture = JSON.parse(original);
const pristine = JSON.stringify(fixture);
let passed = 0;

// --- 真实内容必须通过；校验不能偷偷修改传入对象 ---
assert.deepEqual(validateContent(fixture), {
  concepts: fixture.concepts.length,
  resources: fixture.resources.length,
  relations: fixture.relations.length,
  sources: fixture.sources.length,
  routes: fixture.routes.length,
});
assert.equal(JSON.stringify(fixture), pristine);
passed++;

function rejects(name, mutate, path) {
  const copy = JSON.parse(pristine);
  mutate(copy);
  assert.throws(() => validateContent(copy), error => {
    assert.ok(error instanceof Error, `${name} 应抛出 Error`);
    assert.ok(error.message.startsWith(`${path}:`), `${name} 错误路径不符：${error.message}`);
    return true;
  }, name);
  passed++;
}

function accepts(name, mutate) {
  const copy = JSON.parse(pristine);
  mutate(copy);
  assert.doesNotThrow(() => validateContent(copy), name);
  passed++;
}

// --- 身份与引用：重名不能覆盖，存在但类型错误的引用也必须拒绝 ---
rejects('重复概念身份', data => {
  data.concepts.push({...data.concepts[0]});
}, `content.concepts[${fixture.concepts.length}].id`);
rejects('概念与资源身份冲突', data => {
  data.resources[0].id = data.concepts[0].id;
}, 'content.resources[0].id');
rejects('失效资源引用', data => {
  data.concepts[0].resourceIds = ['missing-resource'];
}, 'content.concepts[0].resourceIds[0]');
rejects('资源引用误指向概念', data => {
  data.concepts[0].resourceIds = [data.concepts[0].id];
}, 'content.concepts[0].resourceIds[0]');
rejects('失效来源引用', data => {
  data.resources[0].sourceIds = ['missing-source'];
}, 'content.resources[0].sourceIds[0]');
rejects('资源缺少来源', data => {
  data.resources[0].sourceIds = [];
}, 'content.resources[0].sourceIds');
rejects('必要字段只有空白', data => {
  data.concepts[0].boundary = '  ';
}, 'content.concepts[0].boundary');

// --- 关联投影：有效 ID 不能掩盖清单与实现关系彼此矛盾 ---
rejects('资源反向清单漏项', data => {
  const resource = data.resources.find(item => item.id === data.concepts[0].resourceIds[0]);
  resource.conceptIds = resource.conceptIds.filter(id => id !== data.concepts[0].id);
}, 'content.concepts[0].resourceIds[0]');
rejects('概念正向清单漏项', data => {
  const concept = data.concepts.find(item => item.id === data.resources[0].conceptIds[0]);
  concept.resourceIds = concept.resourceIds.filter(id => id !== data.resources[0].id);
}, 'content.resources[0].conceptIds[0]');
rejects('双向清单存在但缺少实现关系', data => {
  const concept = data.concepts[0];
  data.relations = data.relations.filter(relation => !(relation.type === 'implements' &&
    relation.from === concept.resourceIds[0] && relation.to === concept.id));
}, 'content.concepts[0].resourceIds[0]');
rejects('新增实现关系未进入双向清单', data => {
  const extra = {...data.concepts[0], id: 'unlisted-concept', resourceIds: []};
  data.concepts.push(extra);
  data.relations.push({...data.relations.find(relation => relation.type === 'implements'),
    id: 'orphan-implementation', to: extra.id});
}, `content.relations[${fixture.relations.length}].to`);

// --- 三入口共享：允许排序不同，拒绝指向不同对象或复制正文 ---
accepts('同一资源集合可以采用不同顺序', data => {
  data.routes[1].resourceIds.reverse();
});
rejects('三个入口资源分叉', data => {
  data.routes[1].resourceIds.pop();
}, 'content.routes[1].resourceIds');
rejects('三个入口概念分叉', data => {
  const extra = {...data.concepts[0], id: 'different-concept', resourceIds: []};
  data.concepts.push(extra);
  data.routes[1].conceptId = extra.id;
}, 'content.routes[1].conceptId');
rejects('入口关系类型错配', data => {
  data.routes[0].relation = 'product';
  if (data.routes[0].id === 'products') data.routes[0].relation = 'role';
}, 'content.routes[0].relation');
rejects('缺少入口', data => {
  data.routes.pop();
}, 'content.routes');
rejects('导航路径不足三层', data => {
  data.routes[0].steps.pop();
}, 'content.routes[0].steps');
rejects('入口复制资源正文', data => {
  data.routes[0].resources = [data.resources[0]];
}, 'content.routes[0].resources');

// --- 来源格式与关系条件：机械检查不联网，不把有来源等同于事实正确 ---
rejects('危险资源链接协议', data => {
  data.resources[0].officialUrl = 'javascript:alert(1)';
}, 'content.resources[0].officialUrl');
rejects('危险来源链接协议', data => {
  data.sources[0].url = 'data:text/html,unsafe';
}, 'content.sources[0].url');
rejects('不完整链接', data => {
  data.sources[0].url = '/relative-source';
}, 'content.sources[0].url');
rejects('不存在的日历日期', data => {
  data.sources[0].checkedAt = '2026-02-30';
}, 'content.sources[0].checkedAt');
rejects('未知关系类型', data => {
  data.relations[0].type = 'related';
}, 'content.relations[0].type');

const comparableIndex = fixture.relations.findIndex(relation => relation.type === 'comparable');
assert.ok(comparableIndex >= 0, '真实样板需要一条可验证的比较关系');
rejects('比较关系缺少条件', data => {
  data.relations[comparableIndex].condition = '';
}, `content.relations[${comparableIndex}].condition`);
rejects('比较端点误指向概念', data => {
  data.relations[comparableIndex].to = data.concepts[0].id;
}, `content.relations[${comparableIndex}].to`);

assert.equal(JSON.stringify(fixture), pristine);
assert.equal(readFileSync(new URL('./content.json', import.meta.url), 'utf8'), original);
console.log(`通过 ${passed} 项内容机械检查；只读真实样板，变异数据均在内存中。`);
