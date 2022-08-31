import { assert, assertEquals } from "assert";
import { puppeteer, PuppeteerExtraPlugin } from "@";

const PUPPETEER_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];
const PAGE_TIMEOUT = 60 * 1000; // 60s

Deno.test("will launch the browser normally", async () => {
  const browser = await puppeteer.launch({ args: PUPPETEER_ARGS });
  const page = await browser.newPage();
  await page.goto("http://example.com", {
    waitUntil: "domcontentloaded",
    timeout: PAGE_TIMEOUT,
  });
  await browser.close();
  assert(true);
});

Deno.test("will launch puppeteer with plugin support", async () => {
  const pluginName = "hello-world";
  const pluginData = [{ name: "foo", value: "bar" }];
  class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
      super(opts);
    }
    get name() {
      return pluginName;
    }
    get data(): any {
      return pluginData;
    }
  }
  const instance = new Plugin();
  puppeteer.use(instance);
  const browser = await puppeteer.launch({ args: PUPPETEER_ARGS });
  const page = await browser.newPage();

  assertEquals(puppeteer.plugins.length, 1);
  assertEquals(puppeteer.plugins[0].name, pluginName);
  assertEquals(puppeteer.pluginNames.length, 1);
  assertEquals(puppeteer.pluginNames[0], pluginName);
  assertEquals(puppeteer.getPluginData().length, 1);
  assertEquals(puppeteer.getPluginData()[0], pluginData[0]);
  assertEquals(puppeteer.getPluginData("foo")[0], pluginData[0]);
  assertEquals(puppeteer.getPluginData("not-existing").length, 0);

  await page.goto("http://example.com", {
    waitUntil: "domcontentloaded",
    timeout: PAGE_TIMEOUT,
  });
  await browser.close();
});
