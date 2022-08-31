import { assert, assertEquals } from "assert";
import { puppeteer } from "@";

Deno.test("is an object", () => {
  assertEquals(typeof puppeteer, "object");
});

Deno.test("is an instance of PuppeteerExtra", () => {
  assertEquals(puppeteer.constructor.name, "PuppeteerExtra");
});

Deno.test("should have the public class members", () => {
  assert(puppeteer.use instanceof Function);
  assert(puppeteer.plugins instanceof Array);
  assert(puppeteer.pluginNames instanceof Array);
  assert(puppeteer.getPluginData instanceof Function);
});

Deno.test("should have the internal class members", () => {
  assert("getPluginsByProp" in puppeteer);
  assert("orderPlugins" in puppeteer);
  assert("checkPluginRequirements" in puppeteer);
  assert("callPlugins" in puppeteer);
  assert("callPluginsWithValue" in puppeteer);
});

Deno.test("should have the orginal puppeteer public class members", () => {
  assert(puppeteer.launch instanceof Function);
  assert(puppeteer.connect instanceof Function);
  assert(puppeteer.executablePath instanceof Function);
  assert(puppeteer.defaultArgs instanceof Function);
  assert(puppeteer.createBrowserFetcher instanceof Function);
});
