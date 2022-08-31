# puppeteer-extra-plugin-user-preferences

Launch puppeteer with arbitrary user preferences.

The user defined preferences will be merged with preferences set by other
plugins. Plugins can add user preferences by exposing a data entry with the name
`userPreferences`.

Overview:
<https://chromium.googlesource.com/chromium/src/+/master/chrome/common/pref_names.cc>

Examples:

```javascript
import {
  puppeteer,
  puppeteer_extra_plugin_user_preferences,
} from "https://deno.land/x/puppeteer_extra/mod.ts";
puppeteer.use(puppeteer_extra_plugin_user_preferences({
  userPrefs: {
    webkit: {
      webprefs: {
        default_font_size: 22,
      },
    },
  },
}));
const browser = await puppeteer.launch();
```

Set custom path for downloading

```typescript
puppeteer.use(
  puppeteer_extra_plugin_user_preferences({
    userPrefs: {
      download: {
        prompt_for_download: false,
        open_pdf_in_system_reader: true,
        default_directory: downloadImageDirectoryPath,
      },
      plugins: {
        always_open_pdf_externally: true,
      },
    },
  }),
);
```

Override `allow-multiple-downloads` browser permission to programmatically allow
multiple downloads (avoid the popup).

```typescript
puppeteer.use(
  puppeteer_extra_plugin_user_preferences({
    userPrefs: {
      download: {
        prompt_for_download: false,
        open_pdf_in_system_reader: true,
        default_directory: downloadImageDirectoryPath,
        // automatic_downloads: 1, -> this params also does disable permission popup in some case (inconsistent behaviour)
      },
      plugins: {
        always_open_pdf_externally: true,
      },
      // disable allow-multiple-downloads popup
      profile: {
        default_content_setting_values: {
          automatic_downloads: 1,
        },
      },
    },
  }),
);
```
