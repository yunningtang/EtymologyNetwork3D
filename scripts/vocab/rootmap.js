/**
 * Maps this project's morpheme ids to entries in ECDICT's wordroot.txt
 * (https://github.com/skywind3000/ECDICT), whose example lists are
 * human-curated. Each value is a list of wordroot keys; an entry may be
 * { k: key, f: /regex/ } to keep only example words matching the regex
 * (used where one wordroot entry covers several of our morphemes).
 * Morphemes absent here have no wordroot counterpart and rely on review.
 */
module.exports = {
  // ---- prefixes ----
  pre:['pre-'], post:['post-'], re:['re-'], un:['un-1'], dis:['dis-'],
  in1:['in-2','il-2','im-2'],            // not
  in2:['in-1','il-1','im-1'],            // in / into (new morpheme)
  en:['en-1, em-1','en-2, em-2'], non:['non-'], anti:['anti-'], over:['over-'],
  under:['under-'], out:['out-'], mis:['mis-'], de:['de-'], trans:['tra-, trans-'],
  inter:['inter-'], intra:['intra-'], extra:['extr-, extra-, exter-'],
  super:[{k:'super-, supra-, sur-2', f:/^sup/}], sur:[{k:'super-, supra-, sur-2', f:/^sur/}],
  sub:['sub-'], com:['con-','com-'], co:['co-'], pro:['pro-1','pro-2'], fore:['fore-'],
  auto:['aut, auto'], bi:['bi-, bin-'], tri:['tri'], multi:['multi-'], poly:['poly'],
  mono:['mon, mono'], uni:['uni'], semi:['semi-, demi-'], micro:['micro-'], macro:['macro-'],
  mega:['mega, megal, megalo, -megaly'], neo:['neo'], proto:['proto, prot'],
  counter:['counter-, contra-'], ab:['ab-, abs-'], ad:['ad-'], circum:['circu-, circum-'],
  dia:['dia-, di-1'], ex:['ex-'], hyper:['hyper-'], hypo:['hyp-, hypo-'], meta:['meta-'],
  para:['para-'], peri:['peri'], retro:['retro-'], ultra:['ultra-'], infra:['infra-'],
  // ---- roots ----
  struct:['struct'], duct:['duc, duct'], spect:['spect, spec, spic, spectro'], port:['port'],
  ject:['ject, jet, jac'], dict:['dic, dict'], scrib:['scrib, script'], vert:['vers, vert'],
  mit:['mit, mis1, mitt, miss, -mise'], cred:['cred, credit'], aud:['aud, audit, audio'],
  vis:['vid, vis, -vise'], tract:['tract'], rupt:['rupt'],
  cept:[{k:'cap1, cip, capt, cept, -ceive, -ceit', f:/cept|ceiv|ceit|cip/}],
  cap:['cap2, capit, cipit', {k:'cap1, cip, capt, cept, -ceive, -ceit', f:/cap/}],
  pos:['pos, -pose, pon, -pone, -pound'], form:['form'], gen:['gen, gener'],
  graph:['graph, -graphy','gram'], log:['log, logo, -logue','-logy, -ology'],
  path:['path, patho, -pathic, -pathy'], phil:['phil, philo, -philia, -phile'],
  phon:['phon, phono, -phone, -phony'], photo:['phot, photo'], psych:['psych, psycho'],
  scope:['scop, -scope, -scopy'], sect:['sect'], sens:['sens, sent1'], voc:['voc, -voke'],
  act:['act, ag'], anim:['anim'], aqua:['aqu, aqua'], astro:['astr, aster, astro'],
  bio:['bio, bi, -be'], cede:['ced, ces, -ceed, -cede, -cess'], chron:['chron, chrono'],
  civ:['civ'], claim:['clam, claim'], cord:['cor2, cour2, cord'],
  corp:['corp, corpo, corpor, corpus'], cosm:['cosm, cosmo'],
  cur:['cur1, curr, cor1, corr, curs, cour1, cours'], dem:['dem, demo'],
  derm:['derm, derma, dermat, dermato'], domin:['dom1, domin'], equ:['equ, equi'],
  fac:['fac, fic, fec, fact, fect'], fer:[{k:'fer, lat2, -late', f:/fer/}], fid:['fid'],
  fin:['fin'], flex:['flect, flex'], frag:['fract, frag'], func:['funct'], geo:['geo'],
  gress:['grad, -grade','gress'], hab:['hab, hib'], junct:['junct'], lect:['leg2, lect1, lig'],
  liber:['liber1'], loc:['loc'], luc:['luc, lum'], man:['man, mani, manu, main'],
  mar:['mar, mari'], mater:['matr, matri, mater'], med:['medi'], mem:['memor, member, membr'],
  ment:['ment'], min:['min'], mob:['mob, mot, mov'], morph:['morph, morpho'], mort:['mort'],
  nat:['nat, nas'], nav:['nav'], nom:['nom1, nomin, nomen'], nov:['nov'], opt:['opt2','opt1'],
  ord:['ord, ordin'], pater:['patr, patri, pater'], ped:['ped1, pedi, -pede','pod, pode'],
  pel:['pel, puls'], pend:['pend, pens'], plex:['plic, plex, ply'], pop:['popul'],
  prim:['prim, princ'], prob:['prob, prov, -prove'], reg:['reg, rect, rig1'], sci:['sci'],
  sol:['sol2, soli','sol1'], spher:['spher, -sphere'], spir:['spir, spiro'],
  stat:['sist','sta, stas, stat, stant, -stance'], stell:['stell'], tang:['tact, tang, ting, tig'],
  temp:['temp1, tempor'], ten:['ten, tin, tain'], terr:['terr, terra'], theo:['the, theo'],
  therm:['therm, thermo'], tort:['tort'], urb:['urb'], val:['val, valu, valid'],
  ven:['veni, vent, ven, -vene'], vita:['viv, vivi, vit'], vol:['vol'],
  // ---- suffixes ----
  tion:['-ion'], ment2:['-ment'], ness:['-ness'], ity:['-ty, -ity, -uity, -eity'],
  er:['-er, -or, -ar2'], ist:['-ist'], ism:['-ism1','-ism2'], able:['-able, -ible, -ble'],
  ful:['-ful1'], less:['-less'], ous:['-ous, -ious'], ive:['-ive, -ative'],
  al:['-al2, -ial, -ual','-al1'], ic:['-ic'], ly:['-ly1','-ly2'], ize:['-ize, -ise'],
  ify:['-fy, -ify, -efy'], ate:['-ate1'], en2:['-en1','-en2'], dom:['-dom'], hood:['-hood'],
  age:['-age'], ance:['-ance, -ence, -ency, -ancy'], ant:['-ant, -ent'],
  ary:['-ary1','-ary2','-ory, -atory2'], ure:['-ure'],
};
