import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const defaultText = (id, text = "YOUR TEXT") => ({
  id,
  type: "text",
  text,
  x: 50,
  y: 18,
  fontSize: 48,
  color: "#ffffff",
  fontFamily: "Impact",
  align: "center",
  opacity: 1,
  outline: true
});

const defaultEmoji = (id) => ({
  id,
  type: "emoji",
  text: "😂",
  x: 50,
  y: 50,
  fontSize: 72,
  opacity: 1
});

function App() {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);

  const [imageSrc, setImageSrc] = useState("");
  const [layers, setLayers] = useState([defaultText(1, "WHEN THE CODE FINALLY WORKS")]);
  const [selectedId, setSelectedId] = useState(1);
  const [effects, setEffects] = useState({
    grayscale: 0,
    brightness: 100,
    contrast: 100,
    blur: 0
  });
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [savedMessage, setSavedMessage] = useState("");

  const selected = layers.find((l) => l.id === selectedId);

  const snapshot = () => ({
    layers: JSON.parse(JSON.stringify(layers)),
    effects: { ...effects }
  });

  const commit = (nextLayers = layers, nextEffects = effects) => {
    setHistory((h) => [...h, snapshot()]);
    setFuture([]);
    setLayers(nextLayers);
    setEffects(nextEffects);
  };

  const addText = () => {
  const id = Date.now();
  const textCount = layers.filter((layer) => layer.type === "text").length;
  const newText = {
    ...defaultText(id),
    y: Math.min(18 + textCount * 15, 85)
  };
  const next = [...layers, newText];
  commit(next);
  setSelectedId(id);
};

  const addEmoji = (emoji) => {
    const id = Date.now();
    const next = [...layers, { ...defaultEmoji(id), text: emoji }];
    commit(next);
    setSelectedId(id);
  };

  const updateSelected = (changes) => {
    if (!selected) return;
    setLayers((prev) =>
      prev.map((l) => (l.id === selectedId ? { ...l, ...changes } : l))
    );
  };

  const commitSelected = (changes) => {
    if (!selected) return;
    const next = layers.map((l) =>
      l.id === selectedId ? { ...l, ...changes } : l
    );
    commit(next);
  };

  const deleteSelected = () => {
    if (!selected) return;
    const next = layers.filter((l) => l.id !== selectedId);
    commit(next);
    setSelectedId(next.at(-1)?.id ?? null);
  };

  const moveLayer = (direction) => {
    const index = layers.findIndex((l) => l.id === selectedId);
    if (index < 0) return;
    const target = direction === "up" ? index + 1 : index - 1;
    if (target < 0 || target >= layers.length) return;
    const next = [...layers];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const undo = () => {
    if (!history.length) return;
    const previous = history.at(-1);
    setFuture((f) => [...f, snapshot()]);
    setHistory((h) => h.slice(0, -1));
    setLayers(previous.layers);
    setEffects(previous.effects);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future.at(-1);
    setHistory((h) => [...h, snapshot()]);
    setFuture((f) => f.slice(0, -1));
    setLayers(next.layers);
    setEffects(next.effects);
  };

  const loadImage = (src) => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageSrc(src);
    };
    img.src = src;
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadImage(reader.result);
    reader.readAsDataURL(file);
  };

  const draw = (targetCanvas = canvasRef.current) => {
    if (!targetCanvas) return;
    const ctx = targetCanvas.getContext("2d");
    const img = imageRef.current;

    const width = img?.naturalWidth || 900;
    const height = img?.naturalHeight || 600;
    targetCanvas.width = width;
    targetCanvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (img) {
      ctx.save();
      ctx.filter =
        `grayscale(${effects.grayscale}%) ` +
        `brightness(${effects.brightness}%) ` +
        `contrast(${effects.contrast}%) ` +
        `blur(${effects.blur}px)`;
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();
    } else {
      ctx.fillStyle = "#222";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 36px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Upload an image to start", width / 2, height / 2);
    }

    layers.forEach((layer) => {
      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1;
      const x = (layer.x / 100) * width;
      const y = (layer.y / 100) * height;

      if (layer.type === "emoji") {
        ctx.font = `${layer.fontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(layer.text, x, y);
      } else {
        ctx.font = `bold ${layer.fontSize}px ${layer.fontFamily}`;
        ctx.textAlign = layer.align;
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        if (layer.outline) {
          ctx.strokeStyle = "#000";
          ctx.lineWidth = Math.max(4, layer.fontSize / 10);
          ctx.strokeText(layer.text, x, y);
        }
        ctx.fillStyle = layer.color;
        ctx.fillText(layer.text, x, y);
      }
      ctx.restore();
    });
  };

  useEffect(() => {
    draw();
  }, [imageSrc, layers, effects]);

  const pointerPosition = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    };
  };

  const startDrag = (event) => {
  const p = pointerPosition(event);
  const width = canvasRef.current.width;
  const height = canvasRef.current.height;

  const clickedLayer = [...layers].reverse().find((layer) => {
    const x = (layer.x / 100) * width;
    const y = (layer.y / 100) * height;
    const size = layer.fontSize || 48;

    return (
      Math.abs(p.x - (x / width) * 100) < (size / width) * 100 * 2 &&
      Math.abs(p.y - (y / height) * 100) < (size / height) * 100
    );
  });

  if (!clickedLayer) return;

  setSelectedId(clickedLayer.id);
  dragRef.current = p;
  canvasRef.current.setPointerCapture(event.pointerId);
};

  const drag = (event) => {
    if (!dragRef.current || !selected) return;
    const p = pointerPosition(event);
    const dx = p.x - dragRef.current.x;
    const dy = p.y - dragRef.current.y;
    dragRef.current = p;
    updateSelected({
      x: Math.max(0, Math.min(100, selected.x + dx)),
      y: Math.max(0, Math.min(100, selected.y + dy))
    });
  };

  const endDrag = () => {
    if (!dragRef.current || !selected) return;
    commitSelected({ x: selected.x, y: selected.y });
    dragRef.current = null;
  };

  const downloadPNG = () => {
    const output = document.createElement("canvas");
    draw(output);
    const link = document.createElement("a");
    link.download = "my-meme.png";
    link.href = output.toDataURL("image/png");
    link.click();
  };

  const saveLocal = () => {
    const output = document.createElement("canvas");
    draw(output);
    localStorage.setItem(
      "tiny-meme-generator",
      JSON.stringify({
        imageSrc,
        layers,
        effects,
        png: output.toDataURL("image/png")
      })
    );
    setSavedMessage("Saved to local storage");
    setTimeout(() => setSavedMessage(""), 1800);
  };

  const loadLocal = () => {
    const raw = localStorage.getItem("tiny-meme-generator");
    if (!raw) return;
    const data = JSON.parse(raw);
    setImageSrc(data.imageSrc || "");
    setLayers(data.layers || []);
    setEffects(data.effects || effects);
    setSelectedId(data.layers?.[0]?.id ?? null);
    if (data.imageSrc) loadImage(data.imageSrc);
  };

  const reset = () => {
    setHistory([]);
    setFuture([]);
    setLayers([defaultText(1, "WHEN THE CODE FINALLY WORKS")]);
    setSelectedId(1);
    setEffects({ grayscale: 0, brightness: 100, contrast: 100, blur: 0 });
  };

  return (
    <div className="app">
      <header>
        <div>
          <h1>😂 Tiny Meme Generator</h1>
          <p>Upload an image, add layers, edit them, and export your meme.</p>
        </div>
        <div className="top-actions">
          <button onClick={undo} disabled={!history.length}>↶ Undo</button>
          <button onClick={redo} disabled={!future.length}>↷ Redo</button>
          <button onClick={saveLocal}>Save</button>
          <button onClick={loadLocal}>Load</button>
          <button className="primary" onClick={downloadPNG}>Download PNG</button>
        </div>
      </header>

      <main className="workspace">
        <aside className="panel">
          <section>
            <h2>1. Image</h2>
            <button onClick={() => fileRef.current.click()}>Upload image</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
          </section>

          <section>
            <h2>2. Add layers</h2>
            <button onClick={addText}>＋ Text</button>
            <div className="emoji-row">
              {["😂", "🔥", "❤️", "😎", "💀", "⭐", "🤣", "😍", "😡", "👍", "💯", "🎉"].map((e) => (
               <button key={e} onClick={() => addEmoji(e)}>{e}</button>
           ))}
            </div>
          </section>

          <section>
            <h2>3. Layers</h2>
            <div className="layers">
              {[...layers].reverse().map((layer) => (
                <button
                  key={layer.id}
                  className={layer.id === selectedId ? "layer selected" : "layer"}
                  onClick={() => setSelectedId(layer.id)}
                >
                  <span>{layer.type === "text" ? "T" : layer.text}</span>
                  <span>{layer.type === "text" ? layer.text : "Emoji"}</span>
                </button>
              ))}
            </div>
            <div className="layer-actions">
              <button
                onClick={() => moveLayer("up")}
                disabled={layers.findIndex((layer) => layer.id === selectedId) >= layers.length - 1}
                title="Move layer up"
             >
                 ↑
              </button>
              <button
                onClick={() => moveLayer("down")}
                disabled={layers.findIndex((layer) => layer.id === selectedId) <= 0}
                title="Move layer down"
             >
                 ↓
              </button>
              <button
                onClick={deleteSelected}
                disabled={!selected}
                title="Delete selected layer"
     >
                Delete
              </button>
            </div>
          </section>

          <section>
            <h2>4. Effects</h2>
             <button
              onClick={() => setEffects({ grayscale: 0, brightness: 100, contrast: 100, blur: 0 })}
          >
              Reset Effects
            </button>
            {[
              ["grayscale", "Grayscale", 0, 100],
              ["brightness", "Brightness", 50, 150],
              ["contrast", "Contrast", 50, 150],
              ["blur", "Blur", 0, 10]
            ].map(([key, label, min, max]) => (
              <label className="range" key={key}>
                <span>{label}: {effects[key]}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={effects[key]}
                  onChange={(e) => {
                    const next = { ...effects, [key]: Number(e.target.value) };
                    setEffects(next);
                  }}
                  onMouseUp={() => commit(layers, effects)}
                />
              </label>
            ))}
          </section>

          <button onClick={reset}>Reset editor</button>
          {savedMessage && <div className="saved">{savedMessage}</div>}
        </aside>

        <section className="canvas-area">
          <div className="canvas-wrap">
            <canvas
              ref={canvasRef}
              onPointerDown={startDrag}
              onPointerMove={drag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
          </div>
          <p className="hint">
            Select a layer, then drag it directly on the image.
          </p>
        </section>

        <aside className="panel inspector">
          <h2>Selected layer</h2>
          {!selected && <p>No layer selected.</p>}

          {selected?.type === "text" && (
            <>
              <label>Text
                <textarea
                  value={selected.text}
                  onChange={(e) => updateSelected({ text: e.target.value })}
                  onBlur={(e) => commitSelected({ text: e.target.value })}
                />
              </label>
              <label>Font
                <select
                  value={selected.fontFamily}
                  onChange={(e) => commitSelected({ fontFamily: e.target.value })}
                >
                  <option>Impact</option>
                  <option>Arial</option>
                  <option>Georgia</option>
                  <option>Verdana</option>
                </select>
              </label>
              <label>Size: {selected.fontSize}px
                <input
                  type="range"
                  min="16"
                  max="120"
                  value={selected.fontSize}
                  onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                  onMouseUp={(e) => commitSelected({ fontSize: Number(e.target.value) })}
                />
              </label>
              <label>Color
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => commitSelected({ color: e.target.value })}
                />
              </label>
              <label>Opacity: {Math.round(selected.opacity * 100)}%
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selected.opacity}
                  onChange={(e) => updateSelected({ opacity: Number(e.target.value) })}
                  onMouseUp={(e) => commitSelected({ opacity: Number(e.target.value) })}
                />
              </label>
              <label>Alignment
                <select
                  value={selected.align}
                  onChange={(e) => commitSelected({ align: e.target.value })}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={selected.outline}
                  onChange={(e) => commitSelected({ outline: e.target.checked })}
                />
                Black outline
              </label>
            </>
          )}

          {selected?.type === "emoji" && (
            <>
              <label>Emoji
                <input
                  value={selected.text}
                  onChange={(e) => updateSelected({ text: e.target.value })}
                  onBlur={(e) => commitSelected({ text: e.target.value })}
                />
              </label>
              <label>Size: {selected.fontSize}px
                <input
                  type="range"
                  min="24"
                  max="160"
                  value={selected.fontSize}
                  onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                  onMouseUp={(e) => commitSelected({ fontSize: Number(e.target.value) })}
                />
              </label>
              <label>Opacity: {Math.round(selected.opacity * 100)}%
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selected.opacity}
                  onChange={(e) => updateSelected({ opacity: Number(e.target.value) })}
                  onMouseUp={(e) => commitSelected({ opacity: Number(e.target.value) })}
                />
              </label>
            </>
          )}

          <div className="position">
            <strong>Position</strong>
            <span>X: {Math.round(selected?.x ?? 0)}%</span>
            <span>Y: {Math.round(selected?.y ?? 0)}%</span>
          </div>
        </aside>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
