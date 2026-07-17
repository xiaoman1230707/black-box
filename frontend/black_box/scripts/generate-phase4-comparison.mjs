import { readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..', '..')
const screenshotsRoot = path.join(repoRoot, 'docs', 'qa', 'phase4', 'screenshots')
const output = path.join(screenshotsRoot, 'comparison.html')
const viewports = ['1440x1000', '900x1000', '390x844', '320x740']
const pages = ['home', 'search', 'post-detail', 'compose', 'chat', 'mine', 'login']

const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
const image = (src, alt) => `<figure><img src="${escape(src)}" alt="${escape(alt)}"><figcaption>${escape(alt)}</figcaption></figure>`

const sections = viewports.map((viewport) => {
  const rows = pages.map((page) => `
    <article>
      <h3>${escape(page)}</h3>
      <div class="pair">
        ${image(`p0/${viewport}/${page}.png`, `P0 ${viewport} ${page}`)}
        ${image(`p6/${viewport}/${page}.png`, `P6 ${viewport} ${page}`)}
      </div>
    </article>`).join('')
  return `<section><h2>${escape(viewport)}</h2>${rows}</section>`
}).join('')

const stateViewports = ['1440x1000', '390x844']
const stateGroups = await Promise.all(stateViewports.map(async (viewport) => {
  const files = (await readdir(path.join(screenshotsRoot, 'p6-states', viewport)))
    .filter((file) => file.endsWith('.png'))
    .sort()
  return `<section><h2>P6 states · ${escape(viewport)}</h2><div class="states">${files.map((file) => image(`p6-states/${viewport}/${file}`, file.replace('.png', ''))).join('')}</div></section>`
}))

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Black-box Phase 4 P0 / P6 comparison</title>
<style>body{margin:0;padding:24px;background:#f4f4f5;color:#18181b;font:14px/1.5 Inter,system-ui,sans-serif}h1,h2,h3{margin:0 0 16px}section{margin:32px 0}article{margin:24px 0}.pair,.states{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.states{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}figure{margin:0;min-width:0}img{display:block;width:100%;height:auto;border:2px solid #18181b;background:white}figcaption{padding:8px 0;font-weight:700}@media(max-width:720px){body{padding:12px}.pair{grid-template-columns:1fr}}</style>
</head><body><h1>Black-box Phase 4 · P0 / P6 人工对照</h1><p>本页只提供人工并排索引，不执行像素阈值断言。</p>${sections}${stateGroups.join('')}</body></html>`

await writeFile(output, html, 'utf8')
console.log(path.relative(repoRoot, output))
