(function () {
  const packages = window.zizPackages = window.zizPackages || {};
  const ui = packages.ui = packages.ui || {};

  function normalizeSchema(schema) {
    if (schema && typeof schema === "object" && Array.isArray(schema.columns)) return schema;
    return { columns: [] };
  }

  function previewRows(preview, schema) {
    const columns = Array.isArray(preview?.columns) ? preview.columns : [];
    const rows = Array.isArray(preview?.rows) ? preview.rows : [];
    const reportColumnIds = new Map();
    (Array.isArray(schema?.columns) ? schema.columns : []).forEach((column) => {
      const originName = String(column?.origin_name ?? column?.id ?? "");
      if (!originName) return;
      reportColumnIds.set(originName, originName);
      const newName = String(column?.new_name ?? "");
      if (newName) reportColumnIds.set(newName, originName);
    });
    return rows.map((row) => {
      const values = Array.isArray(row) ? row : [];
      return columns.reduce((record, column, index) => {
        const previewColumn = String(column ?? "");
        const value = values[index];
        record[previewColumn] = value;
        const reportColumnId = reportColumnIds.get(previewColumn);
        if (reportColumnId && reportColumnId !== previewColumn) record[reportColumnId] = value;
        return record;
      }, {});
    });
  }

  function mountDataViewer({ root, schema, preview, schemaEditable, onSchemaChange }) {
    if (!(root instanceof HTMLElement)) throw new Error("DataViewer mount root is required.");
    if (typeof window.ReportViewer !== "function") throw new Error("DataViewer is unavailable.");
    const normalizedSchema = normalizeSchema(schema);
    const viewer = new window.ReportViewer({
      target: root,
      schema: normalizedSchema,
      data: previewRows(preview, normalizedSchema),
      activeTab: schemaEditable ? "columns" : "report",
      features: {
        report: true,
        columns: !!schemaEditable,
        json: !!schemaEditable,
        distribution: false,
        execute: false,
        export: false,
      },
    });
    let destroyed = false;
    if (schemaEditable && typeof onSchemaChange === "function") {
      viewer.on("schemachange", (nextSchema) => {
        if (destroyed) return;
        onSchemaChange(Array.isArray(nextSchema?.columns) ? nextSchema.columns : []);
      });
    }
    return {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        viewer.destroy();
      },
    };
  }

  const adapter = { mountDataViewer };
  window.uiDataViewerAdapter = adapter;
  ui.dataViewerAdapter = adapter;
})();
