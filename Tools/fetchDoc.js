
const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://olive-amount-97d.notion.site/Guide-Utilisation-243db2d7883480098d29d8a19da5dfba';
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Récupère le texte principal de la page Notion
  const texte = await page.evaluate(() => {
    // Essaye d'extraire le contenu principal
    const el = document.querySelector('.notion-page-content');
    return el ? el.innerText : document.body.innerText;
  });

  console.log(texte);
  await browser.close();
})();