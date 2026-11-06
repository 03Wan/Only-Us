'use strict';
class AccessError extends Error { constructor(code) { super(code); this.code=code; } }
function requireIdentity(context) {
  if(!context || typeof context.OPENID !== 'string' || !context.OPENID.trim())throw new AccessError('UNAUTHENTICATED');
  return context.OPENID;
}
async function requireSpace(openid, repository) {
  const user = await repository.user(openid);
  if(!user || typeof user.spaceId !== 'string' || !user.spaceId)throw new AccessError('NOT_BOUND');
  const space = await repository.space(user.spaceId);
  const members = space?.memberOpenids;
  if(!space || space.status !== 'active' || !Array.isArray(members) || members.length !== 2 || members.some(id=>typeof id!=='string'||!id.trim()) || new Set(members).size !== 2 || !members.includes(openid))throw new AccessError('FORBIDDEN');
  return { spaceId:user.spaceId, space };
}
function requireOwnedRecord(record, spaceId) {
  if(!record || record.deleted || record.spaceId !== spaceId)throw new AccessError('FORBIDDEN');
  return record;
}
function canReadLetterBody(letter, openid, now) {
  // Used only after requireSpace + requireOwnedRecord, never as a standalone membership check.
  if(letter.status === 'draft')return letter.authorOpenid === openid;
  if(letter.status !== 'sent')return false;
  if(letter.authorOpenid === openid)return true;
  return letter.recipientOpenid === openid && Number.isFinite(letter.openAt) && now >= letter.openAt;
}
module.exports={AccessError,requireIdentity,requireSpace,requireOwnedRecord,canReadLetterBody};
