/* Native port of the owner's supplied opening. No framework or network services.
 * DOM remains readable if this enhancement fails; locks have independent deadlines.
 */
import { motionAllowed } from './motion.js';
import { createIntroSky } from './intro-sky.js';
import { cubicBezier, lerp, progress } from './opening-easing.js';
const OUT='cubic-bezier(.22,1,.36,1)', EXIT='cubic-bezier(.55,0,.75,.2)';
const greetings=[['en','Hi, I am Balakrishnan'],['ta','வணக்கம், நான் பாலகிருஷ்ணன்'],['hi','नमस्ते, मैं बालकृष्णन हूँ']];
const petMarkup=`<div class="pet" hidden data-mood="idle"><div class="pet-shadow"></div><div class="pet-jump"><div class="pet-squash"><div class="pet-breathe"><div class="pet-tilt"><svg viewBox="0 0 76 84" aria-hidden="true">
<g class="pet-antenna"><path d="M38 25V12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M38 25V12" stroke="#0a0a0a" stroke-width=".8" stroke-opacity=".35" stroke-linecap="round"/><circle class="antenna-ball" cx="38" cy="9.5" r="3.6" fill="#fff" stroke="#0a0a0a" stroke-width="1.2" style="transform-box:fill-box;transform-origin:center"/></g>
<rect x="3.5" y="41" width="6" height="15" rx="3" fill="#fff" stroke="#0a0a0a" stroke-width="1.2"/><rect x="66.5" y="41" width="6" height="15" rx="3" fill="#fff" stroke="#0a0a0a" stroke-width="1.2"/>
<path d="M21 75 h12 v6.5 a2.5 2.5 0 0 1 -2.5 2.5 h-7 a2.5 2.5 0 0 1 -2.5 -2.5 z" fill="#fff" stroke="#0a0a0a" stroke-width="1.2"/><path d="M43 75 h12 v6.5 a2.5 2.5 0 0 1 -2.5 2.5 h-7 a2.5 2.5 0 0 1 -2.5 -2.5 z" fill="#fff" stroke="#0a0a0a" stroke-width="1.2"/>
<rect x="8" y="23" width="60" height="55" rx="23" fill="#fff" stroke="#0a0a0a" stroke-width="1.4"/>
<g class="pet-face"><rect x="15" y="33" width="46" height="29" rx="13" fill="#0a0a0a"/><path d="M21 37.5 q4 -2.2 9 -2.2" stroke="#fff" stroke-opacity=".22" stroke-width="1.6" stroke-linecap="round" fill="none"/>
<g class="pet-eyes"><g class="pet-blink"><g class="eye-happy" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M25 49.5 q4 -6.5 8 0"/><path d="M43 49.5 q4 -6.5 8 0"/></g><g class="eye-idle" fill="#fff"><rect x="25.5" y="41" width="7" height="11" rx="3.5"/><rect x="43.5" y="41" width="7" height="11" rx="3.5"/></g><g class="eye-surprised" fill="#fff"><rect x="24.5" y="39.5" width="9" height="13" rx="4.5"/><rect x="42.5" y="39.5" width="9" height="13" rx="4.5"/></g></g><circle class="mouth-surprised" cx="38" cy="56.5" r="1.8" fill="none" stroke="#fff" stroke-width="1.3"/><path class="mouth-idle" d="M35.5 56 q2.5 1.6 5 0" stroke="#fff" stroke-opacity=".85" stroke-width="1.4" stroke-linecap="round" fill="none"/></g></g></svg></div></div></div></div><button class="pet-hit" type="button" aria-label="Open Bit, portfolio guide" aria-expanded="false" aria-controls="bit-chat" disabled></button></div>`;

class Opening {
  constructor(){
    this.phase='done';this.sequence=0;this.timers=new Set();this.effects=new Set();this.locked=[];
    this.root=document.createElement('div');this.root.className='opening-experience is-complete';this.root.innerHTML=petMarkup;document.body.append(this.root);
    this.pet=this.root.querySelector('.pet');this.hit=this.root.querySelector('.pet-hit');
    this.hit.addEventListener('click',()=>this.toggleChat());
    this.hit.addEventListener('pointerenter',()=>this.pet.dataset.mood='happy');
    this.hit.addEventListener('pointerleave',()=>this.pet.dataset.mood='idle');
    document.addEventListener('keydown',e=>this.key(e));
    document.addEventListener('portfolio:motionchange',()=>{if(!motionAllowed()){if(this.phase!=='done')this.finish();this.effects.forEach(a=>a.cancel());}});
    window.addEventListener('resize',()=>{if(this.phase==='portal')this.finish();});
    this.setupGaze();this.scheduleBlink();this.scheduleGlance();
    const dismissBubble=()=>{if(this.phase==='done'){this.bubbleDismissed=true;this.bubble?.remove();}};window.addEventListener('scroll',dismissBubble,{passive:true});document.addEventListener('pointerdown',dismissBubble,{passive:true});
  }
  later(fn,ms){const id=setTimeout(()=>{this.timers.delete(id);fn();},ms);this.timers.add(id);return id;}
  async anim(el,frames,options={}){
    if(!el?.animate||!motionAllowed())return false;
    const a=el.animate(frames,{duration:600,easing:OUT,fill:'both',...options});this.effects.add(a);
    try{await a.finished;if(el.isConnected){const last=frames.at(-1);for(const [k,v] of Object.entries(last))if(!['offset','easing','composite'].includes(k))el.style[k]=v;}return true;}
    catch{return false;}finally{a.cancel();this.effects.delete(a);}
  }
  start(force=false){
    const refreshing=performance.getEntriesByType('navigation')[0]?.type==='reload';
    const deepLink=location.hash&&!['#top','#home'].includes(location.hash);
    const gated=document.documentElement.classList.contains('opening-pending');
    // The inline head script decides whether this visit gets the opening; a
    // replay from the footer control (force) is the only other way in.
    if(!motionAllowed()||(!force&&!gated)||(!force&&window.__openingBootExpired)||new URLSearchParams(location.search).has('embed')||(!force&&deepLink&&!refreshing)){this.finish(false);return;}
    if(this.phase!=='done')return;
    this.closeChat(false);this.timers.forEach(clearTimeout);this.timers.clear();this.bubble?.remove();this.sequence++;this.phase='preload';this.root.dataset.phase=this.phase;this.root.classList.remove('is-complete');this.pet.hidden=true;this.hit.disabled=true;this.hit.setAttribute('aria-hidden','true');
    this.focusBefore=document.activeElement;this.replay=force;this.savedScroll=scrollY;const themeMeta=document.querySelector('meta[name="theme-color"]');if(themeMeta)themeMeta.content='#eef3fb';
    this.locked=[...document.body.children].filter(el=>el!==this.root&&!['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el=>[el,el.inert]);
    this.locked.forEach(([el])=>el.inert=true);document.documentElement.classList.add('opening-locked');document.body.classList.add('opening-locked');
    // Fail open if setup throws; fonts load in parallel, never behind a counter.
    this.startupDeadline=this.later(()=>this.finish(),6000);
    for(const font of ['300 48px "Noto Sans Tamil"','300 48px "Noto Sans Devanagari"']){
      try{document.fonts?.load(font,'வணக்கம் नमस्ते').catch(()=>{});}catch{}
    }
    this.showIntro();
    clearTimeout(this.startupDeadline);
    clearTimeout(window.__openingFailOpen);document.documentElement.classList.remove('opening-pending');
  }

  showIntro(){
    this.phase='intro';this.root.dataset.phase=this.phase;
    const layer=document.createElement('div');layer.className='intro-layer';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','Welcome to Balakrishnan’s portfolio');
    layer.innerHTML='<div class="intro-center"><div class="greeting-stage" aria-live="polite"></div><div class="cta-slot"><button class="portfolio-btn" type="button" aria-label="Enter portfolio" hidden>PORTFOLIO</button></div><p class="cta-hint" aria-hidden="true" hidden>Tap anywhere to enter</p></div>';
    this.root.prepend(layer);this.layer=layer;this.sky=createIntroSky(layer);this.cta=layer.querySelector('.portfolio-btn');this.cta.addEventListener('click',()=>this.activate());
    layer.tabIndex=-1;layer.focus({preventScroll:true});
    this.pet.hidden=false;this.pet.dataset.mood='idle';const w=Math.sqrt(140-64),arrival=Array.from({length:67},(_,i)=>{const t=i/60;return {transform:`translateY(${120*Math.exp(-8*t)*(Math.cos(w*t)+8/w*Math.sin(w*t))}%)`};});arrival.push({transform:'translateY(0%)'});this.anim(this.pet,arrival,{duration:1100,delay:200,easing:'linear'});
    this.greet(0);this.later(()=>this.greet(1),1900);this.later(()=>this.greet(2),3800);this.later(()=>this.greet(0),5600);
    this.later(()=>{if(this.phase!=='intro')return;this.cta.hidden=false;this.anim(this.cta,[{opacity:0,transform:'translateY(14px)',filter:'blur(6px)'},{opacity:1,transform:'translateY(0)',filter:'blur(0px)'}],{duration:900});const hint=this.layer.querySelector('.cta-hint');if(hint){hint.hidden=false;this.anim(hint,[{opacity:0},{opacity:1}],{duration:700,delay:500});}this.later(()=>{if(this.phase==='intro')this.cta.focus({preventScroll:true});},650);},3600);
    // Once the button is up, a tap anywhere on the stage (or Enter/Space) also enters.
    layer.addEventListener('click',e=>{if(this.phase==='intro'&&!this.cta.hidden&&!e.target.closest('button'))this.activate();});
    layer.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&this.phase==='intro'&&!this.cta.hidden&&e.target===layer){e.preventDefault();this.activate();}});
  }
  greet(index){
    if(this.phase!=='intro')return;
    this.root.dataset.greeting=index;
    const stage=this.layer.querySelector('.greeting-stage'),old=stage.querySelector('h1:not([data-exiting])');
    if(old){old.dataset.exiting='true';old.setAttribute('aria-hidden','true');const exits=[...old.querySelectorAll('.word')].map((w,i)=>this.anim(w,[{opacity:1,transform:'translateY(0)',filter:'blur(0px)'},{opacity:0,transform:'translateY(-72%)',filter:'blur(8px)'}],{duration:600,delay:i*40,easing:EXIT}));Promise.all(exits).then(()=>old.remove());}
    const [lang,text]=greetings[index],h=document.createElement('h1');h.className='greeting';h.lang=lang;h.setAttribute('aria-label',text);
    text.split(' ').forEach((word,i)=>{if(i)h.append(' ');const mask=document.createElement('span');mask.className='word-mask';mask.setAttribute('aria-hidden','true');const inner=document.createElement('span');inner.className='word';inner.textContent=word;mask.append(inner);h.append(mask);});stage.append(h);
    h.querySelectorAll('.word').forEach((w,i)=>this.anim(w,[{opacity:0,transform:'translateY(108%)',filter:'blur(10px)'},{opacity:1,transform:'translateY(0%)',filter:'blur(0px)'}],{duration:1050,delay:280+i*75}));
  }
  async activate(skipped=false){
    if(this.phase!=='intro')return;this.phase='activating';this.root.dataset.phase=this.phase;this.cta.disabled=true;
    const token=this.sequence,valid=()=>token===this.sequence;this.later(()=>this.finish(),6500);
    const q=s=>this.pet.querySelector(s),squash=q('.pet-squash'),jump=q('.pet-jump'),shadow=q('.pet-shadow');
    if(!skipped)this.anim(this.cta,[{opacity:1},{opacity:.55}],{duration:900});
    this.pet.dataset.mood='surprised';const target=this.cta.getBoundingClientRect();this.lookAt(target.left+target.width/2,target.top+target.height/2);
    await this.anim(q('.antenna-ball'),[{transform:'scale(1)'},{transform:'scale(1.6)'},{transform:'scale(1)'}],{duration:420});if(!valid())return;
    this.look(.05,-.15);this.pet.dataset.mood='idle';await this.anim(q('.pet-blink'),[{transform:'scaleY(1)'},{transform:'scaleY(.08)'},{transform:'scaleY(1)'}],{duration:170});if(!valid())return;
    this.later(()=>this.pet.dataset.mood='happy',140);this.anim(shadow,[{transform:'scaleX(1)',opacity:1},{transform:'scaleX(1.12)',opacity:1}],{duration:300,delay:140});
    await this.anim(squash,[{transform:'scale(1)'},{transform:'scale(1.13,.8)'}],{duration:300,delay:140,easing:'cubic-bezier(.45,0,.55,1)'});if(!valid())return;
    const height=Math.max(70,Math.min(140,innerHeight*.16));
    this.pet.dataset.mood='happy';this.look(.05,.55);
    this.anim(squash,[{transform:'scale(1.13,.8)'},{transform:'scale(.9,1.14)',offset:.35},{transform:'scale(1)'}],{duration:440});
    this.anim(shadow,[{transform:'scaleX(1.12)',opacity:1},{transform:'scaleX(.45)',opacity:.35}],{duration:440});
    await this.anim(jump,[{transform:'translateY(0)'},{transform:`translateY(-${height}px)`}],{duration:440,easing:'cubic-bezier(.18,.85,.32,1)'});if(!valid())return;
    this.look(.05,.85);this.anim(squash,[{transform:'scale(1)'},{transform:'scale(.95,1.07)'}],{duration:320,easing:'ease-in'});
    this.anim(shadow,[{transform:'scaleX(.45)',opacity:.35},{transform:'scaleX(1)',opacity:1}],{duration:320});
    await this.anim(jump,[{transform:`translateY(-${height}px)`},{transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.55,0,.92,.45)'});if(!valid())return;
    this.portal();this.look(0,-.1);
    await this.anim(squash,[{transform:'scale(.95,1.07)'},{transform:'scale(1.18,.76)'}],{duration:90});if(!valid())return;
    // Analytic damped spring: source stiffness 520, damping 13, mass 1.
    const omega=Math.sqrt(520-6.5**2),frames=Array.from({length:61},(_,i)=>{const t=i/75,v=Math.exp(-6.5*t)*(Math.cos(omega*t)+6.5/omega*Math.sin(omega*t));return {transform:`scale(${1+.18*v},${1-.24*v})`};});frames.push({transform:'scale(1)'});this.anim(squash,frames,{duration:810,easing:'linear'});
  }
  portal(){
    this.phase='portal';this.root.dataset.phase=this.phase;
    if(!CSS.supports('mask-image','radial-gradient(10px 10px at 10px 10px,transparent,#000)')){this.anim(this.layer,[{opacity:1},{opacity:0}],{duration:450}).then(()=>this.finish());return;}
    const rect=this.pet.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.bottom-1,maxR=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y))+4;
    const ring=document.createElementNS('http://www.w3.org/2000/svg','svg');ring.classList.add('portal-ring');ring.setAttribute('aria-hidden','true');ring.innerHTML=`<ellipse cx="${x}" cy="${y}" rx="0" ry="0" fill="none" stroke="#0b1220" stroke-width="7" stroke-opacity=".09"/><ellipse cx="${x}" cy="${y}" rx="0" ry="0" fill="none" stroke="#fff" stroke-width="1.25" vector-effect="non-scaling-stroke"/>`;this.root.append(ring);this.ring=ring;
    const emerge=cubicBezier(.16,1,.3,1),expand=cubicBezier(.72,0,.16,1),round=cubicBezier(.33,1,.68,1),start=performance.now(),token=this.sequence;
    const tick=now=>{if(token!==this.sequence)return;const elapsed=now-start;let rx,ry,opacity,p=0;if(elapsed<320){const t=emerge(elapsed/320);rx=46*t;ry=rx*.22;opacity=Math.min(1,t*1.6);}else{p=progress(elapsed-320,0,1250);rx=lerp(46,maxR,expand(p));ry=rx*lerp(.22,1,round(progress(p,0,.42)));opacity=1-progress(p,.7,1);}
      const edge=Math.max(0,100-1.25/Math.max(rx,1)*100),mask=`radial-gradient(${rx.toFixed(2)}px ${ry.toFixed(2)}px at ${x}px ${y}px,transparent ${edge.toFixed(3)}%,#000 100%)`;
      this.layer.style.maskImage=mask;this.layer.style.webkitMaskImage=mask;[...ring.children].forEach((el,i)=>{el.setAttribute('rx',rx.toFixed(2));el.setAttribute('ry',ry.toFixed(2));el.style.opacity=opacity*(i?1:.5);});if(p>=1){this.finish();return;}this.raf=requestAnimationFrame(tick);
    };this.raf=requestAnimationFrame(tick);
  }
  finish(focus=true){
    clearTimeout(window.__openingFailOpen);document.documentElement.classList.remove('opening-pending');
    const wasOpen=this.phase!=='done';this.sequence++;cancelAnimationFrame(this.raf);this.timers.forEach(clearTimeout);this.timers.clear();this.effects.forEach(a=>a.cancel());this.effects.clear();
    this.sky?.stop();this.sky=null;this.loader?.remove();this.layer?.remove();this.ring?.remove();this.loader=this.layer=this.ring=null;
    this.locked.forEach(([el,inert])=>el.inert=inert);this.locked=[];document.documentElement.classList.remove('opening-locked');document.body.classList.remove('opening-locked');
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content='#f6f7fb';
    this.phase='done';this.root.dataset.phase='done';this.root.classList.add('is-complete');this.pet.hidden=false;this.pet.style.transform='';this.hit.disabled=false;this.hit.removeAttribute('aria-hidden');this.bubbleDismissed=false;this.pet.dataset.mood='happy';
    ['.pet-jump','.pet-squash','.pet-shadow','.pet-blink'].forEach(s=>this.pet.querySelector(s).removeAttribute('style'));
    if(wasOpen)document.dispatchEvent(new CustomEvent('portfolio:openingdone'));
    if(wasOpen&&focus){const target=document.querySelector('main');if(target){if(!target.hasAttribute('tabindex')&&!target.matches('button,a'))target.tabIndex=-1;target.focus({preventScroll:true});}}
    this.later(()=>this.pet.dataset.mood='idle',1400);
    if(wasOpen){this.later(()=>{if(this.bubbleDismissed||(this.chat&&!this.chat.hidden))return;this.bubble=document.createElement('div');this.bubble.className='pet-bubble';this.bubble.setAttribute('role','status');this.bubble.textContent='Hi, I’m Bit — Bala’s offline guide. Tap me if you have questions.';this.root.append(this.bubble);this.anim(this.bubble,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:400});},900);this.later(()=>this.bubble?.remove(),window.matchMedia('(max-width: 899px)').matches?5000:7500);}
  }
  key(e){
    if(e.key==='Escape'){if(this.phase!=='done'){e.preventDefault();this.finish();}else if(this.chat&&!this.chat.hidden){e.preventDefault();this.closeChat();}return;}
    if(e.key!=='Tab'||this.phase==='done')return;
    const buttons=[...this.root.querySelectorAll('.preloader button,.intro-layer button')].filter(b=>!b.disabled&&!b.hidden&&b.isConnected&&b.getClientRects().length);
    if(!buttons.length){e.preventDefault();return;}const first=buttons[0],last=buttons.at(-1);
    if(!buttons.includes(document.activeElement)){e.preventDefault();(e.shiftKey?last:first).focus();}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
  scheduleBlink(){
    setTimeout(async()=>{if(motionAllowed()&&!document.hidden&&!this.pet.hidden&&['intro','done'].includes(this.phase)){await this.anim(this.pet.querySelector('.pet-blink'),[{transform:'scaleY(1)'},{transform:'scaleY(.08)'},{transform:'scaleY(1)'}],{duration:170});if(Math.random()<.22)this.anim(this.pet.querySelector('.pet-blink'),[{transform:'scaleY(1)'},{transform:'scaleY(.08)'},{transform:'scaleY(1)'}],{duration:170,delay:90});}this.scheduleBlink();},2200+Math.random()*3600);
  }
  scheduleGlance(){setTimeout(()=>{if(motionAllowed()&&!document.hidden&&!this.pet.hidden&&['intro','done'].includes(this.phase)&&performance.now()-(this.lastMove||0)>3500){const glances=[[-.9,-.2],[.85,-.35],[.2,-.9],[0,0],[.95,.1]];this.look(...glances[Math.floor(Math.random()*glances.length)]);}this.scheduleGlance();},3800+Math.random()*3000);}
  setupGaze(){
    this.gazeTarget=[0,0];let x=0,y=0,vx=0,vy=0,last=0,raf=0;
    const tick=now=>{raf=0;if(!motionAllowed()||document.hidden||this.pet.hidden)return;const dt=Math.min((now-last)/1000||.016,.032);last=now;const [tx,ty]=this.gazeTarget;vx+=((tx-x)*170-vx*18)/.6*dt;vy+=((ty-y)*170-vy*18)/.6*dt;x+=vx*dt;y+=vy*dt;
      this.pet.querySelector('.pet-eyes').style.transform=`translate(${x*5}px,${y*3.6}px)`;this.pet.querySelector('.pet-face').style.transform=`translate(${x*2.2}px,${y*1.4}px)`;this.pet.querySelector('.pet-tilt').style.transform=`rotate(${x*2.5}deg)`;
      if(Math.abs(tx-x)+Math.abs(ty-y)+Math.abs(vx)+Math.abs(vy)>.01)raf=requestAnimationFrame(tick);
    };
    this.lookAt=(px,py)=>{const r=this.pet.getBoundingClientRect(),dx=px-r.left-r.width/2,dy=py-r.top-r.height*.55,dist=Math.hypot(dx,dy)||1,reach=Math.min(dist/260,1);this.look(dx/dist*reach,dy/dist*reach);};
    this.look=(x,y)=>{this.gazeTarget=[x,y];if(!raf){last=performance.now();raf=requestAnimationFrame(tick);}};
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(!motionAllowed()&&this.phase!=='done')this.finish();});
    window.addEventListener('pointermove',e=>{if(!motionAllowed()||this.pet.hidden)return;if(['intro','done'].includes(this.phase)){this.lastMove=performance.now();this.lookAt(e.clientX,e.clientY);}if(!raf){last=performance.now();raf=requestAnimationFrame(tick);}},{passive:true});
  }
  toggleChat(){
    this.bubble?.remove();
    if(this.chat&&!this.chat.hidden){this.closeChat();return;}
    if(!this.chat){
      const chat=document.createElement('section');chat.id='bit-chat';chat.className='pet-chat';chat.setAttribute('role','dialog');chat.setAttribute('aria-label','Bit, offline portfolio guide');
      chat.innerHTML='<header><span class="status"><i aria-hidden="true"></i>Bit · portfolio guide</span><button type="button" class="close" aria-label="Close Bit">×</button></header><div class="messages" role="log" aria-live="polite" aria-label="Conversation"></div><div class="chips"><button type="button">What do you build?</button><button type="button">Tech stack?</button><button type="button">Is he available?</button><button type="button">How do I contact him?</button></div><form><input aria-label="Message to Bit" placeholder="Ask about Bala’s portfolio…" maxlength="500" required/><button type="submit">Send</button></form><div class="chat-disclosure">Offline guide · preset answers · nothing sent or stored</div>';
      this.root.append(chat);this.chat=chat;chat.querySelector('.close').addEventListener('click',()=>this.closeChat());chat.querySelectorAll('.chips button').forEach(b=>b.addEventListener('click',()=>this.ask(b.textContent)));chat.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const input=chat.querySelector('input');if(input.value.trim())this.ask(input.value.trim());input.value='';});this.message('Hi! I’m Bit, a small offline guide. Ask about Balakrishnan’s projects, skills, availability or contact details.');
    }
    this.chat.hidden=false;this.hit.setAttribute('aria-expanded','true');this.chat.querySelector('input').focus({preventScroll:true});this.pet.dataset.mood='happy';
    this.anim(this.chat,[{opacity:0,transform:'translateY(10px) scale(.92)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:350});
  }
  closeChat(focus=true){if(!this.chat)return;this.chat.hidden=true;this.hit.setAttribute('aria-expanded','false');if(focus)this.hit.focus({preventScroll:true});}
  message(text,mine=false,href=null){const list=this.chat.querySelector('.messages'),item=document.createElement('div');item.className='msg '+(mine?'me':'bot');item.textContent=text;if(href){const a=document.createElement('a');a.href=href;a.textContent='View section →';a.addEventListener('click',e=>{this.closeChat(false);const target=document.querySelector(href);if(!target){e.preventDefault();location.href='/'+href;return;}target.tabIndex=-1;target.focus({preventScroll:true});});item.append(a);}list.append(item);while(list.childElementCount>30)list.firstElementChild.remove();list.scrollTop=list.scrollHeight;}
  ask(text){
    this.message(text,true);const t=text.toLowerCase();let answer,href;
    if(/contact|email|mail|reach|talk|github/.test(t)){answer='Email balakrishnan.code@email.com, or use the contact section for GitHub, LinkedIn and a ready-to-copy message.';href='#contact';}
    else if(/available|hire|freelance|job|open/.test(t)){answer='Available to join immediately. Currently a paid Full Stack Developer Intern at Shanthi IT Solution, August 2026–present.';href='#contact';}
    else if(/stack|tech|tools|language|react|node|skills/.test(t)){answer='MERN development: MongoDB, Express, React and Node.js, plus JavaScript, HTML, CSS, Git and Firebase. This portfolio itself is built with native HTML, CSS and JavaScript.';href='#skills';}
    else if(/build|work|project|make/.test(t)){answer='Four projects: BillPro, Pizza Palace, a TripAdvisor recreation, and KADAI. Selected work includes the available repositories, demos and the BillPro case study.';href='#projects';}
    else if(/\b(hi|hello|hey|vanakkam|namaste)\b/.test(t)){answer='Hello! வணக்கம்! नमस्ते! Ask about projects, skills, availability or contact.';}
    else answer='I’m an offline guide with preset answers, not a live AI chat. Try projects, skills, availability or contact.';
    this.message(answer,false,href);
  }
}
let opening;
export function initOpening(){opening??=new Opening();opening.start();}
export function replayOpening(){opening??=new Opening();opening.start(true);}
