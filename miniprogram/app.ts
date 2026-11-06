import { migrateLocalData } from './services/local-migration';
import { environment } from './config/env';

App({
  globalData: { mode: environment.mode, cloudReady:false, startupError:'' },
  onLaunch() {
    try { migrateLocalData(); } catch { wx.showToast({title:'本机数据整理未完成，请重启后重试',icon:'none'}); }
    if (environment.mode === 'cloud') {
      try {
        if (!environment.cloudEnvId) throw new Error('请先配置自己的微信云环境 ID');
        if (!wx.cloud) throw new Error('当前基础库不支持云开发，请升级微信');
        wx.cloud.init({ env: environment.cloudEnvId, traceUser: false });
        this.globalData.cloudReady=true;
      } catch(error) {
        this.globalData.startupError=error instanceof Error?error.message:'云环境初始化失败';
        wx.showModal({title:'云连接尚未就绪',content:this.globalData.startupError,showCancel:false});
      }
    }
  },
});
