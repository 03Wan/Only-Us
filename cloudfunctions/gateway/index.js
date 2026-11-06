'use strict';
const cloud=require('wx-server-sdk');
const {createService}=require('./service.cjs');
cloud.init({env:cloud.DYNAMIC_CURRENT_ENV});
const db=cloud.database();
function adapter(database) {
  return {
    async get(collection,id) {
      try {const result=await database.collection(collection).doc(id).get();return result.data||null;}
      catch(error){if(/document.*(not exist|not found)|DOCUMENT_NOT_EXIST/i.test(String(error.errMsg||error.message)))return null;throw error;}
    },
    async set(collection,id,data) {const {_id,...fields}=data;await database.collection(collection).doc(id).set({data:fields});},
  };
}
const repo={...adapter(db),transaction:fn=>db.runTransaction(transaction=>fn(adapter(transaction))),
  async list(collection,spaceId,offset,limit){const result=await db.collection(collection).where({spaceId,deleted:db.command.neq(true)}).orderBy('createdAt','desc').skip(offset).limit(limit).get();return result.data;}};
const service=createService(repo,{upload:async(cloudPath,fileContent)=>(await cloud.uploadFile({cloudPath,fileContent})).fileID,
  url:async fileID=>{const result=await cloud.getTempFileURL({fileList:[{fileID,maxAge:300}]});const file=result.fileList[0];if(!file?.tempFileURL)throw new Error('FILE_UNAVAILABLE');return file.tempFileURL;}});
exports.main=event=>service(event,cloud.getWXContext());
