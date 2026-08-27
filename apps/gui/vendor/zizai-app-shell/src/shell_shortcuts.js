(function (root) {
  const packages = root.zizPackages = root.zizPackages || {};
  const modules = packages.__uiShellModules = packages.__uiShellModules || {};

  const MODIFIER_ORDER = ["Mod", "Ctrl", "Alt", "Shift", "Meta"];
  const KEY_ALIASES = Object.freeze({
    Esc: "Escape",
    Space: " ",
    Spacebar: " ",
    Del: "Delete",
    Left: "ArrowLeft",
    Right: "ArrowRight",
    Up: "ArrowUp",
    Down: "ArrowDown"
  });

  function normalizeKey(value) {
    const key = String(value || "").trim();
    if (!key) return "";
    const aliased = KEY_ALIASES[key] || key;
    return aliased.length === 1 ? aliased.toUpperCase() : aliased;
  }

  function parseShortcut(value) {
    const parts = String(value || "").split("+").map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return null;

    const modifiers = new Set();
    let key = "";
    for (const part of parts) {
      const modifier = MODIFIER_ORDER.find((name) => name.toLowerCase() === part.toLowerCase());
      if (modifier) modifiers.add(modifier);
      else if (!key) key = normalizeKey(part);
      else return null;
    }
    if (!key) return null;
    return { modifiers, key };
  }

  function matchesShortcut(event, shortcut, isMac) {
    const parsed = parseShortcut(shortcut);
    if (!parsed || event.repeat || event.isComposing) return false;

    const modPressed = isMac ? event.metaKey : event.ctrlKey;
    const expectedCtrl = parsed.modifiers.has("Ctrl") || (!isMac && parsed.modifiers.has("Mod"));
    const expectedMeta = parsed.modifiers.has("Meta") || (isMac && parsed.modifiers.has("Mod"));

    return normalizeKey(event.key) === parsed.key
      && !!event.ctrlKey === expectedCtrl
      && !!event.metaKey === expectedMeta
      && !!event.altKey === parsed.modifiers.has("Alt")
      && !!event.shiftKey === parsed.modifiers.has("Shift")
      && (!parsed.modifiers.has("Mod") || modPressed);
  }

  function createShortcutController({ target, getCommands, onExecute }) {
    const navigatorRef = target?.ownerDocument?.defaultView?.navigator || root.navigator;
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigatorRef?.platform || "");

    function handleKeydown(event) {
      const commands = getCommands();
      const command = commands.find((item) => item.shortcut
        && !item.disabled
        && matchesShortcut(event, item.shortcut, isMac));
      if (!command) return;
      event.preventDefault();
      event.stopPropagation();
      onExecute({ commandId: command.id, source: "shortcut" });
    }

    target.addEventListener("keydown", handleKeydown);

    function destroy() {
      target.removeEventListener("keydown", handleKeydown);
    }

    return Object.freeze({ destroy });
  }

  modules.shellShortcuts = Object.freeze({
    parseShortcut,
    matchesShortcut,
    createShortcutController
  });
})(window);
