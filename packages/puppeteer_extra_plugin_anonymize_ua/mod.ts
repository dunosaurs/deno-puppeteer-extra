import { Page } from "puppeteer";
import { PuppeteerExtraPlugin } from "@";
import debug from "@/common/debug.ts";

/**
 * Anonymize the User-Agent on all pages.
 *
 * Supports dynamic replacing, so the Chrome version stays intact and recent.
 *
 * @param {Object} opts - Options
 * @param {boolean} [opts.stripHeadless=true] - Replace `HeadlessChrome` with `Chrome`.
 * @param {boolean} [opts.makeWindows=true] - Sets the platform to Windows 10, 64bit (most common).
 * @param {Function} [opts.customFn=null] - A custom UA replacer function.
 *
 * @example
 * import { puppeteer, puppeteer_extra_plugin_anonymize_ua } from "https://deno.land/x/puppeteer_extra/mod.ts";
 * puppeteer.use(puppeteer_extra_plugin_anonymize_ua())
 * // or
 * puppeteer.use(puppeteer_extra_plugin_anonymize_ua({
 *   customFn: (ua) => 'MyCoolAgent/' + ua.replace('Chrome', 'Beer')})
 * )
 * const browser = await puppeteer.launch()
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts);
  }

  get name() {
    return "anonymize-ua";
  }

  get defaults() {
    return {
      stripHeadless: true,
      makeWindows: true,
      customFn: null,
    };
  }

  override async onPageCreated(page: Page) {
    let ua = await page.browser().userAgent();
    if (this.opts.stripHeadless) {
      ua = ua.replace("HeadlessChrome/", "Chrome/");
    }
    if (this.opts.makeWindows) {
      ua = ua.replace(/\(([^)]+)\)/, "(Windows NT 10.0; Win64; x64)");
    }
    if (this.opts.customFn) {
      ua = this.opts.customFn(ua);
    }
    debug("new ua", ua);
    await page.setUserAgent(ua);
  }
}

export default function puppeteer_extra_plugin_anonymize_ua(pluginConfig?: {
  stripHeadless?: true;
  makeWindows?: true;
  customFn?: ((ua: string) => string | null) | null;
}) {
  return new Plugin(pluginConfig);
}
