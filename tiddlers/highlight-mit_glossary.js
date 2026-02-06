/*
MIT Glossary Format Syntax Highlighting for highlight.js
*/

hljs.registerLanguage('mit-glossary', function(hljs) {
  const SOURCE_TERM = {
    className: 'source-term',
    begin: /^[^\s#\/]+/,
    end: /(?=\s)/,
    excludeEnd: true,
    relevance: 10
  };

  const TARGET_TERM = {
    className: 'target-term',
    begin: /(?<=[ \t])(?!^\s*(#|\/\/))/,
    end: /(?=[ \t]*(#|\/\/|$))/,
    relevance: 5
  };

  const COMMENT = {
    className: 'comment',
    begin: /#|\/\//,
    end: /$/,
    contains: []
  };

  return {
    name: 'MIT Glossary Format',
    case_insensitive: false,
    contains: [
      SOURCE_TERM,
      TARGET_TERM,
      COMMENT
    ],
    // 支持续行符（如果一行太长）
    disableAutodetect: false
  };
});