# Tiny Meme Generator

A React + Vite meme generator for the vibe-coding exercise.

## Features

- Upload an image
- Add multiple text layers
- Drag layers around the image
- Change font, size, color, alignment, opacity, and outline
- Add emoji stickers
- Reorder and delete layers
- Grayscale, brightness, contrast, and blur
- Undo / redo
- Save and load the editor state with localStorage
- Download the final meme as PNG

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

## Suggested Git workflow

Create a branch for each feature:

```bash
git checkout -b feature/upload-image
git add .
git commit -m "Add image upload"
git checkout main
git merge feature/upload-image
```

Then repeat for:

- `feature/text-layers`
- `feature/drag-layers`
- `feature/emoji-stickers`
- `feature/layer-controls`
- `feature/image-effects`
- `feature/undo-redo`
- `feature/export-save`

Push the repository and submit the GitHub repository link.
