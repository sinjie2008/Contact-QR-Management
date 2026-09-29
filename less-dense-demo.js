(function(){
"use strict";

var STORE_KEY="contactQrLessDenseRemoteV2";
var IMAGE_KEY="contactQrLessDenseImagesV2";
var syncing=false;
var queued=false;
var pendingImages={profile:"",background:""};

function loadJson(key,fallback){
  try{var v=JSON.parse(localStorage.getItem(key)||"null");return v&&typeof v==="object"?v:fallback}catch(e){return fallback}
}
function saveJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
function b64urlText(text){
  var bytes=new TextEncoder().encode(String(text||"")),bin="",chunk=0x6000;
  for(var i=0;i<bytes.length;i+=chunk){
    var part=bytes.subarray(i,Math.min(bytes.length,i+chunk));
    for(var j=0;j<part.length;j++)bin+=String.fromCharCode(part[j]);
  }
  return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function decodeBase64Url(s){
  s=String(s||"").replace(/-/g,"+").replace(/_/g,"/");
  while(s.length%4)s+="=";
  var bin=atob(s),bytes=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function shortUrl(remoteUri){
  var u=new URL("p.html",window.location.href);
  u.search="";
  u.hash="r="+b64urlText(remoteUri);
  return u.href;
}
function qrImage(url){
  return "https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data="+encodeURIComponent(url);
}
function textFor(input){
  var parts=[input.id||"",input.name||"",input.getAttribute("aria-label")||""];
  var wrap=input.closest(".field,.form-field,.full,label,div");
  if(wrap)parts.push(wrap.textContent||"");
  var label=input.id?document.querySelector('label[for="'+CSS.escape(input.id)+'"]'):null;
  if(label)parts.push(label.textContent||"");
  return parts.join(" ").replace(/\s+/g," ").toLowerCase();
}
function imageKind(input){
  var t=textFor(input);
  if(/background|cover/.test(t))return "background";
  if(/profile|avatar|photo/.test(t))return "profile";
  return "";
}
function readFile(file){
  return new Promise(function(resolve,reject){
    var reader=new FileReader();
    reader.onload=function(){resolve(String(reader.result||""))};
    reader.onerror=function(){reject(reader.error||new Error("Unable to read image"))};
    reader.readAsDataURL(file);
  });
}
function loadImage(src){
  return new Promise(function(resolve,reject){
    var img=new Image();
    img.onload=function(){resolve(img)};
    img.onerror=function(){reject(new Error("Unable to load image"))};
    img.src=src;
  });
}
async function compressImage(src,kind){
  if(!/^data:image\//i.test(src))return src;
  try{
    var img=await loadImage(src);
    var maxW=kind==="profile"?360:1000,maxH=kind==="profile"?360:360,target=kind==="profile"?16000:28000;
    var scale=Math.min(1,maxW/img.naturalWidth,maxH/img.naturalHeight);
    var w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
    var canvas=document.createElement("canvas"),ctx=canvas.getContext("2d"),quality=.8,out=src;
    for(var pass=0;pass<14;pass++){
      canvas.width=w;canvas.height=h;
      ctx.clearRect(0,0,w,h);
      ctx.drawImage(img,0,0,w,h);
      out=canvas.toDataURL("image/webp",quality);
      if(!/^data:image\/webp/i.test(out))out=canvas.toDataURL("image/jpeg",quality);
      if(out.length<=target)return out;
      if(quality>.4)quality-=.1;
      else{w=Math.max(48,Math.round(w*.84));h=Math.max(32,Math.round(h*.84))}
    }
    return out;
  }catch(e){return src}
}
function currentEditId(){
  var form=document.getElementById("form"),id=form&&form.querySelector("#id,[name=id]");
  return id?String(id.value||""):"";
}
function bindImageInputs(){
  Array.prototype.forEach.call(document.querySelectorAll('input[type="file"]'),function(input){
    if(input.dataset.lessDenseImageBound==="1")return;
    var kind=imageKind(input);if(!kind)return;
    input.dataset.lessDenseImageBound="1";
    input.addEventListener("change",async function(){
      var file=input.files&&input.files[0];if(!file)return;
      try{
        var data=await compressImage(await readFile(file),kind);
        pendingImages[kind]=data;
        var id=currentEditId();
        if(id){
          var all=loadJson(IMAGE_KEY,{});
          all[id]=all[id]||{};
          all[id][kind]=data;
          saveJson(IMAGE_KEY,all);
        }
      }catch(e){}
    });
  });
}
function bindForm(){
  var form=document.getElementById("form");
  if(!form||form.dataset.lessDenseSyncBound==="1")return;
  form.dataset.lessDenseSyncBound="1";
  form.addEventListener("submit",function(){
    var id=currentEditId();
    if(id&&(pendingImages.profile||pendingImages.background)){
      var all=loadJson(IMAGE_KEY,{});
      all[id]=all[id]||{};
      if(pendingImages.profile)all[id].profile=pendingImages.profile;
      if(pendingImages.background)all[id].background=pendingImages.background;
      saveJson(IMAGE_KEY,all);
    }
    setTimeout(function(){pendingImages={profile:"",background:""};queueSync(true)},120);
  },true);
}
function ensurePopupStyles(){
  if(document.getElementById("lessDenseQrPopupStyle"))return;
  var style=document.createElement("style");
  style.id="lessDenseQrPopupStyle";
  style.textContent=[
    ".less-dense-qr-dialog{box-sizing:border-box;width:min(92vw,440px);max-width:440px;max-height:calc(100vh - 32px);overflow:auto;border:0;border-radius:16px;padding:24px;color:#172033;background:#fff;box-shadow:0 24px 70px rgba(16,24,40,.28);font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif}",
    ".less-dense-qr-dialog::backdrop{background:rgba(16,24,40,.64)}",
    ".less-dense-qr-dialog[open]{position:fixed;inset:50% auto auto 50%;transform:translate(-50%,-50%);z-index:10000;margin:0}",
    ".less-dense-qr-dialog .ldqr-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 16px}",
    ".less-dense-qr-dialog h2{margin:0;color:#172033;font-size:18px;line-height:1.3}",
    ".less-dense-qr-dialog .ldqr-close{min-height:36px;border:1px solid #d0d5dd;border-radius:9px;padding:0 12px;background:#fff;color:#344054;font:600 13px Inter,system-ui,sans-serif;cursor:pointer}",
    ".less-dense-qr-dialog .ldqr-image{display:block;width:320px;max-width:72vw;height:auto;margin:0 auto 14px;border:1px solid #eaecf0;border-radius:12px;padding:10px;background:#fff}",
    ".less-dense-qr-dialog .ldqr-note{margin:0 0 18px;color:#667085;text-align:center;font-size:13px}",
    ".less-dense-qr-dialog .ldqr-actions{display:flex;justify-content:center;gap:10px}",
    ".less-dense-qr-dialog .ldqr-open{min-height:40px;border:1px solid #2563eb;border-radius:9px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;background:#2563eb;color:#fff;font:600 14px Inter,system-ui,sans-serif;text-decoration:none}",
    ".less-dense-qr-dialog .ldqr-dismiss{min-height:40px;border:1px solid #d0d5dd;border-radius:9px;padding:0 16px;background:#fff;color:#344054;font:600 14px Inter,system-ui,sans-serif;cursor:pointer}",
    "@media(max-width:480px){.less-dense-qr-dialog{padding:18px}.less-dense-qr-dialog .ldqr-image{width:260px}}"
  ].join("");
  document.head.appendChild(style);
}
function openQrPopup(imageUrl,profileUrl,noteText,trigger){
  ensurePopupStyles();
  var dialog=document.createElement("dialog");dialog.className="less-dense-qr-dialog";dialog.setAttribute("aria-labelledby","lessDenseQrPopupTitle");
  var head=document.createElement("div");head.className="ldqr-head";
  var title=document.createElement("h2");title.id="lessDenseQrPopupTitle";title.textContent="Less Dense QR";
  var close=document.createElement("button");close.type="button";close.className="ldqr-close";close.textContent="Close";
  var image=document.createElement("img");image.className="ldqr-image";image.src=imageUrl;image.alt="Enlarged Less Dense QR";
  var note=document.createElement("p");note.className="ldqr-note";note.textContent=noteText||"Live profile · Scan with another phone";
  var actions=document.createElement("div");actions.className="ldqr-actions";
  var open=document.createElement("a");open.className="ldqr-open";open.href=profileUrl;open.target="_blank";open.rel="noopener noreferrer";open.textContent="Open Profile";
  var dismiss=document.createElement("button");dismiss.type="button";dismiss.className="ldqr-dismiss";dismiss.textContent="Close";
  head.appendChild(title);head.appendChild(close);actions.appendChild(open);actions.appendChild(dismiss);
  dialog.appendChild(head);dialog.appendChild(image);dialog.appendChild(note);dialog.appendChild(actions);
  function done(){if(typeof dialog.close==="function"&&dialog.open)dialog.close();else{dialog.remove();if(trigger&&trigger.focus)trigger.focus()}}
  dialog.addEventListener("close",function(){dialog.remove();if(trigger&&trigger.focus)trigger.focus()},{once:true});
  dialog.addEventListener("click",function(e){if(e.target===dialog)done()});
  close.addEventListener("click",done);dismiss.addEventListener("click",done);
  document.body.appendChild(dialog);if(dialog.showModal)dialog.showModal();else dialog.setAttribute("open","");close.focus();
}
function bindQrPopup(image,url){
  image.tabIndex=0;image.setAttribute("role","button");image.setAttribute("aria-haspopup","dialog");image.setAttribute("title","Open enlarged QR preview");image.style.cursor="zoom-in";
  function open(){openQrPopup(image.src,url,"Live profile · Scan with another phone",image)}
  image.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();open()});
  image.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}});
}
function findPublicHeader(row){
  if(!row)return -1;
  for(var i=0;i<row.cells.length;i++){
    var t=(row.cells[i].textContent||"").replace(/\s+/g," ").trim().toLowerCase();
    if(t.indexOf("public url")>=0)return i;
  }
  return -1;
}
function rowId(row){var el=row.querySelector("[data-id]");return el?String(el.getAttribute("data-id")||""):""}
function publicProfileUrl(cell){
  if(!cell)return "";
  var a=cell.querySelector('a[href*="profile.html"]');
  return a?String(a.href||""):"";
}
function parseProfile(url){
  try{
    var u=new URL(url,location.href),raw=(u.hash.match(/(?:^#|&)p=([^&]+)/)||[])[1];
    if(!raw)return null;
    var p=JSON.parse(decodeBase64Url(raw));
    return p&&typeof p==="object"&&!Array.isArray(p)?p:null;
  }catch(e){return null}
}
function currentRecord(id){
  try{
    if(Array.isArray(window.contacts)){
      for(var i=0;i<window.contacts.length;i++)if(window.contacts[i]&&String(window.contacts[i].id||"")===String(id))return window.contacts[i];
    }
  }catch(e){}
  return null;
}
function dataImageFromRecord(record,kind){
  if(!record)return "";
  var keys=Object.keys(record),fallback="";
  for(var i=0;i<keys.length;i++){
    var key=keys[i],low=key.toLowerCase(),val=record[key];
    if(typeof val!=="string"||!/^data:image\//i.test(val))continue;
    if(/wechat/.test(low))continue;
    if(kind==="background"&&/background|cover/.test(low))return val;
    if(kind==="profile"&&!/background|cover/.test(low)&&/profile|avatar|photo|image/.test(low))return val;
    if(!fallback)fallback=val;
  }
  return fallback;
}
async function enrichProfile(profile,id){
  var images=loadJson(IMAGE_KEY,{}),saved=images[id]||{},record=currentRecord(id);
  var pi=saved.profile||dataImageFromRecord(record,"profile");
  var bg=saved.background||dataImageFromRecord(record,"background");
  if(pi&&/^data:image\//i.test(pi)&&!saved.profile){
    pi=await compressImage(pi,"profile");
    images[id]=images[id]||{};images[id].profile=pi;saveJson(IMAGE_KEY,images);
  }
  if(bg&&/^data:image\//i.test(bg)&&!saved.background){
    bg=await compressImage(bg,"background");
    images[id]=images[id]||{};images[id].background=bg;saveJson(IMAGE_KEY,images);
  }
  if(pi)profile.profileImage=pi;
  if(bg)profile.profileBackground=bg;
  profile._lessDenseUpdatedAt=new Date().toISOString();
  return profile;
}
function remoteMap(){return loadJson(STORE_KEY,{})}
function saveRemoteMap(map){saveJson(STORE_KEY,map)}
async function createRemote(profile){
  var res=await fetch("https://api.jsonstorage.net/v1/json",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(profile)
  });
  if(!res.ok)throw new Error("Remote profile create failed");
  var data=await res.json(),uri=String(data.uri||"");
  if(!/^https:\/\/api\.jsonstorage\.net\/v1\/json\//i.test(uri))throw new Error("Invalid remote profile URI");
  return uri;
}
async function updateRemote(uri,profile){
  var res=await fetch(uri,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(profile)});
  if(!res.ok)throw new Error("Remote profile update failed");
}
function renderCell(td,url,state){
  td.innerHTML="";
  if(!url){
    var span=document.createElement("span");span.className="muted";span.textContent=state||"Syncing…";td.appendChild(span);return;
  }
  var img=document.createElement("img");img.src=qrImage(url);img.alt="Less dense live profile QR";img.style.cssText="width:78px;height:78px;display:block;margin:auto;border:1px solid #eaecf0;border-radius:7px;padding:4px;background:#fff";
  var actions=document.createElement("div");actions.className="qractions";
  var open=document.createElement("a");open.className="qrbtn";open.href=url;open.target="_blank";open.rel="noopener noreferrer";open.style.textDecoration="none";open.style.color="inherit";open.textContent="Open Profile";
  var note=document.createElement("div");note.className="muted";note.style.cssText="font-size:10px;margin-top:4px";note.textContent=state||"Live · updates after Save";
  actions.appendChild(open);td.appendChild(img);td.appendChild(actions);td.appendChild(note);bindQrPopup(img,url);
}
async function syncRow(row,publicIndex,force){
  var id=rowId(row);if(!id)return;
  var source=publicProfileUrl(row.cells[publicIndex]),profile=parseProfile(source);
  var td=row.querySelector(".less-dense-cell");
  if(!td){
    td=document.createElement("td");td.className="qrcell less-dense-cell";
    if(row.cells[publicIndex])row.cells[publicIndex].after(td);
  }
  if(!profile){renderCell(td,"","Profile unavailable");return}
  profile=await enrichProfile(profile,id);
  var signature=JSON.stringify(profile);
  if(!force&&td.dataset.profileSignature===signature&&td.dataset.remoteUrl)return
  td.dataset.profileSignature=signature;
  renderCell(td,"","Syncing latest profile…");
  var map=remoteMap(),entry=map[id]||{},uri=entry.uri||"";
  try{
    if(uri)await updateRemote(uri,profile);
    else{
      uri=await createRemote(profile);
      map[id]={uri:uri,createdAt:new Date().toISOString()};
      saveRemoteMap(map);
    }
    var url=shortUrl(uri);
    td.dataset.remoteUrl=url;
    renderCell(td,url,"Live · latest saved profile");
  }catch(e){
    renderCell(td,"","Sync failed · retry after Save");
  }
}
async function sync(force){
  if(syncing){queued=true;return}
  syncing=true;
  try{
    bindImageInputs();bindForm();
    var table=document.getElementById("table")||document.querySelector("table");
    if(!table||!table.tHead||!table.tBodies.length)return;
    var header=table.tHead.rows[0],publicIndex=findPublicHeader(header);if(publicIndex<0)return;
    if(!header.querySelector(".less-dense-head")){
      var th=document.createElement("th");th.className="less-dense-head";th.textContent="Less Dense QR";th.title="Stable live QR. Saved edits are synced to the hosted profile.";header.cells[publicIndex].after(th);
    }
    var rows=Array.prototype.slice.call(table.tBodies[0].rows);
    for(var i=0;i<rows.length;i++){
      var row=rows[i];
      if(row.cells.length===1&&row.cells[0].hasAttribute("colspan")){row.cells[0].colSpan=header.cells.length;continue}
      await syncRow(row,publicIndex,!!force);
    }
  }finally{
    syncing=false;
    if(queued){queued=false;setTimeout(function(){sync(false)},50)}
  }
}
function queueSync(force){setTimeout(function(){sync(!!force)},40)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){queueSync(false)},{once:true});else queueSync(false);
document.addEventListener("click",function(e){
  var b=e.target.closest&&e.target.closest('[data-a="edit"],#addBtn,[data-a="add"]');
  if(b)pendingImages={profile:"",background:""};
},true);
var target=document.getElementById("tbody")||document.body;
new MutationObserver(function(){queueSync(false)}).observe(target,{childList:true,subtree:true});
})();