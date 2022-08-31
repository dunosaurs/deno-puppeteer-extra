import puppeteer, { Browser, Page } from "puppeteer";
import { PuppeteerDeno } from "puppeteer/src/deno/Puppeteer.ts";
import merge from "@/common/merge.ts";
import debug from "@/common/debug.ts";

/**
 * Original Puppeteer API
 * @private
 */
export type VanillaPuppeteer = Pick<
  PuppeteerDeno,
  | "connect"
  | "defaultArgs"
  | "executablePath"
  | "launch"
  | "createBrowserFetcher"
>;

/**
 * Minimal plugin interface
 * @private
 */
export interface PuppeteerExtraPlugin {
  _isPuppeteerExtraPlugin: boolean;
  [propName: string]: any;
}

/**
 * We need to hook into non-public APIs in rare occasions to fix puppeteer bugs. :(
 * @private
 */
interface BrowserInternals extends Browser {
  _createPageInContext(contextId?: string): Promise<Page>;
}

/**
 * Modular plugin framework to teach `puppeteer` new tricks.
 *
 * This module acts as a drop-in replacement for `puppeteer`.
 *
 * Allows PuppeteerExtraPlugin's to register themselves and
 * to extend puppeteer with additional functionality.
 *
 * @class PuppeteerExtra
 * @implements {VanillaPuppeteer}
 *
 * @example
 * import { puppeteer, puppeteer_extra_plugin_anonymize_ua, puppeteer_extra_plugin_font_size } from 'https://deno.land/x/puppeteer_extra/mod.ts'
 * puppeteer.use(puppeteer_extra_plugin_anonymize_ua())
 * puppeteer.use(puppeteer_extra_plugin_font_size({defaultFontSize: 18}))
 *
 * const browser = await puppeteer.launch({headless: false})
 * const page = await browser.newPage()
 * await page.goto('http://example.com', {waitUntil: 'domcontentloaded'})
 * await browser.close()
 */
export class PuppeteerExtra implements VanillaPuppeteer {
  private _plugins: PuppeteerExtraPlugin[] = [];

  private pptr: PuppeteerDeno;

  constructor() {
    this.pptr = puppeteer;
  }

  /**
   * The **main interface** to register `puppeteer-extra` plugins.
   *
   * @example
   * puppeteer.use(plugin1).use(plugin2)
   *
   * @see [PuppeteerExtraPlugin]
   *
   * @return The same `PuppeteerExtra` instance (for optional chaining)
   */
  use(plugin: PuppeteerExtraPlugin): this {
    if (typeof plugin !== "object" || !plugin._isPuppeteerExtraPlugin) {
      console.error(
        `Warning: Plugin is not derived from PuppeteerExtraPlugin, ignoring.`,
        plugin,
      );
      return this;
    }
    if (!plugin.name) {
      console.error(
        `Warning: Plugin with no name registering, ignoring.`,
        plugin,
      );
      return this;
    }
    if (plugin.requirements.has("dataFromPlugins")) {
      plugin.getDataFromPlugins = this.getPluginData.bind(this);
    }
    plugin._register(Object.getPrototypeOf(plugin));
    this._plugins.push(plugin);
    debug("plugin registered", plugin.name);
    return this;
  }

  /**
   * The method launches a browser instance with given arguments. The browser will be closed when the parent node.js process is closed.
   *
   * Augments the original `puppeteer.launch` method with plugin lifecycle methods.
   *
   * All registered plugins that have a `beforeLaunch` method will be called
   * in sequence to potentially update the `options` Object before launching the browser.
   *
   * @example
   * const browser = await puppeteer.launch({
   *   headless: false,
   *   defaultViewport: null
   * })
   *
   * @param options - See [puppeteer docs](https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions).
   */
  async launch(
    options?: Parameters<VanillaPuppeteer["launch"]>[0],
  ): ReturnType<VanillaPuppeteer["launch"]> {
    // Ensure there are certain properties (e.g. the `options.args` array)
    const defaultLaunchOptions = { args: [] };
    options = merge(defaultLaunchOptions, options || {});
    this.orderPlugins();

    // Give plugins the chance to modify the options before launch
    options = await this.callPluginsWithValue("beforeLaunch", options);

    const opts = {
      context: "launch",
      options,
      defaultArgs: this.defaultArgs,
    };

    // Let's check requirements after plugin had the chance to modify the options
    this.checkPluginRequirements(opts);

    const browser = await this.pptr.launch(options);
    this._patchPageCreationMethods(browser as BrowserInternals);

    await this.callPlugins("_bindBrowserEvents", browser, opts);
    return browser;
  }

  /**
   * Attach Puppeteer to an existing Chromium instance.
   *
   * Augments the original `puppeteer.connect` method with plugin lifecycle methods.
   *
   * All registered plugins that have a `beforeConnect` method will be called
   * in sequence to potentially update the `options` Object before launching the browser.
   *
   * @param options - See [puppeteer docs](https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#puppeteerconnectoptions).
   */
  async connect(
    options: Parameters<VanillaPuppeteer["connect"]>[0],
  ): ReturnType<VanillaPuppeteer["connect"]> {
    this.orderPlugins();

    // Give plugins the chance to modify the options before connect
    options = await this.callPluginsWithValue("beforeConnect", options);

    const opts = { context: "connect", options };

    // Let's check requirements after plugin had the chance to modify the options
    this.checkPluginRequirements(opts);

    const browser = await this.pptr.connect(options);
    this._patchPageCreationMethods(browser as BrowserInternals);

    await this.callPlugins("_bindBrowserEvents", browser, opts);
    return browser;
  }

  /**
   * The default flags that Chromium will be launched with.
   *
   * @param options - See [puppeteer docs](https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#puppeteerdefaultargsoptions).
   */
  defaultArgs(
    options?: Parameters<VanillaPuppeteer["defaultArgs"]>[0],
  ): ReturnType<VanillaPuppeteer["defaultArgs"]> {
    return this.pptr.defaultArgs(options);
  }

  /** Path where Puppeteer expects to find bundled Chromium. */
  executablePath(): string {
    return this.pptr.executablePath();
  }

  /**
   * This methods attaches Puppeteer to an existing Chromium instance.
   *
   * @param options - See [puppeteer docs](https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#puppeteercreatebrowserfetcheroptions).
   */
  createBrowserFetcher(
    options: Parameters<VanillaPuppeteer["createBrowserFetcher"]>[0],
  ): ReturnType<VanillaPuppeteer["createBrowserFetcher"]> {
    return this.pptr.createBrowserFetcher(options);
  }

  /**
   * Patch page creation methods (both regular and incognito contexts).
   *
   * Unfortunately it's possible that the `targetcreated` events are not triggered
   * early enough for listeners (e.g. plugins using `onPageCreated`) to be able to
   * modify the page instance (e.g. user-agent) before the browser request occurs.
   *
   * This only affects the first request of a newly created page target.
   *
   * As a workaround I've noticed that navigating to `about:blank` (again),
   * right after a page has been created reliably fixes this issue and adds
   * no noticable delay or side-effects.
   *
   * This problem is not specific to `puppeteer-extra` but default Puppeteer behaviour.
   *
   * Note: This patch only fixes explicitly created pages, implicitly created ones
   * (e.g. through `window.open`) are still subject to this issue. I didn't find a
   * reliable mitigation for implicitly created pages yet.
   *
   * Puppeteer issues:
   * https://github.com/GoogleChrome/puppeteer/issues/2669
   * https://github.com/puppeteer/puppeteer/issues/3667
   * https://github.com/GoogleChrome/puppeteer/issues/386#issuecomment-343059315
   * https://github.com/GoogleChrome/puppeteer/issues/1378#issue-273733905
   *
   * @private
   */
  private _patchPageCreationMethods(browser: BrowserInternals) {
    if (!browser._createPageInContext) {
      debug(
        "warning: _patchPageCreationMethods failed (no browser._createPageInContext)",
      );
      return;
    }
    browser._createPageInContext = (function (originalMethod, context) {
      return async function () {
        const page = await originalMethod.apply(context, arguments as any);
        await page.goto("about:blank");
        return page;
      };
    })(browser._createPageInContext, browser);
  }

  /**
   * Get a list of all registered plugins.
   *
   * @member {Array<PuppeteerExtraPlugin>}
   */
  get plugins() {
    return this._plugins;
  }

  /**
   * Get the names of all registered plugins.
   *
   * @member {Array<string>}
   * @private
   */
  get pluginNames() {
    return this._plugins.map((p) => p.name);
  }

  /**
   * Collects the exposed `data` property of all registered plugins.
   * Will be reduced/flattened to a single array.
   *
   * Can be accessed by plugins that listed the `dataFromPlugins` requirement.
   *
   * Implemented mainly for plugins that need data from other plugins (e.g. `user-preferences`).
   *
   * @see [PuppeteerExtraPlugin]/data
   * @param name - Filter data by optional plugin name
   *
   * @private
   */
  public getPluginData(name?: string) {
    const data = this._plugins
      .map((p) => (Array.isArray(p.data) ? p.data : [p.data]))
      .reduce((acc, arr) => [...acc, ...arr], []);
    return name ? data.filter((d: any) => d.name === name) : data;
  }

  /**
   * Get all plugins that feature a given property/class method.
   *
   * @private
   */
  private getPluginsByProp(prop: string): PuppeteerExtraPlugin[] {
    return this._plugins.filter((plugin) => prop in plugin);
  }

  /**
   * Order plugins that have expressed a special placement requirement.
   *
   * This is useful/necessary for e.g. plugins that depend on the data from other plugins.
   *
   * @todo Support more than 'runLast'.
   * @todo If there are multiple plugins defining 'runLast', sort them depending on who depends on whom. :D
   *
   * @private
   */
  private orderPlugins() {
    debug("orderPlugins:before", this.pluginNames);
    const runLast = this._plugins
      .filter((p) => p.requirements.has("runLast"))
      .map((p) => p.name);
    for (const name of runLast) {
      const index = this._plugins.findIndex((p) => p.name === name);
      this._plugins.push(this._plugins.splice(index, 1)[0]);
    }
    debug("orderPlugins:after", this.pluginNames);
  }

  /**
   * Lightweight plugin requirement checking.
   *
   * The main intent is to notify the user when a plugin won't work as expected.
   *
   * @todo This could be improved, e.g. be evaluated by the plugin base class.
   *
   * @private
   */
  private checkPluginRequirements(opts = {} as any) {
    for (const plugin of this._plugins) {
      for (const requirement of plugin.requirements) {
        if (
          opts.context === "launch" &&
          requirement === "headful" &&
          opts.options.headless
        ) {
          console.warn(
            `Warning: Plugin '${plugin.name}' is not supported in headless mode.`,
          );
        }
        if (opts.context === "connect" && requirement === "launch") {
          console.warn(
            `Warning: Plugin '${plugin.name}' doesn't support puppeteer.connect().`,
          );
        }
      }
    }
  }

  /**
   * Call plugins sequentially with the same values.
   * Plugins that expose the supplied property will be called.
   *
   * @param prop - The plugin property to call
   * @param values - Any number of values
   * @private
   */
  private async callPlugins(prop: string, ...values: any[]) {
    for (const plugin of this.getPluginsByProp(prop)) {
      await plugin[prop].apply(plugin, values);
    }
  }

  /**
   * Call plugins sequentially and pass on a value (waterfall style).
   * Plugins that expose the supplied property will be called.
   *
   * The plugins can either modify the value or return an updated one.
   * Will return the latest, updated value which ran through all plugins.
   *
   * @param prop - The plugin property to call
   * @param value - Any value
   * @return The new updated value
   * @private
   */
  private async callPluginsWithValue(prop: string, value: any) {
    for (const plugin of this.getPluginsByProp(prop)) {
      const newValue = await plugin[prop](value);
      if (newValue) {
        value = newValue;
      }
    }
    return value;
  }
}

/**
 * The **default export** will behave exactly the same as the regular puppeteer
 * (just with extra plugin functionality) and can be used as a drop-in replacement.
 *
 * @example
 * import { puppeteer } from 'https://deno.land/x/puppeteer_extra/mod.ts'
 *
 * // Add plugins
 * puppeteer.use(...)
 */

const exp = new PuppeteerExtra();

export default exp;
