/*!  `gbnf` based on `ebnf` grammar compiled for Highlight.js 11.4.0 */
(()=>{var e=(()=>{"use strict";return e=>{const a=e.COMMENT(/#/,"\n")
;return{name:"GGML Backus-Naur Form",illegal:/\S/,contains:[a,{
className:"attribute",begin:/^[ ]*[a-zA-Z]+([\s_-]+[a-zA-Z]+)*/},{begin:/=/,
end:/[.;]/,contains:[a,{className:"meta",begin:/\?.*\?/},{className:"string",
variants:[e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,{begin:"`",end:"`"}]}]}]}}})()
;hljs.registerLanguage("gbnf",e)})();