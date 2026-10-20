const {test}=require('node:test'),assert=require('node:assert/strict');
const {diffFollowers,mergeFollowerHistory:merge}=require('./follower-diff');
const event=(name,type,day)=>({name,type,at:`2026-10-${String(day).padStart(2,'0')}T12:00:00.000Z`});
test('Screenshot examples collapse repeated detections, keeping the first detection time',()=>{
 const events=[event('Alpha','unfollow',18),event('Beta','unfollow',18),event('Alpha','unfollow',17),event('Beta','unfollow',17),event('Gamma','unfollow',13),event('Gamma','unfollow',12),event('Gamma','unfollow',11)];
 const result=merge(events);assert.equal(result.length,3);assert.equal(result.find(e=>e.name==='Alpha').at,event('x','unfollow',17).at);assert.equal(result.find(e=>e.name==='Gamma').at,event('x','unfollow',11).at);
});
test('Real follow, unfollow, refollow, unfollow cycles are preserved',()=>{
 const events=[event('Kanal','follow',1),event('Kanal','unfollow',2),event('Kanal','unfollow',3),event('Kanal','follow',4),event('Kanal','unfollow',5),event('Kanal','unfollow',6)];
 assert.deepEqual(merge(events).map(e=>e.type+e.at.slice(8,10)),['unfollow05','follow04','unfollow02','follow01']);
});
test('Exact cross-device duplicates and case differences do not create new unfollows',()=>{
 const first=event('Kanal','unfollow',1),later=event(' kanal ','unfollow',2);assert.equal(merge([first],[first,later]).length,1);
});
test('Cloud responses cannot reintroduce older duplicate records',()=>{
 const cloud=[event('Kanal','unfollow',1),event('Kanal','unfollow',2),event('Anderer','unfollow',2)];
 const local=merge(cloud);assert.deepEqual(merge(local,cloud),local);assert.deepEqual(merge(cloud,local),local);
});
test('Repeated diff against a stale device snapshot creates no extra unfollow',()=>{
 const old={followers:{'1':{name:'Kanal',at:event('x','follow',1).at}},events:[event('Kanal','unfollow',2)]};
 const result=diffFollowers(old,{},event('x','unfollow',3).at);assert.equal(result.length,1);assert.equal(result[0].at,old.events[0].at);
});
test('Follower snapshots still detect a genuine return followed by a later unfollow',()=>{
 const history=[event('Kanal','unfollow',2)],current={'1':{name:'Kanal',at:event('x','follow',4).at}};
 const followed=diffFollowers({followers:{},events:history},current);const left=diffFollowers({followers:current,events:followed},{},event('x','unfollow',5).at);
 assert.deepEqual(left.map(e=>e.type),['unfollow','follow','unfollow']);
});
test('Different users and distinct follow timestamps remain separate',()=>{
 const events=[event('A','follow',1),event('A','follow',2),event('B','unfollow',2),event('C','unfollow',2)];assert.equal(merge(events).length,4);
});
test('Normalization rejects malformed events and applies limit after deduplication',()=>{
 const repeated=Array.from({length:600},(_,i)=>({name:'A',type:'unfollow',at:new Date(1700000000000+i*1000).toISOString()}));
 assert.equal(merge(repeated,[event('B','unfollow',1),null,{name:'X',type:'unfollow',at:'bad'}]).length,2);
 const unique=Array.from({length:600},(_,i)=>event('User'+i,'unfollow',1));assert.equal(merge(unique).length,500);
});
test('Equal timestamps have stable ordering across repeated merges',()=>{
 const events=[event('B','unfollow',1),event('A','unfollow',1),event('C','follow',1)];const first=merge(events);assert.deepEqual(merge(first),first);assert.deepEqual(merge([...events].reverse()),first);
});
