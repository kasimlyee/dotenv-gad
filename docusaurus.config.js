/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: 'dotenv-gad',
  tagline: 'Environment variable validation and type safety for Node.js',
  url: 'https://kasimlyee.github.io',
  baseUrl: '/dotenv-gad/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'kasimlyee',
  projectName: 'dotenv-gad',
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: 'docs', // Serve docs under /docs
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/kasimlyee/dotenv-gad/edit/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
