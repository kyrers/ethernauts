module.exports = {
  trailingSlash: true,
  reactStrictMode: true,
  exportPathMap: function () {
    return {
      '/': { page: '/' },
      '/gallery': { page: '/gallery' },
      '/gallery/me': { page: '/gallery/me' },
    };
  },
  images: {
    domains: ['https://storageapi.fleek.co/'],
  },
  // Fix fast refresh for Windows users
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };

    return config;
  },
};
