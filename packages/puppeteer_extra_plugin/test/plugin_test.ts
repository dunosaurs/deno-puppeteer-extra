import { PuppeteerExtraPlugin } from "@";
import { assert, assertEquals, assertThrows } from "assert";

Deno.test("is a function", () => {
  assertEquals(typeof PuppeteerExtraPlugin, "function");
});

Deno.test("will throw without a name", () => {
  class Derived extends PuppeteerExtraPlugin {}
  assertThrows(() => new Derived(), `Plugin must override "name"`);
});

Deno.test("should have the basic class members", () => {
  const pluginName = "hello-world";
  class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
      super(opts);
    }
    get name() {
      return pluginName;
    }
  }
  const instance = new Plugin();

  assertEquals(instance.name, pluginName);
  assert(instance.requirements instanceof Set);
  assert(instance.data instanceof Array);
  assert(instance.defaults instanceof Object);
  assertEquals(instance.data.length, 0);
  assert(instance._isPuppeteerExtraPlugin);
});

Deno.test("should have the public class members", () => {
  const pluginName = "hello-world";
  class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
      super(opts);
    }
    get name() {
      return pluginName;
    }
  }
  const instance = new Plugin();

  assert(instance.beforeLaunch instanceof Function);
  assert(instance.afterLaunch instanceof Function);
  assert(instance.onTargetCreated instanceof Function);
  assert(instance.onBrowser instanceof Function);
  assert(instance.onPageCreated instanceof Function);
  assert(instance.onTargetChanged instanceof Function);
  assert(instance.onTargetDestroyed instanceof Function);
  assert(instance.onDisconnected instanceof Function);
  assert(instance.onPluginRegistered instanceof Function);
  assert(instance.getDataFromPlugins instanceof Function);
});

Deno.test("should have the internal class members", () => {
  const pluginName = "hello-world";
  class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
      super(opts);
    }
    get name() {
      return pluginName;
    }
  }
  const instance = new Plugin();

  assert(instance._bindBrowserEvents instanceof Function);
  assert(instance._onTargetCreated instanceof Function);
  assert(instance._register instanceof Function);
  assert(instance._registerChildClassMembers instanceof Function);
  assert(instance._hasChildClassMember instanceof Function);
});

Deno.test("should merge opts with defaults automatically", () => {
  const pluginName = "hello-world";
  const pluginDefaults = { foo: "bar", foo2: "bar2", extra1: 123 };
  const userOpts = { foo2: "bob", extra2: 666 };

  class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
      super(opts);
    }
    get name() {
      return pluginName;
    }
    get defaults() {
      return pluginDefaults;
    }
  }
  const instance = new Plugin(userOpts);

  assertEquals(instance.defaults, pluginDefaults);
  assertEquals(instance.opts.foo, pluginDefaults.foo);
  assertEquals(instance.opts.foo2, userOpts.foo2);
  assertEquals(instance.opts.extra1, pluginDefaults.extra1);
  assertEquals(instance.opts.extra2, userOpts.extra2);
});

Deno.test("should have opts when defaults is not defined", () => {
  const pluginName = "hello-world";
  const userOpts = { foo2: "bob", extra2: 666 };

  class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
      super(opts);
    }
    get name() {
      return pluginName;
    }
  }
  const instance = new Plugin(userOpts);

  assertEquals(instance.opts, userOpts);
});
