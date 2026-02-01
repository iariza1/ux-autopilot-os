export const GITHUB_CONFIG = {
  repo: process.env.TARGET_REPO || 'iariza1/toma-app-web-2',
  get repoUrl() {
    return `https://github.com/${this.repo}.git`;
  },
  cloneDir: '/tmp/toma-app-web-2',
  defaultBranch: 'main',
} as const;
