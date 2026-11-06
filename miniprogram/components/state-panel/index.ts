Component({
  properties: { visible:Boolean, message:String, retryable:Boolean, kind:{type:String,value:'success'}, token:Number },
  data: { top:104 },
  observers: { 'visible,message,kind,token'(){this.scheduleDismiss();} },
  lifetimes: {
    attached(){this._attached=true;this.updateMetrics();this.scheduleDismiss();},
    detached(){this._attached=false;this.clearTimer();},
  },
  pageLifetimes: { hide(){this.dismiss();},resize(){this.updateMetrics();} },
  methods: {
    updateMetrics(){const info=wx.getWindowInfo(),capsule=wx.getMenuButtonBoundingClientRect(),top=info.statusBarHeight??20;const height=capsule.height?(capsule.top-top)*2+capsule.height:44;this.setData({top:top+Math.max(44,Math.min(64,height))+12});},
    clearTimer(){if(this._dismissTimer){clearTimeout(this._dismissTimer);this._dismissTimer=undefined;}},
    scheduleDismiss(){this.clearTimer();if(!this._attached||!this.properties.visible)return;this._dismissTimer=setTimeout(()=>{this._dismissTimer=undefined;this.triggerEvent('dismiss');},this.properties.kind==='error'?5000:2400);},
    dismiss(){this.clearTimer();if(this.properties.visible)this.triggerEvent('dismiss');},
    retry(){this.clearTimer();this.triggerEvent('retry');},
  },
});
