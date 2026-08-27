(function (root) {
  const packages = root.zizPackages = root.zizPackages || {};
  const modules = packages.__uiShellModules = packages.__uiShellModules || {};

  const TAB_SELECTOR = ".zui-shell__tab";
  const MENU_CLASS = "zui-shell__tab-context-menu";
  const MENU_ITEM_CLASS = "zui-shell__tab-context-menu-item";

  function closestTab(target) {
    return target && typeof target.closest === "function" ? target.closest(TAB_SELECTOR) : null;
  }

  function createTabInteractionsController({ documentRef, host, getTabs, onReorderRequest, onContextAction }) {
    let dragSourceId = "";
    let menu = null;

    function findTab(tabId) {
      return getTabs().find((tab) => tab.id === tabId) || null;
    }

    function handleOutsideMouseDown(event) {
      if (menu && !menu.contains(event.target)) closeMenu();
    }

    function handleMenuKeydown(event) {
      if (event.key === "Escape") closeMenu();
    }

    function closeMenu() {
      if (!menu) return;
      documentRef.removeEventListener("mousedown", handleOutsideMouseDown);
      documentRef.removeEventListener("keydown", handleMenuKeydown);
      menu.remove();
      menu = null;
    }

    function openMenu(tabId, actions, x, y) {
      closeMenu();
      const container = documentRef.createElement("div");
      container.className = MENU_CLASS;
      container.style.position = "fixed";
      container.style.left = `${x}px`;
      container.style.top = `${y}px`;

      actions.forEach((action) => {
        const item = documentRef.createElement("button");
        item.type = "button";
        item.className = MENU_ITEM_CLASS;
        item.dataset.actionId = action.id;
        item.textContent = action.label;
        item.disabled = !!action.disabled;
        if (action.disabled) item.setAttribute("aria-disabled", "true");
        item.addEventListener("click", () => {
          if (action.disabled) return;
          closeMenu();
          onContextAction({ tabId, actionId: action.id });
        });
        container.appendChild(item);
      });

      const mountRoot = host.closest(".zui-shell") || documentRef.body;
      mountRoot.appendChild(container);
      menu = container;
      documentRef.addEventListener("mousedown", handleOutsideMouseDown);
      documentRef.addEventListener("keydown", handleMenuKeydown);
    }

    function handleContextMenu(event) {
      const tabElement = closestTab(event.target);
      if (!tabElement) return;
      const tab = findTab(tabElement.dataset.tabId);
      if (!tab || !tab.contextActions.length) return;
      event.preventDefault();
      openMenu(tab.id, tab.contextActions, event.clientX, event.clientY);
    }

    function handleDragStart(event) {
      const tabElement = closestTab(event.target);
      const tab = tabElement ? findTab(tabElement.dataset.tabId) : null;
      if (!tab || !tab.reorderable) {
        dragSourceId = "";
        return;
      }
      dragSourceId = tab.id;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        try {
          event.dataTransfer.setData("text/plain", tab.id);
        } catch (error) {
          // some browsers restrict dataTransfer access outside trusted drag gestures
        }
      }
    }

    function handleDragOver(event) {
      if (!dragSourceId) return;
      if (!closestTab(event.target)) return;
      event.preventDefault();
    }

    function handleDrop(event) {
      if (!dragSourceId) return;
      const tabElement = closestTab(event.target);
      if (!tabElement) return;
      event.preventDefault();
      const sourceTabId = dragSourceId;
      const targetTabId = tabElement.dataset.tabId;
      dragSourceId = "";
      if (!targetTabId || targetTabId === sourceTabId) return;
      const rect = tabElement.getBoundingClientRect();
      const placement = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
      onReorderRequest({ tabId: sourceTabId, targetTabId, placement });
    }

    function handleDragEnd() {
      dragSourceId = "";
    }

    host.addEventListener("dragstart", handleDragStart);
    host.addEventListener("dragover", handleDragOver);
    host.addEventListener("drop", handleDrop);
    host.addEventListener("dragend", handleDragEnd);
    host.addEventListener("contextmenu", handleContextMenu);

    function destroy() {
      closeMenu();
      dragSourceId = "";
      host.removeEventListener("dragstart", handleDragStart);
      host.removeEventListener("dragover", handleDragOver);
      host.removeEventListener("drop", handleDrop);
      host.removeEventListener("dragend", handleDragEnd);
      host.removeEventListener("contextmenu", handleContextMenu);
    }

    return Object.freeze({ destroy });
  }

  modules.shellTabInteractions = Object.freeze({ createTabInteractionsController });
})(window);
