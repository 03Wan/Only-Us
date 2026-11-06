// No secrets belong here. touristappid is the official local guest-mode marker.
export const environment = {
  mode: 'local' as 'local' | 'cloud',
  cloudEnvId: '', // TODO: user's own WeChat CloudBase environment ID
  gatewayFunction: 'gateway',
  storageEnabled: false,
};
