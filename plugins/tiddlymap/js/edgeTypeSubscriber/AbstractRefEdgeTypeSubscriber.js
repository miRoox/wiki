"use strict";Object.defineProperty(exports,"__esModule",{value:true});var _createClass=function(){function e(e,t){for(var r=0;r<t.length;r++){var i=t[r];i.enumerable=i.enumerable||false;i.configurable=true;if("value"in i)i.writable=true;Object.defineProperty(e,i.key,i)}}return function(t,r,i){if(r)e(t.prototype,r);if(i)e(t,i);return t}}();var _utils=require("$:/plugins/felixhayashi/tiddlymap/js/utils");var _utils2=_interopRequireDefault(_utils);var _Edge=require("$:/plugins/felixhayashi/tiddlymap/js/Edge");var _Edge2=_interopRequireDefault(_Edge);var _exception=require("$:/plugins/felixhayashi/tiddlymap/js/exception");var _AbstractEdgeTypeSubscriber=require("$:/plugins/felixhayashi/tiddlymap/js/AbstractEdgeTypeSubscriber");var _AbstractEdgeTypeSubscriber2=_interopRequireDefault(_AbstractEdgeTypeSubscriber);function _interopRequireDefault(e){return e&&e.__esModule?e:{default:e}}function _classCallCheck(e,t){if(!(e instanceof t)){throw new TypeError("Cannot call a class as a function")}}function _possibleConstructorReturn(e,t){if(!e){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return t&&(typeof t==="object"||typeof t==="function")?t:e}function _inherits(e,t){if(typeof t!=="function"&&t!==null){throw new TypeError("Super expression must either be null or a function, not "+typeof t)}e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:false,writable:true,configurable:true}});if(t)Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t}/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */var AbstractRefEdgeTypeSubscriber=function(e){_inherits(t,e);function t(){_classCallCheck(this,t);return _possibleConstructorReturn(this,(t.__proto__||Object.getPrototypeOf(t)).apply(this,arguments))}_createClass(t,[{key:"loadEdges",value:function e(t,r,i){var a=this.getReferences(t,r,i);if(!a||!_utils2.default.hasElements(a))return;var s=t.fields["tmap.id"];var n=$tm.tracker.getIdsByTiddlers();var u=this.allEdgeTypes;var l=_utils2.default.getTiddlerRef(t);var o=_utils2.default.makeHashMap();for(var f in a){var c=a[f];if(!c){continue}var p=u[f];for(var d=c.length;d--;){var _=c[d];if(!_||!$tw.wiki.tiddlerExists(_)||_utils2.default.isSystemOrDraft(_)||r&&!r[_]){continue}var b=p.id+$tw.utils.hashString(l+_);o[b]=new _Edge2.default(s,n[_],p.id,b)}}return o}},{key:"getReferences",value:function e(t,r,i){throw new _exception.MissingOverrideError(this,"getReferences")}}]);return t}(_AbstractEdgeTypeSubscriber2.default);exports.default=AbstractRefEdgeTypeSubscriber;