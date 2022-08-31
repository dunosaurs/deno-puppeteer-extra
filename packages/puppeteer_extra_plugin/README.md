# puppeteer-extra-plugin

Base class for `puppeteer-extra` plugins.

Provides convenience methods to avoid boilerplate.

All common `puppeteer` browser events will be bound to the plugin instance, if a
respectively named class member is found.

Please refer to the
[puppeteer API documentation](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md)
as well.

Example:

```typescript
// hello-world-plugin.js
import { PuppeteerExtraPlugin } from "https://deno.land/x/puppeteer_extra/mod.ts";

class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'hello-world'
  }

  async onPageCreated(page) {
    this.debug('page created', page.url())
    const ua = await page.browser().userAgent()
    this.debug('user agent', ua)
  }
}

export function (pluginConfig) {
  return new Plugin(pluginConfig)
}

// foo.js
import { puppeteer } from "https://deno.land/x/puppeteer_extra/mod.ts";
puppeteer.use(await import('./hello-world-plugin')())
;(async () => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  await page.goto('http://example.com', { waitUntil: 'domcontentloaded' })
  await browser.close()
})()
```
