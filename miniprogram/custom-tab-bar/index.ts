Component({
  data: { selected:0, editorOpen:false, tabs:[
    {text:'小屋',path:'/pages/cabin/index',icon:'cottage'},
    {text:'瞬间',path:'/pages/moments/index',icon:'photo_library'},
    {text:'信箱',path:'/pages/mailbox/index',icon:'mail'},
    {text:'见面',path:'/pages/reunion/index',icon:'flight_takeoff'},
    {text:'我们',path:'/pages/us/index',icon:'diversity_1'},
  ] },
  methods: { switchTab(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index);
    if(!Number.isInteger(index)||index<0||index>=this.data.tabs.length)return;
    if(index===this.data.selected)return;
    wx.switchTab({url:this.data.tabs[index].path,fail:()=>wx.showToast({title:'未能切换页面，请重试',icon:'none'})});
  } },
});
