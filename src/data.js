// Word data: IPA fallbacks and the vocabulary loaded from data/words.js (WORD_DATA, WORD_CN, WORD_IPA, WORD_LV).
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

// ============================================================
//  IPA DATA (top ~300 common words)
// ============================================================
const IPA_MAP = {
'structure':'/ˈstrʌk.tʃər/','construct':'/kənˈstrʌkt/','instruct':'/ɪnˈstrʌkt/','predict':'/prɪˈdɪkt/','prevent':'/prɪˈvent/','prepare':'/prɪˈper/',
'return':'/rɪˈtɜːrn/','review':'/rɪˈvjuː/','reflect':'/rɪˈflekt/','reform':'/rɪˈfɔːrm/','remove':'/rɪˈmuːv/','repeat':'/rɪˈpiːt/','replace':'/rɪˈpleɪs/',
'discover':'/dɪˈskʌv.ər/','discuss':'/dɪˈskʌs/','display':'/dɪˈspleɪ/','distance':'/ˈdɪs.təns/','distribute':'/dɪˈstrɪb.juːt/',
'important':'/ɪmˈpɔːr.tənt/','improve':'/ɪmˈpruːv/','include':'/ɪnˈkluːd/','increase':'/ɪnˈkriːs/','independent':'/ˌɪn.dɪˈpen.dənt/',
'transfer':'/ˈtræns.fɜːr/','transform':'/trænsˈfɔːrm/','translate':'/ˈtræns.leɪt/','transport':'/ˈtræns.pɔːrt/',
'interact':'/ˌɪn.tərˈækt/','interest':'/ˈɪn.trəst/','international':'/ˌɪn.tərˈnæʃ.ən.əl/','internet':'/ˈɪn.tər.net/',
'education':'/ˌedʒ.uˈkeɪ.ʃən/','environment':'/ɪnˈvaɪ.rən.mənt/','experience':'/ɪkˈspɪr.i.əns/','information':'/ˌɪn.fərˈmeɪ.ʃən/',
'technology':'/tekˈnɒl.ə.dʒi/','biology':'/baɪˈɒl.ə.dʒi/','psychology':'/saɪˈkɒl.ə.dʒi/','philosophy':'/fɪˈlɒs.ə.fi/',
'communicate':'/kəˈmjuː.nɪ.keɪt/','community':'/kəˈmjuː.nə.ti/','company':'/ˈkʌm.pə.ni/','compare':'/kəmˈper/',
'generate':'/ˈdʒen.ə.reɪt/','general':'/ˈdʒen.ər.əl/','generation':'/ˌdʒen.əˈreɪ.ʃən/',
'photograph':'/ˈfoʊ.tə.ɡræf/','geography':'/dʒiˈɒɡ.rə.fi/','biography':'/baɪˈɒɡ.rə.fi/',
'telephone':'/ˈtel.ɪ.foʊn/','microscope':'/ˈmaɪ.krə.skoʊp/','telescope':'/ˈtel.ɪ.skoʊp/',
'democracy':'/dɪˈmɒk.rə.si/','economy':'/ɪˈkɒn.ə.mi/','vocabulary':'/voʊˈkæb.jə.ler.i/',
'temperature':'/ˈtem.prə.tʃər/','comfortable':'/ˈkʌm.fər.tə.bəl/','considerable':'/kənˈsɪd.ər.ə.bəl/',
'beautiful':'/ˈbjuː.tɪ.fəl/','wonderful':'/ˈwʌn.dər.fəl/','powerful':'/ˈpaʊ.ər.fəl/',
'action':'/ˈæk.ʃən/','active':'/ˈæk.tɪv/','actual':'/ˈæk.tʃu.əl/','react':'/riˈækt/',
'position':'/pəˈzɪʃ.ən/','compose':'/kəmˈpoʊz/','purpose':'/ˈpɜːr.pəs/','suppose':'/səˈpoʊz/',
'produce':'/prəˈdjuːs/','reduce':'/rɪˈdjuːs/','introduce':'/ˌɪn.trəˈdjuːs/','educate':'/ˈedʒ.u.keɪt/',
'conduct':'/kənˈdʌkt/','inspect':'/ɪnˈspekt/','respect':'/rɪˈspekt/','expect':'/ɪkˈspekt/',
'import':'/ˈɪm.pɔːrt/','export':'/ˈek.spɔːrt/','support':'/səˈpɔːrt/',
'project':'/ˈprɒdʒ.ekt/','inject':'/ɪnˈdʒekt/','reject':'/rɪˈdʒekt/','object':'/ˈɒb.dʒekt/',
'describe':'/dɪˈskraɪb/','subscribe':'/səbˈskraɪb/','prescribe':'/prɪˈskraɪb/',
'convert':'/kənˈvɜːrt/','reverse':'/rɪˈvɜːrs/','diverse':'/daɪˈvɜːrs/','universe':'/ˈjuː.nɪ.vɜːrs/',
'transmit':'/trænzˈmɪt/','submit':'/səbˈmɪt/','admit':'/ədˈmɪt/','commit':'/kəˈmɪt/',
'visible':'/ˈvɪz.ə.bəl/','vision':'/ˈvɪʒ.ən/','visit':'/ˈvɪz.ɪt/','evidence':'/ˈev.ɪ.dəns/',
'attract':'/əˈtrækt/','contract':'/ˈkɒn.trækt/','extract':'/ˈek.strækt/','abstract':'/ˈæb.strækt/',
'interrupt':'/ˌɪn.təˈrʌpt/','corrupt':'/kəˈrʌpt/','disrupt':'/dɪsˈrʌpt/','erupt':'/ɪˈrʌpt/',
'accept':'/əkˈsept/','concept':'/ˈkɒn.sept/','perceive':'/pərˈsiːv/','receive':'/rɪˈsiːv/',
'value':'/ˈvæl.juː/','evaluate':'/ɪˈvæl.ju.eɪt/','available':'/əˈveɪ.lə.bəl/',
'nature':'/ˈneɪ.tʃər/','nation':'/ˈneɪ.ʃən/','natural':'/ˈnætʃ.ər.əl/','native':'/ˈneɪ.tɪv/',
'operate':'/ˈɒp.ər.eɪt/','cooperate':'/koʊˈɒp.ər.eɪt/','function':'/ˈfʌŋk.ʃən/',
'science':'/ˈsaɪ.əns/','conscious':'/ˈkɒn.ʃəs/','memory':'/ˈmem.ər.i/','mental':'/ˈmen.təl/',
'involve':'/ɪnˈvɒlv/','evolve':'/ɪˈvɒlv/','revolution':'/ˌrev.əˈluː.ʃən/','resolve':'/rɪˈzɒlv/',
'progress':'/ˈprɒɡ.res/','process':'/ˈprɒs.es/','problem':'/ˈprɒb.ləm/','program':'/ˈproʊ.ɡræm/',
'develop':'/dɪˈvel.əp/','determine':'/dɪˈtɜːr.mɪn/','design':'/dɪˈzaɪn/','define':'/dɪˈfaɪn/',
'examine':'/ɪɡˈzæm.ɪn/','example':'/ɪɡˈzæm.pəl/','explain':'/ɪkˈspleɪn/','explore':'/ɪkˈsplɔːr/',
'mobile':'/ˈmoʊ.baɪl/','motion':'/ˈmoʊ.ʃən/','emotion':'/ɪˈmoʊ.ʃən/','motivate':'/ˈmoʊ.tɪ.veɪt/',
'capital':'/ˈkæp.ɪ.təl/','capable':'/ˈkeɪ.pə.bəl/','capture':'/ˈkæp.tʃər/','capacity':'/kəˈpæs.ɪ.ti/',
'section':'/ˈsek.ʃən/','insect':'/ˈɪn.sekt/','sense':'/sens/','sensitive':'/ˈsen.sɪ.tɪv/',
'signal':'/ˈsɪɡ.nəl/','significant':'/sɪɡˈnɪf.ɪ.kənt/','similar':'/ˈsɪm.ɪ.lər/',
'solar':'/ˈsoʊ.lər/','solution':'/səˈluː.ʃən/','absolute':'/ˈæb.sə.luːt/',
'special':'/ˈspeʃ.əl/','specific':'/spəˈsɪf.ɪk/','species':'/ˈspiː.ʃiːz/',
'spirit':'/ˈspɪr.ɪt/','inspire':'/ɪnˈspaɪər/','aspire':'/əˈspaɪər/',
'state':'/steɪt/','station':'/ˈsteɪ.ʃən/','stable':'/ˈsteɪ.bəl/','establish':'/ɪˈstæb.lɪʃ/',
'temporary':'/ˈtem.pər.er.i/','contemporary':'/kənˈtem.pər.er.i/',
'contain':'/kənˈteɪn/','continue':'/kənˈtɪn.juː/','maintain':'/meɪnˈteɪn/',
'territory':'/ˈter.ɪ.tɔːr.i/','terrestrial':'/təˈres.tri.əl/',
'theory':'/ˈθɪə.ri/','theology':'/θiˈɒl.ə.dʒi/',
'type':'/taɪp/','typical':'/ˈtɪp.ɪ.kəl/','prototype':'/ˈproʊ.tə.taɪp/',
'urban':'/ˈɜːr.bən/','suburb':'/ˈsʌb.ɜːrb/',
'vital':'/ˈvaɪ.təl/','survive':'/sərˈvaɪv/','vivid':'/ˈvɪv.ɪd/',
'culture':'/ˈkʌl.tʃər/','agriculture':'/ˈæɡ.rɪ.kʌl.tʃər/','architecture':'/ˈɑːr.kɪ.tek.tʃər/',
'pressure':'/ˈpreʃ.ər/','express':'/ɪkˈspres/','impress':'/ɪmˈpres/',
'liberty':'/ˈlɪb.ər.ti/','liberal':'/ˈlɪb.ər.əl/',
'material':'/məˈtɪr.i.əl/','physical':'/ˈfɪz.ɪ.kəl/','political':'/pəˈlɪt.ɪ.kəl/',
'popular':'/ˈpɒp.jʊ.lər/','population':'/ˌpɒp.jʊˈleɪ.ʃən/',
'primary':'/ˈpraɪ.mer.i/','principal':'/ˈprɪn.sɪ.pəl/','principle':'/ˈprɪn.sɪ.pəl/',
'private':'/ˈpraɪ.vɪt/','privilege':'/ˈprɪv.əl.ɪdʒ/',
'region':'/ˈriː.dʒən/','regular':'/ˈreɡ.jʊ.lər/','regulate':'/ˈreɡ.jʊ.leɪt/',
'result':'/rɪˈzʌlt/','credit':'/ˈkred.ɪt/','incredible':'/ɪnˈkred.ɪ.bəl/',
'audience':'/ˈɔː.di.əns/','audio':'/ˈɔː.di.oʊ/',
'local':'/ˈloʊ.kəl/','locate':'/loʊˈkeɪt/','location':'/loʊˈkeɪ.ʃən/',
'current':'/ˈkʌr.ənt/','occur':'/əˈkɜːr/','currency':'/ˈkʌr.ən.si/',
'normal':'/ˈnɔːr.məl/','abnormal':'/æbˈnɔːr.məl/','enormous':'/ɪˈnɔːr.məs/',
'novel':'/ˈnɒv.əl/','innovate':'/ˈɪn.ə.veɪt/',
'equal':'/ˈiː.kwəl/','equation':'/ɪˈkweɪ.ʒən/','equivalent':'/ɪˈkwɪv.əl.ənt/',
'final':'/ˈfaɪ.nəl/','finish':'/ˈfɪn.ɪʃ/','infinite':'/ˈɪn.fɪ.nɪt/',
'flexible':'/ˈflek.sɪ.bəl/',
'influence':'/ˈɪn.flu.əns/','fluent':'/ˈfluː.ənt/',
'fragment':'/ˈfræɡ.mənt/','fraction':'/ˈfræk.ʃən/','fragile':'/ˈfrædʒ.aɪl/',
'civil':'/ˈsɪv.əl/','civilization':'/ˌsɪv.ɪ.laɪˈzeɪ.ʃən/',
'volunteer':'/ˌvɒl.ənˈtɪər/',
'navigate':'/ˈnæv.ɪ.ɡeɪt/','manage':'/ˈmæn.ɪdʒ/','manufacture':'/ˌmæn.jʊˈfæk.tʃər/',
'illuminate':'/ɪˈluː.mɪ.neɪt/','illustrate':'/ˈɪl.ə.streɪt/',
'complete':'/kəmˈpliːt/','complex':'/ˈkɒm.pleks/','connect':'/kəˈnekt/',
'create':'/kriˈeɪt/','celebrate':'/ˈsel.ɪ.breɪt/','concentrate':'/ˈkɒn.sən.treɪt/',
'organize':'/ˈɔːr.ɡən.aɪz/','recognize':'/ˈrek.əɡ.naɪz/','realize':'/ˈriː.əl.aɪz/',
'identify':'/aɪˈden.tɪ.faɪ/','classify':'/ˈklæs.ɪ.faɪ/','simplify':'/ˈsɪm.plɪ.faɪ/',
'absolutely':'/ˈæb.sə.luːt.li/','actually':'/ˈæk.tʃu.ə.li/','especially':'/ɪˈspeʃ.əl.i/',
'immediately':'/ɪˈmiː.di.ət.li/','obviously':'/ˈɒb.vi.əs.li/','probably':'/ˈprɒb.ə.bli/',
'freedom':'/ˈfriː.dəm/','wisdom':'/ˈwɪz.dəm/','kingdom':'/ˈkɪŋ.dəm/',
'relationship':'/rɪˈleɪ.ʃən.ʃɪp/','leadership':'/ˈliː.dər.ʃɪp/','friendship':'/ˈfrend.ʃɪp/',
'childhood':'/ˈtʃaɪld.hʊd/','neighborhood':'/ˈneɪ.bər.hʊd/',
'language':'/ˈlæŋ.ɡwɪdʒ/','marriage':'/ˈmær.ɪdʒ/','message':'/ˈmes.ɪdʒ/',
'difference':'/ˈdɪf.ər.əns/','existence':'/ɪɡˈzɪs.təns/',
'ability':'/əˈbɪl.ɪ.ti/','opportunity':'/ˌɒp.ərˈtjuː.nɪ.ti/',
'reality':'/riˈæl.ɪ.ti/','society':'/səˈsaɪ.ɪ.ti/','university':'/ˌjuː.nɪˈvɜːr.sɪ.ti/',
'teacher':'/ˈtiː.tʃər/','computer':'/kəmˈpjuː.tər/','director':'/daɪˈrek.tər/',
'scientist':'/ˈsaɪ.ən.tɪst/','artist':'/ˈɑːr.tɪst/','journalist':'/ˈdʒɜːr.nəl.ɪst/',
'possible':'/ˈpɒs.ɪ.bəl/','impossible':'/ɪmˈpɒs.ɪ.bəl/','responsible':'/rɪˈspɒn.sɪ.bəl/',
'successful':'/səkˈses.fəl/','careful':'/ˈker.fəl/','useful':'/ˈjuːs.fəl/',
'dangerous':'/ˈdeɪn.dʒər.əs/','famous':'/ˈfeɪ.məs/','nervous':'/ˈnɜːr.vəs/',
'creative':'/kriˈeɪ.tɪv/','effective':'/ɪˈfek.tɪv/','negative':'/ˈneɡ.ə.tɪv/',
'academic':'/ˌæk.əˈdem.ɪk/','economic':'/ˌiː.kəˈnɒm.ɪk/','scientific':'/ˌsaɪ.ənˈtɪf.ɪk/',
'automatic':'/ˌɔː.təˈmæt.ɪk/','dramatic':'/drəˈmæt.ɪk/','romantic':'/roʊˈmæn.tɪk/',
'adventure':'/ədˈven.tʃər/','literature':'/ˈlɪt.ər.ə.tʃər/','sculpture':'/ˈskʌlp.tʃər/',
'government':'/ˈɡʌv.ərn.mənt/','development':'/dɪˈvel.əp.mənt/','management':'/ˈmæn.ɪdʒ.mənt/',
'awareness':'/əˈwer.nəs/','business':'/ˈbɪz.nɪs/','happiness':'/ˈhæp.i.nəs/',
};

// Approximate IPA for words not in IPA_MAP — rule-based phonetic estimation
function approxIPA(w){
  w=w.toLowerCase().replace(/[^a-z]/g,'');
  if(!w) return '';
  // Common suffix pronunciation patterns
  const rules=[
    [/tion$/,'ʃən'],[/sion$/,'ʒən'],[/ious$/,'i.əs'],[/eous$/,'i.əs'],[/ous$/,'əs'],
    [/ment$/,'mənt'],[/ness$/,'nəs'],[/able$/,'ə.bəl'],[/ible$/,'ɪ.bəl'],
    [/ful$/,'fəl'],[/less$/,'ləs'],[/ly$/,'li'],[/ity$/,'ɪ.ti'],[/ive$/,'ɪv'],
    [/ize$/,'aɪz'],[/ise$/,'aɪz'],[/ate$/,'eɪt'],[/ure$/,'ər'],[/ence$/,'əns'],
    [/ance$/,'əns'],[/ant$/,'ənt'],[/ent$/,'ənt'],[/ing$/,'ɪŋ'],[/tion$/,'ʃən'],
    [/al$/,'əl'],[/ic$/,'ɪk'],[/ical$/,'ɪ.kəl'],[/er$/,'ər'],[/or$/,'ər'],
    [/ist$/,'ɪst'],[/dom$/,'dəm'],[/ship$/,'ʃɪp'],[/hood$/,'hʊd'],
  ];
  // Common prefix patterns
  const prefRules=[
    [/^un/,'ʌn.'],[/^re/,'rɪ.'],[/^pre/,'priː.'],[/^dis/,'dɪs.'],[/^mis/,'mɪs.'],
    [/^over/,'oʊ.vər.'],[/^under/,'ʌn.dər.'],[/^inter/,'ɪn.tər.'],[/^trans/,'træns.'],
    [/^sub/,'sʌb.'],[/^super/,'suː.pər.'],[/^anti/,'æn.ti.'],[/^auto/,'ɔː.toʊ.'],
    [/^ex/,'ɛks.'],[/^in/,'ɪn.'],[/^im/,'ɪm.'],[/^de/,'dɪ.'],[/^com/,'kəm.'],
    [/^con/,'kən.'],[/^pro/,'proʊ.'],[/^per/,'pər.'],
  ];
  let pref='', suf='', mid=w;
  for(const [rx,ph] of prefRules){ if(rx.test(mid)&&mid.length>rx.source.replace(/[^a-z]/g,'').length+2){ pref=ph; mid=mid.replace(rx,''); break; } }
  for(const [rx,ph] of rules){ if(rx.test(mid)&&mid.length>rx.source.replace(/[^a-z]/g,'').length+1){ suf=ph; mid=mid.replace(rx,''); break; } }
  // Rough middle approximation
  const vowelMap={a:'æ',e:'ɛ',i:'ɪ',o:'ɒ',u:'ʌ'};
  let midIpa='';
  for(let i=0;i<mid.length;i++){
    const c=mid[i];
    if(vowelMap[c]) midIpa+=vowelMap[c];
    else midIpa+=c;
  }
  if(midIpa&&suf) midIpa+='.';
  return '/'+pref+midIpa+suf+'/';
}

function getIPA(w){
  const clean=w.toLowerCase().replace(/[^a-z]/g,'');
  if(WORD_IPA[clean]) return WORD_IPA[clean];
  if(IPA_MAP[clean]) return IPA_MAP[clean];
  const est=approxIPA(clean);
  return est ? '≈ '+est : ''; // ≈ marks a rule-based estimate, not a dictionary transcription
}

// ============================================================
//  WORD DATA (exam vocabulary → morpheme mappings, 中文释义, IPA, levels)
// ============================================================
// data/words.js is generated by scripts/vocab/build.js from ECDICT + wordroot.txt
// + reviewed mappings. One tab-separated line per word, most frequent first:
//   word \t morphemeIds(,) \t 中文 \t IPA \t levels (z 中考 g 高考 4 CET4 6 CET6 k 考研 t TOEFL i IELTS)
const _t0=performance.now();
const WORDS_RAW = (window.WORDS_RAW || '').trim(); // loaded from data/words.js
const WORD_DATA = new Map(); // word → [morphemeIds]
const MORPH_WORDS = {};      // morphemeId → [words], in frequency order
const WORD_CN = {};          // word → 中文释义 (dictionary, verified)
const WORD_IPA = {};         // word → IPA (dictionary; missing for a few words)
const WORD_LV = {};          // word → level codes
const WORD_EN = {};          // word → short English definition
const WORD_FORMS = {};       // word → "p:past/i:-ing/s:plural/r:comparative"
const LV_NAMES = {z:'中考',g:'高考','4':'CET4','6':'CET6',k:'考研',t:'TOEFL',i:'IELTS'};
if(WORDS_RAW){
  WORDS_RAW.split('\n').forEach(line => {
    const f = line.split('\t');
    if(f.length < 2 || !f[0]) return;
    const word = f[0], mlist = f[1] ? f[1].split(',') : [];
    WORD_DATA.set(word, mlist);
    if(f[2]) WORD_CN[word] = f[2];
    if(f[3]) WORD_IPA[word] = f[3];
    if(f[4]) WORD_LV[word] = f[4];
    if(f[5]) WORD_EN[word] = f[5];
    if(f[6]) WORD_FORMS[word] = f[6];
    mlist.forEach(m => { (MORPH_WORDS[m] = MORPH_WORDS[m] || []).push(word); });
  });
}
// Short gloss for tags/lists: first sense only, POS markers removed, ≤14 chars
function shortCN(cn){
  if(!cn) return '';
  let s=cn.split(' / ')[0].replace(/^(\[[^\]]*\]\s*)?([a-z]+\.\s*)+/,'').replace(/[（(][^）)]*[）)]?/g,'').replace(/\s*[,，]\s*/g,'，').trim();
  s=s.split(/[,，;；]/).map(x=>x.trim()).filter(Boolean).slice(0,2).join('，');
  return s.length>14 ? s.slice(0,13)+'…' : s;
}
// UI state shared across modules (declared early because several files read it)
let pinnedNode=null;            // morpheme node the card is pinned to (legacy; the workshop opens walls instead)
let ttDragged=false;            // card was dragged by hand
let searchQuery='', filterType='all';
let searchResults=[], sdActiveIdx=-1, searchDebounce=null;
let filterCats=new Set();       // sub-category filter (semantic boxes)

// Exam-level filter: empty = show everything; otherwise a word must carry one of the selected codes.
// Supplementary words without a level (added for sparse morphemes) only show when no filter is active.
let levelFilter = new Set();
function wordVisible(w){ if(levelFilter.size===0) return true; const lv=WORD_LV[w]||''; for(const c of levelFilter) if(lv.includes(c)) return true; return false; }
function visibleWordCount(){ if(levelFilter.size===0) return WORD_DATA.size; let n=0; for(const w of WORD_DATA.keys()) if(wordVisible(w)) n++; return n; }
function levelLabel(w){ const lv=WORD_LV[w]||''; return [...lv].map(c=>LV_NAMES[c]).filter(Boolean).join(' · '); }

// Build prefix index for fast word search (2-char prefix → words)
const WORD_PREFIX = {};
WORD_DATA.forEach((morphs, word) => {
  const p2 = word.substring(0,2);
  if(!WORD_PREFIX[p2]) WORD_PREFIX[p2] = [];
  WORD_PREFIX[p2].push(word);
});
console.log(`Word data: ${WORD_DATA.size} words loaded in ${(performance.now()-_t0).toFixed(0)}ms`);

// ---------- question quality helpers ----------
// Do the morphemes, read left to right, roughly spell the word? Returns the ids in spelling
// order when they do (inspect = in + spect, national = nat + tion + al), else null. Tolerates
// a dropped first letter (ex+spect → expect), a trimmed tail (nat+ure → nature) and up to two
// linking letters between parts; the last part may leave three letters unexplained.
const _formsCache={};
function morphForms(id){
  if(_formsCache[id]) return _formsCache[id];
  const n=nodeMap[id]; const morph=n?(n.morph||n.label||''):'';
  return _formsCache[id]=morph.replace(/\([^)]*\)/g,'').split('/').map(s=>s.trim().replace(/^-|-$/g,'').toLowerCase()).filter(Boolean).sort((a,b)=>b.length-a.length);
}
function _fitOrder(word, ids){
  let pos=0;
  for(const id of ids){
    const forms=morphForms(id); let hit=-1;
    outer: for(let skip=0; skip<=2; skip++){
      const at=pos+skip; if(at>word.length) break;
      for(const f of forms){
        const cands=[f]; if(f.length>=4) cands.push(f.slice(1)); if(f.length>=3) cands.push(f.slice(0,-1)); if(f.length>=4) cands.push(f.slice(0,-2));
        for(const c of cands){ if(c.length>=2 && word.startsWith(c,at)){ hit=at+c.length; break outer; } }
      }
    }
    if(hit<0) return false; pos=hit;
  }
  return word.length-pos<=3;
}
function morphFit(word, ids){
  ids=ids.filter(id=>nodeMap[id]); if(!ids.length) return null;
  if(_fitOrder(word,ids)) return ids;
  // the data lists parts by type (prefix, root, suffix); try the order they appear in the word
  const byPos=ids.slice().sort((a,b)=>{ const pa=Math.min(...morphForms(a).map(f=>{ const i=word.indexOf(f.slice(0,3)); return i<0?99:i; })); const pb=Math.min(...morphForms(b).map(f=>{ const i=word.indexOf(f.slice(0,3)); return i<0?99:i; })); return pa-pb; });
  return _fitOrder(word,byPos)?byPos:null;
}
// Part of speech of the first sense: n / v / a / ad / other
function posOf(word){ const m=(WORD_CN[word]||'').match(/^(?:\[[^\]]*\]\s*)?([a-z]+)\./); if(!m) return ''; const p=m[1]; return /^v/.test(p)?'v':p==='n'?'n':p==='a'||p==='adj'?'a':p==='ad'||p==='adv'?'ad':p; }
// Wrong options for a meaning question: same part of speech, similar frequency, not the
// same gloss; one or two from the same root first (so the prefix has to be read).
let _freqList=null;
function pickDistractors(word, n, opts){
  opts=opts||{}; const answer=shortCN(WORD_CN[word]||''); const seen=new Set([answer,'']); const out=[];
  const toks=(c)=>c.replace(/…$/,'').split(/[，,]/).map(x=>x.replace(/^(使|令人|变得|变|成为)/,'').replace(/(的|地|者|们)$/,'')).filter(x=>x.length>=1);
  const ansToks=toks(answer);
  const clash=(c)=>{ const t=toks(c); return t.some(x=>ansToks.some(y=>x===y||(x.length>=2&&y.includes(x))||(y.length>=2&&x.includes(y)))); };
  const okWord=(w)=>{ if(w===word||!WORD_CN[w]||!wordVisible(w)) return false; const c=shortCN(WORD_CN[w]); if(seen.has(c)||c.length>16||clash(c)) return false; return true; };
  const add=(w)=>{ const c=shortCN(WORD_CN[w]); seen.add(c); out.push(opts.words?w:c); };
  const ids=(WORD_DATA.get(word)||[]).filter(id=>nodeMap[id]); const rootId=ids.find(id=>nodeMap[id].type==='r');
  if(rootId&&opts.sameRoot!==false){ for(const w of (MORPH_WORDS[rootId]||[])){ if(out.length>=(opts.sameRootMax||2)) break; if(okWord(w)&&(opts.anyPos||posOf(w)===posOf(word))) add(w); } }
  _freqList=_freqList||[...WORD_DATA.keys()];
  const idx=Math.max(0,_freqList.indexOf(word)); const pos=posOf(word);
  for(let radius=120; out.length<n && radius<=_freqList.length; radius*=2){
    const lo=Math.max(0,idx-radius), hi=Math.min(_freqList.length,idx+radius);
    const cands=[]; for(let i=lo;i<hi;i++){ const w=_freqList[i]; if(okWord(w)&&(opts.anyPos||!pos||posOf(w)===pos)) cands.push(w); }
    for(let i=cands.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [cands[i],cands[j]]=[cands[j],cands[i]]; }
    for(const w of cands){ if(out.length>=n) break; if(okWord(w)) add(w); }
  }
  return out.length>=n?out.slice(0,n):null;
}
