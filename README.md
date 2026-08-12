# Background Remover for Google Slides

A Google Slides add-on: select a photo, open the sidebar, click **Remove
Background**. Background removal runs entirely client-side in the sidebar
(via [`@imgly/background-removal`](https://www.npmjs.com/package/@imgly/background-removal),
a free, open-source, WASM/ONNX model) &mdash; no API key, no external
service, no per-image cost. The processed image is sent back to Apps
Script and swapped into the slide in place, keeping the original's
position, size and rotation.

## Files

- `appsscript.json` &mdash; project manifest (scopes, runtime).
- `Code.gs` &mdash; server-side Apps Script: menu, sidebar, reading the
  selected image, writing the result back into the slide.
- `Sidebar.html` &mdash; the sidebar UI and the client-side background-removal
  logic.

## Setup (copy/paste, ~5 minutes)

1. Open the Google Slides presentation you want this in.
2. **Extensions > Apps Script**. This opens a script bound to that
   presentation.
3. In the Apps Script editor, open **Project Settings** (gear icon) and
   check **"Show `appsscript.json` manifest file in editor"**.
4. Replace the contents of `Code.gs` with the contents of this repo's
   `Code.gs`.
5. Add a new HTML file: **+ > HTML**, name it exactly `Sidebar`. Replace
   its contents with this repo's `Sidebar.html`.
6. Open `appsscript.json` in the editor and replace it with this repo's
   `appsscript.json`.
7. Save the project (Ctrl/Cmd+S), then reload the Slides tab.
8. In Slides, go to **Extensions > Background Remover > Remove
   Background**.
9. The first time you run it, Google will show an OAuth consent screen.
   Since this is your own unpublished script, you'll see an "unverified
   app" warning &mdash; click **Advanced > Go to (project name) (unsafe)**
   and allow it. This is expected for personal scripts; the only
   permission requested is access to the currently open presentation
   (`presentations.currentonly`).

### Optional: deploy with `clasp` instead of copy/paste

If you'd rather push from this repo with the CLI:

```bash
npm install -g @google/clasp
clasp login
# Bind to an existing presentation's script:
#   open the presentation's Extensions > Apps Script, copy the Script ID
#   from Project Settings, then:
clasp clone <SCRIPT_ID>
# or create a brand new standalone script and attach it manually:
#   clasp create --type slides --title "Background Remover"
clasp push
```

`clasp push` uploads `Code.gs`, `Sidebar.html` and `appsscript.json`
as-is.

## How to use it

1. Click a photo on a slide to select it.
2. **Extensions > Background Remover > Remove Background** to open the
   sidebar (only needs to be opened once per session).
3. Click **1. Load Selected Image** &mdash; pulls in the image you selected.
4. Click **2. Remove Background** &mdash; runs entirely in your browser. The
   very first run downloads a segmentation model (tens of MB) which the
   browser caches, so later runs are much faster.
5. Review the result (checkerboard = transparent), then click **3.
   Insert into Slide** to swap it into the slide.

## How it works

- `Code.gs#getSelectedImageInfo` reads the current selection via
  `SlidesApp...getSelection()`, pulls the image blob, and returns it (plus
  its element ID) as a base64 data URL to the sidebar.
- `Sidebar.html` imports `removeBackground` from `@imgly/background-removal`
  over a CDN as an ES module and runs it on that data URL, producing a
  transparent PNG.
- `Code.gs#replaceImage` finds the original element by ID and calls
  `Image.replace(blob, false)`, which swaps the image content while
  keeping position, size, rotation, object ID and z-order intact.

## Notes / troubleshooting

- **Nothing happens / "Select an image" error**: make sure you clicked
  directly on the image (not a group or text box) before loading.
- **Model download blocked**: the sidebar loads the library from
  `cdn.jsdelivr.net` and its model weights from `staticimgly.com`. If
  your organization's network blocks either domain, background removal
  will fail to start &mdash; ask your admin to allowlist them, or swap the
  import URL in `Sidebar.html` for another CDN (e.g. `unpkg.com`).
- **Quality**: this uses a general-purpose segmentation model (`isnet`),
  good for people/products/objects on fairly distinct backgrounds. It
  won't be as precise as a paid API like remove.bg on tricky edge cases
  (hair, glass, fine detail).
- **Large images** take longer to process; the sidebar downsizes nothing
  automatically, so very large photos may be slow in the browser.
