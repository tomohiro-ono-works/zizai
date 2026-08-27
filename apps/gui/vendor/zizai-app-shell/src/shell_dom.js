(function (root) {
  const packages = root.zizPackages = root.zizPackages || {};
  const modules = packages.__uiShellModules = packages.__uiShellModules || {};

  function element(documentRef, tagName, className, region) {
    const node = documentRef.createElement(tagName);
    node.className = className;
    if (region) node.dataset.shellRegion = region;
    return node;
  }

  function separator(documentRef, className, orientation) {
    const node = element(documentRef, "div", `zui-shell__resizer ${className}`);
    node.setAttribute("role", "separator");
    node.setAttribute("aria-orientation", orientation);
    return node;
  }

  function buildShell(documentRef) {
    const shell = element(documentRef, "div", "zui-shell");

    const topbar = element(documentRef, "header", "zui-shell__topbar", "topbar");
    const topbarContent = element(documentRef, "div", "zui-shell__region-content");
    const topbarCommands = element(documentRef, "div", "zui-shell__commands");
    topbar.append(topbarContent, topbarCommands);

    const activitybar = element(documentRef, "aside", "zui-shell__activitybar", "activitybar");
    const activityContent = element(documentRef, "div", "zui-shell__region-content");
    const activityItems = element(documentRef, "nav", "zui-shell__activities");
    activitybar.append(activityContent, activityItems);

    const sidebar = element(documentRef, "aside", "zui-shell__sidebar", "sidebar");
    const sidebarContent = element(documentRef, "div", "zui-shell__region-content");
    const sidebarResizer = separator(documentRef, "zui-shell__resizer--sidebar", "vertical");
    sidebar.append(sidebarContent, sidebarResizer);

    const main = element(documentRef, "section", "zui-shell__main");
    const tabbar = element(documentRef, "div", "zui-shell__tabbar");
    const tabs = element(documentRef, "div", "zui-shell__tabs");
    tabs.setAttribute("role", "tablist");
    const tabbarCommands = element(documentRef, "div", "zui-shell__commands");
    tabbar.append(tabs, tabbarCommands);

    const mainContent = element(documentRef, "div", "zui-shell__main-content", "main");
    main.append(tabbar, mainContent);

    const rightPanel = element(documentRef, "aside", "zui-shell__right-panel", "rightPanel");
    const rightPanelResizer = separator(documentRef, "zui-shell__resizer--right", "vertical");
    const panelCommands = element(documentRef, "div", "zui-shell__commands");
    const rightContent = element(documentRef, "div", "zui-shell__region-content");
    rightPanel.append(rightPanelResizer, panelCommands, rightContent);

    const bottomPanel = element(documentRef, "section", "zui-shell__bottom-panel", "bottomPanel");
    const bottomPanelResizer = separator(documentRef, "zui-shell__resizer--bottom", "horizontal");
    const bottomContent = element(documentRef, "div", "zui-shell__region-content");
    bottomPanel.append(bottomPanelResizer, bottomContent);

    const statusbar = element(documentRef, "footer", "zui-shell__statusbar", "statusbar");
    const statusContent = element(documentRef, "div", "zui-shell__region-content");
    const statusItems = element(documentRef, "div", "zui-shell__status-items");
    const statusCommands = element(documentRef, "div", "zui-shell__commands");
    statusbar.append(statusContent, statusItems, statusCommands);

    shell.append(topbar, activitybar, sidebar, main, rightPanel, bottomPanel, statusbar);

    return {
      root: shell,
      topbar,
      activitybar,
      sidebar,
      main,
      rightPanel,
      bottomPanel,
      statusbar,
      tabbar,
      tabs,
      activityItems,
      statusItems,
      sidebarResizer,
      rightPanelResizer,
      bottomPanelResizer,
      regionHosts: {
        topbar: topbarContent,
        activitybar: activityContent,
        sidebar: sidebarContent,
        main: mainContent,
        rightPanel: rightContent,
        bottomPanel: bottomContent,
        statusbar: statusContent
      },
      commandHosts: {
        topbar: topbarCommands,
        tabbar: tabbarCommands,
        panel: panelCommands,
        status: statusCommands
      }
    };
  }

  modules.shellDom = Object.freeze({ buildShell });
})(window);
