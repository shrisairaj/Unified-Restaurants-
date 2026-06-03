import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import HTMLtoDOCX from 'html-to-docx';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'report-assets', 'screenshots');
const MD_PATH = path.join(ROOT, 'RASOPS_DIPLOMA_PROJECT_REPORT.md');
const OUT_PDF = path.join(ROOT, 'RASOPS_DIPLOMA_PROJECT_REPORT.pdf');
const OUT_DOCX = path.join(ROOT, 'RASOPS_DIPLOMA_PROJECT_REPORT.docx');
const OUT_HTML = path.join(ROOT, 'report-assets', 'RASOPS_DIPLOMA_PROJECT_REPORT.html');

const FE_URL = 'http://localhost:3000';
const BROWSER_EXECUTABLE =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    executablePath: fs.existsSync(BROWSER_EXECUTABLE) ? BROWSER_EXECUTABLE : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
}
const SCREENSHOTS = [
  { name: '01-login.png', url: `${FE_URL}/login`, wait: 2000 },
  { name: '02-signup.png', url: `${FE_URL}/signup`, wait: 2000 },
  { name: '03-hotels.png', url: `${FE_URL}/hotels`, auth: true, wait: 2500 },
  { name: '04-invites.png', url: `${FE_URL}/invites`, auth: true, wait: 2500 },
  { name: '05-managers.png', url: `${FE_URL}/manager`, auth: true, wait: 2500 },
  { name: '06-dashboard.png', url: `${FE_URL}/dashboard`, auth: true, wait: 3000 },
  { name: '07-menu.png', url: `${FE_URL}/menu`, auth: true, wait: 2500 },
  { name: '08-tables.png', url: `${FE_URL}/tables`, auth: true, wait: 2500 },
  { name: '09-orders.png', url: `${FE_URL}/orders`, auth: true, wait: 2500 },
  { name: '10-settings.png', url: `${FE_URL}/settings`, auth: true, wait: 2500 }
];

const SCREENSHOT_INSERTIONS = [
  { afterHeading: /^## 11\. FRONTEND/i, images: ['01-login.png', '02-signup.png'], caption: 'Figure 11.1–11.2: Login and Registration screens' },
  { afterHeading: /^## 18\. HOTELS/i, images: ['03-hotels.png'], caption: 'Figure 18.1: Hotels management screen (Owner)' },
  { afterHeading: /^## 19\. INVITES/i, images: ['04-invites.png'], caption: 'Figure 19.1: Manager invite screen' },
  { afterHeading: /^## 20\. MANAGERS/i, images: ['05-managers.png'], caption: 'Figure 20.1: Managers assignment screen' },
  { afterHeading: /^## 22\. DASHBOARD/i, images: ['06-dashboard.png'], caption: 'Figure 22.1: Analytics dashboard' },
  { afterHeading: /^## 23\. MENU/i, images: ['07-menu.png'], caption: 'Figure 23.1: Menu management screen' },
  { afterHeading: /^## 24\. TABLES/i, images: ['08-tables.png'], caption: 'Figure 24.1: Tables and QR code screen' },
  { afterHeading: /^## 25\. ORDERS/i, images: ['09-orders.png'], caption: 'Figure 25.1: Orders management screen' },
  { afterHeading: /^## 21\. SETTINGS/i, images: ['10-settings.png'], caption: 'Figure 21.1: Settings screen' }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function loginInBrowser(page) {
  await page.goto(`${FE_URL}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('input[name="email"]', { timeout: 15000 });
  await page.type('input[name="email"]', 'devtest.user@example.com', { delay: 20 });
  await page.type('input[name="password"]', 'Test@1234', { delay: 20 });
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.includes('login'), { timeout: 45000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
}

async function captureScreenshots() {
  ensureDir(ASSETS);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  let loggedIn = false;
  for (const shot of SCREENSHOTS) {
    try {
      if (shot.auth && !loggedIn) {
        await loginInBrowser(page);
        loggedIn = true;
      }
      await page.goto(shot.url, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise((r) => setTimeout(r, shot.wait));
      await page.screenshot({
        path: path.join(ASSETS, shot.name),
        fullPage: true
      });
      console.log(`Screenshot: ${shot.name}`);
    } catch (err) {
      console.warn(`Screenshot failed ${shot.name}:`, err.message);
    }
  }
  await browser.close();
}

function buildCoverHtml() {
  return `
  <section class="cover-page">
    <div class="cover-border">
      <p class="cover-institute">[INSTITUTE NAME]</p>
      <p class="cover-dept">Department of [Computer Science / Information Technology]</p>
      <h1 class="cover-title">RASOPS</h1>
      <h2 class="cover-subtitle">Restaurant / Hotel Order Management System</h2>
      <p class="cover-tag">A Diploma Project Report</p>
      <div class="cover-meta">
        <table>
          <tr><td><strong>Submitted By</strong></td><td>[Your Full Name]</td></tr>
          <tr><td><strong>Enrollment No.</strong></td><td>[Roll Number]</td></tr>
          <tr><td><strong>Academic Year</strong></td><td>2025 – 2026</td></tr>
          <tr><td><strong>Guide</strong></td><td>[Guide Name]</td></tr>
        </table>
      </div>
      <p class="cover-footer">Submitted in partial fulfilment of the requirements for the Diploma in Engineering</p>
    </div>
  </section>`;
}

function architectureDiagramHtml() {
  return `
  <figure class="diagram">
    <figcaption>Figure 9.1: Three-tier system architecture</figcaption>
    <div class="arch-box">
      <div class="tier tier-1">Presentation Tier — React SPA (Port 3000)</div>
      <div class="arrow">▼ REST API (JSON + JWT)</div>
      <div class="tier tier-2">Application Tier — Node.js + Express (Port 5000)</div>
      <div class="arrow">▼ Sequelize ORM</div>
      <div class="tier tier-3">Data Tier — MySQL Database (rasops)</div>
      <div class="tier tier-ext">External: Gmail SMTP · Razorpay · Web Push</div>
    </div>
  </figure>`;
}

function flowDiagramHtml() {
  return `
  <figure class="diagram">
    <figcaption>Figure 10.1: End-to-end application workflow</figcaption>
    <div class="flow-grid">
      <div class="flow-col"><h4>Owner</h4><ol><li>Register / Login</li><li>Add Hotel</li><li>Invite Manager</li><li>Subscribe Plan</li></ol></div>
      <div class="flow-col"><h4>Manager</h4><ol><li>Login</li><li>Menu & Tables</li><li>Generate QR</li><li>Manage Orders</li></ol></div>
      <div class="flow-col"><h4>Customer</h4><ol><li>Scan QR</li><li>Register</li><li>Place Order</li><li>Pay & Feedback</li></ol></div>
    </div>
  </figure>`;
}

function injectScreenshots(markdown) {
  const lines = markdown.split('\n');
  const output = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    output.push(line);
    for (const ins of SCREENSHOT_INSERTIONS) {
      if (ins.afterHeading.test(line)) {
        output.push('');
        output.push(`**${ins.caption}**`);
        output.push('');
        for (const img of ins.images) {
          const rel = `report-assets/screenshots/${img}`;
          output.push(`![${ins.caption}](${rel})`);
          output.push('');
        }
      }
    }
    if (/^## 9\. FULL ARCHITECTURE/i.test(line)) {
      output.push('');
      output.push('<!-- ARCH_DIAGRAM -->');
    }
    if (/^## 10\. COMPLETE WORKING FLOW/i.test(line)) {
      output.push('');
      output.push('<!-- FLOW_DIAGRAM -->');
    }
  }
  return output.join('\n');
}

function getStyles() {
  return `
    @page { size: A4; margin: 22mm 18mm 24mm 18mm; }
    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.55; color: #1a1a1a; }
    h1 { font-size: 22pt; color: #0d233f; page-break-before: always; border-bottom: 2px solid #49ac60; padding-bottom: 6px; }
    h1:first-of-type { page-break-before: avoid; }
    h2 { font-size: 16pt; color: #0d233f; margin-top: 1.2em; }
    h3 { font-size: 13pt; color: #2c5282; }
    h4 { font-size: 11.5pt; color: #333; }
    p, li { text-align: justify; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; page-break-inside: avoid; }
    th, td { border: 1px solid #cbd5e0; padding: 8px 10px; vertical-align: top; }
    th { background: #edf2f7; font-weight: 600; text-align: left; }
    tr:nth-child(even) td { background: #f7fafc; }
    img { max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 6px; margin: 10px 0; page-break-inside: avoid; }
    figure.screenshot { margin: 16px 0; page-break-inside: avoid; }
    figcaption { font-size: 9.5pt; color: #4a5568; font-style: italic; margin-top: 6px; }
    pre, code { font-family: Consolas, monospace; font-size: 9pt; background: #f1f5f9; }
    pre { padding: 12px; border-radius: 6px; overflow-x: auto; page-break-inside: avoid; }
    .cover-page { page-break-after: always; min-height: 90vh; display: flex; align-items: center; justify-content: center; text-align: center; }
    .cover-border { border: 3px double #0d233f; padding: 48px 40px; width: 90%; }
    .cover-institute { font-size: 14pt; font-weight: 700; text-transform: uppercase; }
    .cover-dept { font-size: 11pt; margin-bottom: 36px; }
    .cover-title { font-size: 36pt; color: #49ac60; margin: 0; border: none; }
    .cover-subtitle { font-size: 14pt; font-weight: 600; margin: 8px 0 24px; }
    .cover-tag { font-size: 12pt; margin-bottom: 32px; }
    .cover-meta table { border: none; margin: 0 auto; }
    .cover-meta td { border: none; padding: 6px 16px; text-align: left; }
    .cover-footer { margin-top: 40px; font-size: 10pt; color: #555; }
    .toc-page { page-break-after: always; }
    .toc-page h1 { page-break-before: avoid; }
    .toc-list { list-style: none; padding: 0; }
    .toc-list li { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 6px 0; font-size: 11pt; }
    .diagram { margin: 20px 0; page-break-inside: avoid; }
    .arch-box .tier { border: 2px solid #49ac60; background: #f0fff4; padding: 12px; margin: 8px 0; text-align: center; font-weight: 600; border-radius: 6px; }
    .arch-box .tier-ext { background: #ebf8ff; border-color: #3182ce; font-weight: 500; font-size: 10pt; }
    .arch-box .arrow { text-align: center; color: #49ac60; font-weight: bold; margin: 4px 0; }
    .flow-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .flow-col { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fafafa; }
    .flow-col h4 { margin-top: 0; color: #0d233f; text-align: center; }
    .certificate-block { page-break-after: always; min-height: 60vh; }
    .page-break { page-break-before: always; }
  `;
}

function embedImages(html, mode = 'base64') {
  return html.replace(/src="report-assets\/screenshots\/([^"]+)"/g, (_, file) => {
    const imgPath = path.join(ASSETS, file);
    if (!fs.existsSync(imgPath)) {
      return 'src="" alt="Screenshot unavailable — run app on localhost:3000"';
    }
    if (mode === 'file') {
      return `src="screenshots/${file}"`;
    }
    const b64 = fs.readFileSync(imgPath).toString('base64');
    return `src="data:image/png;base64,${b64}"`;
  });
}

function buildTocFromMarkdown(md) {
  const items = [];
  const re = /^## (\d+)\.\s+(.+)$/gm;
  let m;
  while ((m = re.exec(md)) !== null) {
    if (['TABLE OF CONTENTS'].some((x) => m[2].toUpperCase().includes(x))) continue;
    const id = m[2].toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
    items.push({ num: m[1], title: m[2], id });
  }
  return `<section class="toc-page"><h1>Table of Contents</h1><ul class="toc-list">${items
    .map((i) => `<li><span>${i.num}. ${i.title}</span></li>`)
    .join('')}</ul></section>`;
}

async function buildHtmlDocument(mdWithShots) {
  let body = marked.parse(mdWithShots, { gfm: true, breaks: true });
  body = body.replace('<!-- ARCH_DIAGRAM -->', architectureDiagramHtml());
  body = body.replace('<!-- FLOW_DIAGRAM -->', flowDiagramHtml());

  // Remove duplicate manual TOC from markdown if present
  body = body.replace(/<h2[^>]*>TABLE OF CONTENTS<\/h2>[\s\S]*?(?=<h2)/i, '');

  const toc = buildTocFromMarkdown(mdWithShots);
  const certMatch = body.match(/<h2[^>]*>CERTIFICATE<\/h2>[\s\S]*?(?=<h2[^>]*>ACKNOWLEDGEMENT)/i);
  const ackMatch = body.match(/<h2[^>]*>ACKNOWLEDGEMENT<\/h2>[\s\S]*?(?=<h2[^>]*>TABLE OF CONTENTS|<h2[^>]*>ABSTRACT|<h1)/i);

  let mainStart = body.indexOf('<h2');
  const abstractIdx = body.search(/<h2[^>]*>ABSTRACT<\/h2>/i);
  if (abstractIdx >= 0) mainStart = abstractIdx;

  const mainContent = mainStart >= 0 ? body.slice(mainStart) : body;
  const fullBodyPdf = embedImages(mainContent, 'base64');
  const fullBodyDocx = embedImages(mainContent, 'file');

  const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>RASOPS Diploma Project Report</title>
  <style>${getStyles()}</style>
</head>
<body>
  ${buildCoverHtml()}
  ${certMatch ? `<section class="certificate-block">${certMatch[0]}</section>` : ''}
  ${ackMatch ? `<section class="page-break">${ackMatch[0]}</section>` : ''}
  ${toc}
  <div class="main-content">${fullBodyPdf}</div>
</body>
</html>`;

  const htmlDocxOnly = htmlDoc.replace(fullBodyPdf, fullBodyDocx);
  return { htmlDoc, htmlDocxOnly };
}

async function exportPdf(htmlPath, pdfPath) {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666;">RASOPS — Diploma Project Report</div>',
    footerTemplate:
      '<div style="font-size:8px;width:100%;padding:0 18mm;display:flex;justify-content:space-between;color:#666;"><span>Restaurant Order Management System</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
    margin: { top: '20mm', bottom: '22mm', left: '15mm', right: '15mm' }
  });
  await browser.close();
  console.log(`PDF written: ${pdfPath}`);
}

async function exportDocxWithWord(htmlPath, docxPath) {
  const { execSync } = await import('child_process');
  const script = `
$html = "${htmlPath.replace(/\\/g, '\\\\')}"
$docx = "${docxPath.replace(/\\/g, '\\\\')}"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open($html)
$doc.SaveAs([ref]$docx, [ref]16)
$doc.Close()
$word.Quit()
`;
  execSync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"').replace(/\r?\n/g, '; ')}"`, {
    stdio: 'inherit'
  });
}

async function exportDocx(htmlPath, docxPath) {
  if (process.platform === 'win32') {
    try {
      await exportDocxWithWord(htmlPath, docxPath);
      console.log(`DOCX written (Microsoft Word): ${docxPath}`);
      return;
    } catch (err) {
      console.warn('Word COM export failed, falling back to html-to-docx:', err.message);
    }
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const buffer = await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
    font: 'Calibri',
    fontSize: 22
  });
  fs.writeFileSync(docxPath, buffer);
  console.log(`DOCX written: ${docxPath}`);
}

async function main() {
  console.log('Capturing application screenshots...');
  try {
    await captureScreenshots();
  } catch (e) {
    console.warn('Screenshot capture issue (continuing):', e.message);
  }

  const rawMd = fs.readFileSync(MD_PATH, 'utf8');
  const md = injectScreenshots(rawMd);
  ensureDir(path.dirname(OUT_HTML));

  const { htmlDoc, htmlDocxOnly } = await buildHtmlDocument(md);
  fs.writeFileSync(OUT_HTML, htmlDoc, 'utf8');
  const OUT_HTML_DOCX = path.join(ROOT, 'report-assets', 'RASOPS_DIPLOMA_PROJECT_REPORT_docx.html');
  fs.writeFileSync(OUT_HTML_DOCX, htmlDocxOnly, 'utf8');
  console.log(`HTML written: ${OUT_HTML}`);

  await exportPdf(OUT_HTML, OUT_PDF);
  await exportDocx(OUT_HTML, OUT_DOCX);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
