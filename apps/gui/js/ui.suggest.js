(function () {
  const packages = window.zizPackages || {};
  const corePkg = packages.core || {};
  const { el } = (corePkg.utils || {});
  const VARIABLE_NAME_CHARS = "a-zA-Z0-9_\\u3040-\\u309F\\u30A0-\\u30FF\\u3400-\\u4DBF\\u4E00-\\u9FFF\\u3005";
  const VARIABLE_NAME_PATTERN = new RegExp(`^[${VARIABLE_NAME_CHARS}]+$`);
  const VARIABLE_NAME_PREFIX_PATTERN = new RegExp(`\\{\\{\\s*([${VARIABLE_NAME_CHARS}]*)$`);
  const NESTED_PREFIX_PATTERN = new RegExp(`\\{\\{\\s*([${VARIABLE_NAME_CHARS}]+)\\.([${VARIABLE_NAME_CHARS}]*)$`);
  const COMPLETE_ROOT_PATTERN = new RegExp(`\\{\\{\\s*([${VARIABLE_NAME_CHARS}]+)\\s*\\}\\}$`);

  /* =========================================================
     {{var}} suggest (text/textarea/combo)
  ========================================================= */

  function wrapWithVarSuggest(inputEl, variableNames, onStateChanged, contentEl = inputEl, options = {}) {
    const box = el("div", { class: "suggest" }, []);
    const list = el("div", { class: "suggest-list" }, []);
    box.appendChild(contentEl);
    box.appendChild(list);
    const comboController =
      contentEl && contentEl.__comboController
        ? contentEl.__comboController
        : inputEl.closest?.(".combo-field")?.__comboController || null;
    const upstreamSet = new Set((options.upstreamSteps || []).map((name) => String(name || "").trim()).filter(Boolean));
    const resolveTemplateReferenceFields = options.resolveTemplateReferenceFields;
    let currentContext = null;
    let currentItems = [];
    let activeIndex = 0;
    let requestSequence = 0;

    function hide() {
      requestSequence += 1;
      currentContext = null;
      currentItems = [];
      activeIndex = 0;
      list.style.display = "none";
      list.innerHTML = "";
    }

    function applyItem(index = activeIndex) {
      const item = currentItems[index];
      if (!item || !currentContext) return false;
      const value = String(inputEl.value || "");
      inputEl.value = `${value.slice(0, currentContext.from)}${item.insertText}${value.slice(currentContext.to)}`;
      const position = currentContext.from + item.insertText.length;
      inputEl.selectionStart = inputEl.selectionEnd = position;
      inputEl.focus();
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      if (typeof onStateChanged === "function") onStateChanged();
      hide();
      return true;
    }

    function show(context) {
      comboController?.closeMenu?.();
      const sameContext = !!currentContext
        && currentContext.from === context.from
        && currentContext.to === context.to
        && currentItems.length === context.items.length
        && currentItems.every((item, index) => item.insertText === context.items[index]?.insertText);
      currentContext = context;
      currentItems = context.items;
      if (!sameContext || activeIndex >= currentItems.length) activeIndex = 0;
      list.innerHTML = "";
      currentItems.forEach((item, index) => {
        list.appendChild(
          el(
            "div",
            {
              class: `suggest-item${index === activeIndex ? " is-active" : ""}`,
              onmousedown: (e) => e.preventDefault(),
              onclick: () => applyItem(index)
            },
            [document.createTextNode(item.label)]
          )
        );
      });
      list.style.display = "block";
    }

    async function getTemplateCompletionContext(value, caret) {
      const left = value.slice(0, caret);
      const nestedMatch = left.match(NESTED_PREFIX_PATTERN);
      const completeRootMatch = nestedMatch ? null : left.match(COMPLETE_ROOT_PATTERN);
      if (nestedMatch || completeRootMatch) {
        const match = nestedMatch || completeRootMatch;
        const rootName = String(match[1] || "");
        if (!upstreamSet.has(rootName) || typeof resolveTemplateReferenceFields !== "function") return null;
        const fieldPrefix = nestedMatch ? String(nestedMatch[2] || "") : "";
        const loweredPrefix = fieldPrefix.toLowerCase();
        const fieldNames = await resolveTemplateReferenceFields(rootName);
        const items = Array.from(new Set((fieldNames || []).map((name) => String(name || "").trim())))
          .filter((name) => VARIABLE_NAME_PATTERN.test(name) && name.toLowerCase().startsWith(loweredPrefix))
          .map((name) => ({
            label: `{{${rootName}.${name}}}`,
            insertText: `{{${rootName}.${name}}}`
          }));
        return { from: match.index, to: caret, items };
      }

      const rootMatch = left.match(VARIABLE_NAME_PREFIX_PATTERN);
      if (!rootMatch) return null;
      const prefix = String(rootMatch[1] || "");
      const loweredPrefix = prefix.toLowerCase();
      const items = Array.from(new Set((variableNames || []).map((name) => String(name || "").trim()).filter(Boolean)))
        .filter((name) => name.toLowerCase().startsWith(loweredPrefix))
        .map((name) => ({ label: `{{${name}}}`, insertText: `{{${name}}}` }));
      return { from: rootMatch.index, to: caret, items };
    }

    async function handler() {
      const value = String(inputEl.value || "");
      const caret = inputEl.selectionStart || 0;
      const requestId = ++requestSequence;
      const context = await getTemplateCompletionContext(value, caret);
      if (requestId !== requestSequence) return;
      if (!context || !context.items.length) return hide();
      show(context);
    }

    function scheduleHandler() {
      window.requestAnimationFrame(() => void handler());
    }

    function moveActive(delta) {
      if (!currentItems.length) return;
      activeIndex = (activeIndex + delta + currentItems.length) % currentItems.length;
      Array.from(list.querySelectorAll(".suggest-item")).forEach((item, index) => {
        item.classList.toggle("is-active", index === activeIndex);
      });
    }

    inputEl.addEventListener("input", scheduleHandler);
    inputEl.addEventListener("focus", scheduleHandler);
    inputEl.addEventListener("keyup", (event) => {
      if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) return;
      scheduleHandler();
    });
    inputEl.addEventListener("click", scheduleHandler);
    inputEl.addEventListener("mouseup", scheduleHandler);
    inputEl.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" && currentItems.length) {
        event.preventDefault();
        moveActive(1);
        return;
      }
      if (event.key === "ArrowUp" && currentItems.length) {
        event.preventDefault();
        moveActive(-1);
        return;
      }
      if ((event.key === "Enter" || event.key === "Tab") && currentItems.length) {
        event.preventDefault();
        applyItem();
        return;
      }
      if (event.key === "Escape" && currentItems.length) {
        event.preventDefault();
        hide();
        return;
      }
      if (event.key === "{") scheduleHandler();
    });
    inputEl.addEventListener("blur", () => setTimeout(hide, 150));

    return box;
  }

  function attachCodeEditorVarSuggest(editor, contentEl, variableNames, onStateChanged) {
    if (!editor || !contentEl) return;
    const list = el("div", { class: "suggest-list" }, []);
    contentEl.appendChild(list);

    function hide() {
      list.style.display = "none";
      list.innerHTML = "";
    }

    function show(items, onPick) {
      list.innerHTML = "";
      if (!items.length) {
        list.appendChild(
          el("div", { class: "suggest-empty" }, [document.createTextNode("候補がありません")])
        );
        list.style.display = "block";
        return;
      }

      items.forEach((name) => {
        list.appendChild(
          el(
            "div",
            {
              class: "suggest-item",
              onmousedown: (e) => e.preventDefault(),
              onclick: () => onPick(name)
            },
            [document.createTextNode(`{{${name}}}`)]
          )
        );
      });
      list.style.display = "block";
    }

    function handler() {
      const cursor = editor.getCursor();
      const line = editor.getLine(cursor.line) || "";
      const left = line.slice(0, cursor.ch);
      const match = left.match(VARIABLE_NAME_PREFIX_PATTERN);
      if (!match) return hide();

      const prefix = match[1] || "";
      const loweredPrefix = prefix.toLowerCase();
      const items = Array.from(new Set((variableNames || []).filter((name) => String(name || "").toLowerCase().startsWith(loweredPrefix))));
      show(items, (chosen) => {
        const from = { line: cursor.line, ch: cursor.ch - prefix.length };
        const to = { line: cursor.line, ch: cursor.ch };
        editor.replaceRange(`${chosen}}}`, from, to);
        editor.focus();
        editor.setCursor({ line: cursor.line, ch: from.ch + chosen.length + 2 });
        if (onStateChanged) onStateChanged();
        hide();
      });
    }

    function scheduleHandler() {
      window.requestAnimationFrame(handler);
    }

    editor.on("changes", scheduleHandler);
    editor.on("cursorActivity", scheduleHandler);
    editor.on("focus", scheduleHandler);
    editor.on("blur", () => setTimeout(hide, 150));
  }

  const uiSuggest = { wrapWithVarSuggest, attachCodeEditorVarSuggest };
  window.uiSuggest = uiSuggest;
})();
