module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {},
  ignores: [(message) => /\bWIP\b/i.test(message)],
};
