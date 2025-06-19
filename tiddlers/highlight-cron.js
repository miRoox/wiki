/*! `cron` grammar compiled for Highlight.js 11.4.0 */
(() => {
  var e = (() => {
    "use strict";
    return e => ({
      name: "Cron",
      case_insensitive: true,
      contains: [
        // 注释（以#开头）
        e.C_LINE_COMMENT_MODE,
        // 快捷方式：@reboot, @yearly, @annually, @monthly, @weekly, @daily, @midnight, @hourly
        {
          className: "keyword",
          begin: "@(reboot|yearly|annually|monthly|weekly|daily|midnight|hourly)\\b"
        },
        // 数字字段：支持单个数字、范围（1-5）、步进（*/10, 1-10/2）、逗号分隔（1,3,5）
        {
          className: "number",
          begin: "((\\d{1,2}(-\\d{1,2})?(\\/\\d{1,2})?|\\*\\/\\d{1,2})(,\\d{1,2}(-\\d{1,2})?(\\/\\d{1,2})?|,\\*\\/\\d{1,2})*|\\*)"
        }
      ]
    });
  })();
  hljs.registerLanguage("cron", e);
})();
