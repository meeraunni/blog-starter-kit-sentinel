import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
const files = fs.readdirSync('_posts').filter(file => file.endsWith('.md')).sort();
const slugs = new Set(files.map(file => file.slice(0, -3)));
const issues = [];
const inventory = [];
for (const file of files) {
  const { data, content } = matter(fs.readFileSync(path.join('_posts', file), 'utf8'));
  const errors = [], warnings = [];
  for (const field of ['title', 'excerpt', 'date', 'coverImage']) if (!data[field]) errors.push(`Missing ${field}`);
  if (!data.author?.name || !data.ogImage?.url) errors.push('Missing author or social image');
  for (const field of ['date', 'updated']) if (data[field] && Number.isNaN(Date.parse(data[field]))) errors.push(`Invalid ${field}`);
  if (data.updated && Date.parse(data.updated) < Date.parse(data.date)) errors.push('Updated date precedes publication');
  for (const image of [data.coverImage, data.ogImage?.url]) if (image?.startsWith('/') && !fs.existsSync(`public${image}`)) errors.push(`Missing image ${image}`);
  for (const match of content.matchAll(/\]\((\/[^\s)]+)\)/g)) {
    const route = match[1].split(/[?#]/)[0];
    if (route.startsWith('/posts/') && !slugs.has(route.slice(7))) errors.push(`Broken article ${route}`);
    if (/^\/(assets|resources)\/.+\.[a-z]+$/.test(route) && !fs.existsSync(`public${route}`)) errors.push(`Missing file ${route}`);
  }
  const sources = [...new Set(content.match(/https?:\/\/[^\s)]+/g) || [])];
  if (!sources.length) warnings.push('No external sources: review whether factual claims need references');
  const code = [...content.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(match => match[1]).join('\n');
  if (/ConvertTo-SecureString[^\n]*-AsPlainText/.test(code)) warnings.push('Review plaintext secret example');
  if (/\b(?:Set|Get)-Msol\w+/.test(code)) warnings.push('Review legacy MSOnline command');
  inventory.push({ slug: file.slice(0,-3), title: data.title, words: content.split(/\s+/).length, externalSources: sources.length, updated: data.updated || null, errors, warnings });
  issues.push(...errors.map(error => `${file}: ${error}`));
}
const report = { generated: new Date().toISOString(), scope: 'Structural checks and review signals only. Does not establish factual accuracy, originality, lab execution, or AdSense eligibility.', articles: inventory.length, errors: issues.length, warnings: inventory.reduce((n,row) => n+row.warnings.length,0), inventory };
if (process.argv.includes('--write')) fs.writeFileSync('docs/content-inventory.json', JSON.stringify(report,null,2)+'\n');
console.log(`${report.articles} articles: ${report.errors} structural errors; ${report.warnings} editorial review signals.`);
for (const issue of issues) console.error(issue);
for (const row of inventory.filter(row=>row.warnings.length)) console.log(`${row.slug}: ${row.warnings.join('; ')}`);
process.exitCode = issues.length ? 1 : 0;
