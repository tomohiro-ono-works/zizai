(function (global) {
  "use strict";

  const DEFAULT_COMMANDS = [
    { id: "heading1", label: "見出し1", description: "大見出しを挿入", insert: "# " },
    { id: "heading2", label: "見出し2", description: "中見出しを挿入", insert: "## " },
    { id: "bullet", label: "箇条書き", description: "リストを挿入", insert: "- " },
    { id: "table", label: "表", description: "2列の表を挿入", insert: "| 列1 | 列2 |\n| --- | --- |\n| 値1 | 値2 |" },
    { id: "code", label: "コード", description: "コードブロックを挿入", insert: "```text\n\n```" },
    { id: "sql", label: "SQL", description: "SQLコードブロックを挿入", insert: "```sql\nSELECT *\nFROM table_name;\n```" },
    { id: "link", label: "リンク", description: "ハイパーリンクを挿入", insert: "[表示名](https://example.com)" },
    { id: "document", label: "ドキュメント", description: "文書リンクを挿入", insert: "[[" }
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function safeUrl(url) {
    const trimmed = String(url || "").trim();
    if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed;
    return "#";
  }

  function simpleCodeHighlight(code, language) {
    let html = escapeHtml(code);
    html = html.replace(/(\/\*[\s\S]*?\*\/|--[^\n]*|\/\/[^\n]*)/g, '<span class="mce-token-comment">$1</span>');
    html = html.replace(/(&quot;[^&\n]*?&quot;|&#39;[^&\n]*?&#39;|`[^`\n]*?`)/g, '<span class="mce-token-string">$1</span>');
    html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="mce-token-number">$1</span>');

    if (/^(sql|bigquery|duckdb)$/i.test(language)) {
      html = html.replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|ON|AS|AND|OR|NOT|NULL|IS|IN|EXISTS|CASE|WHEN|THEN|ELSE|END|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|INSERT|INTO|UPDATE|DELETE|CREATE|REPLACE|TABLE|VIEW|WITH|DECLARE|SET|BEGIN|COMMIT|ROLLBACK|OVER|PARTITION|QUALIFY|UNNEST)\b/gi, '<span class="mce-token-keyword">$1</span>');
      html = html.replace(/\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST|SAFE_CAST|CURRENT_DATE|CURRENT_TIMESTAMP|DATE|DATETIME|TIMESTAMP|ARRAY_AGG|ROW_NUMBER|RANK|DENSE_RANK)(?=\s*\()/gi, '<span class="mce-token-function">$1</span>');
    } else if (/^(js|javascript|css|html|json)$/i.test(language)) {
      html = html.replace(/\b(const|let|var|function|return|if|else|for|while|class|new|this|true|false|null|undefined|async|await|try|catch|throw|import|export|from)\b/g, '<span class="mce-token-keyword">$1</span>');
    }
    return html;
  }

  function inlineMarkdown(text) {
    let html = escapeHtml(text);
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/\[\[document:([^|\]]+)\|([^\]]+)\]\]/g, function (_, id, label) {
      return '<a href="#" class="mce-document-link" data-document-id="' + escapeAttribute(id) + '">' + label + '</a>';
    });
    html = html.replace(/\[\[([^\]]+)\]\]/g, function (_, label) {
      return '<a href="#" class="mce-document-link" data-document-id="' + escapeAttribute(label) + '">' + label + '</a>';
    });
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, url) {
      const safe = safeUrl(url);
      const external = /^https?:/i.test(safe) ? ' target="_blank" rel="noopener noreferrer"' : "";
      return '<a href="' + escapeAttribute(safe) + '"' + external + '>' + label + '</a>';
    });
    return html;
  }

  class MarkdownRenderer {
    constructor(options) {
      this.options = options || {};
      this.highlighters = Object.assign({}, this.options.highlighters || {});
    }

    registerCodeHighlighter(language, highlighter) {
      if (typeof highlighter !== "function") throw new TypeError("highlighter must be a function");
      this.highlighters[String(language).toLowerCase()] = highlighter;
    }

    render(markdown) {
      const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
      const output = [];
      let index = 0;
      let paragraph = [];
      let listType = null;

      const flushParagraph = () => {
        if (paragraph.length) {
          output.push("<p>" + inlineMarkdown(paragraph.join("\n")).replace(/\n/g, "<br>") + "</p>");
          paragraph = [];
        }
      };
      const closeList = () => {
        if (listType) output.push("</" + listType + ">");
        listType = null;
      };

      while (index < lines.length) {
        const line = lines[index];
        const fence = line.match(/^```\s*([\w-]*)\s*$/);
        if (fence) {
          flushParagraph(); closeList();
          const language = (fence[1] || "text").toLowerCase();
          const code = [];
          index += 1;
          while (index < lines.length && !/^```\s*$/.test(lines[index])) code.push(lines[index++]);
          const codeText = code.join("\n");
          const openAttribute = this.options.codeBlocksCollapsed === false ? " open" : "";
          const languageLabel = escapeHtml(language.toUpperCase());

          if (language === "data") {
            const tabularRows = code.map(line => line.split("\t").map(cell => cell.trim()));
            const columnCount = tabularRows.length ? tabularRows[0].length : 0;
            const isTabular = tabularRows.length >= 2 && columnCount >= 2 && tabularRows.every((row, rowIndex) => code[rowIndex].includes("\t") && row.length === columnCount);
            if (isTabular) {
              const headers = tabularRows[0];
              const rows = tabularRows.slice(1);
              const table = '<table class="mce-tsv-table"><thead><tr>' + headers.map(header => "<th>" + inlineMarkdown(header) + "</th>").join("") + "</tr></thead><tbody>" + rows.map(row => "<tr>" + row.map(cell => "<td>" + inlineMarkdown(cell) + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
              output.push('<details class="mce-code-block mce-data-block"' + openAttribute + '><summary class="mce-code-summary">' + languageLabel + "</summary>" + table + "</details>");
              index += 1;
              continue;
            }
          }

          const highlighter = this.highlighters[language];
          const highlighted = highlighter ? highlighter(codeText, language) : simpleCodeHighlight(codeText, language);
          output.push('<details class="mce-code-block"' + openAttribute + '><summary class="mce-code-summary">' + languageLabel + '</summary><pre><code class="language-' + escapeAttribute(language) + '">' + highlighted + "</code></pre></details>");
          index += 1;
          continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
          flushParagraph(); closeList();
          const level = heading[1].length;
          output.push("<h" + level + ">" + inlineMarkdown(heading[2]) + "</h" + level + ">");
          index += 1; continue;
        }

        if (/^>\s?/.test(line)) {
          flushParagraph(); closeList();
          const quote = [];
          while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, ""));
          output.push("<blockquote>" + inlineMarkdown(quote.join("<br>")) + "</blockquote>");
          continue;
        }

        const list = line.match(/^\s*([-*+] |\d+\. )(.+)$/);
        if (list) {
          flushParagraph();
          const type = /\d+\./.test(list[1]) ? "ol" : "ul";
          if (listType !== type) { closeList(); output.push("<" + type + ">"); listType = type; }
          output.push("<li>" + inlineMarkdown(list[2]) + "</li>");
          index += 1; continue;
        }

        const isTable = line.includes("|") && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1]);
        if (isTable) {
          flushParagraph(); closeList();
          const split = value => value.trim().replace(/^\||\|$/g, "").split("|").map(v => v.trim());
          const headers = split(line);
          index += 2;
          const rows = [];
          while (index < lines.length && lines[index].includes("|") && lines[index].trim()) rows.push(split(lines[index++]));
          output.push("<table><thead><tr>" + headers.map(h => "<th>" + inlineMarkdown(h) + "</th>").join("") + "</tr></thead><tbody>" + rows.map(row => "<tr>" + row.map(cell => "<td>" + inlineMarkdown(cell) + "</td>").join("") + "</tr>").join("") + "</tbody></table>");
          continue;
        }

        if (!line.trim()) { flushParagraph(); closeList(); index += 1; continue; }
        paragraph.push(line);
        index += 1;
      }
      flushParagraph(); closeList();
      return output.join("\n");
    }
  }

  function highlightMarkdownSource(value) {
    let html = escapeHtml(value);
    html = html.replace(/^(#{1,6})(\s+.*)$/gm, '<span class="mce-md-heading">$1$2</span>');
    html = html.replace(/^(&gt;\s?.*)$/gm, '<span class="mce-md-quote">$1</span>');
    html = html.replace(/^(\s*(?:[-*+] |\d+\. ))/gm, '<span class="mce-md-list">$1</span>');
    html = html.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, '<span class="mce-md-code">$1</span>');
    html = html.replace(/(\[\[(?:[^\]]+)\]\])/g, '<span class="mce-md-doc">$1</span>');
    html = html.replace(/(\[[^\]]+\]\([^)]+\))/g, '<span class="mce-md-link">$1</span>');
    return html + (value.endsWith("\n") ? "\n" : "");
  }

  let viewSequence = 0;

  function headingIndentLevel(headingLevel) {
    if (headingLevel <= 2) return 0;
    if (headingLevel === 3) return 1;
    return 2;
  }

  function decorateViewerHeadings(content) {
    const headings = Array.from(content.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    let h2Number = 0;
    let h3Number = 0;

    headings.forEach(function (heading) {
      const level = Number(heading.tagName.slice(1));
      heading.classList.add("mce-heading-level-" + headingIndentLevel(level));
      if (level === 1) {
        heading.classList.add("mce-article-title");
        return;
      }
      if (level === 2) {
        h2Number += 1;
        h3Number = 0;
        heading.classList.add("mce-section-heading");
        const number = document.createElement("span");
        number.className = "mce-heading-number";
        number.textContent = h2Number + ". ";
        heading.insertBefore(number, heading.firstChild);
        return;
      }
      if (level === 3) {
        heading.classList.add("mce-subsection-heading");
        if (h2Number > 0) {
          h3Number += 1;
          const number = document.createElement("span");
          number.className = "mce-heading-number";
          number.textContent = h2Number + "." + h3Number + ". ";
          heading.insertBefore(number, heading.firstChild);
        }
      }
    });

    return headings;
  }

  function contentIndentLevel(headingLevel) {
    if (headingLevel <= 1) return 0;
    if (headingLevel === 2) return 1;
    if (headingLevel === 3) return 2;
    return 3;
  }

  function groupViewerContentByHeading(content, initialHeadingLevel) {
    const children = Array.from(content.children);
    let currentLevel = contentIndentLevel(Number(initialHeadingLevel) || 1);
    let group = null;
    let groupLevel = null;

    children.forEach(function (child) {
      const heading = child.tagName.match(/^H([1-6])$/);
      if (heading) {
        currentLevel = contentIndentLevel(Number(heading[1]));
        group = null;
        groupLevel = null;
        return;
      }

      if (!group || groupLevel !== currentLevel) {
        group = document.createElement("div");
        group.className = "mce-heading-content mce-heading-content-level-" + currentLevel;
        content.insertBefore(group, child);
        groupLevel = currentLevel;
      }
      group.appendChild(child);
    });
  }

  function renderViewerElement(element, html, options) {
    const settings = options || {};
    const initialHeadingLevel = 1;
    if (settings.pageTree === false) {
      element.innerHTML = '<article class="mce-view-content">' + html + "</article>";
      const content = element.querySelector(".mce-view-content");
      decorateViewerHeadings(content);
      groupViewerContentByHeading(content, initialHeadingLevel);
      return;
    }

    element.innerHTML = '<div class="mce-view-layout"><nav class="mce-page-tree" aria-label="ページツリー"><div class="mce-page-tree-title">ページ内</div><ol class="mce-page-tree-list"></ol></nav><article class="mce-view-content">' + html + "</article></div>";
    const content = element.querySelector(".mce-view-content");
    const tree = element.querySelector(".mce-page-tree");
    const list = element.querySelector(".mce-page-tree-list");
    const headings = decorateViewerHeadings(content);
    groupViewerContentByHeading(content, initialHeadingLevel);

    if (!headings.length) {
      tree.remove();
      element.querySelector(".mce-view-layout").classList.add("mce-view-layout-no-tree");
      return;
    }

    const prefix = "mce-heading-" + (++viewSequence) + "-";
    headings.forEach(function (heading, index) {
      const level = Number(heading.tagName.slice(1));
      const id = prefix + (index + 1);
      heading.id = id;
      heading.classList.add("mce-page-heading");
      list.insertAdjacentHTML("beforeend", '<li class="mce-page-tree-item mce-page-tree-level-' + level + '"><button type="button" class="mce-page-tree-link" data-mce-heading-target="' + id + '">' + escapeHtml(heading.textContent.trim()) + "</button></li>");
    });
  }

  function scrollToPageHeading(root, event) {
    const link = event.target.closest(".mce-page-tree-link");
    if (!link || !root.contains(link)) return false;
    const target = root.querySelector("#" + link.dataset.mceHeadingTarget);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  class MarkdownViewer extends EventTarget {
    constructor(target, options) {
      super();
      this.element = typeof target === "string" ? document.querySelector(target) : target;
      if (!this.element) throw new Error("Viewer target not found");
      this.options = options || {};
      this.renderer = this.options.renderer || new MarkdownRenderer(this.options);
      this.element.classList.add("mce-root", "mce-viewer");
      this._clickHandler = this._handleClick.bind(this);
      this.element.addEventListener("click", this._clickHandler);
      this.setValue(this.options.value || "");
    }
    setValue(value) {
      this.value = String(value || "");
      renderViewerElement(this.element, this.renderer.render(this.value), this.options);
    }
    getValue() { return this.value; }
    _handleClick(event) {
      if (scrollToPageHeading(this.element, event)) return;
      const link = event.target.closest(".mce-document-link");
      if (!link || !this.element.contains(link)) return;
      event.preventDefault();
      this.dispatchEvent(new CustomEvent("md:document-open", { detail: { id: link.dataset.documentId, label: link.textContent } }));
    }
    destroy() { this.element.removeEventListener("click", this._clickHandler); this.element.classList.remove("mce-root", "mce-viewer"); this.element.innerHTML = ""; }
  }

  class MarkdownEditor extends EventTarget {
    constructor(target, options) {
      super();
      this.host = typeof target === "string" ? document.querySelector(target) : target;
      if (!this.host) throw new Error("Editor target not found");
      this.options = Object.assign({ commands: DEFAULT_COMMANDS, documents: [], saveButton: true, pageTree: true }, options || {});
      this.renderer = this.options.renderer || new MarkdownRenderer(this.options);
      this.activeSuggestion = 0;
      this.suggestionItems = [];
      this._build();
      this.setValue(this.options.value || "");
    }

    _build() {
      this.host.classList.add("mce-root", "mce-mode-edit");
      const actionButton = this.options.saveButton
        ? '<button type="button" data-mce-action="save">保存</button>'
        : "";
      const toolbar = '<div class="mce-toolbar mce-titlebar"><div class="mce-titlebar-title" aria-live="polite"></div>' + actionButton + '</div>';
      this.host.innerHTML = toolbar + '<div class="mce-editor-shell"><pre class="mce-highlight" aria-hidden="true"></pre><textarea class="mce-input" spellcheck="false" aria-label="Markdown editor"></textarea></div><div class="mce-viewer mce-hidden"></div><div class="mce-suggestions mce-hidden" role="listbox"></div>';
      this.mode = "edit";
      this.input = this.host.querySelector(".mce-input");
      this.highlight = this.host.querySelector(".mce-highlight");
      this.shell = this.host.querySelector(".mce-editor-shell");
      this.viewer = this.host.querySelector(".mce-viewer");
      this.suggestions = this.host.querySelector(".mce-suggestions");
      this.titleElement = this.host.querySelector(".mce-titlebar-title");
      this.actionButton = this.host.querySelector("[data-mce-action]");
      this._handleHostClick = event => this._handleClick(event);
      this._handleInputChange = () => { this._sync(); this._updateTitlebar(); this._updateSuggestions(); this.dispatchEvent(new CustomEvent("md:change", { detail: { value: this.getValue() } })); };
      this._handleInputScroll = () => { this.highlight.scrollTop = this.input.scrollTop; this.highlight.scrollLeft = this.input.scrollLeft; };
      this._handleInputKeydown = event => this._handleKeydown(event);
      this._handleInputBlur = () => {
        if (this._blurTimeoutId) clearTimeout(this._blurTimeoutId);
        this._blurTimeoutId = setTimeout(() => { this._blurTimeoutId = null; this._hideSuggestions(); }, 120);
      };
      this.host.addEventListener("click", this._handleHostClick);
      this.input.addEventListener("input", this._handleInputChange);
      this.input.addEventListener("scroll", this._handleInputScroll);
      this.input.addEventListener("keydown", this._handleInputKeydown);
      this.input.addEventListener("blur", this._handleInputBlur);
    }

    _handleClick(event) {
      const action = event.target.closest("[data-mce-action]");
      if (action) {
        const actionName = action.dataset.mceAction;
        if (actionName === "save") this.save();
        else if (actionName === "edit") this.setMode("edit");
        return;
      }
      if (scrollToPageHeading(this.viewer, event)) return;
      const suggestion = event.target.closest(".mce-suggestion");
      if (suggestion) this._applySuggestion(Number(suggestion.dataset.index));
      const documentLink = event.target.closest(".mce-document-link");
      if (documentLink) {
        event.preventDefault();
        this.dispatchEvent(new CustomEvent("md:document-open", { detail: { id: documentLink.dataset.documentId, label: documentLink.textContent } }));
      }
    }

    _sync() { this.highlight.innerHTML = highlightMarkdownSource(this.input.value); }
    _getTitleFromMarkdown() {
      const match = String(this.getValue() || "").replace(/\r\n?/g, "\n").match(/^#\s+(.+)$/m);
      if (!match) return "";
      const holder = document.createElement("div");
      holder.innerHTML = inlineMarkdown(match[1]);
      return holder.textContent.trim();
    }
    _updateTitlebar(title) {
      if (!this.titleElement) return;
      this.titleElement.textContent = title === undefined ? this._getTitleFromMarkdown() : String(title || "");
    }
    getValue() { return this.input.value; }
    setValue(value) {
      this.input.value = String(value || "");
      this._sync();
      this._updateTitlebar();
      if (!this.viewer.classList.contains("mce-hidden")) this._renderViewer();
    }
    _renderViewer() {
      const holder = document.createElement("div");
      holder.innerHTML = this.renderer.render(this.getValue());
      const title = holder.querySelector("h1");
      if (title) {
        this._updateTitlebar(title.textContent.trim());
        title.remove();
      } else {
        this._updateTitlebar();
      }
      renderViewerElement(this.viewer, holder.innerHTML, this.options);
    }
    focus() { this.input.focus(); }
    insertText(text) {
      const start = this.input.selectionStart;
      const end = this.input.selectionEnd;
      this.input.setRangeText(String(text), start, end, "end");
      this.input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    save() {
      const value = this.getValue();
      this.dispatchEvent(new CustomEvent("md:save", { detail: { value } }));
      this.setMode("view");
    }
    getMode() { return this.mode; }
    setMode(mode) {
      if (mode !== "edit" && mode !== "view") throw new TypeError('mode must be "edit" or "view"');
      const view = mode === "view";
      this.mode = mode;
      this.host.classList.toggle("mce-mode-view", view);
      this.host.classList.toggle("mce-mode-edit", !view);
      this.shell.classList.toggle("mce-hidden", view);
      this.viewer.classList.toggle("mce-hidden", !view);
      if (this.actionButton) {
        this.actionButton.dataset.mceAction = view ? "edit" : "save";
        this.actionButton.textContent = view ? "編集" : "保存";
      }
      if (view) this._renderViewer(); else this.focus();
      this._hideSuggestions();
    }
    registerCodeHighlighter(language, fn) { this.renderer.registerCodeHighlighter(language, fn); }

    _context() {
      const before = this.input.value.slice(0, this.input.selectionStart);
      const line = before.slice(before.lastIndexOf("\n") + 1);
      const command = line.match(/^\/(\S*)$/);
      if (command) return { type: "command", query: command[1], start: this.input.selectionStart - line.length, end: this.input.selectionStart };
      const doc = before.match(/\[\[([^\]\n]*)$/);
      if (doc) return { type: "document", query: doc[1], start: this.input.selectionStart - doc[0].length, end: this.input.selectionStart };
      return null;
    }

    _updateSuggestions() {
      const context = this._context();
      this.suggestionContext = context;
      if (!context) return this._hideSuggestions();
      if (context.type === "command") {
        this._showSuggestions(this.options.commands.filter(item => item.label.includes(context.query) || item.id.includes(context.query)));
      } else {
        const respond = items => { if (this.suggestionContext === context) this._showSuggestions(items || []); };
        this.dispatchEvent(new CustomEvent("md:suggest-request", { detail: { type: "document", query: context.query, respond } }));
        const local = (this.options.documents || []).filter(item => item.label.includes(context.query));
        if (local.length) respond(local);
      }
    }

    _showSuggestions(items) {
      this.suggestionItems = items;
      this.activeSuggestion = 0;
      if (!items.length) return this._hideSuggestions();
      this.suggestions.innerHTML = items.map((item, index) => '<button type="button" class="mce-suggestion" role="option" data-index="' + index + '" aria-selected="' + (index === 0) + '"><strong>' + escapeHtml(item.label) + '</strong>' + (item.description ? '<small>' + escapeHtml(item.description) + '</small>' : "") + "</button>").join("");
      const rect = this.input.getBoundingClientRect();
      this.suggestions.style.left = Math.min(rect.left + 24, window.innerWidth - 260) + "px";
      this.suggestions.style.top = Math.min(rect.top + 58, window.innerHeight - 260) + "px";
      this.suggestions.classList.remove("mce-hidden");
    }
    _hideSuggestions() { this.suggestions.classList.add("mce-hidden"); this.suggestionItems = []; }
    _handleKeydown(event) {
      if (this.suggestions.classList.contains("mce-hidden")) {
        if (event.key === "Tab") { event.preventDefault(); this.insertText("  "); }
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        this.activeSuggestion = (this.activeSuggestion + direction + this.suggestionItems.length) % this.suggestionItems.length;
        this.suggestions.querySelectorAll(".mce-suggestion").forEach((node, index) => node.setAttribute("aria-selected", String(index === this.activeSuggestion)));
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault(); this._applySuggestion(this.activeSuggestion);
      } else if (event.key === "Escape") {
        event.preventDefault(); this._hideSuggestions();
      }
    }
    _applySuggestion(index) {
      const item = this.suggestionItems[index];
      const context = this.suggestionContext;
      if (!item || !context) return;
      const insert = context.type === "command" ? item.insert : "[[document:" + item.id + "|" + item.label + "]]";
      this.input.setSelectionRange(context.start, context.end);
      this.input.setRangeText(insert, context.start, context.end, "end");
      this._hideSuggestions();
      this.input.dispatchEvent(new Event("input", { bubbles: true }));
      this.focus();
    }
    destroy() {
      if (this._destroyed) return;
      this._destroyed = true;
      if (this._blurTimeoutId) { clearTimeout(this._blurTimeoutId); this._blurTimeoutId = null; }
      this.host.removeEventListener("click", this._handleHostClick);
      this.input.removeEventListener("input", this._handleInputChange);
      this.input.removeEventListener("scroll", this._handleInputScroll);
      this.input.removeEventListener("keydown", this._handleInputKeydown);
      this.input.removeEventListener("blur", this._handleInputBlur);
      this.host.innerHTML = "";
      this.host.classList.remove("mce-root", "mce-mode-edit", "mce-mode-view");
      this.host = null;
      this.input = null;
      this.highlight = null;
      this.shell = null;
      this.viewer = null;
      this.suggestions = null;
      this.titleElement = null;
      this.actionButton = null;
      this.suggestionItems = [];
      this.suggestionContext = null;
    }
  }

  global.MarkdownEditor = MarkdownEditor;
  global.MarkdownViewer = MarkdownViewer;
  global.MarkdownRenderer = MarkdownRenderer;
})(window);
