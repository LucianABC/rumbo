// Conventional Commits, see CLAUDE.md "Git and PRs".
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72],
  },
};
