import { assert, fail } from "assert";
import { puppeteer, PuppeteerExtraPlugin } from "@";

const PUPPETEER_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

Deno.test("will bind launched browser events to plugins", async () => {
  const PLUGIN_EVENTS: string[] = [];

  const pluginName = "hello-world";
  class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
      super(opts);
    }
    get name() {
      return pluginName;
    }

    onPluginRegistered() {
      PLUGIN_EVENTS.push("onPluginRegistered");
    }
    beforeLaunch() {
      PLUGIN_EVENTS.push("beforeLaunch");
    }
    afterLaunch() {
      PLUGIN_EVENTS.push("afterLaunch");
    }
    beforeConnect() {
      PLUGIN_EVENTS.push("beforeConnect");
    }
    afterConnect() {
      PLUGIN_EVENTS.push("afterConnect");
    }
    onBrowser() {
      PLUGIN_EVENTS.push("onBrowser");
    }
    onTargetCreated() {
      PLUGIN_EVENTS.push("onTargetCreated");
    }
    onPageCreated() {
      PLUGIN_EVENTS.push("onPageCreated");
    }
    onTargetChanged() {
      PLUGIN_EVENTS.push("onTargetChanged");
    }
    onTargetDestroyed() {
      PLUGIN_EVENTS.push("onTargetDestroyed");
    }
    onDisconnected() {
      PLUGIN_EVENTS.push("onDisconnected");
    }
  }

  const instance = new Plugin();
  puppeteer.use(instance);
  assert(PLUGIN_EVENTS.includes("onPluginRegistered"));
  const browser = await puppeteer.launch({ args: PUPPETEER_ARGS });
  assert(PLUGIN_EVENTS.includes("beforeLaunch"));
  assert(PLUGIN_EVENTS.includes("afterLaunch"));
  assert(PLUGIN_EVENTS.includes("onBrowser"));
  const page = await browser.newPage().catch(console.log);
  assert(PLUGIN_EVENTS.includes("onTargetCreated"));
  assert(PLUGIN_EVENTS.includes("onPageCreated"));

  if (!page) fail("Page never loaded");

  await page.goto("about:blank#foo").catch(console.log);
  assert(PLUGIN_EVENTS.includes("onTargetChanged"));
  await page.close().catch(console.log);
  assert(PLUGIN_EVENTS.includes("onTargetDestroyed"));
  await browser.close().catch(console.log);
  assert(PLUGIN_EVENTS.includes("onDisconnected"));
});
