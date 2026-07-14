# Git Hooks 设置

本项目使用 husky 管理 git hooks。hooks 文件由 husky 在安装时自动生成。

## 一次性安装

```bash
pnpm install              # 安装所有依赖
pnpm exec husky init      # 生成 .husky/ 目录和默认 hooks
```

`husky init` 会创建 `.husky/pre-commit`，把里面的内容替换成：

```sh
#!/usr/bin/sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm exec lint-staged
```

再新建 `.husky/commit-msg`：

```sh
#!/usr/bin/sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no-install commitlint --edit "$1"
```

两个文件都需要 `chmod +x`：

```bash
chmod +x .husky/pre-commit .husky/commit-msg
```

## 工作原理

- **pre-commit**：对暂存文件跑 `lint-staged`（在根 `package.json` 配置）—— ESLint --fix + Prettier
- **commit-msg**：用 commitlint 校验提交信息格式（conventional commits）

## 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

合法的 type：`feat` `fix` `docs` `style` `refactor` `perf` `test` `chore` `ci` `revert`

示例：

```bash
git commit -m "feat: 实现询价单 Excel 模板上传解析"
git commit -m "fix(tenant): 修复 header 缺失时返回 401"
git commit -m "refactor: 抽出 tenant middleware 到独立模块"
```

subject 必须小写、≤72 字符。详细规则见根目录 `commitlint.config.js`。