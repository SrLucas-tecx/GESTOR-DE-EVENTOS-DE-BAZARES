const AVAILABLE_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "🥹", "😂", "🤣",
  "😊", "😍", "🥰", "😘", "😎", "🤩", "🥳", "😇",
  "🙌", "👏", "👍", "👎", "👌", "🤝", "🙏", "💪",
  "❤️", "💛", "💚", "💙", "💜", "✨", "⭐", "🔥",
  "🎉", "🎊", "🎈", "🎁", "🛍️", "🛒", "🏪", "📍",
  "✅", "❌", "⚠️", "💰", "📅", "⏰", "🍰", "☕"
];

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("emoji-picker-toggle");
  const picker = document.getElementById("emoji-picker");
  const grid = document.getElementById("emoji-picker-grid");
  const hint = document.getElementById("emoji-picker-hint");
  const closeButton = document.getElementById("emoji-picker-close");
  if (!toggle || !picker || !grid || !hint || !closeButton) return;

  let lastTextField = null;

  const closePicker = () => {
    picker.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };

  const insertEmoji = (emoji) => {
    if (!(lastTextField instanceof HTMLInputElement || lastTextField instanceof HTMLTextAreaElement)
        || !lastTextField.isConnected || lastTextField.disabled || lastTextField.readOnly) {
      hint.textContent = "Selecciona primero un campo de texto.";
      return;
    }

    const start = lastTextField.selectionStart ?? lastTextField.value.length;
    const end = lastTextField.selectionEnd ?? start;
    lastTextField.setRangeText(emoji, start, end, "end");
    lastTextField.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: emoji
    }));
    lastTextField.focus();
    hint.textContent = "Emoji insertado.";
  };

  AVAILABLE_EMOJIS.forEach((emoji) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emoji-picker-item";
    button.textContent = emoji;
    button.setAttribute("aria-label", emoji);
    button.title = emoji;
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => insertEmoji(emoji));
    grid.append(button);
  });

  document.addEventListener("focusin", (event) => {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement
        || (target instanceof HTMLInputElement && ["text", "search"].includes(target.type))) {
      lastTextField = target;
    }
  });

  toggle.addEventListener("click", () => {
    picker.hidden = !picker.hidden;
    toggle.setAttribute("aria-expanded", String(!picker.hidden));
    if (!picker.hidden && !lastTextField) {
      hint.textContent = "Selecciona primero un campo de texto.";
    }
  });
  closeButton.addEventListener("click", closePicker);

  document.addEventListener("click", (event) => {
    if (!picker.hidden && !picker.contains(event.target) && !toggle.contains(event.target)) {
      closePicker();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !picker.hidden) {
      closePicker();
      toggle.focus();
    }
  });
});
