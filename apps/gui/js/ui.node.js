(function () {
  const packages = window.zizPackages = window.zizPackages || {};
  const uiPkg = packages.ui = packages.ui || {};
  let loadPromise = null;
  const scriptSpecs = [
    {
      key: "shared",
      src: "./js/ui.node.shared.js?v=20260411-1",
      isReady: () => typeof ((uiPkg.nodeShared || window.uiNodeShared || {}).normalizeSteps) === "function"
    },
    {
      key: "workflow-command-facade",
      src: "./js/workflow-command.facade.js",
      isReady: () => typeof ((uiPkg.workflowCommandFacade || window.zizWorkflowCommandFacade || {}).handleCommand) === "function"
    },
    {
      key: "workflow-display-projector",
      src: "./js/workflow-display.projector.js",
      isReady: () => typeof ((uiPkg.workflowDisplayProjector || {}).buildFlowModel) === "function"
    },
    {
      key: "workflow-designer-library",
      src: "./vendor/zizai-workflow-designer/src/workflow_designer.js",
      isReady: () => typeof ((packages.workflowDesigner || {}).createWorkflowDesigner) === "function"
    },
    {
      key: "workflow-designer-adapter",
      src: "./js/workflow-designer.adapter.js",
      isReady: () => typeof ((uiPkg.workflowDesignerAdapter || window.zizWorkflowDesignerAdapter || {}).renderFlowChart) === "function"
    },
    {
      key: "node-form-library",
      src: "./vendor/zizai-form/src/node-form.js",
      isReady: () => typeof ((window.NodeForm || {}).mount) === "function"
    },
    {
      key: "node-form-adapter",
      src: "./js/node-form.adapter.js?v=20260826-1",
      isReady: () => typeof ((uiPkg.nodeFormAdapter || window.uiNodeFormAdapter || {}).mountNodeForm) === "function"
    },
    {
      key: "data-viewer-library",
      src: "./vendor/zizai-data-viewer/src/report-viewer.js",
      isReady: () => typeof window.ReportViewer === "function"
    },
    {
      key: "data-viewer-adapter",
      src: "./js/data-viewer.adapter.js",
      isReady: () => typeof ((uiPkg.dataViewerAdapter || window.uiDataViewerAdapter || {}).mountDataViewer) === "function"
    },
    {
      key: "detail",
      src: "./js/ui.node.detail.js?v=20260419-5",
      isReady: () => typeof ((uiPkg.nodeDetail || window.uiNodeDetail || {}).renderNodeDetail) === "function"
    },
    {
      key: "runtime",
      src: "./js/ui.node.runtime.js?v=20260411-2",
      isReady: () => typeof ((uiPkg.node || window.uiNode || {}).renderFlowChart) === "function"
    }
  ];

  function loadScript(spec) {
    const selector = `script[data-ziz-ui-node-part="${spec.key}"]`;
    const existing = document.querySelector(selector);
    if (existing?.dataset.loaded === "true" || spec.isReady()) {
      if (existing) existing.dataset.loaded = "true";
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = existing || document.createElement("script");
      const handleReady = () => {
        if (!spec.isReady()) return;
        script.dataset.loaded = "true";
        resolve();
      };
      const handleLoad = () => {
        window.requestAnimationFrame(() => {
          if (spec.isReady()) {
            handleReady();
            return;
          }
          reject(new Error(`ui.node ${spec.key} loaded but API is not ready`));
        });
      };
      const handleError = () => reject(new Error(`ui.node ${spec.key} failed to load`));

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });

      if (!existing) {
        script.src = spec.src;
        script.async = false;
        script.dataset.zizUiNodePart = spec.key;
        document.head.appendChild(script);
      }
    });
  }

  function ensureLoaded() {
    if (uiPkg.node && typeof uiPkg.node.renderFlowChart === "function") {
      return Promise.resolve(uiPkg.node);
    }
    if (loadPromise) return loadPromise;

    loadPromise = scriptSpecs
      .reduce((promise, spec) => promise.then(() => loadScript(spec)), Promise.resolve())
      .then(() => uiPkg.node || {})
      .catch((error) => {
        loadPromise = null;
        throw error;
      });

    return loadPromise;
  }

  uiPkg.nodeLoader = { ensureLoaded };
})();
