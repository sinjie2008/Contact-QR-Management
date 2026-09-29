(function(){
"use strict";
var CODE_BY_ID={"sg-sales":"S1","cn-sales":"C1","my-sales":"M1","tw-support":"T1","hk-service":"H1"};
var syncing=false;

function shortUrl(code){
  var u=new URL("p.html",window.location.href);
  u.search="";
  u.hash=code;
  return u.href;
}
function qrImage(url){
  return "https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data="+encodeURIComponent(url);
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
function openQrPopup(imageUrl,profileUrl,code,trigger){
  ensurePopupStyles();
  var dialog=document.createElement("dialog");
  dialog.className="less-dense-qr-dialog";
  dialog.setAttribute("aria-labelledby","lessDenseQrPopupTitle");
  var head=document.createElement("div");
  head.className="ldqr-head";
  var title=document.createElement("h2");
  title.id="lessDenseQrPopupTitle";
  title.textContent="Less Dense QR";
  var close=document.createElement("button");
  close.type="button";
  close.className="ldqr-close";
  close.textContent="Close";
  close.setAttribute("aria-label","Close QR preview");
  var image=document.createElement("img");
  image.className="ldqr-image";
  image.src=imageUrl;
  image.alt="Enlarged Less Dense QR";
  var note=document.createElement("p");
  note.className="ldqr-note";
  note.textContent="Short ID: "+code+" · Scan with another phone";
  var actions=document.createElement("div");
  actions.className="ldqr-actions";
  var open=document.createElement("a");
  open.className="ldqr-open";
  open.href=profileUrl;
  open.target="_blank";
  open.rel="noopener noreferrer";
  open.textContent="Open Profile";
  var dismiss=document.createElement("button");
  dismiss.type="button";
  dismiss.className="ldqr-dismiss";
  dismiss.textContent="Close";
  head.appendChild(title);
  head.appendChild(close);
  actions.appendChild(open);
  actions.appendChild(dismiss);
  dialog.appendChild(head);
  dialog.appendChild(image);
  dialog.appendChild(note);
  dialog.appendChild(actions);

  function removeDialog(){
    if(typeof dialog.close==="function"&&dialog.open){dialog.close();return;}
    dialog.removeAttribute("open");
    dialog.remove();
    if(trigger&&typeof trigger.focus==="function")trigger.focus();
  }
  dialog.addEventListener("close",function(){
    dialog.remove();
    if(trigger&&typeof trigger.focus==="function")trigger.focus();
  },{once:true});
  dialog.addEventListener("click",function(event){
    if(event.target===dialog)removeDialog();
  });
  close.addEventListener("click",removeDialog);
  dismiss.addEventListener("click",removeDialog);
  document.body.appendChild(dialog);
  if(typeof dialog.showModal==="function")dialog.showModal();
  else dialog.setAttribute("open","");
  close.focus();
}
function bindQrPopup(image,url,code){
  image.tabIndex=0;
  image.setAttribute("role","button");
  image.setAttribute("aria-haspopup","dialog");
  image.setAttribute("title","Open enlarged QR preview");
  image.style.cursor="zoom-in";
  image.addEventListener("click",function(event){
    event.preventDefault();
    event.stopPropagation();
    openQrPopup(image.src,url,code,image);
  });
  image.addEventListener("keydown",function(event){
    if(event.key==="Enter"||event.key===" "){
      event.preventDefault();
      openQrPopup(image.src,url,code,image);
    }
  });
}
function findPublicHeader(row){
  if(!row)return -1;
  for(var i=0;i<row.cells.length;i++){
    var t=(row.cells[i].textContent||"").replace(/\s+/g," ").trim().toLowerCase();
    if(t.indexOf("public url")>=0&&t.indexOf("profile qr")>=0)return i;
    if(t.indexOf("public url")>=0)return i;
  }
  return -1;
}
function rowId(row){
  var el=row.querySelector("[data-id]");
  return el?String(el.getAttribute("data-id")||""):"";
}
function sync(){
  if(syncing)return;
  syncing=true;
  try{
    var table=document.getElementById("table")||document.querySelector("table");
    if(!table||!table.tHead||!table.tBodies.length)return;
    var headerRow=table.tHead.rows[0],publicIndex=findPublicHeader(headerRow);
    if(publicIndex<0)return;

    var existing=headerRow.querySelector(".less-dense-head");
    if(!existing){
      var th=document.createElement("th");
      th.className="less-dense-head";
      th.textContent="Less Dense QR";
      th.title="Demo QR using a short hosted profile ID";
      headerRow.cells[publicIndex].after(th);
    }

    Array.prototype.forEach.call(table.tBodies[0].rows,function(row){
      if(row.querySelector(".less-dense-cell"))return;
      if(row.cells.length===1&&row.cells[0].hasAttribute("colspan")){
        row.cells[0].colSpan=headerRow.cells.length;
        return;
      }
      var id=rowId(row),code=CODE_BY_ID[id]||"";
      var td=document.createElement("td");
      td.className="qrcell less-dense-cell";
      if(code){
        var url=shortUrl(code);
        td.innerHTML='<img src="'+qrImage(url)+'" alt="Less dense profile QR" style="width:78px;height:78px;display:block;margin:auto;border:1px solid #eaecf0;border-radius:7px;padding:4px;background:#fff">'
          +'<div class="qractions"><a class="qrbtn" href="'+url+'" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit">Open Profile</a></div>'
          +'<div class="muted" style="font-size:10px;margin-top:4px">Short ID: '+code+'</div>';
        var qr=td.querySelector("img");
        if(qr)bindQrPopup(qr,url,code);
      }else{
        td.innerHTML='<span class="muted" title="This demo profile has not been published to the hosted profile store.">Demo N/A</span>';
      }
      var anchor=row.cells[publicIndex];
      if(anchor)anchor.after(td);
    });
  }finally{
    syncing=false;
  }
}
function queueSync(){requestAnimationFrame(sync)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",queueSync,{once:true});
else queueSync();
var target=document.getElementById("tbody")||document.body;
new MutationObserver(queueSync).observe(target,{childList:true,subtree:true});
})();
