"use strict";Object.defineProperty(exports,"__esModule",{value:true});exports.FilterEdgeTypeSubstriber=undefined;var _extends=Object.assign||function(e){for(var r=1;r<arguments.length;r++){var t=arguments[r];for(var i in t){if(Object.prototype.hasOwnProperty.call(t,i)){e[i]=t[i]}}}return e};var _createClass=function(){function e(e,r){for(var t=0;t<r.length;t++){var i=r[t];i.enumerable=i.enumerable||false;i.configurable=true;if("value"in i)i.writable=true;Object.defineProperty(e,i.key,i)}}return function(r,t,i){if(t)e(r.prototype,t);if(i)e(r,i);return r}}();var _utils=require("$:/plugins/felixhayashi/tiddlymap/js/utils");var _utils2=_interopRequireDefault(_utils);var _AbstractMagicEdgeTypeSubscriber=require("$:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber");var _AbstractMagicEdgeTypeSubscriber2=_interopRequireDefault(_AbstractMagicEdgeTypeSubscriber);var _widget=require("$:/core/modules/widgets/widget.js");var _widget2=_interopRequireDefault(_widget);function _interopRequireDefault(e){return e&&e.__esModule?e:{default:e}}function _classCallCheck(e,r){if(!(e instanceof r)){throw new TypeError("Cannot call a class as a function")}}function _possibleConstructorReturn(e,r){if(!e){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return r&&(typeof r==="object"||typeof r==="function")?r:e}function _inherits(e,r){if(typeof r!=="function"&&r!==null){throw new TypeError("Super expression must either be null or a function, not "+typeof r)}e.prototype=Object.create(r&&r.prototype,{constructor:{value:e,enumerable:false,writable:true,configurable:true}});if(r)Object.setPrototypeOf?Object.setPrototypeOf(e,r):e.__proto__=r}/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/filter
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/
/* @preserve TW-Guard */var FilterEdgeTypeSubstriber=function(e){_inherits(r,e);function r(e){var t=arguments.length>1&&arguments[1]!==undefined?arguments[1]:{};_classCallCheck(this,r);return _possibleConstructorReturn(this,(r.__proto__||Object.getPrototypeOf(r)).call(this,e,_extends({priority:10},t)))}_createClass(r,[{key:"canHandle",value:function e(r){return r.namespace==="tw-filter"}},{key:"getReferencesFromField",value:function e(r,t,i){var n=r.fields[t];return runFilter(n,r.fields.title,i)}},{key:"insertEdge",value:function e(r,t,i){if(!t.to){return}var n=i.name;var a=this.tracker.getTiddlerById(t.to);var s=r.fields.title;var u=r.fields[n]||"";while(runFilter(u,s).indexOf(a)<0){var l=$tw.wiki.parseFilter(u);var o=false;for(var f=l.length-1;f>=0;f--){var p=l[f];var c=runIsSingleTitle(p);if(p.prefix==="-"&&c===a){l.splice(f,1);o=true;break}}if(!o){l.push({prefix:"",operators:[{operator:"title",operands:[{text:a}]}]})}u=reassembleFilter(l)}_utils2.default.setField(r,n,u);return t}},{key:"deleteEdge",value:function e(r,t,i){var n=i.name;var a=this.tracker.getTiddlerById(t.to);var s=r.fields.title;var u=r.fields[n];while(u&&runFilter(u,s).indexOf(a)>=0){var l=$tw.wiki.parseFilter(r.fields[n]);var o=false;for(var f=0;f<l.length;f++){var p=l[f];var c=runIsSingleTitle(p);if(!p.prefix&&c===a){l.splice(f,1);o=true;break}}if(!o){l.push({prefix:"-",operators:[{operator:"title",operands:[{text:a}]}]})}u=reassembleFilter(l)}_utils2.default.setField(r,n,u);return t}}]);return r}(_AbstractMagicEdgeTypeSubscriber2.default);function reassembleFilter(e){var r=[];for(var t=0;t<e.length;t++){var i=e[t];if(r.length>0){r.push(" ")}r.push(i.prefix);var n=runIsSingleTitle(i);if(n){r.push(bestQuoteFor(n))}else if(i.operators.length>0){r.push("[");for(var a=0;a<i.operators.length;a++){var s=i.operators[a];var u=true;if(s.prefix){r.push(s.prefix)}if(s.operator!=="title"||s.suffix){r.push(s.operator)}if(s.suffix){r.push(":",s.suffix)}if(s.regexp){r.push("/",s.regexp.source,"/");if(s.regexp.flags){r.push("(",s.regexp.flags,")")}}else{for(var l=0;l<s.operands.length;l++){var o=s.operands[l];if(!u){r.push(",")}u=false;if(o.variable){r.push("<",o.text,">")}else if(o.indirect){r.push("{",o.text,"}")}else{r.push("[",o.text,"]")}}}}r.push("]")}}if(r.length>0){return r.join("")}return undefined}function runIsSingleTitle(e){if(e.operators.length===1&&!e.namedPrefix){var r=e.operators[0];if(r.operator==="title"&&r.operands.length===1&&!r.suffix&&!r.prefix){var t=r.operands[0];if(!t.variable&&!t.indirect){return t.text}}}return null}function bestQuoteFor(e){if(/^[^\s\[\]\-+~=:'"][^\s\[\]]*$/.test(e)){return e}if(e.indexOf("]")<0){return"[["+e+"]]"}if(e.indexOf("'")<0){return"'"+e+"'"}return'"'+e+'"'}function runFilter(e,r,t){var i=new _widget2.default.widget({});i.setVariable("currentTiddler",r);var n=new _widget2.default.widget({},{parentWidget:i});var a=_utils2.default.getMatches(e,t,n);return a}exports.FilterEdgeTypeSubstriber=FilterEdgeTypeSubstriber;