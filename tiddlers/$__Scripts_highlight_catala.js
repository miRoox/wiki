(() => {
  'use strict';
  const e = () => {
    {
      const KEYWORDS = {
        keyword: [
          'scope', 'declaration', 'context', 'definitions', 'depends', 'on', 'equals',
          'rule', 'under', 'condition', 'consequence', 'assertion', 'vary', 'with',
          'content', 'of', 'for', 'all', 'exists', 'in', 'and', 'or', 'xor', 'not',
          'maximum', 'minimum', 'filter', 'map', 'init', 'list', 'reduce', 'sum',
          'product', 'match', 'return'
        ].join(' '),
        type: [
          'integer', 'decimal', 'money', 'boolean', 'date', 'duration', 'text'
        ].join(' '),
        literal: [
          'true', 'false'
        ].join(' '),
        built_in: [
          'cardinal', 'year', 'month', 'day', 'round', 'param', 'log'
        ].join(' ')
      };

      const OPERATORS = {
        className: 'operator',
        begin: /\|--|->|!=|<=|>=|--/
      };

      const LEGISLATIVE_TEXT = {
        className: 'meta',
        begin: /^>/,
        end: /$/,
        relevance: 10
      };

      // 对应 Pygments 中的 Comment.Preproc (From ... to)
      const LAW_METADATA = {
        className: 'meta',
        begin: /\bFrom\b/,
        end: /\bto\b/,
        keywords: 'From to',
        contains: [
          {
            className: 'string',
            begin: /\d{4}-\d{2}-\d{2}/ // 匹配日期
          }
        ]
      };

      const DATES = {
        className: 'number',
        begin: /\b\d{4}-\d{2}-\d{2}\b/
      };

      const NUMBERS = {
        className: 'number',
        variants: [
          { begin: /\b\d+(\.\d+)?/ } // Decimal and Integer
        ]
      };

      // Catala 使用点号访问结构体字段，或者作为数字小数点
      const DOT_ACCESS = {
        begin: /\./
      };

      return {
        name: 'Catala',
        aliases: ['catala', 'cat'],
        case_insensitive: false,
        keywords: KEYWORDS,
        contains: [
          hljs.HASH_COMMENT_MODE, // # Comment
          hljs.QUOTE_STRING_MODE, // "String"
          LEGISLATIVE_TEXT,       // > Legislative text
          LAW_METADATA,           // From ... to ...
          OPERATORS,
          DATES,
          NUMBERS,
          DOT_ACCESS
        ]
      }
    }
  }
  // Register the language
  hljs.registerLanguage('catala', e);

})();