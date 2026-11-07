import { back, go } from '../../shared/routes';
Component({
  properties: { title: { type: String, value: '此间有你' }, back: { type: Boolean, value: false }, settings: Boolean },
  data: { top: 24, barHeight: 44, reserve: 96, icon: '' },
  lifetimes: {
    attached() {
      this.updateMetrics();
    },
  },
  pageLifetimes: {
    resize() { this.updateMetrics(); },
  },
  methods: {
    openSettings() { this.triggerEvent('settings'); },
    updateMetrics() {
      const info = wx.getWindowInfo();
      const capsule = wx.getMenuButtonBoundingClientRect();
      const top = info.statusBarHeight ?? 20;
      const barHeight = capsule.height ? (capsule.top-top)*2+capsule.height : 44;
      const width = info.windowWidth;
      this.setData({ top, barHeight: Math.max(44,Math.min(64,barHeight)), reserve: capsule.left>0&&capsule.left<width ? width-capsule.left+12 : 96 });
    },
    lead() {
      if(this.properties.back) {
        const pages=getCurrentPages();const route=pages[pages.length-1]?.route||'';
        back(route.startsWith('subpackages/mail/')?'mailbox':route.startsWith('subpackages/moments/')?'moments':'cabin');
        return;
      }
      if(this.properties.settings) { this.openSettings(); return; }
      wx.showActionSheet({ itemList:['双人绑定','小屋资料设置','设置今天心情'], success: res => {
        const items = ['bind','profile','mood'] as const;
        if (res.tapIndex < 3) go(items[res.tapIndex]);

      } });
    },
  },
});
