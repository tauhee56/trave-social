export const tiktokConfig = {
  clientId: '8369d3b8-e04a-4106-bbb8-2cf0b3b2c3dc',
  clientSecret: 'dlTpPKfOg4kcQiSjvC5ueazDnbAMDOP',
  redirectUrl: 'yourapp://tiktok-auth',
  scopes: ['user.info.basic'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://open-api.tiktok.com/platform/oauth/connect/',
    tokenEndpoint: 'https://open-api.tiktok.com/oauth/access_token/',
  },
};
