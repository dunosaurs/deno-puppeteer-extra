import { assert, assertEquals } from "assert";
import Plugin from "../mod.ts";

const PLUGIN_NAME = "user-preferences";

Deno.test("is a function", () => {
  assertEquals(typeof Plugin, "function");
});

Deno.test("should have the basic class members", () => {
  const instance = Plugin();

  assertEquals(instance.name, PLUGIN_NAME);
  assert(instance._isPuppeteerExtraPlugin);
});

Deno.test("should have the public child class members", () => {
  const instance = Plugin();
  const prototype = Object.getPrototypeOf(instance);
  const childClassMembers = Object.getOwnPropertyNames(prototype);

  assert(childClassMembers.includes("constructor"));
  assert(childClassMembers.includes("name"));
  assert(childClassMembers.includes("requirements"));
  assert(childClassMembers.includes("data"));
  assert(childClassMembers.includes("combinedPrefs"));
  assert(childClassMembers.includes("beforeLaunch"));
  assert(childClassMembers.length === 6);
});

Deno.test("should have opts with default values", () => {
  const instance = Plugin();
  const opts = instance.opts;

  assertEquals(opts.userPrefs, {});
});
