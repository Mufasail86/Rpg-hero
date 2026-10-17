import { useEffect, useState } from "react";
import { cropCover } from "../image";

export function ArtButton({ src, label }: { src: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="art-open" aria-label={`Крупно: ${label}`} onClick={() => setOpen(true)}>
        <img className="option-art" src={src} alt="" />
      </button>
      {open && (
        <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={label}>
          <button type="button" className="backdrop" aria-label="Закрыть рисунок" onClick={() => setOpen(false)} />
          <div className="lightbox">
            <img src={src} alt={label} />
            <button type="button" className="btn" onClick={() => setOpen(false)}>Закрыть</button>
          </div>
        </div>
      )}
    </>
  );
}

export function CropDialog({
  file,
  onCancel,
  onSave,
}: {
  file: File;
  onCancel: () => void;
  onSave: (cropped: string, original: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [original, setOriginal] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const picture = new Image();
    picture.onload = () => setImage(picture);
    picture.src = url;
    const reader = new FileReader();
    reader.onload = () => setOriginal(String(reader.result ?? ""));
    reader.readAsDataURL(file);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (image) setPreview(cropCover(image, zoom));
  }, [image, zoom]);

  return (
    <div className="sheet-layer" role="dialog" aria-modal="true" aria-label="Кадр портрета">
      <button type="button" className="backdrop" aria-label="Отмена" onClick={onCancel} />
      <div className="lightbox crop-box">
        {preview && <img src={preview} alt="Предпросмотр кадра" />}
        <label className="field">
          <span>Приближение</span>
          <input data-testid="photo-zoom" type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
        </label>
        <div className="row">
          <button type="button" className="btn primary" data-testid="photo-save" disabled={!preview || !original} onClick={() => onSave(preview, original)}>Оставить кадр</button>
          <button type="button" className="btn" onClick={onCancel}>Отмена</button>
        </div>
      </div>
    </div>
  );
}
