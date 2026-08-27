(function () {
  const PYTHON_KEYWORDS = new Set([
    "and", "as", "assert", "async", "await", "break", "case", "class", "continue", "def", "del",
    "elif", "else", "except", "False", "finally", "for", "from", "global", "if", "import", "in",
    "is", "lambda", "match", "None", "nonlocal", "not", "or", "pass", "raise", "return", "True",
    "try", "while", "with", "yield"
  ]);
  const JSON_LITERALS = new Set(["true", "false", "null"]);

  // SQL tokenization belongs to the vendored zizai-highlighter-sql library. The
  // Application only resolves the dialect and composes its own `{{variable}}`
  // decoration on top of the library's public tokenizer.
  const SQL_TOKEN_CLASS_PREFIX = "sqhl-";
  const SQL_TEMPLATE_CLASS = "cm-token cm-variable-template";
  const SQL_DIALECT_IDS = ["bigquery", "duckdb"];
  const DEFAULT_SQL_DIALECT_ID = "bigquery";
  const CONNECTOR_SQL_DIALECT_IDS = {
    bqconnector: "bigquery",
    duckconnector: "duckdb"
  };
  // Template variables stay invisible inside SQL strings and comments, matching the
  // previous Application behaviour.
  const SQL_OPAQUE_TOKEN_TYPES = new Set(["string", "comment"]);

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function wrapToken(text, className) {
    const escaped = escapeHtml(text);
    if (!className) return escaped;
    return `<span class="cm-token ${className}">${escaped}</span>`;
  }

  function findTemplateTokenEnd(text, startIndex) {
    if (text.slice(startIndex, startIndex + 2) !== "{{") return -1;
    const endIndex = text.indexOf("}}", startIndex + 2);
    if (endIndex < 0) return -1;
    return endIndex + 2;
  }

  function tokenizePython(text) {
    const out = [];
    let index = 0;

    while (index < text.length) {
      const ch = text[index];
      const next3 = text.slice(index, index + 3);

      if (ch === "#") {
        let end = index;
        while (end < text.length && text[end] !== "\n") end += 1;
        out.push(wrapToken(text.slice(index, end), "cm-comment"));
        index = end;
        continue;
      }

      if (next3 === "'''" || next3 === "\"\"\"") {
        const quote = next3;
        let end = index + 3;
        while (end < text.length && text.slice(end, end + 3) !== quote) end += 1;
        end = Math.min(text.length, end + 3);
        out.push(wrapToken(text.slice(index, end), "cm-string"));
        index = end;
        continue;
      }

      if (ch === "'" || ch === "\"") {
        const quote = ch;
        let end = index + 1;
        while (end < text.length) {
          const current = text[end];
          if (current === "\\") {
            end += 2;
            continue;
          }
          if (current === quote) {
            end += 1;
            break;
          }
          end += 1;
        }
        out.push(wrapToken(text.slice(index, end), "cm-string"));
        index = end;
        continue;
      }

      if (ch === "{" && text[index + 1] === "{") {
        const end = findTemplateTokenEnd(text, index);
        if (end > index) {
          out.push(wrapToken(text.slice(index, end), "cm-variable-template"));
          index = end;
          continue;
        }
      }

      if (/\d/.test(ch)) {
        let end = index + 1;
        while (end < text.length && /[\d._]/.test(text[end])) end += 1;
        out.push(wrapToken(text.slice(index, end), "cm-number"));
        index = end;
        continue;
      }

      if (/[A-Za-z_]/.test(ch)) {
        let end = index + 1;
        while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) end += 1;
        const word = text.slice(index, end);
        out.push(wrapToken(word, PYTHON_KEYWORDS.has(word) ? "cm-keyword" : ""));
        index = end;
        continue;
      }

      out.push(escapeHtml(ch));
      index += 1;
    }

    return out.join("");
  }

  function normalizeSqlDialect(value) {
    const id = String(value || "").trim().toLowerCase();
    return SQL_DIALECT_IDS.indexOf(id) >= 0 ? id : DEFAULT_SQL_DIALECT_ID;
  }

  function resolveSqlDialectForConnector(connectorId) {
    const key = String(connectorId || "").trim().toLowerCase();
    return normalizeSqlDialect(CONNECTOR_SQL_DIALECT_IDS[key]);
  }

  function getSqlHighlighter() {
    const api = window.SqlHighlighter;
    return api && typeof api.tokenize === "function" ? api : null;
  }

  function toSqlTokenRanges(tokens) {
    const ranges = [];
    let cursor = 0;
    (tokens || []).forEach((token) => {
      const value = String(token?.value || "");
      const end = cursor + value.length;
      ranges.push({ start: cursor, end, type: String(token?.type || "plain") });
      cursor = end;
    });
    return ranges;
  }

  function isOpaqueSqlOffset(tokenRanges, offset) {
    for (let i = 0; i < tokenRanges.length; i += 1) {
      const token = tokenRanges[i];
      if (offset < token.start) break;
      if (offset < token.end) return SQL_OPAQUE_TOKEN_TYPES.has(token.type);
    }
    return false;
  }

  function findSqlTemplateRanges(text, tokenRanges) {
    const ranges = [];
    let index = 0;
    while (index < text.length) {
      const start = text.indexOf("{{", index);
      if (start < 0) break;
      const end = findTemplateTokenEnd(text, start);
      if (end <= start) break;
      if (!isOpaqueSqlOffset(tokenRanges, start)) ranges.push({ start, end });
      index = end;
    }
    return ranges;
  }

  function renderSqlTokenSpans(text, tokenRanges, from, to) {
    if (to <= from) return "";
    let html = "";
    tokenRanges.forEach((token) => {
      const start = Math.max(token.start, from);
      const end = Math.min(token.end, to);
      if (end <= start) return;
      const escaped = escapeHtml(text.slice(start, end));
      html += token.type === "plain"
        ? escaped
        : `<span class="${SQL_TOKEN_CLASS_PREFIX}${token.type}">${escaped}</span>`;
    });
    return html;
  }

  function renderSqlHighlightedHtml(text, dialectId) {
    const highlighter = getSqlHighlighter();
    if (!highlighter) return escapeHtml(text);

    let tokenRanges;
    try {
      tokenRanges = toSqlTokenRanges(highlighter.tokenize(text, normalizeSqlDialect(dialectId)));
    } catch (_) {
      return escapeHtml(text);
    }

    const templateRanges = findSqlTemplateRanges(text, tokenRanges);
    let html = "";
    let position = 0;
    templateRanges.forEach((range) => {
      html += renderSqlTokenSpans(text, tokenRanges, position, range.start);
      html += `<span class="${SQL_TEMPLATE_CLASS}">${escapeHtml(text.slice(range.start, range.end))}</span>`;
      position = range.end;
    });
    html += renderSqlTokenSpans(text, tokenRanges, position, text.length);
    return html;
  }

  function tokenizeJson(text) {
    const out = [];
    let index = 0;

    while (index < text.length) {
      const ch = text[index];

      if (ch === "\"") {
        let end = index + 1;
        while (end < text.length) {
          const current = text[end];
          if (current === "\\") {
            end += 2;
            continue;
          }
          if (current === "\"") {
            end += 1;
            break;
          }
          end += 1;
        }
        out.push(wrapToken(text.slice(index, end), "cm-string"));
        index = end;
        continue;
      }

      if (ch === "-" || /\d/.test(ch)) {
        const match = text.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
        if (match && match[0]) {
          out.push(wrapToken(match[0], "cm-number"));
          index += match[0].length;
          continue;
        }
      }

      if (/[A-Za-z]/.test(ch)) {
        let end = index + 1;
        while (end < text.length && /[A-Za-z]/.test(text[end])) end += 1;
        const word = text.slice(index, end);
        out.push(wrapToken(word, JSON_LITERALS.has(word) ? "cm-keyword" : ""));
        index = end;
        continue;
      }

      out.push(escapeHtml(ch));
      index += 1;
    }

    return out.join("");
  }

  function renderHighlightedHtml(text, language, options) {
    const source = String(text || "");
    if (!source) return " ";

    if (language === "python") return tokenizePython(source);
    if (language === "sql") return renderSqlHighlightedHtml(source, (options || {}).sqlDialect);
    if (language === "json") return tokenizeJson(source);
    return escapeHtml(source);
  }

  const api = { renderHighlightedHtml, normalizeSqlDialect, resolveSqlDialectForConnector };
  window.codeHighlight = api;
  const packages = window.zizPackages = window.zizPackages || {};
  const core = packages.core = packages.core || {};
  core.codeHighlight = api;
})();
