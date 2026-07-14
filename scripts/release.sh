#!/usr/bin/env bash
# Haycargo 标准发版脚本
#
# 用法:
#   bash scripts/release.sh vX.Y.Z "发布说明（单行字符串）"
#
# 流程:
#   1. 改两个 APP_VERSION 常量:
#      - packages/shared/src/constants.ts
#      - apps/api/src/version/version.service.ts
#   2. git commit + tag + push
#   3. 创建 GitHub Release（依赖 gh CLI；缺失/未 auth 时打印手动命令并保留 tag）
#
# 回滚:升级失败时,服务器 SSH 进去 `git checkout v2.1.0` 即可,无需额外预案。
#
# 也完全可以手动:
#   sed -i "s/APP_VERSION = 'X'/APP_VERSION = 'Y'/" packages/shared/src/constants.ts apps/api/src/version/version.service.ts
#   git add -A && git commit -m "release: vY"
#   git tag vY && git push origin main --tags
#   gh release create vY --notes "..."

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "用法: bash scripts/release.sh vX.Y.Z \"发布说明\""
  exit 1
fi

VERSION="$1"
NOTES="$2"

# 把 'v2.1.1' 归一成 '2.1.1' 给常量用
BARE="${VERSION#v}"

# 防止 silent overwrite：先检查工作树是否干净
if [[ -n "$(git status --porcelain)" ]]; then
  echo "工作区不干净,请先 commit 或 stash 当前改动:"
  git status --short
  exit 1
fi

# 1) 替换两处 APP_VERSION(注意单引号转义)
sed -i "s/APP_VERSION = '[^']*'/APP_VERSION = '${BARE}'/" \
  packages/shared/src/constants.ts \
  apps/api/src/version/version.service.ts

# 校验确实改成功了
grep -q "APP_VERSION = '${BARE}'" packages/shared/src/constants.ts || { echo "常量替换失败"; exit 1; }
grep -q "APP_VERSION = '${BARE}'" apps/api/src/version/version.service.ts || { echo "常量替换失败"; exit 1; }

# 2) commit + tag + push
git add packages/shared/src/constants.ts apps/api/src/version/version.service.ts
git commit -m "release: ${VERSION}"
git tag "${VERSION}"
git push origin main --tags

echo
echo "✓ 已推送 tag ${VERSION}"
echo

# 3) gh release create
if ! command -v gh >/dev/null 2>&1; then
  echo "⚠  gh CLI 未安装 — 已推送 tag,但 GitHub Release 未创建。"
  echo "   安装 gh (https://cli.github.com) 后手动执行:"
  echo "     gh release create \"${VERSION}\" --notes \"${NOTES}\""
  exit 0
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "⚠  gh 未登录 — 已推送 tag,GitHub Release 未创建。"
  echo "   执行 \`gh auth login\` 后手动跑:"
  echo "     gh release create \"${VERSION}\" --notes \"${NOTES}\""
  exit 0
fi

gh release create "${VERSION}" --notes "${NOTES}"
echo
echo "✅ Release ${VERSION} 已创建"
