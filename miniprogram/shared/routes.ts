export const routes = {
  cabin: '/pages/cabin/index', moments: '/pages/moments/index', mailbox: '/pages/mailbox/index',
  reunion: '/pages/reunion/index', us: '/pages/us/index',
  bind: '/subpackages/connection/bind/index', profile: '/subpackages/connection/profile/index',
  mood: '/subpackages/connection/mood/index', editor: '/subpackages/moments/editor/index',
  waiting: '/subpackages/moments/waiting/index', compose: '/subpackages/mail/compose/index',
  locked: '/subpackages/mail/locked/index', letter: '/subpackages/mail/letter/index',
} as const;
export type RouteKey = keyof typeof routes;
export const tabKeys: RouteKey[] = ['cabin','moments','mailbox','reunion','us'];
export function go(key: RouteKey, query=''): void {
  const url = routes[key];
  if (!url) return;
  const fail=()=>wx.showToast({title:'页面未能打开，请重试',icon:'none'});
  if (tabKeys.includes(key)) wx.switchTab({url,fail}); else wx.navigateTo({url:url+query,fail});
}
export function back(fallback: RouteKey = 'cabin'): void {
  if (getCurrentPages().length > 1) wx.navigateBack({fail:()=>go(fallback)}); else go(fallback);
}
