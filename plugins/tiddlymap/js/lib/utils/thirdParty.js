"use strict";Object.defineProperty(exports,"__esModule",{value:true});
/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/lib/utils/thirdParty
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */var generateDraftTitle=exports.generateDraftTitle=function e(n){var r=0,t=void 0;do{t="Draft "+(r?r+1+" ":"")+"of '"+n+"'";r++}while($tw.wiki.tiddlerExists(t));return t};var makeDraftTiddler=exports.makeDraftTiddler=function e(n){var r=$tw.wiki.findDraft(n);if(r){return $tw.wiki.getTiddler(r)}var t=$tw.wiki.getTiddler(n);r=generateDraftTitle(n);var l=new $tw.Tiddler(t,{title:r,"draft.title":n,"draft.of":n},$tw.wiki.getModificationFields());$tw.wiki.addTiddler(l);return l};var getFullScreenApis=exports.getFullScreenApis=function e(){var n=document,r=n.body,t={_requestFullscreen:r.webkitRequestFullscreen!==undefined?"webkitRequestFullscreen":r.mozRequestFullScreen!==undefined?"mozRequestFullScreen":r.msRequestFullscreen!==undefined?"msRequestFullscreen":r.requestFullscreen!==undefined?"requestFullscreen":"",_exitFullscreen:n.webkitExitFullscreen!==undefined?"webkitExitFullscreen":n.mozCancelFullScreen!==undefined?"mozCancelFullScreen":n.msExitFullscreen!==undefined?"msExitFullscreen":n.exitFullscreen!==undefined?"exitFullscreen":"",_fullscreenElement:n.webkitFullscreenElement!==undefined?"webkitFullscreenElement":n.mozFullScreenElement!==undefined?"mozFullScreenElement":n.msFullscreenElement!==undefined?"msFullscreenElement":n.fullscreenElement!==undefined?"fullscreenElement":"",_fullscreenChange:n.webkitFullscreenElement!==undefined?"webkitfullscreenchange":n.mozFullScreenElement!==undefined?"mozfullscreenchange":n.msFullscreenElement!==undefined?"MSFullscreenChange":n.fullscreenElement!==undefined?"fullscreenchange":""};if(!t._requestFullscreen||!t._exitFullscreen||!t._fullscreenElement){return null}else{return t}};var flatten=exports.flatten=function e(n){var r=arguments.length>1&&arguments[1]!==undefined?arguments[1]:{};var t=r.delimiter||".";var l=r.prefix||"";var i={};function u(e,n){Object.keys(e).forEach((function(f){var s=e[f];var c=r.safe&&Array.isArray(s);var a=Object.prototype.toString.call(s);var d=a==="[object Object]"||a==="[object Array]";var o=n?n+t+f:l+f;if(!c&&d){return u(s,o)}i[o]=s}))}u(n);return i};var unflatten=exports.unflatten=function e(n){var r=arguments.length>1&&arguments[1]!==undefined?arguments[1]:{};var t=r.delimiter||".";var l={};if(Object.prototype.toString.call(n)!=="[object Object]"){return n}function i(e){var n=Number(e);return isNaN(n)||e.indexOf(".")!==-1?e:n}Object.keys(n).forEach((function(u){var f=u.split(t);var s=i(f.shift());var c=i(f[0]);var a=l;while(c!==undefined){if(a[s]===undefined){a[s]=typeof c==="number"&&!r.object?[]:{}}a=a[s];if(f.length>0){s=i(f.shift());c=i(f[0])}}a[s]=e(n[u],r)}));return l};var genUUID=exports.genUUID=function(){var e="0123456789abcdefghijklmnopqrstuvwxyz".split("");return function(){var n=e,r=new Array(36);var t=0,l;for(var i=0;i<36;i++){if(i==8||i==13||i==18||i==23){r[i]="-"}else if(i==14){r[i]="4"}else{if(t<=2)t=33554432+Math.random()*16777216|0;l=t&15;t=t>>4;r[i]=n[i==19?l&3|8:l]}}return r.join("")}}();