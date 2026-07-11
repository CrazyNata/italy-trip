export function Photos() {
  return (
    <div style={{ animation: "fadeUp .4s ease both" }}>
      <div
        style={{
          border: "2px dashed var(--line)",
          borderRadius: 18,
          padding: "56px 24px",
          textAlign: "center",
          color: "var(--muted)",
        }}
      >
        <i
          className="fa-solid fa-screwdriver-wrench"
          style={{ fontSize: 34, color: "var(--ac)", opacity: 0.7 }}
        />
        <div
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 20,
            fontWeight: 600,
            marginTop: 14,
            color: "var(--ink)",
          }}
        >
          Раздел в разработке
        </div>
        <div style={{ fontSize: 13, marginTop: 6, maxWidth: 420, marginInline: "auto" }}>
          Фотогалерея временно недоступна — мы ещё решаем, как лучше её сделать.
          Загрузка снимков появится здесь позже.
        </div>
      </div>
    </div>
  );
}
