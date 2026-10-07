# TaskBit public download website

This is a static website that can be deployed as a separate Netlify site for `taskbit.in`.

## Publish with Netlify Drop

1. Open Netlify and create a new site by dropping this entire `download-site` folder.
2. After the site is published, connect `taskbit.in` in the new site's Domain management.
3. Keep `admin.taskbit.in` connected to the existing admin-panel site and `api.taskbit.in` pointed at Render.
4. When the final Android APK is ready, add it at `downloads/taskbit.apk` and replace the disabled download button in `index.html` with a link to `/downloads/taskbit.apk`.

The APK button is intentionally disabled until the final Android build is available.
