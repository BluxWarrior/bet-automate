const puppeteer = require("puppeteer");
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reb_login(page, email, password) {
  await page.bringToFront();
  // login to rebelbetting
  await page.goto("https://vb.rebelbetting.com/login");

  await page.waitForSelector('input[id="inputEmail"]');
  await sleep(500);
  await page.type('input[id="inputEmail"]', email);
  await sleep(500);
  await page.type('input[id="inputPassword"]', password);

  await sleep(3000);
  await page.click('button[type="submit"]');
}

async function bet_login(page, email, password) {
  await page.bringToFront();
  await page.goto("https://www.betfair.com/");
  await sleep(3000);

  // press cookie button
  await page.waitForSelector('button[id="onetrust-accept-btn-handler"]');
  await page.click('button[id="onetrust-accept-btn-handler"]');
  await sleep(3000);

  // goto login page
  await page.click('input[id="ssc-lis"]');

  // input email and password
  await page.waitForSelector('input[id="username"]');
  await sleep(500);
  await page.type('input[id="username"]', email);
  await sleep(500);
  await page.type('input[id="password"]', password);

  await page.click('button[id="login"]');
  await sleep(3000);
}

async function get_betIDs(page) {
  //   await page.bringToFront();
  // check if error
  if (await page.$('span[class="badge text-bg-danger m-2 p-2 clickable"]')) {
    console.log("found error");
    await page.reload();
  }

  // get bet IDs
  const elementHandles = await page.$$("div[class*='odds-card']");
  const betIDswithnull = await Promise.all(
    elementHandles.map(async (element) => {
      // Get the property 'id' for each element
      const idProperty = await element.getProperty("id");
      // Convert the property JSHandle to a string value
      const idValue = await idProperty.jsonValue();
      return idValue;
    })
  );
  const betIDs = betIDswithnull.filter((item) => item !== "");

  //   const betIDs = await page.evaluate(() => {
  //     let betIDs = [];
  //     document.querySelectorAll("div[class*='odds-card']").forEach((div) => {
  //       if (div.id) betIDs.push(div.id);
  //     });

  //     return betIDs;
  //   });

  return betIDs;
}

async function bet(reb_page, bet_page, ID) {
  await reb_page.bringToFront();
  await reb_page.click(`div[id=${ID}]`);

  await reb_page.waitForSelector('a[id="BetOnBookmaker"]');
  //   await reb_page.click('a[id="BetOnBookmaker"]');
  //   const card_link = await reb_page.$eval(
  //     'a[id="BetOnBookmaker"]',
  //     (div) => div.href
  //   );
  const elementHandles = await reb_page.$$('a[id="BetOnBookmaker"]');
  const card_link = await Promise.all(
    elementHandles.map(async (element) => {
      // Get the property 'id' for each element
      const idProperty = await element.getProperty("href");
      // Convert the property JSHandle to a string value
      const idValue = await idProperty.jsonValue();
      return idValue;
    })
  );
  await sleep(500);

  // go to bet
  console.log(card_link[0]);
  await bet_page.bringToFront();
  await bet_page.goto(card_link[0]);
  await sleep(1000);

  // if not betfair
  if (!bet_page.url().includes("www.betfair.com")) {
    await reb_page.reload();
    return true;
  }

  if (await bet_page.$('input[class="stake"]')) {
    await bet_page.type('input[class="stake"]', "0.1");

    await bet_page.waitForSelector(
      'button[class="place-bets-button ui-betslip-action"]'
    );
    await sleep(500);
    await bet_page.click('button[class="place-bets-button ui-betslip-action"]');
  } else if (await bet_page.$('input[aria-label="Stake"]')) {
    await bet_page.type('input[aria-label="Stake"]', "0.1");

    await bet_page.waitForSelector(
      'button[class="typography-h280 _3DCMk _3fSDH _3pIWG"]'
    );
    await sleep(500);
    await bet_page.click(
      'button[class="typography-h280 _3DCMk _3fSDH _3pIWG"]'
    );
  } else return false;

  await reb_page.bringToFront();
  await sleep(100);
  // log
  await reb_page.click('button[id="LogBet"]');
  await sleep(5000);
  return true;
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });

  // login
  const reb_page = await browser.newPage();
  const bet_page = await browser.newPage();
  await reb_login(reb_page, "info@referpro.co.uk", "Charlton1!");
  await bet_login(bet_page, "Chazamunns@googlemail.com", "Charlton1!");
  await sleep(3000);

  await reb_page.bringToFront();
  let origin_betIDs = [];
  while (true) {
    try {
      const betIDs = await get_betIDs(reb_page);
      if (origin_betIDs === "New") {
        origin_betIDs = betIDs;
        console.log(origin_betIDs);
      } else {
        for (const bid of betIDs) {
          if (!origin_betIDs.includes(bid)) {
            origin_betIDs.push(bid);
            console.log(origin_betIDs);
            while (!(await bet(reb_page, bet_page, bid)));
          }
        }
      }

      await sleep(1000);
    } catch (err) {
      console.log(err);
      await reb_page.reload();
      await bet_page.reload();
      await sleep(1000);
    }
  }
})();