// script.js — QA Checklist Pro v4 FIXED
(function(){
'use strict';

// ===================== HELPERS =====================
var $=function(s){return document.querySelector(s);};
var $$=function(s){return Array.from(document.querySelectorAll(s));};
var pad=function(n){return String(n).padStart(2,'0');};
var hms=function(s){return pad(s/3600|0)+':'+pad(s%3600/60|0)+':'+pad(s%60);};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
var uid=function(p){return(p||'id')+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);};
var deb=function(fn,ms){var t;return function(){var a=arguments;clearTimeout(t);t=setTimeout(function(){fn.apply(null,a);},ms||400);};};
var ds=function(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
var tdy=function(){return new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});};
var dayName=function(d){try{return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long'});}catch(e){return'';}};
var dl=function(name,type,content){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},200);};
var T=function(id,nm,pr,mod){return{id:id,name:nm,priority:pr||'medium',module:mod||'web',status:'pending',notes:'',changedAt:null,changedDate:null};};
var getInitials=function(name){if(!name)return'QA';var p=name.trim().split(/\s+/);return(p[0][0]+(p.length>1?p[p.length-1][0]:'')).toUpperCase();};

// ===================== GLOBAL STATE =====================
var authToken=null;
var currentUser=null;
var state=null;
var ui={theme:'light',collapsed:{},search:'',fCat:'all',fPri:'all',fSt:'all',mod:'web',view:'testing',tmrOn:false};
var editId=null,delId=null,delType=null,editProjId=null,editCycNum=null;
var editPortId=null,editAutoId=null,editSheetId=null,editWsId=null;
var roleChangeUserId=null;
var tmrI=null,autoSaveTimer=null,pendingTarget=null,udOpen=false,pendingRestoreData=null;
var appWired=false;

// ===================== SCREEN MANAGEMENT =====================
function hideAllScreens(){
  var auth=$('#authScreen');if(auth){auth.hidden=true;auth.style.display='none';}
  var pend=$('#pendingScreen');if(pend){pend.hidden=true;pend.style.display='none';}
  var app=$('#mainApp');if(app){app.hidden=true;app.style.display='none';}
  hideLoading();
}
function showScreen(screen){
  hideAllScreens();
  if(screen==='auth'){var a=$('#authScreen');if(a){a.hidden=false;a.style.display='flex';}}
  else if(screen==='pending'){var p=$('#pendingScreen');if(p){p.hidden=false;p.style.display='flex';}}
  else if(screen==='app'){var ap=$('#mainApp');if(ap){ap.hidden=false;ap.style.display='flex';}}
}
function showLoading(){var el=$('#loadingOv');if(el){el.hidden=false;el.style.display='flex';}}
function hideLoading(){var el=$('#loadingOv');if(el){el.hidden=true;el.style.display='none';}}

// ===================== API =====================
var draftKeyPrefix='qaDraft_';
var idleTimer=null;var idleWarningTimer=null;var IDLE_WARNING_MS=15*60*1000;var IDLE_LOGOUT_MS=18*60*1000;
function saveToken(token){authToken=token;try{localStorage.setItem('qa_jwt',token);}catch(e){}}
function loadToken(){try{authToken=localStorage.getItem('qa_jwt')||null;}catch(e){authToken=null;}}
function clearAuth(){authToken=null;currentUser=null;try{localStorage.removeItem('qa_jwt');}catch(e){}stopIdleMonitor();}
function draftKey(uid){return draftKeyPrefix+uid;}
function saveDraft(){if(!currentUser||!currentUser.id)return;try{localStorage.setItem(draftKey(currentUser.id),JSON.stringify({data:state,updatedAt:new Date().toISOString()}));}catch(e){}
}
function normalizeText(value){return String(value||'').replace(/\s+/g,' ').trim();}
function autoNormalizeInputs(){var inputs=document.querySelectorAll('input[type="text"],textarea');inputs.forEach(function(el){el.addEventListener('input',function(){if(el.value&&el.value!==normalizeText(el.value)){el.value=normalizeText(el.value);}});});}
function killSessionOnLeave(){if(!authToken||!currentUser)return; if(navigator.sendBeacon){navigator.sendBeacon('/api/auth/logout','');} else {try{var xhr=new XMLHttpRequest();xhr.open('POST','/api/auth/logout',false);xhr.setRequestHeader('Content-Type','application/json');xhr.send(null);}catch(e){}} clearAuth();}
window.addEventListener('pagehide',killSessionOnLeave);
window.addEventListener('beforeunload',killSessionOnLeave);
function getDraft(){if(!currentUser||!currentUser.id)return null;try{return JSON.parse(localStorage.getItem(draftKey(currentUser.id)));}catch(e){return null;}}
function clearDraft(){if(!currentUser||!currentUser.id)return;try{localStorage.removeItem(draftKey(currentUser.id));}catch(e){}}
function resetIdleTimer(){clearTimeout(idleTimer);clearTimeout(idleWarningTimer);if(!authToken||!currentUser)return;idleWarningTimer=setTimeout(function(){toast('warning','Session','No activity detected — you will be logged out soon');},IDLE_WARNING_MS);idleTimer=setTimeout(function(){toast('danger','Session','Logged out due to inactivity');api('POST','/api/auth/logout');clearAuth();showScreen('auth');},IDLE_LOGOUT_MS);} 
function startIdleMonitor(){resetIdleTimer();['mousemove','mousedown','keydown','touchstart','scroll'].forEach(function(ev){window.addEventListener(ev,resetIdleTimer,{passive:true});});}
function stopIdleMonitor(){clearTimeout(idleTimer);clearTimeout(idleWarningTimer);['mousemove','mousedown','keydown','touchstart','scroll'].forEach(function(ev){window.removeEventListener(ev,resetIdleTimer);});}

async function api(method,url,body){
  var opts={method:method,headers:{'Content-Type':'application/json'},credentials:'include'};
  if(authToken)opts.headers['Authorization']='Bearer '+authToken;
  if(body)opts.body=JSON.stringify(body);
  try{
    var controller=new AbortController();
    opts.signal=controller.signal;
    var tout=setTimeout(function(){controller.abort();},10000);
    var res=await fetch(url,opts);
    clearTimeout(tout);
    var data;
    try{data=await res.json();}catch(e){data={ok:false,msg:'Invalid response'};}
    if(res.status===401){clearAuth();showScreen('auth');return{ok:false,msg:'Session expired'};}
    return data;
  }catch(e){
    return{ok:false,msg:e.name==='AbortError'?'Request timeout':'Network error: '+e.message};
  }
}

// ===================== AUTH INFO MESSAGES =====================
function showAuthInfo(id,msg,type){
  var el=$('#'+id);if(!el)return;
  el.hidden=false;el.style.display='block';
  el.className='auth-info info-'+(type||'error');
  el.textContent=msg;
}
function hideAuthInfo(id){var el=$('#'+id);if(el){el.hidden=true;el.style.display='none';}}

// ===================== PASSWORD STRENGTH =====================
function checkPassStrength(pass){
  if(!pass)return 0;
  var s=0;
  if(pass.length>=6)s++;if(pass.length>=10)s++;
  if(/[A-Z]/.test(pass))s++;if(/[0-9]/.test(pass))s++;
  if(/[^A-Za-z0-9]/.test(pass))s++;
  return Math.min(s,5);
}
function fieldWrapper(el){return el?el.closest('.fg')||el.parentElement:null;}
function showFieldError(el,msg){if(!el)return;var wrap=fieldWrapper(el);if(!wrap)return;wrap.classList.add('invalid');el.setAttribute('aria-invalid','true');var existing=wrap.querySelector('.field-error');if(existing){existing.textContent=msg;return;}var span=document.createElement('span');span.className='field-error';span.textContent=msg;wrap.appendChild(span);}
function clearFieldError(el){if(!el)return;var wrap=fieldWrapper(el);if(!wrap)return;wrap.classList.remove('invalid');el.removeAttribute('aria-invalid');var err=wrap.querySelector('.field-error');if(err)err.remove();}
function clearFormErrors(form){if(!form)return;var fields=form.querySelectorAll('input,select,textarea');fields.forEach(clearFieldError);}
function validateText(el,label,min,max){if(!el)return false;var raw=String(el.value||'');var val=normalizeText(raw);clearFieldError(el);if(el.value!==val){el.value=val;}if(!val){showFieldError(el,label+' is required');return false;}if(min&&val.length<min){showFieldError(el,label+' must be at least '+min+' characters');return false;}if(max&&val.length>max){showFieldError(el,label+' must be at most '+max+' characters');return false;}return true;}
function validateEmail(el){if(!el)return false;var val=normalizeText(el.value);clearFieldError(el);if(!val){showFieldError(el,'Email is required');return false;}var rx=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;if(!rx.test(val)){showFieldError(el,'Enter a valid email address');return false;}if(el.value!==val){el.value=val;}return true;}
function validateSelect(el,label){if(!el)return false;clearFieldError(el);if(!el.value||el.value===''){showFieldError(el,label+' is required');return false;}return true;}
function validateNumber(el,label,min,max){if(!el)return false;var val=String(el.value||'').trim();clearFieldError(el);if(val===''){showFieldError(el,label+' is required');return false;}if(!/^-?\d+(\.\d+)?$/.test(val)){showFieldError(el,label+' must be a valid number');return false;}var num=Number(val);var minVal=min!==undefined?min:(el.min!==undefined&&el.min!==''?Number(el.min):undefined);var maxVal=max!==undefined?max:(el.max!==undefined&&el.max!==''?Number(el.max):undefined);if(minVal!==undefined&&!isNaN(minVal)&&num<minVal){showFieldError(el,label+' must be at least '+minVal);return false;}if(maxVal!==undefined&&!isNaN(maxVal)&&num>maxVal){showFieldError(el,label+' must be at most '+maxVal);return false;}return true;}
function validateDate(el,label){if(!el)return false;clearFieldError(el);if(!String(el.value||'').trim()){showFieldError(el,label+' is required');return false;}return true;}

// ===================== UPDATE USER UI =====================
function updateUserUI(){
  if(!currentUser)return;
  var init=currentUser.avatar||getInitials(currentUser.name);
  var name=currentUser.name||'User';
  var email=currentUser.email||'';
  var role=currentUser.role||'employee';
  var els={
    userAvatar:init,topAvatar:init,udAvatar:init,
    userName:name,udName:name,udEmail:email,
    userRole:role,udRole:role
  };
  Object.keys(els).forEach(function(id){var el=$('#'+id);if(el)el.textContent=els[id];});
  var fu=$('#footUser');if(fu)fu.textContent=name+' ('+role+')';
  var isM=role==='manager';
  $$('.mgr-only').forEach(function(el){el.hidden=!isM;});
  if(isM)loadPendingCount();
}
async function loadPendingCount(){
  var res=await api('GET','/api/users/pending');
  if(res.ok){var b=$('#pendingBadge');if(b){b.textContent=res.count||0;b.hidden=!res.count;}}
}

// ===================== AUTH WIRING (FIXED) =====================
function wireAuth(){
  // Tab switching
  $$('.auth-tab').forEach(function(tab){
    tab.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();
      $$('.auth-tab').forEach(function(t){t.classList.remove('active');});
      tab.classList.add('active');
      var isLogin=tab.dataset.tab==='login';
      var pl=$('#panelLogin');var pr=$('#panelRegister');
      if(pl){pl.hidden=!isLogin;pl.style.display=isLogin?'block':'none';}
      if(pr){pr.hidden=isLogin;pr.style.display=isLogin?'none':'block';}
      hideAuthInfo('loginInfo');hideAuthInfo('regInfo');
    });
  });

  // Password toggle — Login
  var logEye=$('#logEye');
  if(logEye){
    logEye.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();
      var inp=$('#logPass');if(!inp)return;
      var show=inp.type==='password';
      inp.type=show?'text':'password';
      logEye.textContent=show?'🙈':'👁';
    });
  }

  // Password toggle — Register
  var regEye=$('#regEye');
  if(regEye){
    regEye.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();
      var inp=$('#regPass');if(!inp)return;
      var show=inp.type==='password';
      inp.type=show?'text':'password';
      regEye.textContent=show?'🙈':'👁';
    });
  }

  // Password strength meter
  var regPass=$('#regPass');
  if(regPass){
    regPass.addEventListener('input',function(){
      var score=checkPassStrength(this.value);
      var bar=$('#passStrBar');var hint=$('#passHint');
      var pct=[0,20,40,60,80,100][score];
      var colors=['#ef4444','#f97316','#f59e0b','#22c55e','#10b981','#10b981'];
      var texts=['Too weak','Weak','Fair','Good','Strong','Very strong'];
      if(bar){bar.style.width=pct+'%';bar.style.background=colors[score];}
      if(hint){hint.textContent=texts[score];hint.style.color=colors[score];}
    });
  }

  // LOGIN SUBMIT
  var loginForm=$('#panelLogin');
  if(loginForm){
    loginForm.addEventListener('submit',async function(e){
      e.preventDefault();e.stopPropagation();
      hideAuthInfo('loginInfo');
      clearFormErrors(loginForm);

      var email=$('#logEmail');
      var pass=$('#logPass');
      var remember=$('#logRemember');

      var rememberVal=remember?remember.checked:false;
      var valid=true;
      valid = validateEmail(email) && valid;
      valid = validateText(pass,'Password',6) && valid;
      if(!valid){return;}

      if(pass && pass.value.length<6){showAuthInfo('loginInfo','Password must be at least 6 characters','error');return;}

      var btn=$('#logBtn');if(btn){btn.disabled=true;btn.textContent='⏳ Signing in...';}

      var res=await api('POST','/api/auth/login',{
        email:email.value.trim(),
        password:pass.value,
        remember:rememberVal
      });

      if(btn){btn.disabled=false;btn.textContent='🔐 Sign In';}

      if(res.ok){
        saveToken(res.token);
        currentUser=res.user;

        if(currentUser.status==='pending'){
          showScreen('pending');
          var pe=$('#pendingEmail');if(pe)pe.textContent=currentUser.email;
          return;
        }
        if(currentUser.status!=='approved'){
          showAuthInfo('loginInfo','Account is '+currentUser.status+'. Contact manager.','error');
          clearAuth();
          return;
        }

        showScreen('app');
        updateUserUI();
        wireApp();
        await loadAppData();
        var is=compStats();
        toast('success','Welcome Back','Hello, '+currentUser.name+' — '+is.t+' tests');
      }else{
        var msgType='error';
        if(res.msg&&(res.msg.indexOf('pending')!==-1||res.msg.indexOf('approval')!==-1))msgType='warning';
        showAuthInfo('loginInfo',res.msg||'Login failed','error');
      }
    });
  }

  // REGISTER SUBMIT
  var regForm=$('#panelRegister');
  if(regForm){
    regForm.addEventListener('submit',async function(e){
      e.preventDefault();e.stopPropagation();
      hideAuthInfo('regInfo');
      clearFormErrors(regForm);

      var name=$('#regName');
      var email=$('#regEmail');
      var pass=$('#regPass');
      var pass2=$('#regPass2');

      var valid=true;
      valid = validateText(name,'Full name',2) && valid;
      valid = validateEmail(email) && valid;
      valid = validateText(pass,'Password',6) && valid;
      valid = validateText(pass2,'Confirm password',6) && valid;
      if(pass && pass2 && pass.value !== pass2.value){showFieldError(pass2,'Passwords do not match');valid=false;}
      if(!valid){return;}

      var btn=$('#regBtn');if(btn){btn.disabled=true;btn.textContent='⏳ Creating...';}

      var res=await api('POST','/api/auth/register',{
        name:name.value.trim(),
        email:email.value.trim(),
        password:pass.value,
        role:'employee'
      });

      if(btn){btn.disabled=false;btn.textContent='📝 Create Account';}

      if(res.ok){
        showAuthInfo('regInfo','✅ Account created! Please wait for manager approval before signing in.','success');
        // Clear form
        if(name)name.value='';if(email)email.value='';if(pass)pass.value='';if(pass2)pass2.value='';
        var bar=$('#passStrBar');if(bar)bar.style.width='0';
        var hint=$('#passHint');if(hint){hint.textContent='Use 6+ chars with letters & numbers';hint.style.color='';}
      }else{
        showAuthInfo('regInfo',res.msg||'Registration failed','error');
      }
    });
  }

  // Pending logout
  var pendLogout=$('#pendingLogout');
  if(pendLogout){
    pendLogout.addEventListener('click',function(e){
      e.preventDefault();
      clearAuth();
      showScreen('auth');
    });
  }
}
// ===================== DEFAULT DATA =====================
var DEF={v:14,timer:0,
projects:[{id:'default',name:'Default Project',desc:'',created:ds()}],
currentProject:'default',currentCycle:1,
cycles:{default:[{num:1,date:ds(),name:'Cycle 1'}]},
history:{},portfolio:[],automation:[],sheet:[],worksheet:[],
categories:[
{id:'w-login',icon:'🔐',name:'Login & Authentication',module:'web',tests:[
T('wl01','Valid credentials login','critical'),T('wl02','Invalid username error','critical'),T('wl03','Invalid password error','critical'),
T('wl04','Empty username prevented','high'),T('wl05','Empty password prevented','high'),T('wl06','Both empty blocked','high'),
T('wl07','Show/hide password toggle','medium'),T('wl08','Forgot password link','high'),T('wl09','Reset email delivered','high'),
T('wl10','Reset link functional','high'),T('wl11','Account lockout','critical'),T('wl12','Session timeout','high'),
T('wl13','Logout clears session','high'),T('wl14','Back after logout safe','high'),T('wl15','Remember me','medium'),
T('wl16','Two-factor auth','high'),T('wl17','Social login','high'),T('wl18','CAPTCHA','medium'),
T('wl19','Multi-tab login','medium'),T('wl20','Password history','medium')]},
{id:'w-reg',icon:'📋',name:'Registration',module:'web',tests:[
T('wr01','Valid signup','critical'),T('wr02','Dup email rejected','critical'),T('wr03','Dup username rejected','critical'),
T('wr04','Weak password rejected','high'),T('wr05','Password mismatch','high'),T('wr06','Required fields','high'),
T('wr07','Optional allowed','medium'),T('wr08','Terms required','high'),T('wr09','Privacy link','medium'),
T('wr10','Verification sent','high'),T('wr11','Verification works','high'),T('wr12','Expired link','medium'),
T('wr13','Resend verification','medium'),T('wr14','Phone validated','medium'),T('wr15','DOB no future','medium'),
T('wr16','Age restriction','high'),T('wr17','Whitespace trimmed','medium'),T('wr18','Unicode names','low'),
T('wr19','Strength meter','medium'),T('wr20','Welcome email','high')]},
{id:'w-forms',icon:'📝',name:'Form Validation',module:'web',tests:[
T('wf01','Required empty submit','high'),T('wf02','Inline blur','medium'),T('wf03','Valid email','high'),
T('wf04','Invalid email','high'),T('wf05','Multiple @','medium'),T('wf06','Phone format','medium'),
T('wf07','Max length','high'),T('wf08','Min length','high'),T('wf09','Numeric rejects alpha','high'),
T('wf10','Alpha rejects num','medium'),T('wf11','Negative rejected','medium'),T('wf12','Decimal','medium'),
T('wf13','Special chars','medium'),T('wf14','Emoji','low'),T('wf15','Copy-paste','low'),
T('wf16','Autofill','medium'),T('wf17','Invalid date','high'),T('wf18','Future date','high'),
T('wf19','Past date','high'),T('wf20','Leap year','low'),T('wf21','Dropdown default','medium'),
T('wf22','Multi-select','medium'),T('wf23','Checkbox','medium'),T('wf24','Radio','medium'),
T('wf25','Double submit','critical'),T('wf26','Success msg','high'),T('wf27','Errors','high'),
T('wf28','Reset button','low'),T('wf29','Errors clear','medium'),T('wf30','Tab order','low')]},
{id:'w-nav',icon:'🧭',name:'Navigation',module:'web',tests:[
T('wn01','Primary links','high'),T('wn02','Dropdown links','high'),T('wn03','Footer links','medium'),
T('wn04','Logo home','medium'),T('wn05','Back button','high'),T('wn06','Forward','medium'),
T('wn07','Refresh state','medium'),T('wn08','Deep links','medium'),T('wn09','Breadcrumbs','medium'),
T('wn10','Active highlight','low'),T('wn11','404 page','high'),T('wn12','Protected redirect','critical'),
T('wn13','Auth redirect','medium'),T('wn14','Unsaved warning','medium'),T('wn15','External tab','low'),
T('wn16','No broken links','high'),T('wn17','Skip content','low'),T('wn18','Mobile menu','high'),
T('wn19','Mobile nav closes','medium'),T('wn20','Anchor scroll','low')]},
{id:'w-crud',icon:'💾',name:'Data Operations',module:'web',tests:[
T('wc01','Create saves','critical'),T('wc02','In list','critical'),T('wc03','List correct','critical'),
T('wc04','Detail correct','critical'),T('wc05','Empty state','medium'),T('wc06','Update persists','critical'),
T('wc07','Cancel discards','high'),T('wc08','Concurrent edit','medium'),T('wc09','Delete confirm','high'),
T('wc10','Delete removes','critical'),T('wc11','Cancel keeps','high'),T('wc12','Bulk select','high'),
T('wc13','Bulk delete','high'),T('wc14','Dup prevented','high'),T('wc15','Special chars','medium'),
T('wc16','Long text','medium'),T('wc17','Timestamps','medium'),T('wc18','Soft delete','medium'),
T('wc19','Undo delete','low'),T('wc20','Inline edit','medium')]},
{id:'w-search',icon:'🔎',name:'Search & Filters',module:'web',tests:[
T('ws01','Full keyword','high'),T('ws02','Partial','high'),T('ws03','Case insensitive','medium'),
T('ws04','No results','high'),T('ws05','Special chars','medium'),T('ws06','Clear restores','high'),
T('ws07','Min chars','medium'),T('ws08','Enter triggers','medium'),T('ws09','Live search','medium'),
T('ws10','Single filter','high'),T('ws11','Multi filter','high'),T('ws12','Search+filter','high'),
T('ws13','Clear all','medium'),T('ws14','Date range','high'),T('ws15','Range error','high'),
T('ws16','Numeric range','medium'),T('ws17','Count','medium'),T('ws18','Sort+filter','high'),
T('ws19','Saved searches','low'),T('ws20','Large data','medium')]},
{id:'w-ux',icon:'🎨',name:'UX & Interactions',module:'web',tests:[
T('wu01','Loading','medium'),T('wu02','Success notif','high'),T('wu03','Error notif','high'),
T('wu04','Warning dialog','high'),T('wu05','Modal open/close','high'),T('wu06','Backdrop closes','medium'),
T('wu07','Escape closes','medium'),T('wu08','Focus trapped','medium'),T('wu09','Outside click','medium'),
T('wu10','Disabled btn','medium'),T('wu11','Tooltips','low'),T('wu12','Copy clipboard','medium'),
T('wu13','Drag drop','medium'),T('wu14','Theme toggle','medium'),T('wu15','Theme persist','low'),
T('wu16','Toast dismiss','medium'),T('wu17','Toasts stack','medium'),T('wu18','Infinite scroll','medium'),
T('wu19','Back to top','low'),T('wu20','Hover states','low')]},
{id:'w-resp',icon:'📱',name:'Responsive',module:'web',tests:[
T('wrp01','320px','high'),T('wrp02','375px','high'),T('wrp03','414px','high'),T('wrp04','768px','high'),
T('wrp05','1024px','high'),T('wrp06','1280px','high'),T('wrp07','1440px','medium'),T('wrp08','1920px','medium'),
T('wrp09','No h-scroll','high'),T('wrp10','Touch 44px','high'),T('wrp11','Images scale','medium'),
T('wrp12','Tables scroll','medium'),T('wrp13','Fonts legible','medium'),T('wrp14','Modal fits','high'),
T('wrp15','Keyboard hide','high'),T('wrp16','Orientation','medium')]},
{id:'w-browser',icon:'🌐',name:'Browser',module:'web',tests:[
T('wb01','Chrome latest','critical'),T('wb02','Chrome prev','high'),T('wb03','Firefox','high'),
T('wb04','Safari','high'),T('wb05','Safari dates','high'),T('wb06','Edge','high'),
T('wb07','Chrome mobile','high'),T('wb08','Safari iOS','high'),T('wb09','Samsung','medium'),
T('wb10','Zoom 150%','medium'),T('wb11','Zoom 200%','medium'),T('wb12','Incognito','medium'),
T('wb13','Cookies disabled','medium'),T('wb14','Autofill','medium'),T('wb15','Ad blocker','medium')]},
{id:'w-a11y',icon:'♿',name:'Accessibility',module:'web',tests:[
T('wa01','Keyboard nav','high'),T('wa02','Focus visible','high'),T('wa03','Focus order','high'),
T('wa04','No trap','high'),T('wa05','Modal trap','medium'),T('wa06','Labels','high'),
T('wa07','Error aria','medium'),T('wa08','Alt text','high'),T('wa09','Decorative alt','medium'),
T('wa10','Contrast 4.5','high'),T('wa11','Contrast 3','medium'),T('wa12','Not color only','high'),
T('wa13','Resize 200%','medium'),T('wa14','Page title','medium'),T('wa15','Heading','medium'),
T('wa16','Landmarks','low'),T('wa17','Skip content','medium'),T('wa18','Dynamic','medium'),
T('wa19','Button names','high'),T('wa20','Link text','medium'),T('wa21','Reduced motion','medium'),T('wa22','No flash','high')]},
{id:'w-sec',icon:'🔒',name:'Security',module:'web',tests:[
T('wse01','Unauth redirect','critical'),T('wse02','Others data','critical'),T('wse03','Admin hidden','critical'),
T('wse04','Role visibility','high'),T('wse05','Pass not source','critical'),T('wse06','Not URL','critical'),
T('wse07','Generic errors','high'),T('wse08','Exe blocked','critical'),T('wse09','Oversized','high'),
T('wse10','HTTPS','critical'),T('wse11','Session cleared','high'),T('wse12','Reset single','high'),
T('wse13','IDOR','critical'),T('wse14','No escalation','critical'),T('wse15','CORS','high'),T('wse16','Rate limit','high')]},
{id:'w-perf',icon:'⚡',name:'Performance',module:'web',tests:[
T('wp01','Load < 3s','high'),T('wp02','3G < 6s','high'),T('wp03','No CLS','high'),T('wp04','Search < 1s','high'),
T('wp05','1000+ no freeze','medium'),T('wp06','Images < 2s','medium'),T('wp07','Smooth scroll','medium'),T('wp08','No mem leak','medium')]},
{id:'w-err',icon:'⚠️',name:'Error Handling',module:'web',tests:[
T('we01','Network loss','high'),T('we02','Recovery','medium'),T('we03','500 friendly','high'),T('we04','Timeout','high'),
T('we05','Slow loader','high'),T('we06','Form preserved','high'),T('we07','404 nav','medium'),T('we08','Dup blocked','critical'),
T('we09','Session warn','high'),T('we10','No resubmit','high')]},
{id:'w-upload',icon:'📁',name:'File Upload',module:'web',tests:[
T('wup01','Valid uploads','critical'),T('wup02','Invalid rejected','critical'),T('wup03','Oversized','critical'),
T('wup04','Zero byte','high'),T('wup05','Multiple','high'),T('wup06','Drag drop','medium'),
T('wup07','Progress','medium'),T('wup08','Cancel','medium'),T('wup09','In list','high'),
T('wup10','Dup filename','medium'),T('wup11','Special chars','medium'),T('wup12','Preview','low'),
T('wup13','Download correct','critical'),T('wup14','Not corrupted','critical'),T('wup15','Filename','medium'),T('wup16','Delete file','high')]},
{id:'w-page',icon:'📄',name:'Pagination',module:'web',tests:[
T('wpg01','First page','high'),T('wpg02','Next','high'),T('wpg03','Prev','high'),T('wpg04','Last','high'),
T('wpg05','Prev disabled','medium'),T('wpg06','Next disabled','medium'),T('wpg07','Per page','medium'),T('wpg08','Total','medium'),
T('wpg09','Filter kept','high'),T('wpg10','Search kept','high'),T('wpg11','Sort asc','high'),T('wpg12','Sort desc','high'),
T('wpg13','Sort toggle','medium'),T('wpg14','Null consistent','medium'),T('wpg15','Sort indicator','low')]},
{id:'w-checkout',icon:'🛒',name:'Checkout',module:'web',tests:[
T('wco01','Add cart','critical'),T('wco02','Remove cart','critical'),T('wco03','Cart total','critical'),
T('wco04','Coupon','high'),T('wco05','Invalid coupon','high'),T('wco06','Shipping','high'),
T('wco07','Tax','high'),T('wco08','Summary','critical'),T('wco09','Guest checkout','high'),
T('wco10','Valid pay','critical'),T('wco11','Invalid pay','critical'),T('wco12','Confirmation','critical'),
T('wco13','Email sent','high'),T('wco14','Out of stock','critical'),T('wco15','Qty stock','high'),
T('wco16','Double pay','critical'),T('wco17','Cart persists','medium'),T('wco18','Multi methods','high'),T('wco19','Order history','high')]},
{id:'w-profile',icon:'👤',name:'User Profile',module:'web',tests:[
T('wpr01','Data correct','high'),T('wpr02','Name saves','high'),T('wpr03','Email verify','high'),
T('wpr04','Old pass','critical'),T('wpr05','Strength','high'),T('wpr06','Avatar','medium'),
T('wpr07','Notif prefs','high'),T('wpr08','Privacy','high'),T('wpr09','Delete confirm','high'),
T('wpr10','Deleted no login','critical'),T('wpr11','Activity log','low'),T('wpr12','Connected','medium')]},
{id:'w-email',icon:'📧',name:'Email',module:'web',tests:[
T('wem01','Welcome','high'),T('wem02','Reset','high'),T('wem03','Links work','high'),
T('wem04','Gmail','high'),T('wem05','Outlook','high'),T('wem06','Unsubscribe','high'),
T('wem07','In-app count','medium'),T('wem08','Mark read','medium'),T('wem09','Mark all','medium'),
T('wem10','Personal','medium'),T('wem11','Not spam','medium')]},
{id:'w-i18n',icon:'🌍',name:'i18n',module:'web',tests:[
T('wi01','Language','high'),T('wi02','Translated','high'),T('wi03','Date locale','high'),
T('wi04','12/24h','medium'),T('wi05','Currency','high'),T('wi06','RTL','medium'),
T('wi07','Unicode','medium'),T('wi08','Long text','medium'),T('wi09','Decimal','medium'),T('wi10','Thousands','medium')]},
// APP
{id:'a-install',icon:'📲',name:'Installation',module:'app',tests:[
T('ai01','Install','critical','app'),T('ai02','Launch','critical','app'),T('ai03','Splash','medium','app'),
T('ai04','Icon','medium','app'),T('ai05','Name','medium','app'),T('ai06','Update','high','app'),
T('ai07','Uninstall','high','app'),T('ai08','Reinstall','high','app'),T('ai09','Size','low','app'),
T('ai10','Onboard','high','app'),T('ai11','Skip onboard','medium','app')]},
{id:'a-auth',icon:'🔐',name:'App Auth',module:'app',tests:[
T('aa01','Login','critical','app'),T('aa02','Invalid','critical','app'),T('aa03','Biometric','high','app'),
T('aa04','PIN','high','app'),T('aa05','Auto-login','medium','app'),T('aa06','Forgot','high','app'),
T('aa07','Session bg','medium','app'),T('aa08','Timeout','high','app'),T('aa09','Logout','high','app'),
T('aa10','Multi acc','medium','app'),T('aa11','Social','high','app'),T('aa12','Bio fallback','high','app')]},
{id:'a-nav',icon:'🧭',name:'App Nav',module:'app',tests:[
T('an01','Tabs','high','app'),T('an02','Drawer','high','app'),T('an03','Back','high','app'),
T('an04','HW back','high','app'),T('an05','iOS swipe','high','app'),T('an06','Deep link','medium','app'),
T('an07','Push screen','high','app'),T('an08','No stack','medium','app'),T('an09','Tab state','medium','app'),T('an10','Scroll','low','app')]},
{id:'a-offline',icon:'📡',name:'Offline',module:'app',tests:[
T('ao01','Indicator','high','app'),T('ao02','Core offline','high','app'),T('ao03','Sync','critical','app'),
T('ao04','Slow','high','app'),T('ao05','Airplane','high','app'),T('ao06','WiFi to cell','medium','app'),
T('ao07','Timeout','medium','app'),T('ao08','Queue','high','app'),T('ao09','Cache','medium','app'),T('ao10','No dup','critical','app')]},
{id:'a-notif',icon:'🔔',name:'Notifications',module:'app',tests:[
T('apn01','Foreground','high','app'),T('apn02','Background','high','app'),T('apn03','Killed','high','app'),
T('apn04','Tap screen','high','app'),T('apn05','Badge','medium','app'),T('apn06','Sound','low','app'),
T('apn07','Rich','medium','app'),T('apn08','Opt-out','high','app'),T('apn09','Local','medium','app'),T('apn10','Clear','medium','app')]},
{id:'a-perm',icon:'🔑',name:'Permissions',module:'app',tests:[
T('ap01','Camera ask','high','app'),T('ap02','Camera works','high','app'),T('ap03','Gallery','high','app'),
T('ap04','Location ask','high','app'),T('ap05','Location works','high','app'),T('ap06','Mic','medium','app'),
T('ap07','Contacts','medium','app'),T('ap08','Denied','high','app'),T('ap09','Revoked','high','app'),T('ap10','No unnecessary','high','app')]},
{id:'a-gesture',icon:'👆',name:'Gestures',module:'app',tests:[
T('ag01','Single tap','critical','app'),T('ag02','No double','critical','app'),T('ag03','Long press','medium','app'),
T('ag04','Swipe','medium','app'),T('ag05','Pull refresh','high','app'),T('ag06','Pinch','medium','app'),
T('ag07','Scroll','high','app'),T('ag08','Touch 44pt','high','app'),T('ag09','Swipe del','medium','app')]},
{id:'a-device',icon:'📱',name:'Devices',module:'app',tests:[
T('ad01','Small','high','app'),T('ad02','Standard','high','app'),T('ad03','Large','high','app'),
T('ad04','Tablet','medium','app'),T('ad05','Notch','high','app'),T('ad06','Density','medium','app'),
T('ad07','Android new','critical','app'),T('ad08','Android prev','high','app'),T('ad09','iOS new','critical','app'),T('ad10','iOS prev','high','app')]},
{id:'a-bg',icon:'🔄',name:'Background',module:'app',tests:[
T('ab01','Resume','high','app'),T('ab02','State kept','high','app'),T('ab03','Long bg','high','app'),
T('ab04','Call no crash','high','app'),T('ab05','Switch','high','app'),T('ab06','Memory','high','app'),
T('ab07','Lock','medium','app'),T('ab08','Orientation','medium','app'),T('ab09','OS kill','high','app')]},
{id:'a-perf',icon:'⚡',name:'App Perf',module:'app',tests:[
T('ape01','Launch < 3s','high','app'),T('ape02','Smooth','high','app'),T('ape03','Large list','high','app'),
T('ape04','Placeholder','medium','app'),T('ape05','No leak','high','app'),T('ape06','Battery','medium','app'),
T('ape07','Size','medium','app'),T('ape08','No ANR','critical','app')]},
{id:'a-camera',icon:'📷',name:'Camera',module:'app',tests:[
T('acm01','Capture','high','app'),T('acm02','Preview','medium','app'),T('acm03','Switch','medium','app'),
T('acm04','Flash','low','app'),T('acm05','Video','medium','app'),T('acm06','Gallery','high','app'),
T('acm07','Crop','medium','app'),T('acm08','Compress','medium','app')]},
{id:'a-update',icon:'🆕',name:'Updates',module:'app',tests:[
T('aup01','Force','critical','app'),T('aup02','Optional','medium','app'),T('aup03','No loss','critical','app'),
T('aup04','Features','high','app'),T('aup05','Backward','high','app')]}
]};

// Initialize state
state=JSON.parse(JSON.stringify(DEF));

// ===================== SAVE =====================
function save(){
  if(currentUser){
    try{localStorage.setItem('qaUI_'+currentUser.id,JSON.stringify({theme:ui.theme,collapsed:ui.collapsed,mod:ui.mod,view:ui.view}));}catch(e){}
    saveDraft();
  }
  clearTimeout(autoSaveTimer);
  autoSaveTimer=setTimeout(function(){
    if(authToken)api('PUT','/api/data',{data:state});
  },2000);
}

// ===================== THEME =====================
function applyTheme(t){ui.theme=t;document.documentElement.setAttribute('data-theme',t);save();}
function toggleTheme(){applyTheme(ui.theme==='dark'?'light':'dark');toast('info','Theme',ui.theme==='dark'?'Dark mode':'Light mode');}

// ===================== VIEWS =====================
function switchView(v){
  ui.view=v;$$('.nl[data-v]').forEach(function(b){b.classList.toggle('active',b.dataset.v===v);});
  $$('.vw').forEach(function(el){el.hidden=true;});
  var map={testing:'vTesting',history:'vHistory',portfolio:'vPortfolio',automation:'vAutomation',sheet:'vSheet',worksheet:'vWorksheet',users:'vUsers'};
  var el=document.getElementById(map[v]);if(el){el.hidden=false;el.scrollIntoView({behavior:'smooth',block:'start'});}
  var titles={testing:'📋 Test Execution',history:'📅 History',portfolio:'📊 Portfolio',automation:'🤖 Automation',sheet:'📑 Sheet',worksheet:'📝 Worksheet',users:'👥 Users'};
  var mt=$('#mT');if(mt)mt.textContent=titles[v]||v;save();
  if(v==='history')renderHist();else if(v==='portfolio')renderPort();else if(v==='automation')renderAuto();
  else if(v==='sheet')renderSheet();else if(v==='worksheet')renderWs();else if(v==='users')renderUsers();
}

// ===================== MODULE =====================
function setMod(m,s){ui.mod=m;$$('.ml').forEach(function(n){n.classList.toggle('active',n.dataset.m===m);});if(!s)save();}
function switchMod(m){setMod(m);ui.search='';ui.fCat='all';ui.fPri='all';ui.fSt='all';var s=$('#sIn');if(s)s.value='';['fC','fP','fS'].forEach(function(id){var e=$('#'+id);if(e)e.value='all';});popCatFlt();render();}
function curCats(){return state.categories.filter(function(c){return c.module===ui.mod;});}

// ===================== PROJECT =====================
function popProj(){var sel=$('#projSel');if(!sel)return;sel.innerHTML='';state.projects.forEach(function(p){var o=document.createElement('option');o.value=p.id;o.textContent=p.name;sel.appendChild(o);});sel.value=state.currentProject;updProjDisp();}
function updProjDisp(){var p=state.projects.find(function(p){return p.id===state.currentProject;});var tp=$('#tP');if(tp)tp.textContent=p?p.name:'No project';popCyc();}
function popCyc(){var sel=$('#cycSel');if(!sel)return;var cycs=state.cycles[state.currentProject]||[];sel.innerHTML='';cycs.forEach(function(c){var o=document.createElement('option');o.value=c.num;o.textContent=c.name+' ('+c.date+')';sel.appendChild(o);});sel.value=state.currentCycle;var c=cycs.find(function(c){return c.num===state.currentCycle;});var tc=$('#tC');if(tc)tc.textContent=c?c.name:'Cycle 1';}
function newProj(){editProjId=null;$('#mPT').innerHTML='<span class="add-icon mh-icon">+</span> New Project';$('#pN').value='';$('#pDe').value='';openM('mProj');}
function editProj(){var p=state.projects.find(function(x){return x.id===state.currentProject;});if(!p)return;editProjId=p.id;$('#mPT').textContent='✏️ Edit';$('#pN').value=p.name;$('#pDe').value=p.desc||'';openM('mProj');}
function saveProj(){var form=$('#mProj');if(form)clearFormErrors(form);var nm=$('#pN');if(!validateText(nm,'Project name',2))return;var desc=$('#pDe').value||'';var id; if(editProjId){var p=state.projects.find(function(x){return x.id===editProjId;});if(p){p.name=nm.value.trim();p.desc=desc;}closeM('mProj');popProj();save();toast('success','Updated','Done');}else{id=uid('proj');state.projects.push({id:id,name:nm.value.trim(),desc:desc,created:ds()});state.cycles[id]=[{num:1,date:ds(),name:'Cycle 1'}];state.sheet.push({id:uid('sh'),name:nm.value.trim(),type:'web',status:'testing',received:ds(),mailed:'',started:ds(),submitted:'',cycles:0,bugs:0,remarks:'Auto-added'});state.currentProject=id;state.currentCycle=1;closeM('mProj');popProj();save();toast('success','Created','Project created');}}
function delProj(){if(state.projects.length<=1){toast('danger','Error','Cannot delete only project');return;}delType='project';delId=state.currentProject;$('#dMsg').textContent='Delete project?';openM('mDel');}
function newCyc(){var cycs=state.cycles[state.currentProject]||[];var num=cycs.length+1;cycs.push({num:num,date:ds(),name:'Cycle '+num});state.cycles[state.currentProject]=cycs;state.currentCycle=num;state.categories.forEach(function(c){c.tests.forEach(function(t){t.status='pending';t.changedAt=null;t.changedDate=null;});});save();popCyc();render();toast('success','Cycle','Cycle '+num);}
function editCyc(){var cycs=state.cycles[state.currentProject]||[];var c=cycs.find(function(c){return c.num===state.currentCycle;});if(!c)return;editCycNum=c.num;$('#mCT').textContent='✏️ Edit';$('#cyN').value=c.name;$('#cyD').value=c.date;openM('mCyc');}
function saveCyc(){var form=$('#mCyc');if(form)clearFormErrors(form);var cycs=state.cycles[state.currentProject]||[];var c=cycs.find(function(c){return c.num===editCycNum;});if(!c)return;var n=$('#cyN');var d=$('#cyD');var valid=true;valid=validateText(n,'Cycle name',2)&&valid;valid=validateDate(d,'Cycle date')&&valid;if(!valid)return;c.name=n.value.trim();c.date=d.value;closeM('mCyc');popCyc();save();toast('success','Updated','Cycle updated');}
function delCyc(){var cycs=state.cycles[state.currentProject]||[];if(cycs.length<=1){toast('danger','Error','Cannot delete only cycle');return;}delType='cycle';delId=state.currentCycle;$('#dMsg').textContent='Delete cycle?';openM('mDel');}
function saveTest(){var form=$('#mAdd');if(form)clearFormErrors(form);var nm=$('#aN');var cat=$('#aC');var mod=$('#aM');var valid=true;valid=validateText(nm,'Test name',3)&&valid;valid=validateSelect(cat,'Category')&&valid;valid=validateSelect(mod,'Module')&&valid; if(cat&&cat.value==='__new__'){var cn=$('#aCN');valid=validateText(cn,'New category',2)&&valid;} if(!valid) return;var nameValue=nm.value.trim();if(editId){var r=findT(editId);if(r){r.test.name=nameValue;r.test.priority=$('#aP').value||'medium';}closeM('mAdd');render();toast('success','Updated','Done');return;}var catId=cat.value;var moduleValue=mod.value||ui.mod;if(catId==='__new__'){var cn=$('#aCN').value.trim();catId=uid('cat');state.categories.push({id:catId,icon:'📌',name:cn,module:moduleValue,tests:[]});ui.collapsed[catId]=true;}var category=state.categories.find(function(c){return c.id===catId;});if(!category)return;category.tests.push(T(uid(catId.slice(0,6)),nameValue,$('#aP').value||'medium',moduleValue));$('#aN').value='';$('#aCN').value='';closeM('mAdd');popCatFlt();render();toast('success','Added',nameValue);}

// ===================== STATS =====================
function compStats(){var t=0,p=0,f=0,b=0,s=0;curCats().forEach(function(c){c.tests.forEach(function(x){t++;if(x.status==='passed')p++;else if(x.status==='failed')f++;else if(x.status==='blocked')b++;else if(x.status==='skipped')s++;});});var d=p+f+b+s;return{t:t,p:p,f:f,b:b,s:s,pe:t-d,tested:d,pct:t?Math.round(d/t*100):0,pr:t?Math.round(p/t*100):0,fr:t?Math.round(f/t*100):0};}
function updStats(){var s=compStats();function S(i,v){var e=document.getElementById(i);if(e)e.textContent=v;}S('xT',s.t);S('xP',s.p);S('xF',s.f);S('xB',s.b);S('xS',s.s);S('xPe',s.pe);S('xPR',s.pr+'%');S('xFR',s.fr+'%');S('pV',s.pct+'%');S('lgP',s.p);S('lgF',s.f);S('lgB',s.b);S('lgS',s.s);S('lgPe',s.pe);function seg(i,w){var e=document.getElementById(i);if(e)e.style.width=(s.t?w/s.t*100:0)+'%';}seg('sgP',s.p);seg('sgF',s.f);seg('sgB',s.b);seg('sgS',s.s);var wt=0,at=0;state.categories.forEach(function(c){c.tests.forEach(function(){if(c.module==='web')wt++;else at++;});});S('nW',wt);S('nA',at);var ti=$('#tI');if(ti)ti.textContent=s.t+' tests · '+s.pct+'%';}

// ===================== RENDER + TEST OPS + MODALS + VIEWS + EXPORTS + IMPORTS =====================
function matchT(t){if(ui.search){var q=ui.search.toLowerCase();if(t.name.toLowerCase().indexOf(q)===-1&&t.id.toLowerCase().indexOf(q)===-1)return false;}if(ui.fPri!=='all'&&t.priority!==ui.fPri)return false;if(ui.fSt!=='all'&&t.status!==ui.fSt)return false;return true;}
function hl(t,q){if(!q)return esc(t);var r=new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');return esc(t).replace(r,'<mark>$1</mark>');}
function popCatFlt(){var fc=$('#fC');if(!fc)return;var c=fc.value;fc.innerHTML='<option value="all">All Categories</option>';curCats().forEach(function(cat){var o=document.createElement('option');o.value=cat.id;o.textContent=cat.icon+' '+cat.name;fc.appendChild(o);});fc.value=(c&&fc.querySelector('option[value="'+c+'"]'))?c:'all';}
function popAddCats(){var mc=$('#aC');if(!mc)return;mc.innerHTML='';curCats().forEach(function(c){var o=document.createElement('option');o.value=c.id;o.textContent=c.icon+' '+c.name;mc.appendChild(o);});var s=document.createElement('option');s.value='__new__';s.textContent='— ➕ New —';mc.appendChild(s);var am=$('#aM');if(am)am.value=ui.mod;}
function render(){var root=$('#tL'),emp=$('#emp');if(!root)return;root.innerHTML='';var cnt=0;var q=ui.search?ui.search.toLowerCase():'';curCats().forEach(function(cat){if(ui.fCat!=='all'&&cat.id!==ui.fCat)return;var vis=cat.tests.filter(matchT);if(!vis.length)return;cnt+=vis.length;var cp=0,cf=0;vis.forEach(function(t){if(t.status==='passed')cp++;else if(t.status==='failed')cf++;});var rows='';vis.forEach(function(t){var ck=t.status==='passed'?'checked':'';var dt=t.changedDate?'<div class="row-dt">'+esc(t.changedDate)+'</div>':'';rows+='<div class="row" data-t="'+esc(t.id)+'" data-s="'+esc(t.status)+'" data-n="0"><input type="checkbox" class="row-cb" '+ck+'><div class="row-info"><div class="row-id"><span class="row-dot d-'+esc(t.status)+'"></span>'+esc(t.id.toUpperCase().replace(/-/g,'_'))+'</div><div class="row-nm">'+hl(t.name,q)+'</div>'+dt+'</div><span class="row-pri p-'+esc(t.priority)+'">'+esc(t.priority)+'</span><div class="row-acts"><button class="ab ab-f">✗</button><button class="ab ab-b">⊘</button><button class="ab ab-s">⏭</button><button class="ab ab-n">📝</button><button class="ab ab-e">✏️</button><button class="ab ab-del">🗑</button></div><div class="row-notes"><textarea placeholder="Notes…">'+esc(t.notes||'')+'</textarea></div></div>';});var card=document.createElement('article');card.className='cat';card.dataset.cat=cat.id;card.dataset.cl=ui.collapsed[cat.id]?'1':'0';card.innerHTML='<div class="cat-h" role="button" tabindex="0"><div class="cat-l"><div class="cat-ic">'+esc(cat.icon||'📁')+'</div><div><div class="cat-n">'+esc(cat.name)+'</div><div class="cat-m">'+vis.length+' · ✅'+cp+' · ❌'+cf+'</div></div></div><div class="cat-r"><span class="cat-b cbp">'+cp+'✓</span><span class="cat-b cbf">'+cf+'✗</span><div class="cat-a">▼</div></div></div><div class="cat-body">'+rows+'</div>';root.appendChild(card);});if(emp)emp.hidden=cnt>0;updStats();save();}
function findT(id){for(var i=0;i<state.categories.length;i++){var c=state.categories[i];for(var j=0;j<c.tests.length;j++){if(c.tests[j].id===id)return{cat:c,test:c.tests[j],idx:j};}}return null;}
function setSt(id,st){var r=findT(id);if(!r)return;var now=new Date();r.test.status=st;r.test.changedAt=now.toISOString();r.test.changedDate=now.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});var key=ds();if(!state.history[key])state.history[key]=[];state.history[key].push({testId:id,testName:r.test.name,category:r.cat.name,status:st,time:now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),user:currentUser?currentUser.name:''});save();var row=$('.row[data-t="'+id+'"]');if(row){row.dataset.s=st;var cb=row.querySelector('.row-cb');if(cb)cb.checked=st==='passed';var dot=row.querySelector('.row-dot');if(dot)dot.className='row-dot d-'+st;var dtEl=row.querySelector('.row-dt');if(!dtEl){var info=row.querySelector('.row-info');if(info){dtEl=document.createElement('div');dtEl.className='row-dt';info.appendChild(dtEl);}}if(dtEl)dtEl.textContent=r.test.changedDate;}updStats();var card=$('.cat[data-cat="'+r.cat.id+'"]');if(card){var vis=r.cat.tests.filter(matchT);var cp2=0,cf2=0;vis.forEach(function(t){if(t.status==='passed')cp2++;else if(t.status==='failed')cf2++;});var bp=card.querySelector('.cbp');if(bp)bp.textContent=cp2+'✓';var bf=card.querySelector('.cbf');if(bf)bf.textContent=cf2+'✗';}}
var saveNote=deb(function(id,v){var r=findT(id);if(r){r.test.notes=v;save();}},500);
function openM(id){var el=document.getElementById(id);if(!el)return;el.style.display='flex';requestAnimationFrame(function(){requestAnimationFrame(function(){el.classList.add('on');});});}
function closeM(id){var el=document.getElementById(id);if(!el)return;el.classList.remove('on');setTimeout(function(){if(!el.classList.contains('on'))el.style.display='none';},320);}
function setButtonTitles(){var iconMap={'✏️':'Edit','🗑':'Delete','⊘':'Clear','⏭':'Advance','📝':'Notes','↻':'Reset','💾':'Save','🚪':'Sign Out','☰':'Menu','🔍':'Search','☀️':'Light theme','🌙':'Dark theme','📤':'Export','📥':'Import','🔄':'Reset','✅':'Confirm','❌':'Cancel','📅':'Date','👤':'Profile'};document.querySelectorAll('button').forEach(function(btn){if(btn.title)return;var txt=(btn.getAttribute('aria-label')||btn.textContent||'').trim();if(!txt)return;txt=txt.replace(/\s+/g,' ').trim();if(iconMap[txt])btn.title=iconMap[txt];else btn.title=txt;});}
function getAutoTopics(text,oldTopics){var lines=String(text||'').split(/\r?\n/).map(function(t){return t.trim();}).filter(Boolean);return lines.map(function(title){var found=(oldTopics||[]).find(function(x){return x.title===title;});return{title:title,done:found?found.done:false};});}
function computeAutoProgress(item){if(item&&item.topics&&item.topics.length){var done=item.topics.filter(function(t){return t.done;}).length;return Math.round(done/item.topics.length*100);}return item&&item.progress?item.progress:0;}
function toggleAuTopic(id,index){var a=state.automation.find(function(x){return x.id===id;});if(!a||!a.topics||!a.topics[index])return;a.topics[index].done=!a.topics[index].done;a.progress=computeAutoProgress(a);save();renderAuto();}
function openRestorePrompt(data,draftTime,serverTime){pendingRestoreData=data;var note='You have a saved draft from a previous session.'; if(draftTime){note='You have a saved draft from '+draftTime.toLocaleString()+'.';} if(serverTime){var diff=Math.max(0,Math.round((draftTime-serverTime)/60000));note+=' Current saved data is older by '+diff+' min.';} var msg=$('#restoreMsg'); if(msg)msg.textContent=note; openM('mRestore');}
function restorePreviousDraft(){if(pendingRestoreData){state=pendingRestoreData;pendingRestoreData=null;save();render();closeM('mRestore');toast('success','Restored','Previous session restored.');}else closeM('mRestore');}
function discardPreviousDraft(){pendingRestoreData=null;clearDraft();closeM('mRestore');toast('info','Discarded','Previous draft removed.');}
function closeAll(){$$('.ov.on').forEach(function(o){o.classList.remove('on');setTimeout(function(){if(!o.classList.contains('on'))o.style.display='none';},320);});}
function openAddM(){editId=null;$('#mAT').innerHTML='<span class="add-icon mh-icon">+</span> Add Test';$('#aN').value='';$('#aCN').value='';$('#nCR').hidden=true;popAddCats();openM('mAdd');}
function openEditM(id){var r=findT(id);if(!r)return;editId=id;$('#mAT').textContent='✏️ Edit';popAddCats();$('#aC').value=r.cat.id;$('#aN').value=r.test.name;$('#aP').value=r.test.priority;$('#aM').value=r.cat.module;$('#nCR').hidden=true;openM('mAdd');}
function confirmDel(id){var r=findT(id);if(!r)return;delType='test';delId=id;$('#dMsg').textContent='Delete "'+r.test.name+'"?';openM('mDel');}
function execDel(){if(delType==='test'){for(var i=0;i<state.categories.length;i++){var idx=-1;for(var j=0;j<state.categories[i].tests.length;j++){if(state.categories[i].tests[j].id===delId){idx=j;break;}}if(idx!==-1){state.categories[i].tests.splice(idx,1);break;}}closeM('mDel');popCatFlt();render();}else if(delType==='project'){state.projects=state.projects.filter(function(p){return p.id!==delId;});delete state.cycles[delId];state.currentProject=state.projects[0].id;state.currentCycle=1;closeM('mDel');popProj();save();render();}else if(delType==='cycle'){var cycs=state.cycles[state.currentProject]||[];state.cycles[state.currentProject]=cycs.filter(function(c){return c.num!==delId;});var rem=state.cycles[state.currentProject];state.currentCycle=rem.length?rem[0].num:1;closeM('mDel');popCyc();save();}else if(delType==='portfolio'){state.portfolio=state.portfolio.filter(function(p){return p.id!==delId;});closeM('mDel');renderPort();save();}else if(delType==='automation'){state.automation=state.automation.filter(function(a){return a.id!==delId;});closeM('mDel');renderAuto();save();}else if(delType==='sheet'){state.sheet=state.sheet.filter(function(s){return s.id!==delId;});closeM('mDel');renderSheet();save();}else if(delType==='worksheet'){state.worksheet=state.worksheet.filter(function(w){return w.id!==delId;});closeM('mDel');renderWs();save();}delId=null;delType=null;toast('success','Deleted','Done');}
// All renders
function renderHist(fd){var el=$('#hR');if(!el)return;el.innerHTML='';var dates=Object.keys(state.history).sort().reverse();if(fd)dates=dates.filter(function(d){return d===fd;});if(!dates.length){el.innerHTML='<div class="empty"><div class="eic">📅</div><h3>No history</h3></div>';return;}dates.forEach(function(date){var items=state.history[date];var div=document.createElement('div');div.className='hday';var h='<div class="hdate">📅 '+date+' — '+dayName(date)+' ('+items.length+')</div>';items.forEach(function(x){h+='<div class="hitm"><span class="htme">'+esc(x.time)+'</span><span class="hst hs-'+esc(x.status)+'">'+esc(x.status)+'</span><span style="flex:1;font-weight:600;font-size:11px">'+esc(x.testName)+'</span><span style="color:var(--mt);font-size:10px">'+esc(x.user||'')+'</span></div>';});div.innerHTML=h;el.appendChild(div);});}
function renderPort(){var el=$('#ptL');if(!el)return;el.innerHTML='';var wc=0,ac=0,au=0;state.portfolio.forEach(function(p){if(p.type==='web')wc++;else if(p.type==='app')ac++;else au++;});$('#psW').textContent=wc;$('#psA').textContent=ac;$('#psAu').textContent=au;$('#psT').textContent=state.portfolio.length;if(!state.portfolio.length){el.innerHTML='<div class="empty"><div class="eic">📊</div><h3>No projects</h3></div>';return;}state.portfolio.forEach(function(p){el.innerHTML+='<div class="pitm"><span class="ptype pt-'+esc(p.type)+'">'+esc(p.type)+'</span><div class="pinfo"><div class="pnm">'+esc(p.name)+'</div><div class="pmt">'+(p.tc||0)+' tests · '+(p.bugs||0)+' bugs</div></div><span class="psts pst-'+esc(p.status)+'">'+esc(p.status.replace(/-/g,' '))+'</span><div class="pacts"><button class="ab ab-e" onclick="editPo(\''+p.id+'\')">✏️</button><button class="ab ab-del" onclick="delPo(\''+p.id+'\')">🗑</button></div></div>';});}
function savePo(){var form=$('#mPort');if(form)clearFormErrors(form);var nm=$('#poN');var ty=$('#poTy');var st=$('#poSt');var tc=$('#poTC');var bg=$('#poBg');var valid=true;valid=validateText(nm,'Project name',2)&&valid;valid=validateSelect(ty,'Project type')&&valid;valid=validateSelect(st,'Status')&&valid;valid=validateNumber(tc,'Tests')&&valid;valid=validateNumber(bg,'Bugs')&&valid;if(!valid)return;var e={id:editPortId||uid('port'),name:nm.value.trim(),type:ty.value,status:st.value,tc:parseInt(tc.value)||0,bugs:parseInt(bg.value)||0,remarks:$('#poRm').value||''};if(editPortId){var i=state.portfolio.findIndex(function(p){return p.id===editPortId;});if(i!==-1)state.portfolio[i]=e;}else state.portfolio.push(e);editPortId=null;closeM('mPort');renderPort();save();toast('success','Saved','Done');}
window.editPo=function(id){var p=state.portfolio.find(function(x){return x.id===id;});if(!p)return;editPortId=id;$('#mPoT').textContent='✏️ Edit';$('#poN').value=p.name;$('#poTy').value=p.type;$('#poSt').value=p.status;$('#poTC').value=p.tc||0;$('#poBg').value=p.bugs||0;$('#poRm').value=p.remarks||'';openM('mPort');};
window.delPo=function(id){delType='portfolio';delId=id;$('#dMsg').textContent='Delete?';openM('mDel');};
function renderAuto(){var el=$('#auL');if(!el)return;el.innerHTML='';if(!state.automation.length){el.innerHTML='<div class="empty"><div class="eic">🤖</div><h3>No suites</h3></div>';return;}state.automation.forEach(function(a){var progress=computeAutoProgress(a);var c=progress>=80?'var(--ok)':progress>=50?'var(--pm)':'var(--wn)';var topicsHtml='';if(a.topics&&a.topics.length){topicsHtml='<div class="topic-list">';a.topics.forEach(function(t,i){topicsHtml+='<label class="topic-item"><input type="checkbox" '+(t.done?'checked':'')+' onchange="toggleAuTopic('+JSON.stringify(a.id)+','+i+')"><span>'+esc(t.title)+'</span></label>';});topicsHtml+='</div>';}el.innerHTML+='<div class="aitm"><span class="atool">'+esc(a.tool)+'</span><span class="atype">'+esc(a.type)+'</span><div class="ainfo"><div class="anm">'+esc(a.name)+'</div><div class="amt">'+(a.remarks?esc(a.remarks):'—')+'</div>'+(a.topics&&a.topics.length?'<div class="topic-summary">'+a.topics.filter(function(t){return t.done;}).length+' / '+a.topics.length+' topics completed</div>':'')+'</div><div class="aprog"><div class="aprog-bar"><div class="aprog-fill" style="width:'+progress+'%;background:'+c+'"></div></div><div class="aprog-val" style="color:'+c+'">'+progress+'%</div></div>'+topicsHtml+'<div class="pacts"><button class="ab ab-e" onclick="editAu('+JSON.stringify(a.id)+')">✏️</button><button class="ab ab-del" onclick="delAu('+JSON.stringify(a.id)+')">🗑</button></div></div>';});}
function saveAu(){var form=$('#mAuto');if(form)clearFormErrors(form);var nm=$('#auN');var tool=$('#auTool');var type=$('#auType');var prog=$('#auProg');var valid=true;valid=validateText(nm,'Suite name',3)&&valid;valid=validateSelect(tool,'Tool')&&valid;valid=validateSelect(type,'Suite type')&&valid;valid=validateNumber(prog,'Progress')&&valid;var progress=parseInt(prog.value)||0;if(progress<0||progress>100){showFieldError(prog,'Progress must be between 0 and 100');valid=false;}if(!valid)return;var oldTopics=editAutoId?(state.automation.find(function(a){return a.id===editAutoId;})||{}).topics||[]:[];var topics=getAutoTopics($('#auTopics')?$('#auTopics').value:'',oldTopics);if(topics.length)progress=computeAutoProgress({topics:topics});var e={id:editAutoId||uid('auto'),name:nm.value.trim(),tool:tool.value,type:type.value,progress:progress,remarks:$('#auRm').value||'',topics:topics};if(editAutoId){var i=state.automation.findIndex(function(a){return a.id===editAutoId;});if(i!==-1)state.automation[i]=e;}else state.automation.push(e);editAutoId=null;closeM('mAuto');renderAuto();save();toast('success','Saved','Done');}
window.editAu=function(id){var a=state.automation.find(function(x){return x.id===id;});if(!a)return;editAutoId=id;$('#mAuT').textContent='✏️ Edit';$('#auN').value=a.name;$('#auTool').value=a.tool;$('#auType').value=a.type;$('#auProg').value=a.progress||0;$('#auProgVal').textContent=(a.progress||0)+'%';$('#auRm').value=a.remarks||'';$('#auTopics').value=(a.topics||[]).map(function(t){return t.title;}).join('\n');openM('mAuto');};
window.delAu=function(id){delType='automation';delId=id;$('#dMsg').textContent='Delete?';openM('mDel');};
function renderSheet(){var tb=$('#shB');if(!tb)return;tb.innerHTML='';if(!state.sheet.length){tb.innerHTML='<tr><td colspan="11" style="text-align:center;padding:32px;color:var(--mt)">No entries</td></tr>';return;}state.sheet.forEach(function(s){tb.innerHTML+='<tr><td><b>'+esc(s.name)+'</b></td><td>'+esc(s.type)+'</td><td>'+esc(s.received||'—')+'</td><td>'+esc(s.mailed||'—')+'</td><td>'+esc(s.started||'—')+'</td><td>'+esc(s.submitted||'—')+'</td><td style="text-align:center;font-weight:800">'+(s.cycles||0)+'</td><td style="text-align:center;font-weight:800;color:var(--no)">'+(s.bugs||0)+'</td><td><span class="shst sh-'+esc(s.status)+'">'+esc(s.status)+'</span></td><td style="color:var(--mt)">'+esc(s.remarks||'—')+'</td><td><div style="display:flex;gap:4px"><button class="ab ab-e" onclick="editSh(\''+s.id+'\')">✏️</button><button class="ab ab-del" onclick="delSh(\''+s.id+'\')">🗑</button></div></td></tr>';});}
function saveSh(){var form=$('#mSheet');if(form)clearFormErrors(form);var nm=$('#shN');var ty=$('#shTy');var st=$('#shSt');var rc=$('#shRc');var valid=true;valid=validateText(nm,'Project name',2)&&valid;valid=validateSelect(ty,'Type')&&valid;valid=validateSelect(st,'Status')&&valid;valid=validateDate(rc,'Received')&&valid;if(!valid)return;var e={id:editSheetId||uid('sh'),name:nm.value.trim(),type:ty.value,status:st.value,received:rc.value||'',mailed:$('#shMl').value||'',started:$('#shSr').value||'',submitted:$('#shSb').value||'',cycles:parseInt($('#shCy').value)||0,bugs:parseInt($('#shBg').value)||0,remarks:$('#shRm').value||''};if(editSheetId){var i=state.sheet.findIndex(function(s){return s.id===editSheetId;});if(i!==-1)state.sheet[i]=e;}else state.sheet.push(e);editSheetId=null;closeM('mSheet');renderSheet();save();toast('success','Saved','Done');}
window.editSh=function(id){var s=state.sheet.find(function(x){return x.id===id;});if(!s)return;editSheetId=id;$('#mShT').textContent='✏️ Edit';$('#shN').value=s.name;$('#shTy').value=s.type;$('#shSt').value=s.status;$('#shRc').value=s.received||'';$('#shMl').value=s.mailed||'';$('#shSr').value=s.started||'';$('#shSb').value=s.submitted||'';$('#shCy').value=s.cycles||0;$('#shBg').value=s.bugs||0;$('#shRm').value=s.remarks||'';openM('mSheet');};
window.delSh=function(id){delType='sheet';delId=id;$('#dMsg').textContent='Delete?';openM('mDel');};
function renderWs(){var tb=$('#wsB');if(!tb)return;tb.innerHTML='';if(!state.worksheet.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--mt)">No entries</td></tr>';return;}state.worksheet.slice().sort(function(a,b){return b.date.localeCompare(a.date);}).forEach(function(w){tb.innerHTML+='<tr><td><b>'+esc(w.date)+'</b></td><td style="color:var(--ac);font-weight:700">'+esc(w.day||dayName(w.date))+'</td><td style="font-weight:700">'+esc(w.title)+'</td><td style="white-space:normal;max-width:420px;color:var(--tx2)">'+esc(w.desc||'')+'</td><td><div style="display:flex;gap:4px"><button class="ab ab-e" onclick="editWs(\''+w.id+'\')">✏️</button><button class="ab ab-del" onclick="delWs(\''+w.id+'\')">🗑</button></div></td></tr>';});}
function saveWs(){var form=$('#mWs');if(form)clearFormErrors(form);var t=$('#wsTitle');var d=$('#wsD');var valid=true;valid=validateText(t,'Title',3)&&valid;valid=validateDate(d,'Date')&&valid;if(!valid)return;var e={id:editWsId||uid('ws'),date:d.value||ds(),day:dayName(d.value||ds()),title:t.value.trim(),desc:$('#wsDesc').value||''};if(editWsId){var i=state.worksheet.findIndex(function(w){return w.id===editWsId;});if(i!==-1)state.worksheet[i]=e;}else state.worksheet.push(e);editWsId=null;closeM('mWs');renderWs();save();toast('success','Saved','Done');}
window.editWs=function(id){var w=state.worksheet.find(function(x){return x.id===id;});if(!w)return;editWsId=id;$('#mWsT').textContent='✏️ Edit';$('#wsD').value=w.date;$('#wsTitle').value=w.title;$('#wsDesc').value=w.desc||'';openM('mWs');};
window.delWs=function(id){delType='worksheet';delId=id;$('#dMsg').textContent='Delete?';openM('mDel');};
// ===================== USER MANAGEMENT =====================
async function renderUsers(){
  if(!currentUser||currentUser.role!=='manager')return;
  showLoading();
  var pRes=await api('GET','/api/users/pending');
  var pList=$('#umPendingList');var pCount=$('#umPendingCount');
  if(pRes.ok&&pList){
    pCount.textContent=pRes.users?pRes.users.length:0;
    if(!pRes.users||!pRes.users.length){pList.innerHTML='<div class="empty" style="padding:20px"><p>No pending approvals 🎉</p></div>';}
    else{pList.innerHTML='';pRes.users.forEach(function(u){
      pList.innerHTML+='<div class="um-pending-item"><div class="um-pending-av">'+esc(u.avatar||'??')+'</div><div class="um-pending-info"><div class="um-pending-name">'+esc(u.name)+'</div><div class="um-pending-email">'+esc(u.email)+'</div><div class="um-pending-date">'+esc(u.createdAt?u.createdAt.split('T')[0]:'')+'</div></div><div class="um-pending-acts"><button class="btn btn-ok btn-xs" onclick="approveUser(\''+u.id+'\')">✅ Approve</button><button class="btn btn-d btn-xs" onclick="rejectUser(\''+u.id+'\')">❌ Reject</button></div></div>';
    });}
  }
  var aRes=await api('GET','/api/users');
  var aBody=$('#umUsersBody');var aCount=$('#umAllCount');
  hideLoading();
  if(aRes.ok&&aBody){
    aCount.textContent=aRes.users?aRes.users.length:0;
    aBody.innerHTML='';
    (aRes.users||[]).forEach(function(u){
      var isSelf=currentUser&&u.id===currentUser.id;
      var acts='';
      if(!isSelf){
        if(u.status==='pending')acts='<button class="btn btn-ok btn-xs" onclick="approveUser(\''+u.id+'\')">✅</button><button class="btn btn-d btn-xs" onclick="rejectUser(\''+u.id+'\')">❌</button>';
        else if(u.status==='approved')acts='<button class="btn btn-warn btn-xs" onclick="suspendUser(\''+u.id+'\')">⏸</button>';
        else acts='<button class="btn btn-ok btn-xs" onclick="activateUser(\''+u.id+'\')">✅</button>';
        acts+=' <button class="btn btn-g btn-xs" onclick="changeRole(\''+u.id+'\',\''+esc(u.name)+'\',\''+u.role+'\')">🔄</button>';
        acts+=' <button class="btn btn-d btn-xs" onclick="deleteUser(\''+u.id+'\',\''+esc(u.name)+'\')">🗑</button>';
      }else{acts='<span style="font-size:10px;color:var(--mt)">You</span>';}
      aBody.innerHTML+='<tr><td><b>'+esc(u.name)+'</b></td><td>'+esc(u.email)+'</td><td><span class="um-role um-role-'+esc(u.role)+'">'+esc(u.role)+'</span></td><td><span class="um-status um-st-'+esc(u.status)+'">'+esc(u.status)+'</span></td><td style="font-size:10px">'+esc(u.createdAt?u.createdAt.split('T')[0]:'')+'</td><td style="font-size:10px">'+esc(u.lastLogin?u.lastLogin.split('T')[0]:'Never')+'</td><td style="font-size:10px">'+esc(u.approvedBy||'—')+'</td><td><div style="display:flex;gap:3px;flex-wrap:wrap">'+acts+'</div></td></tr>';
    });
  }
}
window.approveUser=async function(id){showLoading();var r=await api('POST','/api/users/'+id+'/approve');hideLoading();if(r.ok){toast('success','Approved',r.msg||'Done');renderUsers();loadPendingCount();}else toast('danger','Error',r.msg||'Failed');};
window.rejectUser=async function(id){showLoading();var r=await api('POST','/api/users/'+id+'/reject');hideLoading();if(r.ok){toast('success','Rejected',r.msg||'Done');renderUsers();loadPendingCount();}else toast('danger','Error',r.msg||'Failed');};
window.suspendUser=async function(id){showLoading();var r=await api('POST','/api/users/'+id+'/suspend');hideLoading();if(r.ok){toast('info','Suspended',r.msg||'Done');renderUsers();}else toast('danger','Error',r.msg||'Failed');};
window.activateUser=async function(id){showLoading();var r=await api('POST','/api/users/'+id+'/activate');hideLoading();if(r.ok){toast('success','Activated',r.msg||'Done');renderUsers();}else toast('danger','Error',r.msg||'Failed');};
window.changeRole=function(id,name,role){roleChangeUserId=id;var rn=$('#roleUserName');if(rn)rn.textContent=name;var rs=$('#roleSelect');if(rs)rs.value=role;openM('mRole');};
window.deleteUser=async function(id,name){if(!confirm('Delete "'+name+'" permanently?'))return;showLoading();var r=await api('DELETE','/api/users/'+id);hideLoading();if(r.ok){toast('success','Deleted',r.msg||'Done');renderUsers();}else toast('danger','Error',r.msg||'Failed');};

// ===================== PROFILE =====================
function openProfile(){
  if(!currentUser)return;
  var pn=$('#profName');if(pn)pn.value=currentUser.name||'';
  var pe=$('#profEmail');if(pe)pe.value=currentUser.email||'';
  var pr=$('#profRoleDisplay');if(pr)pr.value=currentUser.role||'employee';
  var cp=$('#profCurPass');if(cp)cp.value='';
  var np=$('#profNewPass');if(np)np.value='';
  var av=$('#profAvatar');if(av)av.textContent=currentUser.avatar||getInitials(currentUser.name);
  openM('mProfile');
}
async function saveProfile(){
  var form=$('#mProfile');if(form)clearFormErrors(form);
  var pn=$('#profName');var name=pn?pn.value.trim():'';
  var cp=$('#profCurPass');var np=$('#profNewPass');
  var valid=true;
  valid = validateText(pn,'Full name',2) && valid;
  if(np&&np.value){valid = validateText(cp,'Current password',6) && valid;valid = validateText(np,'New password',6) && valid;}
  if(!valid){return;}
  var body={name:name};
  if(np&&np.value){body.currentPassword=cp.value;body.newPassword=np.value;}
  showLoading();
  var res=await api('PUT','/api/auth/profile',body);
  hideLoading();
  if(res.ok){
    currentUser.name=res.user.name;currentUser.avatar=res.user.avatar;
    updateUserUI();closeM('mProfile');toast('success','Saved','Profile updated');
  }else{toast('danger','Error',res.msg||'Failed');}
}

// ===================== EXPORTS =====================
function styledTable(t,h,c,r,s){var ths=h.map(function(hh,i){return'<th style="background:'+c[i%c.length]+';color:#fff;padding:12px 14px;font-size:9px;font-weight:800;text-transform:uppercase;text-align:left">'+hh+'</th>';}).join('');return'<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+esc(t)+'</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial;padding:28px;background:#eef0f7}.hdr{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:24px;border-radius:16px;margin-bottom:20px}.hdr h1{font-size:22px;font-weight:900;margin-bottom:4px}.hdr p{opacity:.8;font-size:12px}.wrap{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}table{width:100%;border-collapse:collapse}td{padding:11px 14px;border-bottom:1px solid #f1f5f9;font-size:12px}tr:nth-child(even) td{background:#f8fafc}</style></head><body><div class="hdr"><h1>'+esc(t)+'</h1><p>'+(s||tdy())+'</p></div><div class="wrap"><table><thead><tr>'+ths+'</tr></thead><tbody>'+r+'</tbody></table></div></body></html>';}
function styledWord(t,c,s){return'<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial;max-width:960px;margin:0 auto;padding:32px}.hdr{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:28px;border-radius:16px;margin-bottom:24px}.hdr h1{font-size:24px;font-weight:900;margin:0 0 6px}.hdr p{opacity:.85;font-size:12px;margin:0}table{width:100%;border-collapse:collapse;margin:10px 0}th{padding:10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;background:#f8fafc}td{padding:9px;border-bottom:1px solid #f1f5f9;font-size:11px}tr:nth-child(even) td{background:#f8fafc}</style></head><body><div class="hdr"><h1>'+esc(t)+'</h1><p>'+(s||tdy())+'</p></div>'+c+'</body></html>';}
function exportXLSX(){if(typeof XLSX==='undefined')return toast('danger','Error','XLSX not loaded');var wb=XLSX.utils.book_new();var s=compStats();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['QA REPORT'],['Generated',tdy()],[''],['Total',s.t],['Passed',s.p,s.pr+'%'],['Failed',s.f,s.fr+'%'],['Blocked',s.b],['Skipped',s.s],['Pending',s.pe]]),'Summary');var td=[['Category','Module','ID','Test','Priority','Status','Changed','Notes']];state.categories.forEach(function(c){c.tests.forEach(function(t){td.push([c.name,c.module,t.id.toUpperCase(),t.name,t.priority,t.status,t.changedDate||'',t.notes||'']);});});XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(td),'Tests');XLSX.writeFile(wb,'qa-report-'+ds()+'.xlsx');toast('success','Exported','Excel');}
function exportCSV(){var r=['\uFEFFCategory,Module,ID,Test,Priority,Status,Changed,Notes'];state.categories.forEach(function(c){c.tests.forEach(function(t){r.push('"'+c.name.replace(/"/g,'""')+'","'+c.module+'","'+t.id.toUpperCase()+'","'+t.name.replace(/"/g,'""')+'","'+t.priority+'","'+t.status+'","'+(t.changedDate||'')+'","'+(t.notes||'').replace(/"/g,'""')+'"');});});dl('qa-report-'+ds()+'.csv','text/csv;charset=utf-8',r.join('\n'));toast('success','Exported','CSV');}
function exportWord(){var s=compStats();var cats='';curCats().forEach(function(c){var rows=c.tests.map(function(t,i){return'<tr style="background:'+(i%2?'#f8fafc':'')+'"><td>'+t.id.toUpperCase()+'</td><td>'+esc(t.name)+'</td><td>'+t.priority+'</td><td>'+t.status+'</td></tr>';}).join('');cats+='<h3>'+esc(c.icon)+' '+esc(c.name)+'</h3><table><tr><th>ID</th><th>Test</th><th>Priority</th><th>Status</th></tr>'+rows+'</table>';});dl('qa-report-'+ds()+'.doc','application/msword;charset=utf-8',styledWord('QA Report','<p>Total:'+s.t+' Pass:'+s.p+' Fail:'+s.f+'</p>'+cats));toast('success','Exported','Word');}
function exportHTML(){var s=compStats();var cats='';curCats().forEach(function(c){var rows=c.tests.map(function(t,i){return'<tr style="background:'+(i%2?'#f8fafc':'')+'"><td style="padding:10px;font-family:monospace;font-size:9px;color:#94a3b8;border-bottom:1px solid #f1f5f9">'+esc(t.id.toUpperCase())+'</td><td style="padding:10px;font-size:12px;font-weight:600;border-bottom:1px solid #f1f5f9">'+esc(t.name)+'</td><td style="padding:10px;text-align:center;border-bottom:1px solid #f1f5f9">'+t.priority+'</td><td style="padding:10px;text-align:center;border-bottom:1px solid #f1f5f9">'+t.status+'</td></tr>';}).join('');cats+='<div style="margin-bottom:24px"><h3 style="color:#6366f1;border-left:4px solid #6366f1;padding:8px 12px;background:#6366f108;border-radius:0 8px 8px 0;margin-bottom:8px">'+esc(c.icon)+' '+esc(c.name)+'</h3><table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.06)"><thead><tr style="background:#f8fafc"><th style="padding:10px;text-align:left;font-size:8px;font-weight:800;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0">ID</th><th style="padding:10px;text-align:left;font-size:8px;font-weight:800;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0">Test</th><th style="padding:10px;text-align:center;font-size:8px;font-weight:800;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0">Priority</th><th style="padding:10px;text-align:center;font-size:8px;font-weight:800;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0">Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>';});dl('qa-report-'+ds()+'.html','text/html;charset=utf-8','<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;background:#eef0f7;padding:24px}.wrap{max-width:1060px;margin:0 auto}.hdr{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:30px;border-radius:18px;margin-bottom:20px}.hdr h1{font-size:26px;font-weight:900}.hdr p{opacity:.8;font-size:12px}.ct{background:#fff;border-radius:18px;padding:26px}</style></head><body><div class="wrap"><div class="hdr"><h1>QA Report</h1><p>Total:'+s.t+' Pass:'+s.p+' Fail:'+s.f+' · '+tdy()+'</p></div><div class="ct">'+cats+'</div></div></body></html>');toast('success','Exported','HTML');}
// Sheet exports
function shExpXLSX(){if(typeof XLSX==='undefined')return;var wb=XLSX.utils.book_new();var d=[['Project','Type','Received','Mailed','Started','Submitted','Cycles','Bugs','Status','Remarks']];state.sheet.forEach(function(s){d.push([s.name,s.type,s.received||'',s.mailed||'',s.started||'',s.submitted||'',s.cycles||0,s.bugs||0,s.status,s.remarks||'']);});XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(d),'Sheet');XLSX.writeFile(wb,'sheet-'+ds()+'.xlsx');toast('success','Exported','Sheet XLSX');}
function shExpCSV(){var r=['\uFEFFProject,Type,Received,Mailed,Started,Submitted,Cycles,Bugs,Status,Remarks'];state.sheet.forEach(function(s){r.push('"'+s.name.replace(/"/g,'""')+'","'+s.type+'","'+(s.received||'')+'","'+(s.mailed||'')+'","'+(s.started||'')+'","'+(s.submitted||'')+'",'+(s.cycles||0)+','+(s.bugs||0)+',"'+s.status+'","'+(s.remarks||'').replace(/"/g,'""')+'"');});dl('sheet-'+ds()+'.csv','text/csv;charset=utf-8',r.join('\n'));toast('success','Exported','Sheet CSV');}
function shExpWord(){var rows=state.sheet.map(function(s,i){return'<tr style="background:'+(i%2?'#f8fafc':'')+'"><td style="padding:9px;font-weight:700;border-bottom:1px solid #f1f5f9">'+esc(s.name)+'</td><td style="padding:9px;border-bottom:1px solid #f1f5f9">'+esc(s.type)+'</td><td style="padding:9px;border-bottom:1px solid #f1f5f9">'+(s.received||'—')+'</td><td style="padding:9px;border-bottom:1px solid #f1f5f9">'+(s.mailed||'—')+'</td><td style="padding:9px;border-bottom:1px solid #f1f5f9">'+(s.started||'—')+'</td><td style="padding:9px;border-bottom:1px solid #f1f5f9">'+(s.submitted||'—')+'</td><td style="padding:9px;text-align:center;font-weight:800;border-bottom:1px solid #f1f5f9">'+(s.cycles||0)+'</td><td style="padding:9px;text-align:center;font-weight:800;color:#f43f5e;border-bottom:1px solid #f1f5f9">'+(s.bugs||0)+'</td><td style="padding:9px;border-bottom:1px solid #f1f5f9">'+esc(s.status)+'</td><td style="padding:9px;color:#64748b;border-bottom:1px solid #f1f5f9">'+esc(s.remarks||'—')+'</td></tr>';}).join('');dl('sheet-'+ds()+'.doc','application/msword;charset=utf-8',styledWord('Project Sheet','<table><tr><th>Project</th><th>Type</th><th>Received</th><th>Mailed</th><th>Started</th><th>Submitted</th><th>Cycles</th><th>Bugs</th><th>Status</th><th>Remarks</th></tr>'+rows+'</table>'));toast('success','Exported','Sheet Word');}
function shExpHTML(){var thC=['#6366f1','#8b5cf6','#10b981','#06b6d4','#f59e0b','#f97316','#ec4899','#ef4444','#8b5cf6','#64748b'];var rows=state.sheet.map(function(s,i){return'<tr style="background:'+(i%2?'#f8fafc':'')+'"><td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;font-weight:700">'+esc(s.name)+'</td><td style="padding:11px 14px;border-bottom:1px solid #f1f5f9">'+esc(s.type)+'</td><td style="padding:11px 14px;border-bottom:1px solid #f1f5f9">'+(s.received||'—')+'</td><td style="padding:11px 14px;border-bottom:1px solid #f1f5f9">'+(s.mailed||'—')+'</td><td style="padding:11px 14px;border-bottom:1px solid #f1f5f9">'+(s.started||'—')+'</td><td style="padding:11px 14px;border-bottom:1px solid #f1f5f9">'+(s.submitted||'—')+'</td><td style="padding:11px 14px;text-align:center;font-weight:800;border-bottom:1px solid #f1f5f9">'+(s.cycles||0)+'</td><td style="padding:11px 14px;text-align:center;font-weight:800;color:#f43f5e;border-bottom:1px solid #f1f5f9">'+(s.bugs||0)+'</td><td style="padding:11px 14px;border-bottom:1px solid #f1f5f9">'+esc(s.status)+'</td><td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#64748b">'+esc(s.remarks||'—')+'</td></tr>';}).join('');dl('sheet-'+ds()+'.html','text/html;charset=utf-8',styledTable('Project Sheet',['Project','Type','Received','Mailed','Started','Submitted','Cycles','Bugs','Status','Remarks'],thC,rows));toast('success','Exported','Sheet HTML');}
function wsExpXLSX(){if(typeof XLSX==='undefined')return;var wb=XLSX.utils.book_new();var d=[['Date','Day','Title','Description']];state.worksheet.forEach(function(w){d.push([w.date,w.day||'',w.title,w.desc||'']);});XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(d),'Worksheet');XLSX.writeFile(wb,'worksheet-'+ds()+'.xlsx');toast('success','Exported','WS XLSX');}
function wsExpCSV(){var r=['\uFEFFDate,Day,Title,Description'];state.worksheet.forEach(function(w){r.push('"'+w.date+'","'+(w.day||'')+'","'+w.title.replace(/"/g,'""')+'","'+(w.desc||'').replace(/"/g,'""')+'"');});dl('worksheet-'+ds()+'.csv','text/csv;charset=utf-8',r.join('\n'));toast('success','Exported','WS CSV');}
function wsExpWord(){var rows=state.worksheet.map(function(w,i){return'<tr style="background:'+(i%2?'#f8fafc':'')+'"><td style="padding:9px;font-weight:700;border-bottom:1px solid #f1f5f9">'+esc(w.date)+'</td><td style="padding:9px;color:#8b5cf6;font-weight:700;border-bottom:1px solid #f1f5f9">'+esc(w.day||'')+'</td><td style="padding:9px;font-weight:700;border-bottom:1px solid #f1f5f9">'+esc(w.title)+'</td><td style="padding:9px;color:#64748b;border-bottom:1px solid #f1f5f9">'+esc(w.desc||'')+'</td></tr>';}).join('');dl('worksheet-'+ds()+'.doc','application/msword;charset=utf-8',styledWord('Worksheet','<table><tr><th>Date</th><th>Day</th><th>Title</th><th>Description</th></tr>'+rows+'</table>'));toast('success','Exported','WS Word');}
function wsExpHTML(){var thC=['#6366f1','#8b5cf6','#10b981','#f59e0b'];var rows=state.worksheet.map(function(w,i){return'<tr style="background:'+(i%2?'#f8fafc':'')+'"><td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;font-weight:700">'+esc(w.date)+'</td><td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#8b5cf6;font-weight:700">'+esc(w.day||'')+'</td><td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;font-weight:700">'+esc(w.title)+'</td><td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;white-space:normal;max-width:480px">'+esc(w.desc||'')+'</td></tr>';}).join('');dl('worksheet-'+ds()+'.html','text/html;charset=utf-8',styledTable('Worksheet',['Date','Day','Title','Description'],thC,rows));toast('success','Exported','WS HTML');}

// ===================== IMPORTS =====================
function importJSON(file){var r=new FileReader();r.onload=function(e){try{var d=JSON.parse(e.target.result);if(!d.categories)throw 0;state=d;['portfolio','automation','sheet','worksheet'].forEach(function(k){if(!state[k])state[k]=[];});if(!state.history)state.history={};save();popProj();popCatFlt();render();updTmr();closeM('mImp');toast('success','Imported','JSON loaded');}catch(err){toast('danger','Error','Invalid JSON');}};r.readAsText(file);}
function importXLSX(file,target){if(typeof XLSX==='undefined')return toast('danger','Error','XLSX not loaded');var r=new FileReader();r.onload=function(e){try{var wb=XLSX.read(e.target.result,{type:'array'});var d=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});if(!d.length)return toast('danger','Error','Empty');processImport(d,target);}catch(err){toast('danger','Error','Cannot read');}};r.readAsArrayBuffer(file);}
function importCSV(file,target){var r=new FileReader();r.onload=function(e){try{var lines=e.target.result.split(/\r?\n/).filter(function(l){return l.trim();});if(lines.length<2)return toast('danger','Error','Empty');var h=parseCSVLine(lines[0]);var d=[];for(var i=1;i<lines.length;i++){var v=parseCSVLine(lines[i]);var o={};h.forEach(function(hh,idx){o[hh.trim()]=v[idx]?v[idx].trim():'';});d.push(o);}processImport(d,target);}catch(err){toast('danger','Error','Cannot parse');}};r.readAsText(file);}
function parseCSVLine(line){var r=[];var c='';var q=false;for(var i=0;i<line.length;i++){var ch=line[i];if(q){if(ch==='"'&&line[i+1]==='"'){c+='"';i++;}else if(ch==='"')q=false;else c+=ch;}else{if(ch==='"')q=true;else if(ch===','){r.push(c);c='';}else c+=ch;}}r.push(c);return r;}
function processImport(data,target){var count=0;var errors=[];var validationErrors=0;if(target==='sheet'){data.forEach(function(r,idx){var n=(r.Project||r.project||r.Name||r.name||'').trim();if(!n||n.length<2){validationErrors++;return;}var t=r.Type||r.type||'web';if(['web','app','api','desktop'].indexOf(t)===-1)t='web';var st=r.Status||r.status||'testing';if(['testing','submitted','hold','rejected'].indexOf(st)===-1)st='testing';state.sheet.push({id:uid('sh'),name:n,type:t,status:st,received:r.Received||r.received||'',mailed:r.Mailed||r.mailed||'',started:r.Started||r.started||'',submitted:r.Submitted||r.submitted||'',cycles:Math.max(0,parseInt(r.Cycles||r.cycles)||0),bugs:Math.max(0,parseInt(r.Bugs||r.bugs)||0),remarks:(r.Remarks||r.remarks||'').slice(0,140)});count++;});save();renderSheet();if(validationErrors>0)toast('warning','Import','Imported '+count+' items, skipped '+validationErrors);else toast('success','Imported',count+' sheet items');closeM('mSheetImp');}else if(target==='worksheet'){data.forEach(function(r,idx){var t=(r['Work Title']||r.Title||r.title||'').trim();if(!t||t.length<3){validationErrors++;return;}var d=r.Date||r.date||ds();state.worksheet.push({id:uid('ws'),date:d,day:r.Day||r.day||dayName(d),title:t,desc:(r['Work Description']||r.Description||r.desc||'').slice(0,300)});count++;});save();renderWs();if(validationErrors>0)toast('warning','Import','Imported '+count+' items, skipped '+validationErrors);else toast('success','Imported',count+' worksheet items');closeM('mWsImp');}else{data.forEach(function(r,idx){var n=(r.Test||r['Test Name']||r.test||r.Name||r.name||'').trim();if(!n||n.length<3){validationErrors++;return;}var cn=(r.Category||r.category||'Imported').trim();if(cn.length<2)cn='Imported';var m=r.Module||r.module||'web';if(m!=='web'&&m!=='app')m='web';var p=r.Priority||r.priority||'medium';if(['critical','high','medium','low'].indexOf(p)===-1)p='medium';var cat=state.categories.find(function(c){return c.name.toLowerCase()===cn.toLowerCase()&&c.module===m;});if(!cat){var cid=uid('cat');cat={id:cid,icon:'📥',name:cn,module:m,tests:[]};state.categories.push(cat);ui.collapsed[cid]=true;}cat.tests.push(T(uid('imp'),n,p,m));count++;});save();popCatFlt();render();if(validationErrors>0)toast('warning','Import','Imported '+count+' tests, skipped '+validationErrors);else toast('success','Imported',count+' tests');closeM('mImp');}}
function importWord(file){var r=new FileReader();r.onload=function(e){try{var lines=e.target.result.split(/\r?\n/).filter(function(l){return l.trim();});var c=0;var cid=uid('cat');var cat={id:cid,icon:'📥',name:'Imported',module:'web',tests:[]};lines.forEach(function(l){l=l.trim();if(l.length>5&&l.length<200){cat.tests.push(T(uid('imp'),l,'medium','web'));c++;}});if(c>0){state.categories.push(cat);ui.collapsed[cid]=true;save();popCatFlt();render();}closeM('mImp');toast(c>0?'success':'danger',c>0?'Imported':'Error',c>0?c+' tests':'No tests found');}catch(err){toast('danger','Error','Cannot read');}};r.readAsText(file);}

// ===================== TIMER / TOAST / SIDEBAR =====================
function updTmr(){var el=$('#tmF');if(el)el.textContent=hms(state.timer||0);}
function toggleTmr(){ui.tmrOn=!ui.tmrOn;var b=$('#tmT');if(ui.tmrOn){if(b)b.classList.add('tmr-running');tmrI=setInterval(function(){state.timer=(state.timer||0)+1;save();updTmr();},1000);}else{if(b)b.classList.remove('tmr-running');clearInterval(tmrI);tmrI=null;}}
function rstTmr(){ui.tmrOn=false;clearInterval(tmrI);tmrI=null;state.timer=0;save();updTmr();var b=$('#tmT');if(b)b.classList.remove('tmr-running');toast('success','Timer','Reset');}
function toast(type,title,msg){var ic={success:'✓',danger:'✕',info:'i'};var w=$('#toasts');if(!w)return;var el=document.createElement('div');el.className='toast '+type;el.innerHTML='<div class="toast-i">'+esc(ic[type]||'i')+'</div><div class="toast-b"><h4>'+esc(title)+'</h4><p>'+esc(msg)+'</p></div><button class="toast-d">✕</button>';w.appendChild(el);requestAnimationFrame(function(){requestAnimationFrame(function(){el.classList.add('in');});});var rm=function(){el.classList.remove('in');setTimeout(function(){if(el.parentNode)el.remove();},380);};el.querySelector('.toast-d').addEventListener('click',rm);setTimeout(rm,4000);}
function openSB(){var s=$('#side');if(s)s.classList.add('open');var o=$('#sOv');if(o)o.classList.add('on');}
function closeSB(){var s=$('#side');if(s)s.classList.remove('open');var o=$('#sOv');if(o)o.classList.remove('on');}
function toggleUD(){udOpen=!udOpen;var dd=$('#userDropdown');if(dd)dd.hidden=!udOpen;}
function closeUD(){udOpen=false;var dd=$('#userDropdown');if(dd)dd.hidden=true;}
async function resetAll(){state=JSON.parse(JSON.stringify(DEF));ui.collapsed={};state.categories.forEach(function(c){ui.collapsed[c.id]=true;});ui.search='';ui.fCat='all';ui.fPri='all';ui.fSt='all';ui.tmrOn=false;clearInterval(tmrI);tmrI=null;var si=$('#sIn');if(si)si.value='';['fC','fP','fS'].forEach(function(id){var e=$('#'+id);if(e)e.value='all';});var tb=$('#tmT');if(tb)tb.classList.remove('tmr-running');closeM('mRst');save();popProj();popCatFlt();updTmr();render();toast('success','Reset','Cleared');}

// ===================== DRAG & DROP =====================
function setupDragDrop(){var drop=$('#impDrop');if(!drop)return;drop.addEventListener('click',function(){var f=$('#impF');if(f)f.click();});drop.addEventListener('dragover',function(e){e.preventDefault();drop.classList.add('drag-over');});drop.addEventListener('dragleave',function(e){e.preventDefault();drop.classList.remove('drag-over');});drop.addEventListener('drop',function(e){e.preventDefault();drop.classList.remove('drag-over');var f=e.dataTransfer.files;if(f.length>0)handleFile(f[0],'tests');});}
function handleFile(file,target){if(!file)return;var ext=file.name.split('.').pop().toLowerCase();if(ext==='json')importJSON(file);else if(ext==='xlsx'||ext==='xls')importXLSX(file,target);else if(ext==='csv')importCSV(file,target);else if(ext==='txt'||ext==='doc')importWord(file);else toast('danger','Error','Unsupported: .'+ext);}

// ===================== LOAD APP DATA =====================
async function loadAppData(){
  var serverData=null;
  try{var res=await api('GET','/api/data');if(res.ok&&res.data)serverData=res.data;else serverData=null;}catch(e){serverData=null;}
  if(serverData){state=serverData;}else{state=JSON.parse(JSON.stringify(DEF));}
  var draft=getDraft();
  if(draft&&draft.data){
    var draftTime=draft.updatedAt?new Date(draft.updatedAt):null;
    var serverTime=serverData&&serverData.lastUpdatedAt?new Date(serverData.lastUpdatedAt):null;
    if(draftTime && (!serverTime || draftTime > serverTime)){
      openRestorePrompt(draft.data, draftTime, serverTime);
    }
  }
  if(!state.categories||!state.categories.length)state.categories=JSON.parse(JSON.stringify(DEF.categories));
  if(!state.projects||!state.projects.length)state.projects=JSON.parse(JSON.stringify(DEF.projects));
  if(!state.cycles)state.cycles=JSON.parse(JSON.stringify(DEF.cycles));
  if(!state.portfolio)state.portfolio=[];if(!state.automation)state.automation=[];
  if(!state.sheet)state.sheet=[];if(!state.worksheet)state.worksheet=[];
  if(!state.history)state.history={};if(state.timer===undefined)state.timer=0;
  if(!state.currentProject)state.currentProject='default';if(!state.currentCycle)state.currentCycle=1;
  try{if(currentUser){var u=localStorage.getItem('qaUI_'+currentUser.id);if(u){var p=JSON.parse(u);ui.theme=p.theme||'light';ui.collapsed=p.collapsed||{};ui.mod=p.mod||'web';ui.view=p.view||'testing';}}}catch(e){}
  if(!ui.collapsed||Object.keys(ui.collapsed).length===0){ui.collapsed={};state.categories.forEach(function(c){ui.collapsed[c.id]=true;});}
  applyTheme(ui.theme);setMod(ui.mod,true);popProj();popCatFlt();updTmr();render();switchView(ui.view);
}

// ===================== WIRE APP EVENTS =====================
function wireApp(){
  if(appWired)return;
  appWired=true;
  setButtonTitles();
  autoNormalizeInputs();
  var hm=$('#hm');if(hm)hm.addEventListener('click',function(e){e.stopPropagation();openSB();});
  var sx=$('#sX');if(sx)sx.addEventListener('click',closeSB);
  var so=$('#sOv');if(so)so.addEventListener('click',closeSB);
  $$('.nl[data-v]').forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();switchView(b.dataset.v);closeSB();});});
  $$('.ml').forEach(function(n){n.addEventListener('click',function(){switchMod(n.dataset.m);switchView('testing');closeSB();});});
  var nt=$('#nThm');if(nt)nt.addEventListener('click',function(){toggleTheme();closeSB();});
  var tt=$('#tTh');if(tt)tt.addEventListener('click',toggleTheme);
  var ts=$('#tSv');if(ts)ts.addEventListener('click',async function(){showLoading();await api('PUT','/api/data',{data:state});hideLoading();toast('success','Saved','Synced');});
  var na=$('#nAdd');if(na)na.addEventListener('click',function(){switchView('testing');setTimeout(openAddM,50);closeSB();});
  var ne=$('#nExp');if(ne)ne.addEventListener('click',function(){openM('mExp');closeSB();});
  var ni=$('#nImp');if(ni)ni.addEventListener('click',function(){openM('mImp');closeSB();});
  var nr=$('#nRst');if(nr)nr.addEventListener('click',function(){openM('mRst');closeSB();});
  var umb=$('#userMenuBtn');if(umb)umb.addEventListener('click',function(e){e.stopPropagation();toggleUD();});
  document.addEventListener('click',function(e){if(!e.target.closest('#userDropdown')&&!e.target.closest('#userMenuBtn'))closeUD();});
  var udp=$('#udProfile');if(udp)udp.addEventListener('click',function(){closeUD();openProfile();});
  var udt=$('#udTheme');if(udt)udt.addEventListener('click',function(){closeUD();toggleTheme();});
  var ude=$('#udExport');if(ude)ude.addEventListener('click',function(){closeUD();openM('mExp');});
  var udl=$('#udLogout');if(udl)udl.addEventListener('click',async function(){closeUD();showLoading();await api('POST','/api/auth/logout');hideLoading();clearAuth();showScreen('auth');toast('info','Signed Out','Goodbye');});
  var ps=$('#profSave');if(ps)ps.addEventListener('click',saveProfile);
  var rs=$('#roleSave');if(rs)rs.addEventListener('click',async function(){if(!roleChangeUserId)return;showLoading();var r=await api('PUT','/api/users/'+roleChangeUserId+'/role',{role:$('#roleSelect').value});hideLoading();if(r.ok){toast('success','Updated',r.msg||'Done');closeM('mRole');renderUsers();}else toast('danger','Error',r.msg);roleChangeUserId=null;});
  var ur=$('#umRefresh');if(ur)ur.addEventListener('click',renderUsers);
  var restoreBtn=$('#restoreSessionBtn');if(restoreBtn)restoreBtn.addEventListener('click',function(){restorePreviousDraft();});
  var discardBtn=$('#discardSessionBtn');if(discardBtn)discardBtn.addEventListener('click',function(){discardPreviousDraft();});
  var psl=$('#projSel');if(psl)psl.addEventListener('change',function(e){state.currentProject=e.target.value;state.currentCycle=1;save();updProjDisp();render();});
  var pn=$('#pNew');if(pn)pn.addEventListener('click',newProj);var pe=$('#pEdit');if(pe)pe.addEventListener('click',editProj);var pd=$('#pDel');if(pd)pd.addEventListener('click',delProj);var psv=$('#pSv');if(psv)psv.addEventListener('click',saveProj);
  var csl=$('#cycSel');if(csl)csl.addEventListener('change',function(e){state.currentCycle=parseInt(e.target.value)||1;save();popCyc();});
  var cn=$('#cNew');if(cn)cn.addEventListener('click',newCyc);var ce=$('#cEdit');if(ce)ce.addEventListener('click',editCyc);var cd=$('#cDel');if(cd)cd.addEventListener('click',delCyc);var csv=$('#cySv');if(csv)csv.addEventListener('click',saveCyc);
  var tmt=$('#tmT');if(tmt)tmt.addEventListener('click',toggleTmr);var tmr=$('#tmR');if(tmr)tmr.addEventListener('click',rstTmr);
  var sin=$('#sIn');var cx=$('#cX');if(sin)sin.addEventListener('input',function(){ui.search=sin.value;if(cx)cx.hidden=!ui.search;render();});if(cx)cx.addEventListener('click',function(){if(sin)sin.value='';ui.search='';cx.hidden=true;render();if(sin)sin.focus();});
  var fc=$('#fC');if(fc)fc.addEventListener('change',function(e){ui.fCat=e.target.value;render();});
  var fp=$('#fP');if(fp)fp.addEventListener('change',function(e){ui.fPri=e.target.value;render();});
  var fs=$('#fS');if(fs)fs.addEventListener('change',function(e){ui.fSt=e.target.value;render();});
  var qe=$('#qE');if(qe)qe.addEventListener('click',function(){curCats().forEach(function(c){delete ui.collapsed[c.id];});render();});
  var qc=$('#qC');if(qc)qc.addEventListener('click',function(){curCats().forEach(function(c){ui.collapsed[c.id]=true;});render();});
  var qa=$('#qA');if(qa)qa.addEventListener('click',function(){var now=new Date();var dt=now.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});curCats().forEach(function(c){c.tests.forEach(function(t){if(t.status!=='passed'){t.status='passed';t.changedDate=dt;}});});save();render();toast('success','Done','All passed');});
  var qad=$('#qAdd');if(qad)qad.addEventListener('click',openAddM);
  var ac=$('#aC');if(ac)ac.addEventListener('change',function(e){var ncr=$('#nCR');if(ncr)ncr.hidden=e.target.value!=='__new__';});
  var asv=$('#aSv');if(asv)asv.addEventListener('click',saveTest);
  var rcf=$('#rCf');if(rcf)rcf.addEventListener('click',resetAll);
  var dcf=$('#dCf');if(dcf)dcf.addEventListener('click',execDel);
  var mex=$('#mExp');if(mex)mex.addEventListener('click',function(e){var b=e.target.closest('[data-fmt]');if(!b)return;({xlsx:exportXLSX,csv:exportCSV,word:exportWord,html:exportHTML})[b.dataset.fmt]();});
  var ijb=$('#impJsonBtn');if(ijb)ijb.addEventListener('click',function(){pendingTarget='tests';var f=$('#impF');if(f){f.accept='.json';f.click();}});
  var ixb=$('#impXlsxBtn');if(ixb)ixb.addEventListener('click',function(){pendingTarget='tests';var f=$('#impF');if(f){f.accept='.xlsx,.xls';f.click();}});
  var icb=$('#impCsvBtn');if(icb)icb.addEventListener('click',function(){pendingTarget='tests';var f=$('#impF');if(f){f.accept='.csv';f.click();}});
  var iwb=$('#impWordBtn');if(iwb)iwb.addEventListener('click',function(){pendingTarget='tests';var f=$('#impF');if(f){f.accept='.txt,.doc';f.click();}});
  var impf=$('#impF');if(impf)impf.addEventListener('change',function(e){var f=e.target.files?e.target.files[0]:null;if(f)handleFile(f,pendingTarget||'tests');e.target.value='';});
  var she=$('#shExp');if(she)she.addEventListener('click',function(){openM('mSheetExp');});
  var mse=$('#mSheetExp');if(mse)mse.addEventListener('click',function(e){var b=e.target.closest('[data-shfmt]');if(!b)return;({xlsx:shExpXLSX,csv:shExpCSV,word:shExpWord,html:shExpHTML})[b.dataset.shfmt]();});
  var shi=$('#shImp');if(shi)shi.addEventListener('click',function(){openM('mSheetImp');});
  var six=$('#shImpXlsx');if(six)six.addEventListener('click',function(){var f=$('#shImpFile');if(f){f.accept='.xlsx,.xls';f.click();}});
  var sic=$('#shImpCsv');if(sic)sic.addEventListener('click',function(){var f=$('#shImpFile');if(f){f.accept='.csv';f.click();}});
  var sif=$('#shImpFile');if(sif)sif.addEventListener('change',function(e){var f=e.target.files?e.target.files[0]:null;if(!f)return;var ext=f.name.split('.').pop().toLowerCase();if(ext==='xlsx'||ext==='xls')importXLSX(f,'sheet');else if(ext==='csv')importCSV(f,'sheet');e.target.value='';});
  var wse=$('#wsExp');if(wse)wse.addEventListener('click',function(){openM('mWsExp');});
  var mwe=$('#mWsExp');if(mwe)mwe.addEventListener('click',function(e){var b=e.target.closest('[data-wsfmt]');if(!b)return;({xlsx:wsExpXLSX,csv:wsExpCSV,word:wsExpWord,html:wsExpHTML})[b.dataset.wsfmt]();});
  var wsi=$('#wsImp');if(wsi)wsi.addEventListener('click',function(){openM('mWsImp');});
  var wix=$('#wsImpXlsx');if(wix)wix.addEventListener('click',function(){var f=$('#wsImpFile');if(f){f.accept='.xlsx,.xls';f.click();}});
  var wic=$('#wsImpCsv');if(wic)wic.addEventListener('click',function(){var f=$('#wsImpFile');if(f){f.accept='.csv';f.click();}});
  var wif=$('#wsImpFile');if(wif)wif.addEventListener('change',function(e){var f=e.target.files?e.target.files[0]:null;if(!f)return;var ext=f.name.split('.').pop().toLowerCase();if(ext==='xlsx'||ext==='xls')importXLSX(f,'worksheet');else if(ext==='csv')importCSV(f,'worksheet');e.target.value='';});
  var pta=$('#ptAdd');if(pta)pta.addEventListener('click',function(){editPortId=null;$('#mPoT').innerHTML='<span class="add-icon mh-icon">+</span> Add';$('#poN').value='';$('#poTC').value='0';$('#poBg').value='0';$('#poRm').value='';openM('mPort');});
  var posv=$('#poSv');if(posv)posv.addEventListener('click',savePo);
  var aua=$('#auAdd');if(aua)aua.addEventListener('click',function(){editAutoId=null;$('#mAuT').innerHTML='<span class="add-icon mh-icon">+</span> Add Suite';$('#auN').value='';$('#auProg').value=0;$('#auProgVal').textContent='0%';$('#auRm').value='';openM('mAuto');});
  var aup=$('#auProg');if(aup)aup.addEventListener('input',function(){$('#auProgVal').textContent=aup.value+'%';});
  var ausv=$('#auSv');if(ausv)ausv.addEventListener('click',saveAu);
  var sha=$('#shAdd');if(sha)sha.addEventListener('click',function(){editSheetId=null;$('#mShT').innerHTML='<span class="add-icon mh-icon">+</span> Add';['shN','shRm'].forEach(function(id){var e=$('#'+id);if(e)e.value='';});['shRc','shMl','shSr','shSb'].forEach(function(id){var e=$('#'+id);if(e)e.value='';});['shCy','shBg'].forEach(function(id){var e=$('#'+id);if(e)e.value='0';});openM('mSheet');});
  var shsv=$('#shSv');if(shsv)shsv.addEventListener('click',saveSh);
  var wsa=$('#wsAdd');if(wsa)wsa.addEventListener('click',function(){editWsId=null;$('#mWsT').innerHTML='<span class="add-icon mh-icon">+</span> Entry';var wd=$('#wsD');if(wd)wd.value=ds();var wt=$('#wsTitle');if(wt)wt.value='';var wds=$('#wsDesc');if(wds)wds.value='';openM('mWs');});
  var wssv=$('#wsSv');if(wssv)wssv.addEventListener('click',saveWs);
  var hl=$('#hLoad');if(hl)hl.addEventListener('click',function(){var d=$('#hD');if(!d||!d.value)return toast('danger','Error','Select date');renderHist(d.value);});
  var ha=$('#hAll');if(ha)ha.addEventListener('click',function(){renderHist();});
  document.addEventListener('click',function(e){var c=e.target.closest('[data-c]');if(c)closeM(c.dataset.c);});
  $$('.ov').forEach(function(o){o.addEventListener('click',function(e){if(e.target===o){o.classList.remove('on');setTimeout(function(){if(!o.classList.contains('on'))o.style.display='none';},320);}});});
  var root=$('#tL');
  if(root){
    root.addEventListener('click',function(e){var head=e.target.closest('.cat-h');if(head){var card=head.closest('.cat');var id=card.dataset.cat;if(ui.collapsed[id])delete ui.collapsed[id];else ui.collapsed[id]=true;card.dataset.cl=ui.collapsed[id]?'1':'0';save();return;}var row=e.target.closest('.row');if(!row)return;var tid=row.dataset.t;if(e.target.closest('.ab-f')){var r=findT(tid);if(r)setSt(tid,r.test.status==='failed'?'pending':'failed');return;}if(e.target.closest('.ab-b')){var r2=findT(tid);if(r2)setSt(tid,r2.test.status==='blocked'?'pending':'blocked');return;}if(e.target.closest('.ab-s')){var r3=findT(tid);if(r3)setSt(tid,r3.test.status==='skipped'?'pending':'skipped');return;}if(e.target.closest('.ab-n')){row.dataset.n=row.dataset.n==='1'?'0':'1';if(row.dataset.n==='1'){var ta=row.querySelector('textarea');if(ta)setTimeout(function(){ta.focus();},60);}return;}if(e.target.closest('.ab-e')){openEditM(tid);return;}if(e.target.closest('.ab-del')){confirmDel(tid);return;}});
    root.addEventListener('change',function(e){if(!e.target.classList.contains('row-cb'))return;var row=e.target.closest('.row');if(row)setSt(row.dataset.t,e.target.checked?'passed':'pending');});
    root.addEventListener('input',function(e){if(e.target.tagName!=='TEXTAREA')return;var row=e.target.closest('.row');if(row)saveNote(row.dataset.t,e.target.value);});
    root.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('cat-h')){e.preventDefault();e.target.click();}});
  }
  document.addEventListener('keydown',function(e){var app=$('#mainApp');if(!app||app.hidden)return;var mod=e.ctrlKey||e.metaKey;if(e.key==='Escape'){closeAll();closeUD();return;}if(mod&&e.key.toLowerCase()==='k'){e.preventDefault();switchView('testing');var s=$('#sIn');if(s)s.focus();return;}if(mod&&e.key.toLowerCase()==='n'){e.preventDefault();switchView('testing');setTimeout(openAddM,50);return;}if(mod&&e.key.toLowerCase()==='e'){e.preventDefault();openM('mExp');return;}if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();api('PUT','/api/data',{data:state}).then(function(){toast('success','Saved','Synced');});return;}if(mod&&e.key.toLowerCase()==='d'){e.preventDefault();toggleTheme();return;}});
  var dd=$('#dD');if(dd)dd.textContent=tdy();
  var hd=$('#hD');if(hd)hd.value=ds();
  setupDragDrop();
  startIdleMonitor();
  setInterval(function(){if(authToken&&currentUser)api('PUT','/api/data',{data:state});},60000);
}

// ===================== INIT =====================
async function init(){
  console.log('🚀 QA Checklist starting...');
  hideAllScreens();
  wireAuth();

  // Check server
  var serverOk=false;
  try{
    var ctrl=new AbortController();
    var t=setTimeout(function(){ctrl.abort();},5000);
    var h=await fetch('/api/health',{signal:ctrl.signal});
    clearTimeout(t);
    serverOk=h.ok;
  }catch(e){serverOk=false;}

  if(!serverOk){
    showScreen('auth');
    showAuthInfo('loginInfo','⚠️ Cannot connect to server. Run: node server.js','error');
    return;
  }
  console.log('✅ Server OK');

  loadToken();
  if(!authToken){
    showScreen('auth');
    console.log('📋 No token — auth screen');
    return;
  }

  // Verify token
  console.log('🔍 Checking session...');
  var res=await api('GET','/api/auth/me');

  if(!res.ok||!res.user){
    clearAuth();showScreen('auth');
    console.log('❌ Invalid token');
    return;
  }

  currentUser=res.user;
  console.log('👤',currentUser.name,currentUser.role,currentUser.status);

  if(currentUser.status==='pending'){
    showScreen('pending');
    var pem=$('#pendingEmail');if(pem)pem.textContent=currentUser.email;
    return;
  }
  if(currentUser.status!=='approved'){
    clearAuth();showScreen('auth');
    showAuthInfo('loginInfo','Account '+currentUser.status+'. Contact manager.','error');
    return;
  }

  // ✅ Approved
  showScreen('app');
  updateUserUI();
  wireApp();
  await loadAppData();
  var is=compStats();
  toast('success','Welcome',currentUser.name+' — '+is.t+' tests');
  console.log('✅ Ready!');
}

init();
})();