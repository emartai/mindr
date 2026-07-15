const path = require('node:path');

const siteDir = __dirname;

// Docusaurus emits `require.resolveWeak(...)` calls in the server bundle that
// are evaluated by Node's outer `require`, not Webpack's runtime require.
// Build an alias map from Webpack's module graph and rewrite them to module IDs.
function requireResolveWeakFix() {
  const jsString = String.raw`(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')`;
  const jsRequireCall = new RegExp(String.raw`require\((` + jsString + String.raw`)\)`, 'g');
  const jsResolveWeakCall = new RegExp(
    String.raw`require\.resolveWeak\((` + jsString + String.raw`)\)`,
    'g',
  );

  function unquoteJsString(value) {
    return JSON.parse(value.replace(/^'/, '"').replace(/'$/, '"'));
  }

  function toPosix(value) {
    return value.split(path.sep).join('/');
  }

  function aliasForResource(resource) {
    if (!resource) return undefined;
    const normalized = toPosix(resource);
    const normalizedSiteDir = toPosix(siteDir);
    const docsPrefix = `${normalizedSiteDir}/docs/`;
    const generatedPrefix = `${normalizedSiteDir}/.docusaurus/`;
    const themePrefix = '/node_modules/@docusaurus/theme-classic/lib/theme/';

    if (normalized.startsWith(docsPrefix)) {
      return `@site/docs/${normalized.slice(docsPrefix.length)}`;
    }

    if (normalized.startsWith(generatedPrefix)) {
      return `@generated/${normalized.slice(generatedPrefix.length)}`;
    }

    const themeIndex = normalized.indexOf(themePrefix);
    if (themeIndex !== -1) {
      const themePath = normalized
        .slice(themeIndex + themePrefix.length)
        .replace(/\/index\.[cm]?js$/, '')
        .replace(/\.[cm]?js$/, '');
      return `@theme/${themePath}`;
    }

    return undefined;
  }

  return {
    name: 'require-resolve-weak-fix',
    configureWebpack(_config, isServer) {
      if (!isServer) return {};
      return {
        plugins: [
          {
            apply(compiler) {
              const { Compilation, sources } = compiler.webpack;
              compiler.hooks.thisCompilation.tap('RequireResolveWeakFix', (compilation) => {
                compilation.hooks.processAssets.tap(
                  {
                    name: 'RequireResolveWeakFix',
                    stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_COMPATIBILITY,
                  },
                  (assets) => {
                    const moduleIds = new Map();
                    let fallbackModuleId;
                    for (const module of compilation.modules) {
                      const id = compilation.chunkGraph.getModuleId(module);
                      if (id === null || id === undefined) continue;
                      const encodedId = JSON.stringify(id);
                      fallbackModuleId ??= encodedId;
                      for (const key of [
                        module.rawRequest,
                        module.userRequest,
                        module.request,
                        module.resource,
                        aliasForResource(module.resource),
                      ]) {
                        if (key) moduleIds.set(key, encodedId);
                      }
                    }

                    const toModuleId = (match, requestLiteral) => {
                      const request = unquoteJsString(requestLiteral);
                      return moduleIds.get(request) ?? fallbackModuleId ?? match;
                    };

                    for (const [assetName, asset] of Object.entries(assets)) {
                      if (!assetName.endsWith('.js')) continue;
                      const source = asset.source().toString();
                      if (!source.includes('require')) {
                        continue;
                      }
                      compilation.updateAsset(
                        assetName,
                        new sources.RawSource(
                          source
                            .replace(jsResolveWeakCall, toModuleId)
                            .replace(/require\((['"])[^'"]+\.css\1\)/g, 'undefined')
                            .replace(
                              /require\((['"])[^'"]+@docusaurus[\\/]+theme-classic[\\/]+lib[\\/]+(?:prism-include-languages|nprogress)\1\)/g,
                              'undefined',
                            )
                            .replace(jsRequireCall, (match, requestLiteral) => {
                              const request = unquoteJsString(requestLiteral);
                              const moduleId = moduleIds.get(request);
                              return request.startsWith('@') && moduleId
                                ? `__webpack_require__(${moduleId})`
                                : match;
                            })
                        ),
                      );
                    }
                  },
                );
              });
            },
          },
        ],
      };
    },
  };
}

module.exports = {
  title: 'Mindr',
  tagline: 'Persistent memory for your coding agents',
  url: 'https://emartai.github.io',
  baseUrl: '/mindr/',
  favicon: 'img/favicon.svg',
  organizationName: 'emartai',
  projectName: 'mindr',
  trailingSlash: false,
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/docs',
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/emartai/mindr/tree/main/docs/',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      },
    ],
  ],
  themeConfig: {
    image: 'img/mindr-social-card.svg',
    colorMode: { defaultMode: 'dark', respectPrefersColorScheme: true },
    navbar: {
      title: 'Mindr',
      logo: { alt: 'Mindr logo', src: 'img/logo.svg' },
      items: [
        { to: '/docs/quickstart', label: 'Docs', position: 'left' },
        { to: '/docs/cli', label: 'CLI', position: 'left' },
        { to: '/docs/sdk', label: 'SDK', position: 'left' },
        { to: '/docs/why-mindr', label: 'Why Mindr', position: 'left' },
        {
          href: 'https://github.com/emartai/mindr',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Quickstart', to: '/docs/quickstart' },
            { label: 'CLI Reference', to: '/docs/cli' },
            { label: 'SDK Reference', to: '/docs/sdk' },
            { label: 'Architecture', to: '/docs/architecture' },
          ],
        },
        {
          title: 'Concepts',
          items: [
            { label: 'Memory schema', to: '/docs/concepts/memory-schema' },
            { label: 'Conventions', to: '/docs/concepts/conventions' },
            { label: 'Decisions', to: '/docs/concepts/decisions' },
            { label: 'Technical debt', to: '/docs/concepts/debt' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/emartai/mindr' },
            { label: 'npm', href: 'https://www.npmjs.com/package/mindragent' },
            { label: 'Emart AI', href: 'https://github.com/emartai' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Emart AI · Built with Docusaurus`,
    },
  },
  plugins: [requireResolveWeakFix],
}
