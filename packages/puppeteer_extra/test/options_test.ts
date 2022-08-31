import { assertEquals } from "assert";
import { Browser } from "puppeteer";
import { puppeteer, PuppeteerExtraPlugin } from "@";

const PUPPETEER_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

Deno.test("will modify puppeteer launch options through plugins", async () => {
  let FINAL_OPTIONS = null;

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
    beforeLaunch(options: any) {
      options.args.push("--foobar=true");
      options.timeout = 60 * 1000;
      options.headless = true;
    }
    afterLaunch(_browser: Browser, opts: any) {
      FINAL_OPTIONS = opts.options;
    }
  }
  const instance = new Plugin();
  puppeteer.use(instance);
  const browser = await puppeteer.launch({
    args: [...PUPPETEER_ARGS],
    headless: false,
  });

  assertEquals(FINAL_OPTIONS, {
    headless: true,
    timeout: 60000,
    args: [...PUPPETEER_ARGS, "--foobar=true"],
  });

  await browser.close();
});
