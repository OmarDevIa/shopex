const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://olive-amount-97d.notion.site/Frais-de-livraison-243db2d7883480a2bb72c763ef5780d0';
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Récupère le texte principal de la page Notion
  const texte = await page.evaluate(() => {
    const el = document.querySelector('.notion-page-content');
    return el ? el.innerText : document.body.innerText;
  });

  console.log(texte);
  await browser.close();
})();