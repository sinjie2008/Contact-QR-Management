(function(){
"use strict";

var latest={profile:"",background:""};
var bound=new WeakSet();

function textFor(input){
  var parts=[input.id||"",input.name||"",input.getAttribute("aria-label")||""];
  var field=input.closest(".field, .form-field, .full, label, div");
  if(field)parts.push(field.textContent||"");
  var label=input.id?document.querySelector('label[for="'+CSS.escape(input.id)+'"]'):null;
  if(label)parts.push(label.textContent||"");
  return parts.join(" ").replace(/\s+/g," ").toLowerCase();
}
function kindOf(input){
  var t=textFor(input);
  if(/background|cover/.test(t)&&/image|photo|profile|background|cover/.test(t))return "background";
  if(/profile/.test(t)&&/image|photo|avatar/.test(t))return "profile";
  return "";
}
function readImage(file){
  return new Promise(function(resolve,reject){
    var reader=new FileReader();
    reader.onload=function(){resolve(String(reader.result||""))};
    reader.onerror=function(){reject(reader.error||new Error("Unable to read image."))};
    reader.readAsDataURL(file);
  });
}
function setPendingGlobals(kind,data){
  try{
    Object.getOwnPropertyNames(window).forEach(function(key){
      var low=key.toLowerCase();
      if(low.indexOf("pending")<0)return;
      var isProfile=kind==="profile"&&(/profile|avatar|photo/.test(low))&&!/background|cover/.test(low);
      var isBackground=kind==="background"&&/background|cover/.test(low);
      if((isProfile||isBackground)&&typeof window[key]==="string")window[key]=data;
    });
  }catch(e){}
}
function updatePreview(input,data){
  var field=input.closest(".field, .form-field, .full, div");
  if(!field)return;
  var preview=field.querySelector(".preview");
  var img=(preview&&preview.querySelector("img"))||field.querySelector("img");
  if(img)img.src=data;
  if(preview)preview.classList.remove("hidden");
}
function bindInput(input){
  if(bound.has(input))return;
  var kind=kindOf(input);
  if(!kind)return;
  bound.add(input);
  input.addEventListener("change",function(){
    var file=input.files&&input.files[0];
    if(!file)return;
    readImage(file).then(function(data){
      latest[kind]=data;
      setPendingGlobals(kind,data);
      updatePreview(input,data);
    }).catch(function(){});
  });
}
function bindInputs(){
  Array.prototype.forEach.call(document.querySelectorAll('input[type="file"][accept*="image"],input[type="file"]'),bindInput);
}
function applyImage(record,kind,data){
  if(!record||!data)return false;
  var changed=false;
  var props=kind==="profile"
    ?["profileImageData","profilePhotoData","avatarData"]
    :["profileBackgroundData","backgroundImageData","coverImageData","backgroundData"];
  var fallback=kind==="profile"?"profileImageData":"profileBackgroundData";
  var found=false;
  props.forEach(function(prop){
    if(Object.prototype.hasOwnProperty.call(record,prop)){
      record[prop]=data;found=true;changed=true;
    }
  });
  if(!found){record[fallback]=data;changed=true}
  return changed;
}
function matchingRecord(arr,id,form){
  if(!Array.isArray(arr))return null;
  if(id){
    for(var i=0;i<arr.length;i++)if(arr[i]&&String(arr[i].id||"")===String(id))return arr[i];
  }
  var first=form&&form.querySelector("#firstName,[name=firstName]");
  var last=form&&form.querySelector("#lastName,[name=lastName]");
  var mobile=form&&form.querySelector("#mobile,[name=mobile]");
  var fn=first?first.value.trim():"",ln=last?last.value.trim():"",mob=mobile?mobile.value.trim():"";
  for(var j=arr.length-1;j>=0;j--){
    var r=arr[j]||{};
    if(fn&&ln&&String(r.firstName||"")===fn&&String(r.lastName||"")===ln&&(!mob||String(r.mobile||"")===mob))return r;
  }
  return null;
}
function patchLocalStorage(id,form){
  var did=false;
  for(var i=0;i<localStorage.length;i++){
    var key=localStorage.key(i);
    var raw=localStorage.getItem(key);
    if(!raw||raw.charAt(0)!=="["&&raw.charAt(0)!=="{")continue;
    try{
      var value=JSON.parse(raw),arr=Array.isArray(value)?value:(value&&Array.isArray(value.contacts)?value.contacts:null);
      if(!arr)continue;
      var record=matchingRecord(arr,id,form);
      if(!record)continue;
      var changed=false;
      if(latest.profile)changed=applyImage(record,"profile",latest.profile)||changed;
      if(latest.background)changed=applyImage(record,"background",latest.background)||changed;
      if(changed){localStorage.setItem(key,JSON.stringify(value));did=true}
    }catch(e){}
  }
  return did;
}
function patchRuntime(id,form){
  var did=false;
  try{
    if(Array.isArray(window.contacts)){
      var record=matchingRecord(window.contacts,id,form);
      if(record){
        if(latest.profile)did=applyImage(record,"profile",latest.profile)||did;
        if(latest.background)did=applyImage(record,"background",latest.background)||did;
      }
    }
  }catch(e){}
  return did;
}
function afterSave(id,form){
  if(!latest.profile&&!latest.background)return;
  patchRuntime(id,form);
  patchLocalStorage(id,form);
  try{
    if(typeof window.save==="function")window.save();
  }catch(e){}
  try{
    if(typeof window.render==="function")window.render();
  }catch(e){}
  latest.profile="";
  latest.background="";
}
function bindForm(){
  var form=document.getElementById("form");
  if(!form||form.dataset.imageRefreshFix==="1")return;
  form.dataset.imageRefreshFix="1";
  form.addEventListener("submit",function(){
    var idInput=form.querySelector("#id,[name=id]");
    var id=idInput?String(idInput.value||""):"";
    setTimeout(function(){afterSave(id,form)},0);
  },true);
}
function resetPendingOnOpen(event){
  var button=event.target.closest&&event.target.closest('[data-a="edit"],#addBtn,[data-a="add"]');
  if(!button)return;
  latest.profile="";
  latest.background="";
}
function boot(){
  bindInputs();
  bindForm();
}
document.addEventListener("click",resetPendingOnOpen,true);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
new MutationObserver(boot).observe(document.documentElement,{childList:true,subtree:true});
})();