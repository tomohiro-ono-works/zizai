(function () {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('embedded') === '1') return;
  const body = document.body;
  const page = String(body?.dataset.shellPage || '');
  if (page !== 'dataflow') return;

  const shellApi = window.zizShell || null;
  const appShell = shellApi?.appShell || null;
  if (!body || !appShell) return;
  if (body.classList.contains('workspace-enabled')) return;

  const mainContentHost = document.querySelector('.zui-shell__main-content');
  const main = mainContentHost?.querySelector('main');
  if (!main) return;
  const rightPanelContent = document.querySelector('.zui-shell__right-panel .right-sidebar-content');

  body.classList.add('workspace-enabled');

  const workspaceLayout = document.createElement('div');
  workspaceLayout.className = 'workspace-layout';

  const globalLeftArea = document.createElement('div');
  globalLeftArea.className = 'workspace-global-left-area';
  globalLeftArea.id = 'workspaceGlobalLeftArea';
  globalLeftArea.innerHTML = [
    '<div class="workspace-global-left-area__head" id="workspaceLeftAreaTitle">サイドエリア</div>',
    '<div class="workspace-global-left-area__body" id="workspaceLeftAreaBody">',
    '<div class="workspace-empty">左サイドバーから機能を選択してください。</div>',
    '</div>'
  ].join('');

  const panes = document.createElement('div');
  panes.className = 'workspace-panes';
  panes.id = 'workspacePanes';
  panes.innerHTML = [
    '<section class="workspace-pane is-active" data-pane="active">',
    '  <div class="workspace-pane-body" data-pane-body="active"></div>',
    '</section>'
  ].join('');

  workspaceLayout.appendChild(panes);

  const hiddenHost = document.createElement('div');
  hiddenHost.className = 'workspace-flow-hidden-host';
  hiddenHost.hidden = true;
  const dataflowView = document.createElement('div');
  dataflowView.className = 'workspace-dataflow-view';
  dataflowView.dataset.viewType = 'dataflow';
  dataflowView.dataset.tabId = 'tab-dataflow';
  dataflowView.appendChild(main);
  if (rightPanelContent) dataflowView.appendChild(rightPanelContent);
  hiddenHost.appendChild(dataflowView);
  workspaceLayout.appendChild(hiddenHost);

  appShell.setRegion('sidebar', globalLeftArea);
  appShell.setRegion('main', workspaceLayout);
  appShell.setRegion('rightPanel', null);

  window.zizWorkspaceShell = {
    appShell,
    workspaceLayout,
    globalLeftArea,
    leftAreaTitle: globalLeftArea.querySelector('#workspaceLeftAreaTitle'),
    leftAreaBody: globalLeftArea.querySelector('#workspaceLeftAreaBody'),
    panes,
    pane: panes.querySelector('[data-pane="active"]'),
    paneBody: panes.querySelector('[data-pane-body="active"]'),
    dataflowView,
  };
})();
