# Lightcut

A small, free 2D motion graphics editor. Runs locally in a browser with no runtime dependencies, accounts, API keys, or cloud processing.

## Run

Install Node.js, then run:

```sh
npm start
```

Open http://localhost:5173. No dependency installation or build step is needed. Stop the server with Ctrl+C.

## Create an animation

1. Try the included animated composition with the play button.
2. Add text, rectangles, ellipses, or an image. Select layers from the timeline or canvas.
3. Drag layers on the canvas; edit their appearance and transforms in the inspector.
4. Scrub the timeline to the desired time. Click ◇ beside a transform to create a keyframe.
5. Move to another time and edit that property. Animated properties automatically receive a new keyframe. Drag ◆ markers to retime them; a marker moves all property keys at that time together. Clicking ◇ again removes that property's keyframe.
6. Choose smooth, linear, or hold interpolation in the inspector. This applies to all existing keys on the selected layer.
7. Export a silent WebM video, save a PNG of the current frame, or download an editable `.lightcut` project.

Layer order is front to back. Forward and Backward change compositing order. The visibility toggle hides layers in preview and exports. Projects support a 1–60 second duration and 30 fps timeline. Shortening a composition removes keyframes beyond its new end; Undo restores them. Changing composition size preserves layer coordinates.

## Saving and privacy

Projects autosave to this browser's local storage. Imported images are embedded in projects. Browser storage can fill up or be cleared: download your project for a durable copy and use Open to restore it. The app never uploads your media. Very large images increase project size and memory use.

## Current scope

This is an initial 2D editor, not a full After Effects replacement. It supports text, filled shapes, imported images, position, scale, rotation, opacity, easing, canvas dragging, layer order, visibility, undo/redo, local autosave and project files.

Video/audio source layers, masks, effects, blend modes, 3D, expressions, graph editing, MP4 output, and frame-accurate offline rendering are not implemented. WebM uses browser MediaRecorder in real time, so keep the tab visible during export. Browser recording support varies, and output may drop frames under load. Export is silent. PNG and project downloads remain available independently.

## Development

```sh
npm run check
npm test
```

`src/engine.js` contains animation interpolation and project validation. `src/app.js` implements editing, canvas rendering, history and export. `src/style.css` defines the responsive interface. `server.mjs` serves local app assets.

Verification: syntax checks and five engine/project validation tests pass. Interactive browser QA and export recording require manual verification.
