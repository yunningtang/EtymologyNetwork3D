// Morpheme icons (emoji) for the kid-friendly theme: a concrete picture per morpheme where one
// exists, otherwise a category icon. Used on cards, the 2D map and the quest game.
// Classic script: shares the global scope with the other files in src/.

const CAT_ICON = {
  neg:'🚫', dir:'🧭', deg:'📏', num:'🔢', aux:'🧩', create:'🛠️', move:'🏃', sense:'👀', mind:'🧠',
  lang:'💬', nature:'🌿', society:'🏛️', noun_s:'📦', adj_s:'🎨', verb_s:'⚡', adv_s:'💨', word:'⭐',
};
const MORPH_ICON = {
  // prefixes
  pre:'⏮️', post:'⏭️', re:'🔁', un:'🚫', dis:'✂️', in1:'🚫', in2:'📥', en:'📥', non:'🙅', anti:'🛡️',
  over:'☂️', under:'🌊', out:'🚪', mis:'❌', de:'⬇️', trans:'🌉', inter:'🤝', intra:'🏠', extra:'🎁',
  super:'🦸', sub:'🚇', com:'🫱🏼‍🫲🏽', co:'👯', pro:'➡️', fore:'🔮', auto:'🤖', bi:'🚲', tri:'🔺', multi:'🎛️',
  poly:'🐙', mono:'1️⃣', uni:'🦄', semi:'🌗', micro:'🔬', macro:'🔭', mega:'🐘', mini:'🐜', neo:'🌱',
  proto:'🦖', counter:'↩️', sur:'🏔️', ab:'🏃‍♂️', ad:'🎯', circum:'🔄', dia:'↔️', ex:'📤', hyper:'🚀',
  hypo:'🪫', meta:'🦋', para:'🪂', peri:'⭕', retro:'📼', ultra:'🌌', vice:'🎭', infra:'🏗️',
  // roots
  struct:'🏗️', duct:'🧲', spect:'👓', port:'🚢', ject:'🏹', dict:'🗣️', scrib:'✍️', vert:'🔃', mit:'📨',
  cred:'🤞', aud:'👂', vis:'👁️', tract:'🚜', rupt:'💥', cept:'🤲', pos:'📍', form:'🧊', gen:'🐣',
  graph:'📝', log:'📚', path:'💔', phil:'💖', phon:'🔊', photo:'📸', psych:'🧠', scope:'🔭', sect:'🔪',
  sens:'🖐️', voc:'📣', act:'🎬', anim:'🐾', aqua:'💧', astro:'⭐', bio:'🧬', cap:'👑', cede:'🚶',
  chron:'⏰', civ:'🏙️', claim:'📢', clar:'🔆', cord:'❤️', corp:'🧍', cosm:'🪐', cur:'🏃‍♀️', dem:'👥',
  derm:'🩹', domin:'🏰', equ:'⚖️', fac:'🏭', fer:'🚚', fid:'🐕', fin:'🏁', flex:'🤸', flu:'🌊',
  frag:'🧩', func:'⚙️', geo:'🌍', gress:'🪜', hab:'🧳', junct:'🔗', lect:'📖', liber:'🕊️', liter:'🔤',
  loc:'📍', luc:'💡', man:'✋', mar:'🐳', mater:'👩‍👧', med:'🎯', mem:'🧠', ment:'💭', min:'🤏',
  mob:'🚗', morph:'🦋', mort:'💀', nat:'👶', nav:'⛵', nom:'🏷️', norm:'📐', nov:'🆕', oper:'🔧',
  opt:'🔘', ord:'🔢', pater:'👨‍👧', ped:'👣', pel:'🏒', pend:'⚖️', plex:'🪢', pop:'🧑‍🤝‍🧑', press:'🖨️',
  prim:'🥇', priv:'🔒', prob:'🧪', reg:'👑', sal:'🦘', sci:'🔬', sign:'🪧', simil:'👯', sol:'☀️',
  spec2:'🔍', spher:'🏀', spir:'🫁', stat:'🗿', stell:'🌟', tang:'👆', temp:'⏳', ten:'🤝', terr:'🏔️',
  test:'📜', theo:'⛪', therm:'🌡️', tort:'🌀', typ:'🖨️', urb:'🏙️', val:'💪', ven:'🚪', vita:'🌱', vol:'🙋',
  // suffixes
  tion:'📦', ment2:'📦', ness:'📦', ity:'📦', er:'🧑‍🔧', ist:'🎓', ism:'💡', able:'✅', ful:'🥛', less:'🫙',
  ous:'🎨', ive:'🎨', al:'🎨', ic:'🎨', ly:'💨', ize:'⚡', ify:'⚡', ate:'⚡', en2:'⚡', ward:'🧭',
  dom:'🏰', ship:'🚢', hood:'🏘️', age:'📦', ance:'📦', ant:'🎨', ary:'📚', ure:'📦', ing2:'🔄',
  ed2:'⏮️', ular:'🎨', esque:'🖼️', ling:'🐥',
};
function morphIcon(id){ return MORPH_ICON[id] || CAT_ICON[(typeof NODE_CAT!=='undefined' && NODE_CAT[id]) || ''] || '🪐'; }
