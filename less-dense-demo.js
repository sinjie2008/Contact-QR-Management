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
        td.innerHTML='<a href="'+url+'" target="_blank" rel="noopener noreferrer" title="Open hosted short-ID profile">'
          +'<img src="'+qrImage(url)+'" alt="Less dense profile QR" style="width:78px;height:78px;display:block;margin:auto;border:1px solid #eaecf0;border-radius:7px;padding:4px;background:#fff">'
          +'</a><div class="qractions"><a class="qrbtn" href="'+url+'" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit">Open Profile</a></div>'
          +'<div class="muted" style="font-size:10px;margin-top:4px">Short ID: '+code+'</div>';
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
