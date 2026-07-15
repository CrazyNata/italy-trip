import { useRef } from "react";
import { createPortal } from "react-dom";
import { useDialogKeyboard, useScrollLock } from "../shared";
import type { Restaurant } from "../../types/trip";

type Props = {
  draft: Restaurant;
  isNew: boolean;
  statuses: readonly string[];
  priceLevels: readonly string[];
  onChange: (patch: Partial<Restaurant>) => void;
  onUpload: (files: FileList | null) => void;
  onRemovePhoto: (index: number) => void;
  onMovePhoto: (index: number, amount: number) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
};

export function RestaurantEditorModal({
  draft,
  isNew,
  statuses,
  priceLevels,
  onChange,
  onUpload,
  onRemovePhoto,
  onMovePhoto,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const photos = draft.photos ?? [];

  useScrollLock();
  useDialogKeyboard({ open: true, onClose: onCancel, initialFocus: closeButton });

  return createPortal(
    <div
      className="restaurant-editor-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restaurant-editor-title"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
    >
      <section className="restaurant-editor-card">
        <header className="restaurant-editor-header">
          <h2 id="restaurant-editor-title">{isNew ? "Новый ресторан" : "Редактировать ресторан"}</h2>
          <button ref={closeButton} type="button" onClick={onCancel} aria-label="Закрыть">
            ×
          </button>
        </header>
        <div className="restaurant-editor-body">
          <label className="restaurant-editor-field">
            <span>Название</span>
            <input
              value={draft.name}
              onChange={(event) => onChange({ name: event.target.value })}
              placeholder="Название ресторана"
            />
          </label>
          <label className="restaurant-editor-field">
            <span>Кухня / что заказать</span>
            <input
              value={draft.note ?? ""}
              onChange={(event) => onChange({ note: event.target.value })}
              placeholder="кухня / что заказать…"
            />
          </label>
          <fieldset className="restaurant-editor-options"><legend>Тип места</legend><div>{["ресторан", "кафе", "бар"].map((type) => <button key={type} type="button" className={(draft.placeType ?? "ресторан") === type ? "is-active" : ""} onClick={() => onChange({ placeType: type as Restaurant["placeType"] })}>{type}</button>)}</div></fieldset>
          <fieldset className="restaurant-editor-options">
            <legend>Уровень цен</legend>
            <div>
              {priceLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={draft.price === level ? "is-active" : ""}
                  onClick={() => onChange({ price: draft.price === level ? "" : level })}
                >
                  {level}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="restaurant-editor-options">
            <legend>Статус</legend>
            <div>
              {statuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={draft.status === status ? "is-active" : ""}
                  onClick={() => onChange({ status })}
                >
                  {status}
                </button>
              ))}
              <button
                type="button"
                className={draft.priority ? "is-active" : ""}
                onClick={() => onChange({ priority: !draft.priority })}
              >
                🔥 приоритет
              </button>
            </div>
          </fieldset>
          {draft.status === "бронь" && (
            <div style={{ display: "flex", gap: 10 }}>
              <label className="restaurant-editor-field" style={{ flex: 1 }}><span>Дата брони</span><input type="date" value={draft.reservationDate ?? ""} onChange={(event) => onChange({ reservationDate: event.target.value })} /></label>
              <label className="restaurant-editor-field" style={{ flex: 1 }}><span>Время</span><input type="time" value={draft.reservationTime ?? ""} onChange={(event) => onChange({ reservationTime: event.target.value })} /></label>
            </div>
          )}
          <section className="restaurant-editor-photos" aria-label="Фотографии">
            <div>
              <strong>Фотографии</strong>
              <label>
                <i className="fa-solid fa-camera" aria-hidden /> Добавить фото
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    onUpload(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {photos.length > 0 && (
              <div className="restaurant-editor-photo-grid">
                {photos.map((photo, index) => (
                  <figure key={photo}>
                    <img src={photo} alt={`Фото ресторана ${index + 1}`} />
                    <div className="restaurant-editor-photo-move">
                      <button type="button" disabled={index === 0} onClick={() => onMovePhoto(index, -1)} aria-label={`Переместить фото ${index + 1} влево`}>
                        <i className="fa-solid fa-arrow-left" aria-hidden />
                      </button>
                      <button type="button" disabled={index === photos.length - 1} onClick={() => onMovePhoto(index, 1)} aria-label={`Переместить фото ${index + 1} вправо`}>
                        <i className="fa-solid fa-arrow-right" aria-hidden />
                      </button>
                    </div>
                    <button type="button" onClick={() => onRemovePhoto(index)} aria-label={`Удалить фото ${index + 1}`}>
                      <i className="fa-solid fa-trash" aria-hidden />
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </section>
        </div>
        <footer className="restaurant-editor-actions">
          {!isNew && (
            <button type="button" className="restaurant-editor-delete" onClick={onDelete}>
              Удалить ресторан
            </button>
          )}
          <span />
          <button type="button" className="restaurant-editor-cancel" onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className="restaurant-editor-save" onClick={onSave}>
            Сохранить
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
