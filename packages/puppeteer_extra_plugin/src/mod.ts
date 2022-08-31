import { Browser, ConnectOptions, Page, Target } from "puppeteer";
import { LaunchOptions } from "puppeteer/src/deno/LaunchOptions.ts";
import merge from "@/common/merge.ts";
import debug from "@/common/debug.ts";

export interface PluginOptions {
  [key: string]: any;
}
export interface PluginData {
  name: {
    [key: string]: any;
  };
  value: {
    [key: string]: any;
  };
}

export type PluginDependencies = Set<string>;
export type PluginRequirements = Set<
  "launch" | "headful" | "dataFromPlugins" | "runLast"
>;

/**
 * Base class for `puppeteer-extra` plugins.
 *
 * Provides convenience methods to avoid boilerplate.
 *
 * All common `puppeteer` browser events will be bound to
 * the plugin instance, if a respectively named class member is found.
 *
 * Please refer to the [puppeteer API documentation](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md) as well.
 *
 * @example
 * // hello-world-plugin.js
 * import { PuppeteerExtraPlugin } from "https://deno.land/x/puppeteer_extra/mod.ts";
 *
 * class Plugin extends PuppeteerExtraPlugin {
 *   constructor (opts = { }) { super(opts) }
 *
 *   get name () { return 'hello-world' }
 *
 *   onPageCreated (page) {
 *     this.debug('page created', page.url())
 *     const ua = await page.browser().userAgent()
 *     this.debug('user agent', ua)
 *   }
 * }
 *
 * module.exports = function (pluginConfig) { return new Plugin(pluginConfig) }
 *
 * // foo.js
 * import { puppeteer } from "https://deno.land/x/puppeteer_extra/mod.ts";
 * puppeteer.use(await import('./hello-world-plugin')())
 *
 * const browser = await puppeteer.launch({headless: false})
 * const page = await browser.newPage()
 * await page.goto('http://example.com', {waitUntil: 'domcontentloaded'})
 * await browser.close()
 */
export abstract class PuppeteerExtraPlugin {
  /** @protected */
  protected _opts: PluginOptions;
  /** @private */
  private _childClassMembers: string[];

  constructor(opts?: PluginOptions) {
    this._childClassMembers = [];

    this._opts = merge(this.defaults, opts || {});

    if (!this.name) throw "No name provided";

    debug("Initialized.");
  }

  /**
   * Plugin name (required).
   *
   * Convention:
   * - Package: `puppeteer-extra-plugin-anonymize-ua`
   * - Name: `anonymize-ua`
   *
   * @example
   * get name () { return 'anonymize-ua' }
   */
  get name(): string {
    throw new Error('Plugin must override "name"');
  }

  /**
   * Plugin defaults (optional).
   *
   * If defined will be ([deep-](https://github.com/jonschlinkert/merge-deep))merged with the (optional) user supplied options (supplied during plugin instantiation).
   *
   * The result of merging defaults with user supplied options can be accessed through `this.opts`.
   *
   * @see [[opts]]
   *
   * @example
   * get defaults () {
   *   return {
   *     stripHeadless: true,
   *     makeWindows: true,
   *     customFn: null
   *   }
   * }
   *
   * // Users can overwrite plugin defaults during instantiation:
   * puppeteer.use(await import('puppeteer-extra-plugin-foobar')({ makeWindows: false }))
   */
  get defaults(): PluginOptions {
    return {};
  }

  /**
   * Plugin requirements (optional).
   *
   * Signal certain plugin requirements to the base class and the user.
   *
   * Currently supported:
   * - `launch`
   *   - If the plugin only supports locally created browser instances (no `puppeteer.connect()`),
   *     will output a warning to the user.
   * - `headful`
   *   - If the plugin doesn't work in `headless: true` mode,
   *     will output a warning to the user.
   * - `dataFromPlugins`
   *   - In case the plugin requires data from other plugins.
   *     will enable usage of `this.getDataFromPlugins()`.
   * - `runLast`
   *   - In case the plugin prefers to run after the others.
   *     Useful when the plugin needs data from others.
   *
   * @example
   * get requirements () {
   *   return new Set(['runLast', 'dataFromPlugins'])
   * }
   */
  get requirements(): PluginRequirements {
    return new Set([]);
  }

  /**
   * Plugin data (optional).
   *
   * Plugins can expose data (an array of objects), which in turn can be consumed by other plugins,
   * that list the `dataFromPlugins` requirement (by using `this.getDataFromPlugins()`).
   *
   * Convention: `[ {name: 'Any name', value: 'Any value'} ]`
   *
   * @see [[getDataFromPlugins]]
   *
   * @example
   * // plugin1.js
   * get data () {
   *   return [
   *     {
   *       name: 'userPreferences',
   *       value: { foo: 'bar' }
   *     },
   *     {
   *       name: 'userPreferences',
   *       value: { hello: 'world' }
   *     }
   *   ]
   *
   * // plugin2.js
   * get requirements () { return new Set(['dataFromPlugins']) }
   *
   * async beforeLaunch () {
   *   const prefs = this.getDataFromPlugins('userPreferences').map(d => d.value)
   *   this.debug(prefs) // => [ { foo: 'bar' }, { hello: 'world' } ]
   * }
   */
  get data(): PluginData[] {
    return [];
  }

  /**
   * Access the plugin options (usually the `defaults` merged with user defined options)
   *
   * To skip the auto-merging of defaults with user supplied opts don't define a `defaults`
   * property and set the `this._opts` Object in your plugin constructor directly.
   *
   * @see [[defaults]]
   *
   * @example
   * get defaults () { return { foo: "bar" } }
   *
   * async onPageCreated (page) {
   *   this.debug(this.opts.foo) // => bar
   * }
   */
  get opts(): PluginOptions {
    return this._opts;
  }

  /**
   * Before a new browser instance is created/launched.
   *
   * Can be used to modify the puppeteer launch options by modifying or returning them.
   *
   * Plugins using this method will be called in sequence to each
   * be able to update the launch options.
   *
   * @example
   * async beforeLaunch (options) {
   *   if (this.opts.flashPluginPath) {
   *     options.args.push(`--ppapi-flash-path=${this.opts.flashPluginPath}`)
   *   }
   * }
   *
   * @param options - Puppeteer launch options
   */
  beforeLaunch(_options: any) {
    // noop
  }

  /**
   * After the browser has launched.
   *
   * Note: Don't assume that there will only be a single browser instance during the lifecycle of a plugin.
   * It's possible that `pupeeteer.launch` will be  called multiple times and more than one browser created.
   * In order to make the plugins as stateless as possible don't store a reference to the browser instance
   * in the plugin but rather consider alternatives.
   *
   * E.g. when using `onPageCreated` you can get a browser reference by using `page.browser()`.
   *
   * Alternatively you could expose a class method that takes a browser instance as a parameter to work with:
   *
   * ```es6
   * const fancyPlugin = await import('puppeteer-extra-plugin-fancy')()
   * puppeteer.use(fancyPlugin)
   * const browser = await puppeteer.launch()
   * await fancyPlugin.killBrowser(browser)
   * ```
   *
   * @param  browser - The `puppeteer` browser instance.
   * @param  opts.options - Puppeteer launch options used.
   *
   * @example
   * afterLaunch (browser, opts) {
   *   this.debug('browser has been launched', opts.options)
   * }
   */
  afterLaunch(
    _browser: Browser,
    _opts = { options: {} as LaunchOptions },
  ) {
    // noop
  }

  /**
   * Before connecting to an existing browser instance.
   *
   * Can be used to modify the puppeteer connect options by modifying or returning them.
   *
   * Plugins using this method will be called in sequence to each
   * be able to update the launch options.
   *
   * @param  {Object} options - Puppeteer connect options
   * @return {Object=}
   */
  beforeConnect(_options: ConnectOptions) {
    // noop
  }

  /**
   * After connecting to an existing browser instance.
   *
   * > Note: Don't assume that there will only be a single browser instance during the lifecycle of a plugin.
   *
   * @param browser - The `puppeteer` browser instance.
   * @param  {Object} opts
   * @param  {Object} opts.options - Puppeteer connect options used.
   */
  afterConnect(_browser: Browser, _opts = {}) {
    // noop
  }

  /**
   * Called when a browser instance is available.
   *
   * This applies to both `puppeteer.launch()` and `puppeteer.connect()`.
   *
   * Convenience method created for plugins that need access to a browser instance
   * and don't mind if it has been created through `launch` or `connect`.
   *
   * > Note: Don't assume that there will only be a single browser instance during the lifecycle of a plugin.
   *
   * @param browser - The `puppeteer` browser instance.
   */
  public onBrowser(_browser: Browser, _opts: any) {
    // noop
  }

  /**
   * Called when a target is created, for example when a new page is opened by window.open or browser.newPage.
   *
   * > Note: This includes target creations in incognito browser contexts.
   *
   * > Note: This includes browser instances created through `.launch()` as well as `.connect()`.
   *
   * @param  {Puppeteer.Target} target
   */
  onTargetCreated(_target: Target) {
    // noop
  }

  /**
   * Same as `onTargetCreated` but prefiltered to only contain Pages, for convenience.
   *
   * > Note: This includes page creations in incognito browser contexts.
   *
   * > Note: This includes browser instances created through `.launch()` as well as `.connect()`.
   *
   * @param  {Puppeteer.Target} target
   *
   * @example
   * onPageCreated (page) {
   *   let ua = await page.browser().userAgent()
   *   if (this.opts.stripHeadless) {
   *     ua = ua.replace('HeadlessChrome/', 'Chrome/')
   *   }
   *   this.debug('new ua', ua)
   *   await page.setUserAgent(ua)
   * }
   */
  onPageCreated(_page: Page) {
    // noop
  }

  /**
   * Called when the url of a target changes.
   *
   * > Note: This includes target changes in incognito browser contexts.
   *
   * > Note: This includes browser instances created through `.launch()` as well as `.connect()`.
   *
   * @param  {Puppeteer.Target} target
   */
  onTargetChanged(_target: Target) {
    // noop
  }

  /**
   * Called when a target is destroyed, for example when a page is closed.
   *
   * > Note: This includes target destructions in incognito browser contexts.
   *
   * > Note: This includes browser instances created through `.launch()` as well as `.connect()`.
   *
   * @param  {Puppeteer.Target} target
   */
  onTargetDestroyed(_target: Target) {
    // noop
  }

  /**
   * Called when Puppeteer gets disconnected from the Chromium instance.
   *
   * This might happen because of one of the following:
   * - Chromium is closed or crashed
   * - The `browser.disconnect` method was called
   */
  onDisconnected() {
    // noop
  }

  /**
   * After the plugin has been registered in `puppeteer-extra`.
   *
   * Normally right after `puppeteer.use(plugin)` is called
   */
  onPluginRegistered() {
    // noop
  }

  /**
   * Helper method to retrieve `data` objects from other plugins.
   *
   * A plugin needs to state the `dataFromPlugins` requirement
   * in order to use this method. Will be mapped to `puppeteer.getPluginData`.
   *
   * @param name - Filter data by `name` property
   *
   * @see [data]
   * @see [requirements]
   */
  getDataFromPlugins(_name?: string): PluginData[] {
    return [];
  }

  /**
   * Conditionally bind browser/process events to class members.
   * The idea is to reduce event binding boilerplate in plugins.
   *
   * For efficiency we make sure the plugin is using the respective event
   * by checking the child class members before registering the listener.
   *
   * @param  {<Puppeteer.Browser>} browser
   * @param  {Object} opts - Options
   * @param  {string} opts.context - Puppeteer context (launch/connect)
   * @param  {Object} [opts.options] - Puppeteer launch or connect options
   * @param  {Array<string>} [opts.defaultArgs] - The default flags that Chromium will be launched with
   *
   * @private
   */
  async _bindBrowserEvents(browser: Browser, opts: any = {}) {
    if (
      this._hasChildClassMember("onTargetCreated") ||
      this._hasChildClassMember("onPageCreated")
    ) {
      browser.on("targetcreated", this._onTargetCreated.bind(this));
    }
    if (this._hasChildClassMember("onTargetChanged") && this.onTargetChanged) {
      browser.on("targetchanged", this.onTargetChanged.bind(this));
    }
    if (
      this._hasChildClassMember("onTargetDestroyed") &&
      this.onTargetDestroyed
    ) {
      browser.on("targetdestroyed", this.onTargetDestroyed.bind(this));
    }
    if (this._hasChildClassMember("onDisconnected") && this.onDisconnected) {
      browser.on("disconnected", this.onDisconnected.bind(this));
    }
    if (opts.context === "launch" && this.afterLaunch) {
      await this.afterLaunch(browser, opts);
    }
    if (opts.context === "connect" && this.afterConnect) {
      await this.afterConnect(browser, opts);
    }
    if (this.onBrowser) await this.onBrowser(browser, opts);
  }

  /**
   * @private
   */
  async _onTargetCreated(target: Target) {
    if (this.onTargetCreated) await this.onTargetCreated(target);
    // Pre filter pages for plugin developers convenience
    if (target.type() === "page") {
      try {
        const page = await target.page();
        if (!page) {
          return;
        }
        const validPage = "isClosed" in page && !page.isClosed();
        if (this.onPageCreated && validPage) {
          await this.onPageCreated(page);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  /**
   * @private
   */
  _register(prototype: any) {
    this._registerChildClassMembers(prototype);
    if (this.onPluginRegistered) this.onPluginRegistered();
  }

  /**
   * @private
   */
  _registerChildClassMembers(prototype: any) {
    this._childClassMembers = Object.getOwnPropertyNames(prototype);
  }

  /**
   * @private
   */
  _hasChildClassMember(name: string) {
    return !!this._childClassMembers.includes(name);
  }

  /**
   * @private
   */
  get _isPuppeteerExtraPlugin() {
    return true;
  }
}
