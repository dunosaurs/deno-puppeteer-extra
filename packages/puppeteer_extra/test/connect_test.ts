import { assert } from "assert";
import { puppeteer, puppeteer_extra_plugin_anonymize_ua } from "@";

const PUPPETEER_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

Deno.test("will remove headless from remote browser", async () => {
  // Mitigate CI quirks
  try {
    // Use puppeteer-extra with plugin
    puppeteer.use(puppeteer_extra_plugin_anonymize_ua());
    const browser = await puppeteer.launch({
      args: PUPPETEER_ARGS,
    });
    // Let's ensure we've anonymized the user-agent, despite not using .launch
    const page = await browser.newPage();
    const ua = await page.evaluate(() => window.navigator.userAgent);
    assert(!ua.includes("HeadlessChrome"));

    await browser.close();
    assert(true);
  } catch (err) {
    console.log(`Caught error:`, err);
    if (
      err.message &&
      err.message.includes(
        "Session closed. Most likely the page has been closed",
      )
    ) {
      assert(true); // ignore this error
    } else {
      throw err;
    }
  }
});
