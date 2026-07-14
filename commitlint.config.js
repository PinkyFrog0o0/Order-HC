module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能
        'fix', // 修复
        'docs', // 文档
        'style', // 格式（不影响代码运行）
        'refactor', // 重构（不是新功能也不是修复）
        'perf', // 性能优化
        'test', // 增加/修改测试
        'chore', // 构建过程或辅助工具变动
        'ci', // CI 配置
        'revert', // 回滚
      ],
    ],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
    'header-case': [2, 'always', 'lower-case'],
  },
};