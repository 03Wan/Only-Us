// Archive supplied assets; never use page screenshots as interactive page backgrounds.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const cheerio = require('cheerio');
const pages = require('./design-map.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'miniprogram/assets/photos');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
const hash = s => crypto.createHash('sha256').update(s).digest('hex');

async function main() {
  const images = new Map();
  const inventory = [];
  for (const page of pages) {
    const dir = path.join(root, 'stitch_only_us', `_${page.id}`);
    const html = fs.readFileSync(path.join(dir, 'code.html'), 'utf8');
    const $ = cheerio.load(html);
    const screenshots = fs.readdirSync(dir).filter(f => /\.(png|jpe?g)$/i.test(f)).map(f => ({
      file: `stitch_only_us/_${page.id}/${f}`,
      sha256: hash(fs.readFileSync(path.join(dir, f)))
    }));
    for (const url of html.matchAll(/https:\/\/lh3\.googleusercontent\.com\/[^\s"')]+/g)) {
      const name = `photo-${hash(url[0]).slice(0, 12)}.jpg`;
      const alt = $('img').toArray().find(el => $(el).attr('src') === url[0]);
      if (!images.has(url[0])) images.set(url[0], { url: url[0], local: `/assets/photos/${name}`, pages: [], description: alt ? $(alt).attr('data-alt') : 'HTML CSS background image' });
      const item = images.get(url[0]); if (!item.pages.includes(page.id)) item.pages.push(page.id);
    }
    inventory.push({ ...page, source: `stitch_only_us/_${page.id}/code.html`, screenshots,
      screenshotStatus: page.id===6 ? 'available: screen-full.png is complete; prior 6.png is partially occluded' : 'available',
      headings: $('h1,h2,h3').map((_, e) => $(e).text().trim()).get(),
      controls: $('button,a,input,textarea,[onclick]').map((_, e) => ({ tag: e.tagName, id: $(e).attr('id') || '', label: $(e).attr('aria-label') || $(e).text().trim().replace(/\s+/g,' ').slice(0,100), action: $(e).attr('onclick') || '' })).get(),
      imageCount: $('img').length,
      cssImageCount: $('[style*="background-image"]').length,
      icons: [...new Set($('.material-symbols-outlined').map((_,e) => $(e).text().trim()).get())]
    });
  }
  const entries = [...images.values()];
  // Bounded parallel downloads; a missing source is a hard failure, not a silent placeholder.
  for (let start = 0; start < entries.length; start += 5) {
    await Promise.all(entries.slice(start, start + 5).map(async item => {
      const dest = path.join(root, 'miniprogram', item.local);
      if (!fs.existsSync(dest)) {
        const response = await fetch(item.url, { signal: AbortSignal.timeout(45000) });
        if (!response.ok) throw new Error(`Asset ${response.status}: ${item.url}`);
        await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(dest);
      }
      const meta = await sharp(dest).metadata();
      Object.assign(item, { bytes: fs.statSync(dest).size, width: meta.width, height: meta.height, sha256: hash(fs.readFileSync(dest)), status: 'local' });
    }));
  }
  fs.writeFileSync(path.join(root, 'docs/resource-manifest.json'), JSON.stringify({ pages: inventory, images: entries, font: 'System CJK fallback; original Google font not bundled', iconSource: '@material-symbols/svg-400 (Apache-2.0)' }, null, 2));
  const rows = inventory.map(p => `| _${p.id} | ${p.title} | ${p.screenshots.map(s=>s.file).join(', ')} | ${p.imageCount} + ${p.cssImageCount} | ${p.screenshotStatus} |`).join('\n');
  fs.writeFileSync(path.join(root, 'docs/RESOURCE-INVENTORY.md'), `# 原型与素材清单\n\n13 个 HTML、14 个截图文件（含第 6 页历史半幅截图）。_9/9.png 已匹配心情选择；用户附件已保存为 _6/screen-full.png，完整绑定页可供核对。原始文件完整保留。\n\n| 来源 | 页面 | 截图 | img + CSS 图片 | 核验 |\n| --- | --- | --- | --- | --- |\n${rows}\n\n共 ${entries.length} 张唯一远程照片/插画，已本地归档，逐项 URL、用途、尺寸、文件哈希与控件清单见 resource-manifest.json。依赖许可见 THIRD-PARTY.md。截图用作核对，不充当页面 UI。\n`);
  console.log(`Audited ${inventory.length} pages; archived ${entries.length} unique images.`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
