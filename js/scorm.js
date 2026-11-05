/* SCORM 1.2: the best result of the course's final practice test. */
window.ScormBridge = (() => {
  let api = null, started = false, ended = false, truncated = false;
  let studentId = '', start = Date.now();
  const ok = value => String(value) === 'true';

  function locate(w) {
    for (let i = 0; w && i < 15; i++) {
      try {
        if (w.API) return w.API;
        if (w.parent === w) break;
        w = w.parent;
      } catch (e) { break; }
    }
    return null;
  }

  function init() {
    try {
      api = locate(window) || locate(window.opener);
      if (!api || !ok(api.LMSInitialize(''))) return null;
      started = true;
      studentId = String(api.LMSGetValue('cmi.core.student_id') || '');
      const status = api.LMSGetValue('cmi.core.lesson_status');
      if (!status || status === 'not attempted') api.LMSSetValue('cmi.core.lesson_status', 'incomplete');
      const value = api.LMSGetValue('cmi.suspend_data');
      return value ? JSON.parse(value) : null;
    } catch (e) { return null; }
  }

  function save(state) {
    if (!started || ended) return false;
    try {
      const copy = {version:state.version, route:state.route, elapsed:state.elapsed,
        done:state.done, scenarioDone:state.scenarioDone, zupDone:state.zupDone,
        branchStep:state.branchStep, best:state.best, lastScore:state.lastScore,
        answers:state.answers, moduleAnswers:state.moduleAnswers, sim:state.sim};
      let payload = JSON.stringify(copy);
      truncated = payload.length > 3900;
      if (truncated) { copy.sim = null; payload = JSON.stringify(copy); }
      if (payload.length > 4096) return false;
      let success = ok(api.LMSSetValue('cmi.suspend_data', payload));
      success = ok(api.LMSSetValue('cmi.core.lesson_location', JSON.stringify(state.route).slice(0, 255))) && success;
      // The final test is the single assessment sent to the LMS; preserve the
      // best completed attempt if a later retry has a lower score.
      const candidates = [state.best, state.lastScore].filter(x => Number.isFinite(x) && x >= 0 && x <= 100);
      if (candidates.length) {
        const score = Math.max(...candidates);
        const threshold = Number(window.COURSE_SETTINGS ? window.COURSE_SETTINGS.passScore : NaN);
        const passScore = Number.isFinite(threshold) && threshold >= 0 && threshold <= 100 ? threshold : 80;
        // Min/max may be unsupported; raw score and status are essential.
        api.LMSSetValue('cmi.core.score.min', '0');
        api.LMSSetValue('cmi.core.score.max', '100');
        success = ok(api.LMSSetValue('cmi.core.score.raw', String(score))) && success;
        success = ok(api.LMSSetValue('cmi.core.lesson_status', score >= passScore ? 'passed' : 'failed')) && success;
      }
      return ok(api.LMSCommit('')) && success;
    } catch (e) { return false; }
  }

  function finish(state) {
    if (!started || ended) return;
    save(state);
    try {
      const seconds = Math.floor((Date.now() - start) / 1000);
      const hours = String(Math.min(9999, Math.floor(seconds / 3600))).padStart(2, '0');
      const minutes = String(Math.floor(seconds % 3600 / 60)).padStart(2, '0');
      const secs = String(seconds % 60).padStart(2, '0');
      api.LMSSetValue('cmi.core.session_time', `${hours}:${minutes}:${secs}`);
      api.LMSSetValue('cmi.core.exit', 'suspend');
      api.LMSCommit('');
      api.LMSFinish('');
    } catch (e) {}
    ended = true;
  }
  return {init, save, finish, available:()=>started && !ended,
    simOmitted:()=>truncated, studentId:()=>studentId};
})();
