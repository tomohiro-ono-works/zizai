(function (globalScope) {
  'use strict';

  const TAG_PATTERN = /(^|\s)(#[^\s#]+)/gu;

  function extractTags(text) {
    const tags = [];
    const seen = new Set();
    const source = String(text || '');
    let match;
    TAG_PATTERN.lastIndex = 0;
    while ((match = TAG_PATTERN.exec(source))) {
      const tag = match[2];
      const key = tag.toLocaleLowerCase('ja');
      if (!seen.has(key)) {
        seen.add(key);
        tags.push(tag);
      }
    }
    return tags;
  }

  function splitDescription(text) {
    const source = String(text || '');
    const tags = extractTags(source);
    let description = source;
    for (const tag of tags) {
      description = description.replace(new RegExp('(^|\\s)' + escapeRegExp(tag) + '(?=\\s|$)', 'gu'), '$1');
    }
    return { text: description.replace(/\s+/gu, ' ').trim(), tags };
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function parseSearch(query) {
    const tokens = String(query || '').trim().split(/\s+/u).filter(Boolean);
    const tags = [];
    const words = [];
    for (const token of tokens) {
      if (token.startsWith('#') && token.length > 1) tags.push(token.toLocaleLowerCase('ja'));
      else words.push(token.toLocaleLowerCase('ja'));
    }
    return { tags, words };
  }

  class CatalogPanel {
    constructor(target, options) {
      this.root = typeof target === 'string' ? document.querySelector(target) : target;
      if (!this.root) throw new Error('CatalogPanel target was not found');
      this.options = Object.assign({ title: 'カタログ', resolveIcon: null, defaultItemIcon: null, onActivateItem: null }, options || {});
      this.store = new globalScope.CatalogStore(this.options.data || {});
      this._openFolders = new Set(this.store.getData().folders.map(folder => folder.id));
      this._query = '';
      this._destroyed = false;
      this._contextMenu = null;
      this._overlay = null;
      this._tagDropdown = null;
      this._toastTimer = null;
      this._onRootClick = this._handleRootClick.bind(this);
      this._onRootContextMenu = this._handleRootContextMenu.bind(this);
      this._onRootInput = this._handleRootInput.bind(this);
      this._onDocumentPointerDown = this._handleDocumentPointerDown.bind(this);
      this._onDocumentKeyDown = this._handleDocumentKeyDown.bind(this);
      this.root.addEventListener('click', this._onRootClick);
      this.root.addEventListener('contextmenu', this._onRootContextMenu);
      this.root.addEventListener('input', this._onRootInput);
      document.addEventListener('pointerdown', this._onDocumentPointerDown);
      document.addEventListener('keydown', this._onDocumentKeyDown);
      this.render();
    }

    getData() { return this.store.getData(); }
    validateData(data) { return globalScope.CatalogStore.validate(data); }
    setData(data) {
      try { this.store.setData(data); } catch (error) { this._emitError(error); throw error; }
      this._openFolders = new Set(this.store.getData().folders.map(folder => folder.id));
      this.render();
      return this.getData();
    }
    clearData() { this.store.clear(); this.render(); return this.getData(); }
    openCreateFolder() { if (!this._requirePermission('createFolder')) return false; this._openFolderForm(); return true; }
    openCreateItem(folderId) { if (!this._requirePermission('createItem')) return false; this._openItemForm(null, folderId || ''); return true; }

    destroy() {
      if (this._destroyed) return;
      this._destroyed = true;
      this._closeContextMenu(); this._closeTagDropdown(); this._closeOverlay(); this._clearToastTimer();
      this.root.removeEventListener('click', this._onRootClick);
      this.root.removeEventListener('contextmenu', this._onRootContextMenu);
      this.root.removeEventListener('input', this._onRootInput);
      document.removeEventListener('pointerdown', this._onDocumentPointerDown);
      document.removeEventListener('keydown', this._onDocumentKeyDown);
      this.store.clear(); this.root.replaceChildren();
    }

    render() {
      const data = this.store.getData();
      const filtered = this._filterItems(data.items);
      this.root.innerHTML = `<section class="cp-root" aria-label="${this._escape(this.options.title)}"><header class="cp-header"><h2 class="cp-title">${this._escape(this.options.title)}</h2><div class="cp-search-wrap"><input class="cp-search" type="search" value="${this._escape(this._query)}" placeholder="名前・説明・タグを検索" autocomplete="off" aria-label="カタログを検索"></div></header><div class="cp-tree" data-role="empty-area"></div><div class="cp-toast" role="status" aria-live="polite"></div></section>`;
      const tree = this.root.querySelector('.cp-tree');
      const folders = [...data.folders].sort((a,b)=>(a.order||0)-(b.order||0));
      for (const folder of folders) {
        const folderItems = filtered.filter(item=>item.folderId===folder.id).sort((a,b)=>(a.order||0)-(b.order||0));
        if (this._query && folderItems.length===0) continue;
        tree.appendChild(this._renderFolder(folder, folderItems));
      }
      const looseItems = filtered.filter(item=>!item.folderId).sort((a,b)=>(a.order||0)-(b.order||0));
      for (const item of looseItems) tree.appendChild(this._renderItem(item));
      if (!tree.children.length) { const empty=document.createElement('div'); empty.className='cp-empty'; empty.textContent=this._query?'一致する項目がありません':'カタログは空です'; tree.appendChild(empty); }
    }

    _renderFolder(folder, items) {
      const section=document.createElement('section'); section.className='cp-folder'; section.dataset.folderId=folder.id;
      const expanded=this._openFolders.has(folder.id);
      const header=document.createElement('button'); header.type='button'; header.className='cp-folder-row'; header.dataset.action='toggle-folder'; header.dataset.folderId=folder.id; header.setAttribute('aria-expanded',String(expanded));
      header.innerHTML=`<span class="cp-chevron" aria-hidden="true">${expanded?'▾':'▸'}</span><span class="cp-folder-icon" aria-hidden="true">📁</span><span class="cp-folder-label">${this._escape(folder.label||folder.id)}</span><span class="cp-count">${items.length}</span>`;
      section.appendChild(header);
      const body=document.createElement('div'); body.className='cp-folder-body'; body.hidden=!expanded;
      for (const item of items) body.appendChild(this._renderItem(item));
      if (!items.length) { const empty=document.createElement('div'); empty.className='cp-folder-empty'; empty.textContent='項目はありません'; body.appendChild(empty); }
      section.appendChild(body); return section;
    }

    _renderItem(item) {
      const row=document.createElement('button'); row.type='button'; row.className='cp-item'; row.dataset.action='copy-item'; row.dataset.itemId=item.id;
      const iconUrl=typeof this.options.resolveIcon==='function'?this.options.resolveIcon(item.icon,item):'';
      const parsed=splitDescription(item.description||'');
      const icon=document.createElement('span'); icon.className='cp-item-icon'; icon.setAttribute('aria-hidden','true');
      if (iconUrl) { const image=document.createElement('img'); image.src=iconUrl; image.alt=''; icon.appendChild(image); } else icon.textContent='◻';
      const content=document.createElement('span'); content.className='cp-item-content';
      const label=document.createElement('span'); label.className='cp-item-label'; label.textContent=item.label||item.id; content.appendChild(label);
      if (parsed.text) { const description=document.createElement('span'); description.className='cp-item-description'; description.textContent=parsed.text; content.appendChild(description); }
      if (parsed.tags.length) { const tags=document.createElement('span'); tags.className='cp-tags'; for (const tag of parsed.tags) { const tagNode=document.createElement('span'); tagNode.className='cp-tag'; tagNode.textContent=tag; tags.appendChild(tagNode); } content.appendChild(tags); }
      row.append(icon,content); return row;
    }

    _handleRootClick(event) {
      const actionNode=event.target.closest('[data-action]'); if (!actionNode||!this.root.contains(actionNode)) return;
      const action=actionNode.dataset.action;
      if (action==='toggle-folder') { const id=actionNode.dataset.folderId; this._openFolders.has(id)?this._openFolders.delete(id):this._openFolders.add(id); this.render(); }
      else if (action==='copy-item') this._copyItem(actionNode.dataset.itemId);
      else if (action==='context-command') this._runContextCommand(actionNode.dataset.command,actionNode.dataset.id);
      else if (action==='close-overlay') this._closeOverlay();
      else if (action==='save-folder') this._saveFolder(actionNode.closest('form'));
      else if (action==='save-item') this._saveItem(actionNode.closest('form'));
      else if (action==='tag-option') this._selectTag(actionNode.dataset.tag);
    }

    _handleRootContextMenu(event) {
      const itemNode=event.target.closest('.cp-item'); const folderNode=event.target.closest('.cp-folder-row'); const tree=event.target.closest('.cp-tree'); if (!tree) return;
      event.preventDefault();
      if (itemNode) this._openContextMenu(event.clientX,event.clientY,'item',itemNode.dataset.itemId);
      else if (folderNode) this._openContextMenu(event.clientX,event.clientY,'folder',folderNode.dataset.folderId);
      else this._openContextMenu(event.clientX,event.clientY,'empty','');
    }

    _handleRootInput(event) {
      if (!event.target.classList.contains('cp-search')) return;
      this._query=event.target.value; this.render(); const input=this.root.querySelector('.cp-search');
      if (input) { input.focus(); input.setSelectionRange(input.value.length,input.value.length); this._openTagDropdown(input); }
    }

    _handleDocumentPointerDown(event) {
      if (this._contextMenu&&!this._contextMenu.contains(event.target)) this._closeContextMenu();
      const searchWrap=this.root.querySelector('.cp-search-wrap');
      if (this._tagDropdown&&searchWrap&&!searchWrap.contains(event.target)) this._closeTagDropdown();
      if (event.target.classList&&event.target.classList.contains('cp-search')) this._openTagDropdown(event.target);
    }
    _handleDocumentKeyDown(event) { if (event.key!=='Escape') return; this._closeContextMenu(); this._closeTagDropdown(); this._closeOverlay(); }

    _openContextMenu(x,y,type,id) {
      this._closeContextMenu(); const permissions=this.store.getPermissions(); const commands=[];
      if (type==='folder') { if (permissions.createItem) commands.push(['create-item','項目を作成']); if (permissions.createFolder) commands.push(['create-folder','フォルダを作成']); if (permissions.deleteFolder) commands.push(['delete-folder','フォルダを削除',true]); }
      else if (type==='item') { commands.push(['copy-item','コピー']); if (permissions.editItem) commands.push(['edit-item','編集']); if (permissions.deleteItem) commands.push(['delete-item','削除',true]); }
      else if (permissions.createFolder) commands.push(['create-folder','フォルダを作成']);
      if (!commands.length) return;
      const menu=document.createElement('div'); menu.className='cp-context-menu'; menu.setAttribute('role','menu');
      for (const command of commands) { const button=document.createElement('button'); button.type='button'; button.className='cp-context-command'+(command[2]?' cp-danger':''); button.dataset.action='context-command'; button.dataset.command=command[0]; button.dataset.id=id; button.textContent=command[1]; menu.appendChild(button); }
      menu.addEventListener('click',event=>{ const commandNode=event.target.closest('[data-command]'); if (commandNode) this._runContextCommand(commandNode.dataset.command,commandNode.dataset.id); });
      document.body.appendChild(menu); const left=Math.min(x,window.innerWidth-menu.offsetWidth-8); const top=Math.min(y,window.innerHeight-menu.offsetHeight-8); menu.style.left=Math.max(8,left)+'px'; menu.style.top=Math.max(8,top)+'px'; this._contextMenu=menu;
    }

    _runContextCommand(command,id) {
      this._closeContextMenu(); const data=this.store.getData();
      if (command==='create-folder') this.openCreateFolder(); else if (command==='create-item') this.openCreateItem(id); else if (command==='copy-item') this._copyItem(id);
      else if (command==='edit-item'&&this._requirePermission('editItem')) this._openItemForm(data.items.find(item=>item.id===id));
      else if (command==='delete-item'&&this._requirePermission('deleteItem')) { const item=data.items.find(entry=>entry.id===id); if (item&&globalScope.confirm('「'+(item.label||item.id)+'」を削除しますか？')) { this.store.removeItem(id); this._changed('delete-item','item',id); this.render(); } }
      else if (command==='delete-folder'&&this._requirePermission('deleteFolder')) { const folder=data.folders.find(entry=>entry.id===id); if (folder&&globalScope.confirm('「'+(folder.label||folder.id)+'」を削除しますか？\n配下の項目も削除されます。')) { this.store.removeFolder(id); this._changed('delete-folder','folder',id); this.render(); } }
    }

    _openFolderForm() { this._showOverlay(`<form class="cp-form" novalidate><h3>フォルダを作成</h3><label>フォルダ名<input name="label" required maxlength="100" autofocus></label><footer><button type="button" data-action="close-overlay">キャンセル</button><button type="button" class="cp-primary" data-action="save-folder">作成</button></footer></form>`); }

    _openItemForm(item,preferredFolderId) {
      const data=this.store.getData(); const selectedFolder=item?item.folderId:preferredFolderId;
      const options=data.folders.map(folder=>`<option value="${this._escape(folder.id)}" ${selectedFolder===folder.id?'selected':''}>${this._escape(folder.label||folder.id)}</option>`).join('');
      this._showOverlay(`<form class="cp-form" novalidate><h3>${item?'項目を編集':'項目を作成'}</h3><input type="hidden" name="editingId" value="${this._escape(item?item.id:'')}"><label>名前<input name="label" required maxlength="100" value="${this._escape(item?item.label||'':'')}"></label><label>説明<textarea name="description" rows="3" placeholder="説明文と #タグ を入力">${this._escape(item?item.description||'':'')}</textarea></label><label>フォルダ<select name="folderId" required><option value="">選択してください</option>${options}</select></label><label>登録内容<textarea name="clipboardValue" rows="8" required placeholder="コピーした内容を貼り付けてください">${this._escape(item?item.clipboard.value:'')}</textarea></label><footer><button type="button" data-action="close-overlay">キャンセル</button><button type="button" class="cp-primary" data-action="save-item">${item?'保存':'作成'}</button></footer></form>`);
    }

    _saveFolder(form) {
      if (!this._requirePermission('createFolder')) return; const label=form.elements.label.value.trim(); if (!label) return this._formError(form,'フォルダ名を入力してください');
      const folder={id:this._generateId('folder'),label,order:this.store.getData().folders.length+1};
      try { this.store.addFolder(folder); this._openFolders.add(folder.id); this._changed('create-folder','folder',folder.id); this._closeOverlay(); this.render(); } catch(error){ this._emitError(error); }
    }

    _saveItem(form) {
      const editingId=form.elements.editingId.value; if (!this._requirePermission(editingId?'editItem':'createItem')) return;
      const label=form.elements.label.value.trim(); const folderId=form.elements.folderId.value; const clipboardValue=form.elements.clipboardValue.value;
      if (!label||!folderId||!clipboardValue) return this._formError(form,'名前、フォルダ、登録内容を入力してください');
      const current=editingId?this.store.getData().items.find(item=>item.id===editingId):null;
      const item={id:editingId||this._generateId('item'),folderId,label,description:form.elements.description.value.trim(),clipboard:{type:current&&current.clipboard?current.clipboard.type:'text/plain',value:clipboardValue},order:current?current.order:this.store.getData().items.filter(entry=>entry.folderId===folderId).length+1};
      if (current&&current.icon!=null) item.icon=current.icon; else { const defaultIcon=this._getDefaultItemIcon(); if (defaultIcon!=null) item.icon=defaultIcon; }
      try { editingId?this.store.updateItem(editingId,item):this.store.addItem(item); this._openFolders.add(folderId); this._changed(editingId?'edit-item':'create-item','item',item.id); this._closeOverlay(); this.render(); } catch(error){ this._emitError(error); }
    }

    _getDefaultItemIcon(){ const icon=this.options?this.options.defaultItemIcon:null; return typeof icon==='string'&&icon.trim()?icon.trim():null; }
    _getActivationHook(){ const hook=this.options?this.options.onActivateItem:null; return typeof hook==='function'?hook:null; }
    _normalizeActivation(result){ const handled=result===true||Boolean(result&&typeof result==='object'&&result.handled===true); const message=handled&&result&&typeof result==='object'&&typeof result.message==='string'?result.message.trim():''; return {handled,message}; }
    async _copyItem(id){
      const item=this.store.getData().items.find(entry=>entry.id===id); if(!item)return;
      const text=item.clipboard.value; const hook=this._getActivationHook();
      if(hook){
        let activation;
        try{ activation=this._normalizeActivation(await hook(item,{text})); }catch(error){ this._emitError(error); return; }
        if(activation.handled){ this._showToast(activation.message||'「'+(item.label||item.id)+'」を処理しました'); this.root.dispatchEvent(new CustomEvent('catalog:activate',{detail:{item,text,message:activation.message},bubbles:true})); return; }
      }
      try{ await navigator.clipboard.writeText(text); this._showToast('「'+(item.label||item.id)+'」をコピーしました'); this.root.dispatchEvent(new CustomEvent('catalog:copy',{detail:{item,text},bubbles:true})); }catch(error){this._emitError(error);}
    }
    _filterItems(items){ const parsed=parseSearch(this._query); if(!parsed.tags.length&&!parsed.words.length)return items; return items.filter(item=>{const text=((item.label||'')+' '+(item.description||'')).toLocaleLowerCase('ja'); const tags=extractTags(item.description||'').map(tag=>tag.toLocaleLowerCase('ja')); return parsed.words.every(word=>text.includes(word))&&parsed.tags.every(tag=>tags.includes(tag));}); }
    _collectTagCounts(){ const counts=new Map(); for(const item of this.store.getData().items){for(const tag of extractTags(item.description||'')){const key=tag.toLocaleLowerCase('ja');const current=counts.get(key)||{tag,count:0};current.count+=1;counts.set(key,current);}} return [...counts.values()].sort((a,b)=>b.count-a.count||a.tag.localeCompare(b.tag,'ja')); }
    _openTagDropdown(input){ this._closeTagDropdown(); const tags=this._collectTagCounts(); if(!tags.length)return; const fragment=this._currentTagFragment(input.value); const matches=tags.filter(entry=>!fragment||entry.tag.toLocaleLowerCase('ja').includes(fragment.toLocaleLowerCase('ja'))); if(!matches.length)return; const dropdown=document.createElement('div'); dropdown.className='cp-tag-dropdown'; dropdown.setAttribute('role','listbox'); for(const entry of matches){const button=document.createElement('button');button.type='button';button.dataset.action='tag-option';button.dataset.tag=entry.tag;button.className='cp-tag-option';button.innerHTML=`<span>${this._escape(entry.tag)}</span><span class="cp-tag-count">${entry.count}件</span>`;dropdown.appendChild(button);} input.parentElement.appendChild(dropdown);this._tagDropdown=dropdown; }
    _currentTagFragment(value){const match=String(value||'').match(/(?:^|\s)(#[^\s]*)$/u);return match?match[1]:'';}
    _selectTag(tag){const input=this.root.querySelector('.cp-search');if(!input)return;const fragment=this._currentTagFragment(input.value);if(fragment)input.value=input.value.slice(0,input.value.length-fragment.length)+tag+' ';else input.value=(input.value.trim()?input.value.trim()+' ':'')+tag+' ';this._query=input.value;this._closeTagDropdown();this.render();const nextInput=this.root.querySelector('.cp-search');if(nextInput){nextInput.focus();nextInput.setSelectionRange(nextInput.value.length,nextInput.value.length);}}
    _showOverlay(html){this._closeOverlay();const overlay=document.createElement('div');overlay.className='cp-overlay';overlay.innerHTML=html;this.root.querySelector('.cp-root').appendChild(overlay);this._overlay=overlay;const first=overlay.querySelector('input:not([type="hidden"]), textarea, select');if(first)first.focus();}
    _closeOverlay(){if(this._overlay)this._overlay.remove();this._overlay=null;}
    _closeContextMenu(){if(this._contextMenu)this._contextMenu.remove();this._contextMenu=null;}
    _closeTagDropdown(){if(this._tagDropdown)this._tagDropdown.remove();this._tagDropdown=null;}
    _clearToastTimer(){if(this._toastTimer)clearTimeout(this._toastTimer);this._toastTimer=null;}
    _showToast(message){const toast=this.root.querySelector('.cp-toast');if(!toast)return;toast.textContent=message;toast.classList.add('cp-toast-visible');this._clearToastTimer();this._toastTimer=setTimeout(()=>toast.classList.remove('cp-toast-visible'),1800);}
    _formError(form,message){let error=form.querySelector('.cp-form-error');if(!error){error=document.createElement('p');error.className='cp-form-error';form.insertBefore(error,form.querySelector('footer'));}error.textContent=message;}
    _requirePermission(action){if(this.store.can(action))return true;this._emitError(new Error('operation is not permitted: '+action));return false;}
    _changed(action,entityType,entityId){this.root.dispatchEvent(new CustomEvent('catalog:change',{detail:{action,entityType:entityType||null,entityId:entityId||null,data:this.getData()},bubbles:true}));}
    _emitError(error){this.root.dispatchEvent(new CustomEvent('catalog:error',{detail:{error,code:error&&error.code?error.code:'CATALOG_ERROR',validationErrors:error&&Array.isArray(error.errors)?error.errors:[]},bubbles:true}));}
    _generateId(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);}
    _escape(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  }

  CatalogPanel.extractTags=extractTags;
  CatalogPanel.parseSearch=parseSearch;
  CatalogPanel.validateData=function(data){return globalScope.CatalogStore.validate(data);};
  if(typeof module!=='undefined'&&module.exports)module.exports={CatalogPanel,extractTags,parseSearch,splitDescription};
  globalScope.CatalogPanel=CatalogPanel;
})(typeof globalThis!=='undefined'?globalThis:window);
