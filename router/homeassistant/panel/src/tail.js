// ─── Регистрация ─────────────────────────────────────────────────────────────────────────────────────────────
if (!customElements.get("home-panel-card")) customElements.define("home-panel-card", HomePanelCard);
window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === "home-panel-card"))
  window.customCards.push({ type: "home-panel-card", name: "Панель дома", description: "Главный экран квартиры: свет, климат, пылесосы, камера, музыка" });
console.info(`%c HOME-PANEL %c ${HP_VERSION} `, "background:#a78bfa;color:#fff;font-weight:700;border-radius:4px 0 0 4px", "background:#1e1b4b;color:#fff;border-radius:0 4px 4px 0");
