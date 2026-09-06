#!/usr/bin/env node
/**
 * [INPUT]: 本目录模板、样式、视图与内容正本；原 data/concepts.json 的域名称与一句定位。
 * [OUTPUT]: 校验并内联生成 design/index.html；--check 只检验引用、语法、产物同步，不写文件。
 * [POS]: 独立样板的构建入口，沿用根构建的注入方式；不改旧数据和根 index.html。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {validateContent} from './validate.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const read = name => readFileSync(join(directory, name), 'utf8');
const content = JSON.parse(read('content.json'));
const summary = validateContent(content);
const original = JSON.parse(read('../data/concepts.json'));
const panorama = original.nodes.filter(node => node.t === 'group').map(node => ({name:node.n,summary:node.g}));
if (!panorama.some(domain => domain.name === '数据库与存储')) throw new Error('原型全景缺少数据库与存储，需重新确认领域入口。');
const catalog = JSON.stringify({content, panorama}).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const parts = {'style.css':read('style.css'), catalog:`const CATALOG = ${catalog};`, 'view.js':read('view.js')};
let html = read('template.html');
for (const [name, value] of Object.entries(parts)) {
  const tag = `/*@inject ${name}*/`;
  if (html.split(tag).length !== 2) throw new Error(`注入点必须恰好出现一次：${name}`);
  html = html.replace(tag, () => '\n' + value.trimEnd() + '\n');
}
if (/\/\*@inject /.test(html)) throw new Error('还有未填充的注入点。');
for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script, {filename:'design/index.html'});
if (/<(?:script|img)\b[^>]*\bsrc\s*=|<link\b[^>]*\bhref\s*=/i.test(html)) throw new Error('样板不能加载外部脚本、字体或图片；外部资料请用普通链接。');
if (process.argv.includes('--check')) {
  if (read('index.html') !== html) throw new Error('design/index.html 与源文件不一致，请先运行 node design/build.mjs。');
  console.log('设计样板引用、语法与产物同步检查通过（未写文件）。', summary);
} else {
  writeFileSync(join(directory,'index.html'), html);
  console.log(`design/index.html ${(Buffer.byteLength(html)/1024).toFixed(1)} KiB`, summary);
}
