import { PuppeteerExtraPlugin } from "@";
import debug from "@/common/debug.ts";
import merge from "@/common/merge.ts";

/**
 * Launch puppeteer with arbitrary user preferences.
 *
 * The user defined preferences will be merged with preferences set by other plugins.
 * Plugins can add user preferences by exposing a data entry with the name `userPreferences`.
 *
 * Overview:
 * https://chromium.googlesource.com/chromium/src/+/master/chrome/common/pref_names.cc
 *
 * @param {Object} opts - Options
 * @param {Object} [opts.userPrefs={}] - An object containing the preferences.
 *
 * @example
 * import { puppeteer, puppeteer_extra_plugin_user_preferences } from "https://deno.land/x/puppeteer_extra/mod.ts";
 * puppeteer.use(puppeteer_extra_plugin_user_preferences({userPrefs: {
 *   webkit: {
 *     webprefs: {
 *       default_font_size: 22
 *     }
 *   }
 * }}))
 * const browser = await puppeteer.launch()
 */
class Plugin extends PuppeteerExtraPlugin {
  _userPrefsFromPlugins: any;

  constructor(opts = {}) {
    super(opts);
    this._userPrefsFromPlugins = {};

    const defaults = {
      userPrefs: {},
    };

    this._opts = Object.assign(defaults, opts);
  }

  get name() {
    return "user-preferences";
  }

  get requirements(): any {
    return new Set(["runLast", "dataFromPlugins"]);
  }
  
  get data(): any {
    return [
      {
        name: "userDataDirFile",
        value: {
          target: "Profile",
          file: "Preferences",
          contents: JSON.stringify(this.combinedPrefs, null, 2),
        },
      },
    ];
  }

  get combinedPrefs() {
    return merge(this._opts.userPrefs, this._userPrefsFromPlugins);
  }

  beforeLaunch() {
    const preferences = this.getDataFromPlugins("userPreferences").map((d) =>
      d.value
    );
    this._userPrefsFromPlugins = preferences.reduce(
      (prev, cur) => merge(prev, cur),
      {},
    );
    debug("_userPrefsFromPlugins", this._userPrefsFromPlugins);
  }
}

export default function puppeteer_extra_plugin_user_preferences(pluginConfig?: any) {
  return new Plugin(pluginConfig);
}
