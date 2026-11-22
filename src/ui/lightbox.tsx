import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cropCover } from "../image";

export function ArtButton({
  src,
  label,
  description,
  wide,
  onPick,
}: {
  src: string;
  label: string;
  description?: string;
  wide?: boolean;
  onPick?: () => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button type="button" className={`art-open ${wide ? "art-wide" : ""}`} aria-label={`Крупно: ${label}`} onClick={() => setOpen(true)}>
        <img className={wide ? "art-wide-img" : "option-art"} src={src} alt="" />
      </button>
      {open && createPortal(
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label={label}>
          <button type="button" className="modal-backdrop" aria-label="Закрыть" onClick={() => setOpen(false)} />
          <div className="portrait-dialog">
            <button type="button" className="modal-x" aria-label="Закрыть" onClick={() => setOpen(false)}>×</button>
            <img src={src} alt={label} />
            <div className="portrait-copy">
              <h2>{label}</h2>
              {description && <p>{description}</p>}
              {onPick && <button type="button" className="btn primary" onClick={() => { onPick(); setOpen(false); }}>Выбрать</button>}
            </div>
          </div>
        </div>,
        document.body,
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
