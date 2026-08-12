# Background Remover for Google Slides

A Google Slides add-on: select a photo, open the sidebar, click **Remove
Background**. Background removal runs entirely client-side in the sidebar
(via [`@imgly/background-removal`](https://www.npmjs.com/package/@imgly/background-removal),
a free, open-source, WASM/ONNX model) &mdash; no API key, no external
service, no per-image cost. The processed image is sent back to Apps
Script and swapped into the slide in place, keeping the original's
position, size and rotation.

## Files

- `appsscript.json` &mdash; project manifest (scopes, runtime, and the
  `addOns` block needed to install this as a personal add-on).
- `Code.gs` &mdash; server-side Apps Script: menu, sidebar, reading the
  selected image, writing the result back into the slide.
- `Sidebar.html` &mdash; the sidebar UI and the client-side background-removal
  logic.

## Setup

There are two ways to install this, depending on whether you want it in
one presentation or in every Slides file you open.

### Option A: works in every Slides file you open (recommended, personal add-on)

This deploys the project as a **standalone** Apps Script project (not tied
to any one presentation) and installs it as a personal add-on. Once
installed, the **Extensions > Background Remover** menu appears
automatically in *any* Google Slides file you open with your account &mdash;
no per-file setup.

1. Go to [script.google.com](https://script.google.com) and click **New
   project**. (Do **not** go through a Slides file's Extensions menu for
   this &mdash; that creates a container-bound script, which is Option B
   below.)
2. Rename the project (e.g. "Background Remover") via the title at the
   top.
3. Replace the default `Code.gs` contents with this repo's `Code.gs`.
4. Add a new HTML file: **+ > HTML**, name it exactly `Sidebar`. Replace
   its contents with this repo's `Sidebar.html`.
5. Open **Project Settings** (gear icon) and check **"Show
   `appsscript.json` manifest file in editor"**, then open
   `appsscript.json` and replace it with this repo's version (it includes
   an `addOns` block that's required for installable add-ons).
6. Save the project (Ctrl/Cmd+S).
7. Click **Deploy > Test deployments** (top right). In the dialog that
   opens, click **Install add-on**, then **Done**. This installs the
   unpublished add-on to your own Google account &mdash; no Google review or
   Marketplace listing needed for personal use.
8. Open (or reload) **any** Google Slides file. You'll find **Extensions
   > Background Remover > Remove Background**.
9. First run triggers the usual OAuth consent screen with an "unverified
   app" warning (expected for a personal, unpublished script) &mdash; click
   **Advanced > Go to (project name) (unsafe)** and allow it. The only
   permission requested is access to the currently open presentation.

Notes on this install method:
- It's tied to your Google account, not to specific files &mdash; it'll show
  up in every Slides file you personally open, including new ones you
  create later.
- It only works for you. To share it with teammates or the public, it
  needs to be published (internally to your Workspace org, or publicly to
  the Marketplace), which requires Google's app verification process &mdash;
  a separate, heavier step from what's covered here.
- If you ever edit the code, re-open **Deploy > Test deployments** and
  save/redeploy &mdash; the installed add-on picks up the latest saved code
  automatically since test deployments track the project's head, not a
  frozen version.

### Option B: single presentation only (container-bound, copy/paste)

Simpler, but only works in the one file you set it up in.

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
9. Same OAuth consent screen as above on first run.

### Optional: deploy with `clasp` instead of copy/paste

If you'd rather push from this repo with the CLI:

```bash
npm install -g @google/clasp
clasp login
# Standalone project for Option A (works across all your Slides files):
clasp create --type standalone --title "Background Remover"
clasp push
# then open script.google.com, open this project, and do steps 7-9 of
# Option A above (Deploy > Test deployments > Install add-on).

# Or, to bind to one existing presentation's script (Option B):
#   open the presentation's Extensions > Apps Script, copy the Script ID
#   from Project Settings, then:
clasp clone <SCRIPT_ID>
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
