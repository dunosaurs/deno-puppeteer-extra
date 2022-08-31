# puppeteer-extra-plugin-anonymize-ua

```javascript
import {
  puppeteer,
  puppeteer_extra_plugin_anonymize_ua,
} from "https://deno.land/x/puppeteer_extra/mod.ts";
puppeteer.use(puppeteer_extra_plugin_anonymize_ua());
// or
puppeteer.use(puppeteer_extra_plugin_anonymize_ua({
  customFn: (ua) => "MyCoolAgent/" + ua.replace("Chrome", "Beer"),
}));
const browser = await puppeteer.launch();
```
