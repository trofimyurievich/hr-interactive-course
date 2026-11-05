/* SCORM 1.2: test score only; the commission exam is not automated. */
window.ScormBridge=(()=>{
 let api=null,started=false,ended=false,truncated=false,studentId='',start=Date.now();
 function locate(w){for(let i=0;w&&i<15;i++){try{if(w.API)return w.API;if(w.parent===w)break;w=w.parent}catch(e){break}}return null}
 function ok(v){return String(v)==='true'}
 function init(){try{api=locate(window)||locate(window.opener);if(!api||!ok(api.LMSInitialize('')))return null;started=true;studentId=String(api.LMSGetValue('cmi.core.student_id')||'');const status=api.LMSGetValue('cmi.core.lesson_status');if(!status||status==='not attempted')api.LMSSetValue('cmi.core.lesson_status','incomplete');const value=api.LMSGetValue('cmi.suspend_data');return value?JSON.parse(value):null}catch(e){return null}}
 function save(state){
  if(!started||ended)return false;
  try{
   let copy={version:state.version,route:state.route,elapsed:state.elapsed,done:state.done,scenarioDone:state.scenarioDone,zupDone:state.zupDone,branchStep:state.branchStep,best:state.best,lastScore:state.lastScore,answers:state.answers,moduleAnswers:state.moduleAnswers,sim:state.sim};
   let payload=JSON.stringify(copy);truncated=payload.length>3900;if(truncated){copy.sim=null;payload=JSON.stringify(copy)}
   if(payload.length>4096)return false;
   let success=ok(api.LMSSetValue('cmi.suspend_data',payload));
   success=ok(api.LMSSetValue('cmi.core.lesson_location',JSON.stringify(state.route).slice(0,255)))&&success;
   if(Number.isFinite(state.lastScore)){success=ok(api.LMSSetValue('cmi.core.score.min','0'))&&success;success=ok(api.LMSSetValue('cmi.core.score.max','100'))&&success;success=ok(api.LMSSetValue('cmi.core.score.raw',String(state.lastScore)))&&success}
   return ok(api.LMSCommit(''))&&success;
  }catch(e){return false}
 }
 function finish(state){if(!started||ended)return;save(state);try{let s=Math.floor((Date.now()-start)/1000),h=String(Math.floor(s/3600)).padStart(2,'0'),m=String(Math.floor(s%3600/60)).padStart(2,'0'),sec=String(s%60).padStart(2,'0');api.LMSSetValue('cmi.core.session_time',`${h}:${m}:${sec}`);api.LMSSetValue('cmi.core.exit','suspend');api.LMSCommit('');api.LMSFinish('')}catch(e){}ended=true}
 return{init,save,finish,available:()=>started&&!ended,simOmitted:()=>truncated,studentId:()=>studentId};
})();
