(function (globalScope) {
  'use strict';
  const DEFAULT_PERMISSIONS = Object.freeze({ createFolder:true, createItem:true, editItem:true, deleteItem:true, deleteFolder:true });
  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function addError(errors,path,code,message){ errors.push({path,code,message}); }
  function isObject(value){ return value!==null && typeof value==='object' && !Array.isArray(value); }
  function validateOptionalString(errors,value,path){ if(value!=null&&typeof value!=='string') addError(errors,path,'invalid_type',path+' must be a string'); }
  function validateOptionalNumber(errors,value,path){ if(value!=null&&(typeof value!=='number'||!Number.isFinite(value))) addError(errors,path,'invalid_type',path+' must be a finite number'); }
  function validateCatalogData(data){
    const errors=[]; if(data==null)return {valid:true,errors};
    if(!isObject(data)){addError(errors,'','invalid_type','catalog data must be an object');return {valid:false,errors};}
    if(data.version!=null&&(typeof data.version!=='number'||!Number.isFinite(data.version)))addError(errors,'version','invalid_type','version must be a finite number');
    if(data.permissions!=null){if(!isObject(data.permissions))addError(errors,'permissions','invalid_type','permissions must be an object');else for(const key of Object.keys(DEFAULT_PERMISSIONS))if(data.permissions[key]!=null&&typeof data.permissions[key]!=='boolean')addError(errors,'permissions.'+key,'invalid_type','permissions.'+key+' must be a boolean');}
    const folders=data.folders==null?[]:data.folders,items=data.items==null?[]:data.items;
    if(!Array.isArray(folders))addError(errors,'folders','invalid_type','folders must be an array'); if(!Array.isArray(items))addError(errors,'items','invalid_type','items must be an array'); if(!Array.isArray(folders)||!Array.isArray(items))return {valid:false,errors};
    const folderIds=new Set();
    for(let index=0;index<folders.length;index+=1){const folder=folders[index],base='folders['+index+']';if(!isObject(folder)){addError(errors,base,'invalid_type',base+' must be an object');continue;}if(typeof folder.id!=='string'||folder.id.trim()==='')addError(errors,base+'.id','required',base+'.id is required');else if(folderIds.has(folder.id))addError(errors,base+'.id','duplicate_id','folder id already exists: '+folder.id);else folderIds.add(folder.id);validateOptionalString(errors,folder.label,base+'.label');validateOptionalString(errors,folder.icon,base+'.icon');validateOptionalNumber(errors,folder.order,base+'.order');}
    const itemIds=new Set();
    for(let index=0;index<items.length;index+=1){const item=items[index],base='items['+index+']';if(!isObject(item)){addError(errors,base,'invalid_type',base+' must be an object');continue;}if(typeof item.id!=='string'||item.id.trim()==='')addError(errors,base+'.id','required',base+'.id is required');else if(itemIds.has(item.id))addError(errors,base+'.id','duplicate_id','item id already exists: '+item.id);else itemIds.add(item.id);if(item.folderId!=null){if(typeof item.folderId!=='string'||item.folderId.trim()==='')addError(errors,base+'.folderId','invalid_type',base+'.folderId must be a non-empty string');else if(!folderIds.has(item.folderId))addError(errors,base+'.folderId','unknown_folder','item.folderId does not reference an existing folder');}validateOptionalString(errors,item.label,base+'.label');validateOptionalString(errors,item.description,base+'.description');validateOptionalString(errors,item.icon,base+'.icon');validateOptionalNumber(errors,item.order,base+'.order');if(!isObject(item.clipboard))addError(errors,base+'.clipboard','required',base+'.clipboard is required');else{validateOptionalString(errors,item.clipboard.type,base+'.clipboard.type');if(typeof item.clipboard.value!=='string')addError(errors,base+'.clipboard.value','invalid_type',base+'.clipboard.value must be a string');}}
    return {valid:errors.length===0,errors};
  }
  class CatalogValidationError extends TypeError{constructor(errors){const first=errors&&errors[0]?errors[0].message:'catalog data is invalid';super(first);this.name='CatalogValidationError';this.code='CATALOG_VALIDATION_ERROR';this.errors=Array.isArray(errors)?clone(errors):[];}}
  function assertValid(data){const result=validateCatalogData(data);if(!result.valid)throw new CatalogValidationError(result.errors);}
  function normalizePermissions(value){const source=value&&typeof value==='object'?value:{},result={};for(const key of Object.keys(DEFAULT_PERMISSIONS))result[key]=source[key]!==false;return result;}
  function normalize(data){const source=data&&typeof data==='object'?clone(data):{};return {version:Number.isFinite(source.version)?source.version:1,permissions:normalizePermissions(source.permissions),folders:Array.isArray(source.folders)?source.folders:[],items:Array.isArray(source.items)?source.items:[]};}
  class CatalogStore{
    constructor(data){assertValid(data);this._data=normalize(data);} static validate(data){return validateCatalogData(data);} getData(){return clone(this._data);} getPermissions(){return clone(this._data.permissions);} can(action){return this._data.permissions[action]!==false;}
    setData(data){assertValid(data);this._data=normalize(data);return this.getData();}
    addFolder(folder){const next=this.getData();next.folders.push(clone(folder));assertValid(next);this._data=normalize(next);return this.getData();}
    updateFolder(id,patch){const next=this.getData(),folder=next.folders.find(item=>item.id===id);if(!folder)throw new Error('folder not found: '+id);if(patch&&patch.id&&patch.id!==id)throw new Error('folder id cannot be changed');Object.assign(folder,clone(patch||{}),{id});assertValid(next);this._data=normalize(next);return this.getData();}
    removeFolder(id){const next=this.getData();next.folders=next.folders.filter(item=>item.id!==id);next.items=next.items.filter(item=>item.folderId!==id);assertValid(next);this._data=normalize(next);return this.getData();}
    addItem(item){const next=this.getData();next.items.push(clone(item));assertValid(next);this._data=normalize(next);return this.getData();}
    updateItem(id,patch){const next=this.getData(),index=next.items.findIndex(item=>item.id===id);if(index<0)throw new Error('item not found: '+id);if(patch&&patch.id&&patch.id!==id)throw new Error('item id cannot be changed');next.items[index]=Object.assign({},next.items[index],clone(patch||{}),{id});assertValid(next);this._data=normalize(next);return this.getData();}
    removeItem(id){const next=this.getData();next.items=next.items.filter(item=>item.id!==id);this._data=normalize(next);return this.getData();}
    clear(){this._data={version:this._data.version||1,permissions:clone(this._data.permissions),folders:[],items:[]};return this.getData();}
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={CatalogStore,CatalogValidationError,DEFAULT_PERMISSIONS,normalizePermissions,validateCatalogData};
  globalScope.CatalogStore=CatalogStore;globalScope.CatalogValidationError=CatalogValidationError;
})(typeof globalThis!=='undefined'?globalThis:window);
