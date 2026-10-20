function mergeFollowerHistory(...lists){
  const exact=new Map();
  for(const list of lists)for(const event of Array.isArray(list)?list:[]){
    if(!['follow','unfollow'].includes(event?.type)||typeof event.name!=='string'||!event.name.trim()||!Number.isFinite(Date.parse(event.at)))continue;
    const value={type:event.type,name:event.name.trim(),at:new Date(event.at).toISOString()};
    exact.set(JSON.stringify([value.type,value.name.toLowerCase(),value.at]),value);
  }
  // Collapse repeated detections of the same unfollow across devices.
  // A subsequent follow starts a new cycle, so a genuine later unfollow remains.
  const state=new Map(),events=[];
  const ordered=[...exact.values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||(a.type===b.type?0:a.type==='follow'?-1:1)||a.name.toLowerCase().localeCompare(b.name.toLowerCase(),'en'));
  for(const event of ordered){
    const key=event.name.toLowerCase();
    if(event.type==='unfollow'&&state.get(key)==='unfollow')continue;
    events.push(event);state.set(key,event.type);
  }
  return events.reverse().slice(0,500);
}
function diffFollowers(old,current,now=new Date().toISOString()){
  const events=old?Array.isArray(old.events)?[...old.events]:[]:[];
  for(const [id,f] of Object.entries(current))if(!old||!old.followers?.[id]||old.followers[id].at!==f.at)events.push({type:'follow',name:f.name,at:f.at});
  if(old?.followers)for(const [id,f] of Object.entries(old.followers))if(!current[id])events.push({type:'unfollow',name:f.name,at:now});
  return mergeFollowerHistory(events);
}
if(typeof module!=='undefined')module.exports={diffFollowers,mergeFollowerHistory};
