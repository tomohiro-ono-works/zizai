(function (global) {
  "use strict";

  var EMPTY = "";
  var sequence = 0;

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function clone(value) {
    if (value === undefined || value === null || typeof value !== "object") return value;
    if (typeof global.structuredClone === "function") {
      try { return global.structuredClone(value); } catch (_) {}
    }
    return JSON.parse(JSON.stringify(value));
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (key === "className") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "htmlFor") node.htmlFor = value;
      else if (value !== undefined && value !== null) node.setAttribute(key, String(value));
    });
    (children || []).forEach(function (child) {
      if (child === undefined || child === null) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function normalizeOption(option) {
    if (isObject(option)) {
      var value = hasOwn(option, "value") ? option.value : option.id;
      var label = hasOwn(option, "label") ? option.label : value;
      return {
        value: value == null ? EMPTY : String(value),
        label: label == null ? EMPTY : String(label),
        image: option.image ? String(option.image) : EMPTY,
        keywords: option.keywords ? String(option.keywords) : EMPTY
      };
    }
    return { value: option == null ? EMPTY : String(option), label: option == null ? EMPTY : String(option), image: EMPTY, keywords: EMPTY };
  }

  function normalizeOptions(options) {
    return Array.isArray(options) ? options.map(normalizeOption) : [];
  }

  function isDisplayOnly(field) {
    return field.kind === "google-auth-login" || field.kind === "mouse-coordinate-picker" || field.displayOnly === true;
  }

  function outputKey(field) {
    return String(field.exportKey || field.key);
  }

  function initialValue(field, source) {
    if (source && hasOwn(source, field.key)) return clone(source[field.key]);
    if (field.exportKey && source && hasOwn(source, field.exportKey)) return clone(source[field.exportKey]);
    if (hasOwn(field, "default")) return clone(field.default);
    if (field.kind === "checkbox") return false;
    if (field.kind === "checklist") return [];
    return EMPTY;
  }

  function empty(value) {
    return value === undefined || value === null || value === EMPTY || (Array.isArray(value) && value.length === 0);
  }

  function isFieldVisible(field, values) {
    var rule = field && field.visible_if;
    if (!rule || !rule.key) return true;
    var current = values ? values[rule.key] : undefined;
    if (hasOwn(rule, "equals")) return String(current == null ? EMPTY : current) === String(rule.equals == null ? EMPTY : rule.equals);
    if (Array.isArray(rule.in)) {
      var currentText = String(current == null ? EMPTY : current);
      return rule.in.some(function (item) { return String(item == null ? EMPTY : item) === currentText; });
    }
    return true;
  }

  function normalizeNumberInput(field, rawValue) {
    if (rawValue === EMPTY) return EMPTY;
    if (field.allowVars) {
      var text = String(rawValue);
      var numberValue = Number(text);
      return Number.isFinite(numberValue) ? numberValue : text;
    }
    return Number(rawValue);
  }

  function validateField(field, value) {
    if (isDisplayOnly(field)) return null;
    if (field.required) {
      var missing = field.kind === "checkbox" ? value !== true : empty(value);
      if (missing) return "必須項目です";
    }
    if (empty(value)) return null;
    var numericValue = Number(value);
    var canValidateNumber = Number.isFinite(numericValue);
    if (field.min != null && canValidateNumber && numericValue < Number(field.min)) return field.min + "以上で入力してください";
    if (field.max != null && canValidateNumber && numericValue > Number(field.max)) return field.max + "以下で入力してください";
    if (field.minLength != null && String(value).length < Number(field.minLength)) return field.minLength + "文字以上で入力してください";
    if (field.maxLength != null && String(value).length > Number(field.maxLength)) return field.maxLength + "文字以下で入力してください";
    if (field.pattern) {
      try { if (!(new RegExp(field.pattern)).test(String(value))) return "入力形式が正しくありません"; } catch (_) {}
    }
    return null;
  }

  function common(input, field) {
    if (field.placeholder != null) input.setAttribute("placeholder", String(field.placeholder));
    if (field.accept != null) input.setAttribute("accept", String(field.accept));
    if (field.min != null) input.setAttribute("min", String(field.min));
    if (field.max != null) input.setAttribute("max", String(field.max));
    if (field.minLength != null) input.setAttribute("minlength", String(field.minLength));
    if (field.maxLength != null) input.setAttribute("maxlength", String(field.maxLength));
    if (field.pattern != null) input.setAttribute("pattern", String(field.pattern));
    if (field.required) input.setAttribute("aria-required", "true");
  }

  function textInput(field, value, type) {
    var input = el("input", { type: type || "text", className: "node-form__input" });
    input.value = value == null ? EMPTY : String(value);
    common(input, field);
    return { control: input, inputs: [input] };
  }

  function textarea(field, value) {
    var input = el("textarea", { className: "node-form__textarea" });
    input.value = value == null ? EMPTY : String(value);
    common(input, field);
    return { control: input, inputs: [input] };
  }

  function selectControl(field, value) {
    var input = el("select", { className: "node-form__select" });
    var options = normalizeOptions(field.options);
    var current = value == null ? EMPTY : String(value);
    if (!field.required || current === EMPTY) input.appendChild(el("option", { value: EMPTY, text: "選択してください" }));
    if (current && !options.some(function (item) { return item.value === current; })) options.unshift({ value: current, label: current });
    options.forEach(function (item) { input.appendChild(el("option", { value: item.value, text: item.label })); });
    input.value = current;
    common(input, field);
    return { control: input, inputs: [input] };
  }

  function comboControl(field, value, instance) {
    if (field.allowCustom === false) return selectControl(field, value);

    var options = normalizeOptions(field.options);
    var current = value == null ? EMPTY : String(value);
    var wrapper = el("div", { className: "node-form__combo" });
    var input = el("input", { type: "text", className: "node-form__input node-form__combo-input" });
    var button = el("button", { type: "button", className: "node-form__combo-button", text: "▼", "aria-label": "候補を開く" });
    var menu = el("div", { className: "node-form__combo-menu", hidden: "hidden" });
    var open = false;
    var outside = null;
    input.value = options.find(function (item) { return item.value === current; })?.label || current;
    common(input, field);

    function close() {
      if (!open) return;
      open = false;
      menu.hidden = true;
      if (outside) document.removeEventListener("pointerdown", outside);
      outside = null;
    }

    function render(filterText, forceAll) {
      menu.innerHTML = EMPTY;
      var query = forceAll ? EMPTY : String(filterText || EMPTY).toLowerCase();
      var visible = options.filter(function (item) {
        return !query || item.label.toLowerCase().indexOf(query) >= 0 || item.value.toLowerCase().indexOf(query) >= 0 || item.keywords.toLowerCase().indexOf(query) >= 0;
      });
      if (!visible.length) menu.appendChild(el("div", { className: "node-form__combo-empty", text: "候補がありません" }));
      visible.forEach(function (item) {
        var option = el("button", { type: "button", className: "node-form__combo-option", text: item.label });
        var choose = function (event) {
          if (event && event.preventDefault) event.preventDefault();
          input.value = item.label;
          instance.setInternalValue(field, item.value, true);
          close();
        };
        option.addEventListener("mousedown", choose);
        instance.bindings.push({ element: option, eventName: "mousedown", listener: choose });
        menu.appendChild(option);
      });
    }

    function openMenu(forceAll) {
      render(input.value, forceAll);
      open = true;
      menu.hidden = false;
      outside = function (event) { if (!wrapper.contains || !wrapper.contains(event.target)) close(); };
      document.addEventListener("pointerdown", outside);
    }

    var onInput = function () {
      instance.setInternalValue(field, input.value, true);
      openMenu(false);
    };
    var onButton = function () { open ? close() : openMenu(true); };
    input.addEventListener("input", onInput);
    button.addEventListener("click", onButton);
    instance.bindings.push({ element: input, eventName: "input", listener: onInput });
    instance.bindings.push({ element: button, eventName: "click", listener: onButton });
    instance.cleanup.push(close);

    wrapper.appendChild(input);
    wrapper.appendChild(button);
    wrapper.appendChild(menu);
    return { control: wrapper, inputs: [input], manual: true, setValue: function (next) {
      var text = next == null ? EMPTY : String(next);
      var found = options.find(function (item) { return item.value === text; });
      input.value = found ? found.label : text;
    }};
  }

  function browseControl(field, value, instance) {
    var wrapper = el("div", { className: "node-form__browse" });
    var input = el("input", { type: "text", className: "node-form__input" });
    var button = el("button", { type: "button", className: "node-form__browse-button", text: "選択" });
    input.value = value == null ? EMPTY : String(value);
    common(input, field);

    var onInput = function () { instance.setInternalValue(field, input.value, true); };
    var onClick = function () {
      if (button.disabled) return;
      var requestId = instance.id + "_browse_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      instance.pendingBrowse[field.key] = requestId;
      button.disabled = true;
      button.textContent = "選択中...";
      instance.root.dispatchEvent(new CustomEvent("nodeform:browse-request", {
        bubbles: true,
        detail: {
          instanceId: instance.id,
          requestId: requestId,
          key: field.key,
          kind: field.kind,
          currentValue: input.value,
          accept: field.accept || EMPTY
        }
      }));
    };
    input.addEventListener("input", onInput);
    button.addEventListener("click", onClick);
    instance.bindings.push({ element: input, eventName: "input", listener: onInput });
    instance.bindings.push({ element: button, eventName: "click", listener: onClick });
    wrapper.appendChild(input);
    wrapper.appendChild(button);
    return { control: wrapper, inputs: [input], manual: true, browseButton: button, setValue: function (next) { input.value = next == null ? EMPTY : String(next); } };
  }

  function normalizeChecklistValues(value) {
    if (Array.isArray(value)) return value.map(function (item) { return String(item == null ? EMPTY : item).trim(); }).filter(Boolean);
    if (isObject(value)) return Object.keys(value).filter(function (key) { return !!value[key]; });
    var text = String(value == null ? EMPTY : value).trim();
    if (!text) return [];
    try {
      var parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(function (item) { return String(item == null ? EMPTY : item).trim(); }).filter(Boolean);
    } catch (_) {}
    return text.split(",").map(function (item) { return item.trim(); }).filter(Boolean);
  }

  function checklistControl(field, value, instance, inputId) {
    var wrapper = el("div", { className: "node-form__checklist" });
    var options = normalizeOptions(field.options);
    var selected = normalizeChecklistValues(value);
    var inputs = [];

    function collect() {
      return inputs.filter(function (input) { return input.checked; }).map(function (input) { return input.value; });
    }

    function setValue(next) {
      var nextValues = normalizeChecklistValues(next);
      inputs.forEach(function (input) { input.checked = nextValues.indexOf(input.value) >= 0; });
    }

    options.forEach(function (item, index) {
      var id = inputId + "_check_" + index;
      var input = el("input", { type: "checkbox", id: id, value: item.value, className: "node-form__checklist-input" });
      input.checked = selected.indexOf(item.value) >= 0;
      var label = el("label", { className: "node-form__checklist-option", htmlFor: id }, [input, item.label]);
      var listener = function () { instance.setInternalValue(field, collect(), true); };
      input.addEventListener("change", listener);
      instance.bindings.push({ element: input, eventName: "change", listener: listener });
      wrapper.appendChild(label);
      inputs.push(input);
    });

    return { control: wrapper, inputs: inputs, manual: true, setValue: setValue };
  }

  function normalizeDefineValueRows(value) {
    function normalizeRow(item) {
      if (!isObject(item)) return null;
      return {
        name: String(item.name || item.key || EMPTY),
        value: String(item.value != null ? item.value : (item.val != null ? item.val : EMPTY))
      };
    }
    if (Array.isArray(value)) return value.map(normalizeRow).filter(Boolean);
    if (isObject(value)) return Object.keys(value).map(function (name) {
      return { name: String(name), value: String(value[name] == null ? EMPTY : value[name]) };
    });
    var text = String(value == null ? EMPTY : value).trim();
    if (!text) return [];
    try { return normalizeDefineValueRows(JSON.parse(text)); } catch (_) { return []; }
  }

  function stringifyDefineValueRows(rows) {
    return JSON.stringify(normalizeDefineValueRows(rows), null, 2);
  }

  function defineValuesControl(field, value, instance) {
    var wrapper = el("div", { className: "node-form__define-values" });
    var rowsHost = el("div", { className: "node-form__define-values-rows" });
    var addButton = el("button", { type: "button", className: "node-form__define-values-add", text: "+ 変数を追加" });
    var rows = normalizeDefineValueRows(value);

    function sync() {
      instance.setInternalValue(field, stringifyDefineValueRows(rows), true);
    }

    function renderRows() {
      rowsHost.innerHTML = EMPTY;
      rows.forEach(function (item, index) {
        var row = el("div", { className: "node-form__define-values-row" });
        var nameInput = el("input", { type: "text", className: "node-form__input node-form__define-values-name", placeholder: "変数名" });
        var valueInput = el("input", { type: "text", className: "node-form__input node-form__define-values-value", placeholder: "値" });
        var removeButton = el("button", { type: "button", className: "node-form__define-values-remove", text: "削除" });
        nameInput.value = item.name;
        valueInput.value = item.value;

        var onName = function () { rows[index].name = nameInput.value; sync(); };
        var onValue = function () { rows[index].value = valueInput.value; sync(); };
        var onRemove = function () { rows.splice(index, 1); renderRows(); sync(); };
        nameInput.addEventListener("input", onName);
        valueInput.addEventListener("input", onValue);
        removeButton.addEventListener("click", onRemove);
        instance.bindings.push({ element: nameInput, eventName: "input", listener: onName });
        instance.bindings.push({ element: valueInput, eventName: "input", listener: onValue });
        instance.bindings.push({ element: removeButton, eventName: "click", listener: onRemove });

        row.appendChild(nameInput);
        row.appendChild(valueInput);
        row.appendChild(removeButton);
        rowsHost.appendChild(row);
      });
    }

    var onAdd = function () {
      rows.push({ name: EMPTY, value: EMPTY });
      renderRows();
      sync();
    };
    addButton.addEventListener("click", onAdd);
    instance.bindings.push({ element: addButton, eventName: "click", listener: onAdd });
    wrapper.appendChild(rowsHost);
    wrapper.appendChild(addButton);
    renderRows();

    return {
      control: wrapper,
      inputs: [],
      manual: true,
      setValue: function (next) { rows = normalizeDefineValueRows(next); renderRows(); }
    };
  }

  var FILTER_OPERATOR_OPTIONS = [
    { value: "exact", label: "完全一致" },
    { value: "prefix", label: "前方一致" },
    { value: "suffix", label: "後方一致" },
    { value: "contains", label: "部分一致" },
    { value: "regex", label: "正規表現" },
    { value: "range", label: "範囲一致" },
    { value: "is_null", label: "空(null)" }
  ];
  var FILTER_APPLY_OPTIONS = [
    { value: "include", label: "対象" },
    { value: "exclude", label: "除外" }
  ];

  function normalizeFilterConditions(value) {
    var items = value;
    if (!Array.isArray(items)) {
      var text = String(value == null ? EMPTY : value).trim();
      if (!text) return [];
      try { items = JSON.parse(text); } catch (_) { return []; }
    }
    if (!Array.isArray(items)) return [];
    return items.filter(isObject).map(function (item) {
      return {
        field: String(item.field || EMPTY),
        operator: String(item.operator || "exact").trim().toLowerCase() || "exact",
        apply: String(item.apply || item.target || "include").trim().toLowerCase() === "exclude" ? "exclude" : "include",
        value: String(item.value || EMPTY),
        value_to: String(item.value_to || EMPTY)
      };
    });
  }

  function stringifyFilterConditions(items) {
    return JSON.stringify(normalizeFilterConditions(items), null, 2);
  }

  function filterBuilderControl(field, value, instance) {
    var wrapper = el("div", { className: "node-form__filter-builder" });
    var rowsHost = el("div", { className: "node-form__filter-rows" });
    var addButton = el("button", { type: "button", className: "node-form__filter-add", text: "+ 条件追加" });
    var conditions = normalizeFilterConditions(value);

    function blankCondition() {
      return { field: EMPTY, operator: "exact", apply: "include", value: EMPTY, value_to: EMPTY };
    }

    function sync() {
      instance.setInternalValue(field, stringifyFilterConditions(conditions), true);
    }

    function appendOptions(select, options, current) {
      options.forEach(function (option) {
        select.appendChild(el("option", { value: option.value, text: option.label }));
      });
      select.value = current;
    }

    function updateRangeState(item, valueInput, valueToInput) {
      var isRange = item.operator === "range";
      var isNull = item.operator === "is_null";
      valueInput.disabled = isNull;
      valueToInput.disabled = !isRange;
      if (isNull) {
        item.value = EMPTY;
        item.value_to = EMPTY;
        valueInput.value = EMPTY;
        valueToInput.value = EMPTY;
      } else if (!isRange) {
        item.value_to = EMPTY;
        valueToInput.value = EMPTY;
      }
    }

    function renderRows() {
      rowsHost.innerHTML = EMPTY;
      if (!conditions.length) conditions.push(blankCondition());
      conditions.forEach(function (item, index) {
        var row = el("div", { className: "node-form__filter-row" });
        var fieldInput = el("input", { type: "text", className: "node-form__input node-form__filter-field", placeholder: "フィールド" });
        var operatorSelect = el("select", { className: "node-form__select node-form__filter-operator" });
        var applySelect = el("select", { className: "node-form__select node-form__filter-apply" });
        var valueInput = el("input", { type: "text", className: "node-form__input node-form__filter-value", placeholder: "値" });
        var valueToInput = el("input", { type: "text", className: "node-form__input node-form__filter-value-to", placeholder: "範囲終点" });
        var removeButton = el("button", { type: "button", className: "node-form__filter-remove", text: "削除" });

        fieldInput.value = item.field;
        valueInput.value = item.value;
        valueToInput.value = item.value_to;
        appendOptions(operatorSelect, FILTER_OPERATOR_OPTIONS, item.operator);
        appendOptions(applySelect, FILTER_APPLY_OPTIONS, item.apply);
        updateRangeState(item, valueInput, valueToInput);

        var onField = function () { item.field = fieldInput.value; sync(); };
        var onOperator = function () { item.operator = operatorSelect.value || "exact"; updateRangeState(item, valueInput, valueToInput); sync(); };
        var onApply = function () { item.apply = applySelect.value === "exclude" ? "exclude" : "include"; sync(); };
        var onValue = function () { item.value = valueInput.value; sync(); };
        var onValueTo = function () { item.value_to = valueToInput.value; sync(); };
        var onRemove = function () { conditions.splice(index, 1); renderRows(); sync(); };

        fieldInput.addEventListener("input", onField);
        operatorSelect.addEventListener("change", onOperator);
        applySelect.addEventListener("change", onApply);
        valueInput.addEventListener("input", onValue);
        valueToInput.addEventListener("input", onValueTo);
        removeButton.addEventListener("click", onRemove);
        instance.bindings.push({ element: fieldInput, eventName: "input", listener: onField });
        instance.bindings.push({ element: operatorSelect, eventName: "change", listener: onOperator });
        instance.bindings.push({ element: applySelect, eventName: "change", listener: onApply });
        instance.bindings.push({ element: valueInput, eventName: "input", listener: onValue });
        instance.bindings.push({ element: valueToInput, eventName: "input", listener: onValueTo });
        instance.bindings.push({ element: removeButton, eventName: "click", listener: onRemove });

        row.appendChild(fieldInput);
        row.appendChild(operatorSelect);
        row.appendChild(applySelect);
        row.appendChild(valueInput);
        row.appendChild(valueToInput);
        row.appendChild(removeButton);
        rowsHost.appendChild(row);
      });
    }

    var onAdd = function () { conditions.push(blankCondition()); renderRows(); sync(); };
    addButton.addEventListener("click", onAdd);
    instance.bindings.push({ element: addButton, eventName: "click", listener: onAdd });
    wrapper.appendChild(addButton);
    wrapper.appendChild(rowsHost);
    renderRows();

    return {
      control: wrapper,
      inputs: [],
      manual: true,
      setValue: function (next) { conditions = normalizeFilterConditions(next); renderRows(); }
    };
  }

  function checkboxControl(field, value) {
    var input = el("input", { type: "checkbox", className: "node-form__checkbox" });
    input.checked = value === true || value === "true" || value === 1 || value === "1";
    common(input, field);
    return { control: input, inputs: [input] };
  }

  function radioControl(field, value, name) {
    var wrapper = el("div", { className: "node-form__radio-group" });
    var current = value == null ? EMPTY : String(value);
    var inputs = [];
    normalizeOptions(field.options).forEach(function (item, index) {
      var id = name + "_" + index;
      var input = el("input", { type: "radio", name: name, id: id, value: item.value });
      input.checked = item.value === current;
      var label = el("label", { className: "node-form__radio-option", htmlFor: id }, [input, item.label]);
      wrapper.appendChild(label);
      inputs.push(input);
    });
    return { control: wrapper, inputs: inputs };
  }

  function coordinatePickerControl(field, instance) {
    var wrapper = el("div", { className: "node-form__coordinate-picker" });
    var button = el("button", { type: "button", className: "node-form__coordinate-button", text: field.buttonLabel || "マウスで指定する" });
    var onClick = function () {
      if (button.disabled) return;
      var requestId = instance.id + "_coordinate_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      var xKey = String(field.x_key || "x");
      var yKey = String(field.y_key || "y");
      instance.pendingCoordinate[field.key] = requestId;
      button.disabled = true;
      button.textContent = "座標取得中...";
      instance.root.dispatchEvent(new CustomEvent("nodeform:coordinate-request", {
        bubbles: true,
        detail: {
          instanceId: instance.id,
          requestId: requestId,
          key: field.key,
          xKey: xKey,
          yKey: yKey,
          currentX: clone(instance.values[xKey]),
          currentY: clone(instance.values[yKey])
        }
      }));
    };
    button.addEventListener("click", onClick);
    instance.bindings.push({ element: button, eventName: "click", listener: onClick });
    wrapper.appendChild(button);
    return { control: wrapper, inputs: [], manual: true, coordinateButton: button };
  }

  function displayControl(field) {
    var button = el("button", { type: "button", className: "node-form__display-button", text: field.buttonLabel || field.label || "実行", disabled: "disabled" });
    return { control: button, inputs: [], manual: true };
  }

  function createControl(field, value, instance, inputId) {
    switch (field.kind) {
      case "number": return textInput(field, value, field.allowVars ? "text" : "number");
      case "textarea": return textarea(field, value);
      case "select": return selectControl(field, value);
      case "combo": return comboControl(field, value, instance);
      case "checkbox": return checkboxControl(field, value);
      case "checklist": return checklistControl(field, value, instance, inputId);
      case "radio": return radioControl(field, value, inputId);
      case "file":
      case "dir": return browseControl(field, value, instance);
      case "define-values-editor": return defineValuesControl(field, value, instance);
      case "filter-builder": return filterBuilderControl(field, value, instance);
      case "mouse-coordinate-picker": return coordinatePickerControl(field, instance);
      case "google-auth-login": return displayControl(field);
      default: return textInput(field, value, "text");
    }
  }

  function NodeFormInstance(options) {
    this.root = options.root;
    this.node = options.node;
    this.forms = options.forms;
    this.onChange = typeof options.onChange === "function" ? options.onChange : null;
    this.formKey = String(this.node.connector || EMPTY) + "." + String(this.node.action || EMPTY);
    this.fields = Array.isArray(this.forms[this.formKey]) ? this.forms[this.formKey].slice() : [];
    this.values = {};
    this.controls = {};
    this.rows = {};
    this.bindings = [];
    this.cleanup = [];
    this.pendingBrowse = {};
    this.pendingCoordinate = {};
    this.destroyed = false;
    this.id = "nodeform_" + (++sequence);
    this.init();
    this.render();
    this.bindBrowseResult();
    this.bindCoordinateResult();
  }

  NodeFormInstance.prototype.init = function () {
    var source = isObject(this.node.form) ? this.node.form : {};
    var self = this;
    this.fields.forEach(function (field) {
      if (!field || !field.key || isDisplayOnly(field)) return;
      self.values[field.key] = initialValue(field, source);
    });
  };

  NodeFormInstance.prototype.setInternalValue = function (field, value, notify) {
    this.values[field.key] = clone(value);
    this.clearError(field.key);
    this.refreshVisibility();
    if (notify && this.onChange) this.onChange(this.getParams(), { key: outputKey(field), value: clone(value) });
  };

  NodeFormInstance.prototype.refreshVisibility = function () {
    var self = this;
    Object.keys(this.rows).forEach(function (key) {
      var data = self.rows[key];
      if (!data || !data.row || !data.field) return;
      var visible = isFieldVisible(data.field, self.values);
      data.row.hidden = !visible;
      if (visible) data.row.removeAttribute("aria-hidden");
      else {
        data.row.setAttribute("aria-hidden", "true");
        self.clearError(key);
      }
    });
  };

  NodeFormInstance.prototype.render = function () {
    var self = this;
    this.root.innerHTML = EMPTY;
    this.root.classList.add("node-form");
    this.root.setAttribute("data-node-form-key", this.formKey);
    this.root.setAttribute("data-node-form-instance", this.id);

    if (!this.fields.length) {
      this.root.appendChild(el("div", { className: "node-form__empty", text: "フォーム定義が見つかりません" }));
      return;
    }

    this.fields.forEach(function (field, index) {
      if (!field || !field.key || field.hidden === true) return;
      var inputId = self.id + "_" + index;
      var size = field.size === "half" ? "half" : "full";
      var row = el("div", {
        className: "node-form__field node-form__field--" + size,
        "data-field-key": field.key,
        "data-field-size": size
      });
      var label = el("label", { className: "node-form__label", htmlFor: inputId, text: field.label || field.key });
      if (field.required && !isDisplayOnly(field)) label.appendChild(el("span", { className: "node-form__required", text: " *", "aria-hidden": "true" }));
      var rendered = createControl(field, self.values[field.key], self, inputId);
      var error = el("div", { className: "node-form__error", id: inputId + "_error", role: "alert" });

      if (!rendered.manual) {
        rendered.inputs.forEach(function (input) {
          if (!input.id) input.id = inputId;
          input.setAttribute("data-field-key", field.key);
          input.setAttribute("aria-describedby", error.id);
          var eventName = ["checkbox", "radio", "select"].indexOf(field.kind) >= 0 || (field.kind === "combo" && field.allowCustom === false) ? "change" : "input";
          var listener = function () {
            var value;
            if (field.kind === "checkbox") value = !!input.checked;
            else if (field.kind === "radio") {
              var checked = rendered.inputs.find(function (item) { return item.checked; });
              value = checked ? checked.value : EMPTY;
            } else if (field.kind === "number") value = normalizeNumberInput(field, input.value);
            else value = input.value;
            self.setInternalValue(field, value, true);
          };
          input.addEventListener(eventName, listener);
          self.bindings.push({ element: input, eventName: eventName, listener: listener });
        });
      }

      row.appendChild(label);
      row.appendChild(rendered.control);
      row.appendChild(error);
      self.root.appendChild(row);
      self.controls[field.key] = rendered;
      self.rows[field.key] = { row: row, error: error, field: field };
    });
    this.refreshVisibility();
  };

  NodeFormInstance.prototype.bindBrowseResult = function () {
    var self = this;
    this.browseResultListener = function (event) {
      var detail = event.detail || {};
      if (detail.instanceId !== self.id) return;
      if (!detail.key || self.pendingBrowse[detail.key] !== detail.requestId) return;
      var control = self.controls[detail.key];
      if (control && control.browseButton) {
        control.browseButton.disabled = false;
        control.browseButton.textContent = "選択";
      }
      delete self.pendingBrowse[detail.key];
      if (detail.cancelled || detail.error || detail.value == null) return;
      var field = self.rows[detail.key] && self.rows[detail.key].field;
      if (!field) return;
      if (control && control.setValue) control.setValue(detail.value);
      self.setInternalValue(field, String(detail.value), true);
    };
    document.addEventListener("nodeform:browse-result", this.browseResultListener);
  };

  NodeFormInstance.prototype.bindCoordinateResult = function () {
    var self = this;
    this.coordinateResultListener = function (event) {
      var detail = event.detail || {};
      if (detail.instanceId !== self.id) return;
      if (!detail.key || self.pendingCoordinate[detail.key] !== detail.requestId) return;
      var control = self.controls[detail.key];
      if (control && control.coordinateButton) {
        control.coordinateButton.disabled = false;
        control.coordinateButton.textContent = (self.rows[detail.key] && self.rows[detail.key].field.buttonLabel) || "マウスで指定する";
      }
      delete self.pendingCoordinate[detail.key];
      if (detail.cancelled || detail.error || detail.x == null || detail.y == null) return;

      var pickerField = self.rows[detail.key] && self.rows[detail.key].field;
      if (!pickerField) return;
      var xKey = String(pickerField.x_key || "x");
      var yKey = String(pickerField.y_key || "y");
      var xField = self.fields.find(function (field) { return field && field.key === xKey; });
      var yField = self.fields.find(function (field) { return field && field.key === yKey; });

      function apply(field, next) {
        if (!field || isDisplayOnly(field)) return;
        var targetControl = self.controls[field.key];
        if (targetControl) {
          if (targetControl.setValue) targetControl.setValue(next);
          else if (field.kind === "checkbox" && targetControl.inputs[0]) targetControl.inputs[0].checked = !!next;
          else if (targetControl.inputs[0]) targetControl.inputs[0].value = String(next);
        }
        self.setInternalValue(field, next, true);
      }

      apply(xField, detail.x);
      apply(yField, detail.y);
    };
    document.addEventListener("nodeform:coordinate-result", this.coordinateResultListener);
  };

  NodeFormInstance.prototype.clearError = function (key) {
    var data = this.rows[key];
    if (!data) return;
    data.error.textContent = EMPTY;
    data.row.classList.remove("node-form__field--invalid");
  };

  NodeFormInstance.prototype.getParams = function () {
    var result = {};
    var self = this;
    this.fields.forEach(function (field) {
      if (!field || !field.key || isDisplayOnly(field) || field.hidden === true) return;
      result[outputKey(field)] = clone(self.values[field.key]);
    });
    return result;
  };

  NodeFormInstance.prototype.setParams = function (params) {
    var source = isObject(params) ? params : {};
    var self = this;
    this.fields.forEach(function (field) {
      if (!field || !field.key || isDisplayOnly(field)) return;
      var key = hasOwn(source, field.key) ? field.key : (field.exportKey && hasOwn(source, field.exportKey) ? field.exportKey : null);
      if (!key) return;
      var value = clone(source[key]);
      self.values[field.key] = value;
      var control = self.controls[field.key];
      if (!control) return;
      if (control.setValue) control.setValue(value);
      else if (field.kind === "checkbox" && control.inputs[0]) control.inputs[0].checked = value === true || value === "true" || value === 1 || value === "1";
      else if (field.kind === "radio") control.inputs.forEach(function (input) { input.checked = input.value === String(value == null ? EMPTY : value); });
      else if (control.inputs[0]) control.inputs[0].value = value == null ? EMPTY : String(value);
      self.clearError(field.key);
    });
    this.refreshVisibility();
    return this;
  };

  NodeFormInstance.prototype.validate = function () {
    var errors = {};
    var self = this;
    this.fields.forEach(function (field) {
      if (!field || !field.key || isDisplayOnly(field) || field.hidden === true) return;
      if (!isFieldVisible(field, self.values)) {
        self.clearError(field.key);
        return;
      }
      var message = validateField(field, self.values[field.key]);
      self.clearError(field.key);
      if (message) {
        errors[outputKey(field)] = message;
        var data = self.rows[field.key];
        if (data) {
          data.error.textContent = message;
          data.row.classList.add("node-form__field--invalid");
        }
      }
    });
    return { valid: Object.keys(errors).length === 0, errors: errors };
  };

  NodeFormInstance.prototype.destroy = function () {
    if (this.destroyed) return;
    this.bindings.forEach(function (binding) { binding.element.removeEventListener(binding.eventName, binding.listener); });
    this.cleanup.forEach(function (fn) { fn(); });
    document.removeEventListener("nodeform:browse-result", this.browseResultListener);
    document.removeEventListener("nodeform:coordinate-result", this.coordinateResultListener);
    this.root.innerHTML = EMPTY;
    this.root.classList.remove("node-form");
    this.root.removeAttribute("data-node-form-key");
    this.root.removeAttribute("data-node-form-instance");
    this.destroyed = true;
  };

  function mount(options) {
    if (!isObject(options)) throw new TypeError("NodeForm.mount(options) の options が必要です");
    if (!(options.root instanceof Element)) throw new TypeError("options.root にはDOM要素を指定してください");
    if (!isObject(options.node)) throw new TypeError("options.node にはノード情報を指定してください");
    if (!isObject(options.forms)) throw new TypeError("options.forms にはフォーム定義を指定してください");
    return new NodeFormInstance(options);
  }

  global.NodeForm = Object.freeze({ mount: mount });
}(window));
