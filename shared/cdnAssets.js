const CDN_BASE = "https://cdn.wire24.co/";
const CDN_VERSION = "v4";

export const cdnAssets = {
  logo: {
    small: `${CDN_BASE}${CDN_VERSION}/images/logo-64.webp`,
    medium: `${CDN_BASE}${CDN_VERSION}/images/logo-256.webp`,
    large: `${CDN_BASE}${CDN_VERSION}/images/logo-1024.webp`,
  },
  splash: {
    iphoneX: `${CDN_BASE}${CDN_VERSION}/splash/splash-1125.webp`,
  },
  flags: {
    uganda: `${CDN_BASE}${CDN_VERSION}/flags/ug.svg`,
  },
  videos: {
    promo: `${CDN_BASE}${CDN_VERSION}/videos/promo.mp4`,
  },
};
