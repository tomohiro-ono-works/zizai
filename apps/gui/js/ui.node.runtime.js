(function () {
  const packages = window.zizPackages || {};
  const uiPkg = packages.ui || {};
  const shared = uiPkg.nodeShared || window.uiNodeShared || {};
  const adapter = uiPkg.workflowDesignerAdapter || window.zizWorkflowDesignerAdapter || {};
  const detail = uiPkg.nodeDetail || window.uiNodeDetail || {};
  const uiNode = {
    normalizeSteps: shared.normalizeSteps,
    renderFlowChart: adapter.renderFlowChart,
    renderNodeDetail: detail.renderNodeDetail,
    destroyFlowCanvas: adapter.destroyFlowCanvas,
    refreshFlowStatus: adapter.refreshFlowStatus
  };
  window.uiNode = uiNode;
  const packagesOut = window.zizPackages = window.zizPackages || {};
  const uiOut = packagesOut.ui = packagesOut.ui || {};
  uiOut.node = uiNode;
})();
