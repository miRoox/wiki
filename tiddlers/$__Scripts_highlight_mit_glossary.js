/*
MIT Glossary Format Syntax Highlighting for highlight.js
Simple and effective version
*/

hljs.registerLanguage('mit-glossary', function(hljs) {
  return {
    name: 'MIT Glossary Format',
    case_insensitive: false,
    contains: [
      // 源词
      {
        className: 'source-term',
        match: /^[^\s#\/]+/
      },
      // 目标词（确保不匹配到注释或跨行）
      {
        className: 'target-term',
        match: /(?<=[ \t])(?!(#|\/\/))(?:[^\s#\/]+(?:[ \t]+[^\s#\/]+)*)/
      },
      // 注释
      {
        className: 'comment',
        match: /(#|\/\/).*$/
      }
    ]
  };
});