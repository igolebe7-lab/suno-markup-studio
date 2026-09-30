import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tags } from '../../apps/web/src/data/tags.ts';
import { tagKnowledge } from '../../apps/web/src/data/tagKnowledge.ts';
import { buildTagSettingProfile, settingCatalog } from '../../apps/web/src/domain/tagSettings.ts';
import { categoryNames, meanings, vocalMeanings, specialMeanings, settingsHelp, categoryGuidance } from './content.mjs';

const base = new URL('./', import.meta.url);
const candidates = JSON.parse(await readFile(new URL('candidates.json', base), 'utf8'));
const sourceFile = JSON.parse(await readFile(new URL('sources.json', base), 'utf8'));
const sources = new Map(sourceFile.sources.map(s => [s.id, s]));
const oldKnowledge = new Map(tagKnowledge.map(a => [a.tagId, a]));
const keySet = new Set(settingCatalog.map(f => f.key));
const date = '2026-09-29';
const anchor = id => `tag-${Buffer.from(id).toString('base64url')}`;
const normalize = text => text.replace(/^\[|\]$/g, '').toLowerCase();
const mdCode = text => `\`\`\`text\n${text}\n\`\`\``;
const href = id => {
  const tag = tags.find(t => t.id === id);
  return `reference/${tag.category}.md#${anchor(id)}`;
};

function meaning(tag) {
  if (specialMeanings[tag.id]) return specialMeanings[tag.id];
  if (tag.category === 'vocal') {
    const value = vocalMeanings[normalize(tag.sunoText)];
    assert(value, `Missing vocal meaning: ${tag.id}`);
    return value;
  }
  if (tag.category === 'avoid') {
    const term = tag.sunoText.replace(/^avoid:\s*/i, '');
    const target = {
      trap:'трэп-аранжировку', 'heavy guitars':'тяжёлые гитарные слои', 'screaming vocals':'криковый вокал',
      'excessive reverb':'избыточное пространственное послезвучие', 'muddy mix':'неразборчивый мутный микс',
      'long intro':'длинное вступление', 'spoken vocals':'разговорную вокальную подачу',
      'abrupt ending':'резкое необоснованное окончание', 'distorted drums':'перегруженные ударные',
      'generic EDM drop':'типовую фестивальную электронную кульминацию', 'chipmunk vocals':'чрезмерно высокий мультяшный голос',
      'overcompressed master':'чрезмерно сжатую общую динамику'
    }[term];
    assert(target, `Missing exclusion: ${term}`);
    return `Просьба не использовать ${target}. В поле Exclude предлагается переносить «${term}» без префикса avoid:.`;
  }
  if (/^\d+ BPM$/.test(tag.sunoText)) return `Пожелание пульса ${tag.sunoText}: ${tag.sunoText.split(' ')[0]} долей в минуту. Не задаёт рисунок ударных, размер такта или гарантированную скорость готового аудио.`;
  const value = meanings[tag.category]?.[tag.sunoText];
  if (value) return value;
  // Explicit section/instrument labels already have individual Russian descriptions.
  assert(tag.sunoText.startsWith('['), `Missing specific definition: ${tag.id}`);
  return `${tag.descriptionRu}. Это название музыкальной функции, не команда с гарантированным результатом.`;
}

function profile(tag) {
  const current = buildTagSettingProfile(tag).fields.map(f => f.key);
  let proposed = [...current];
  const fixes = [];
  if (tag.category === 'avoid') {
    proposed = [];
    fixes.push('Убрать неподтверждённые strictness/avoidScope; отдельное поле Exclude, без скрытой силы запрета.');
  }
  if (['end', 'hard-stop', 'big-finish', 'climax'].includes(tag.id)) {
    proposed = proposed.filter(k => k !== 'number');
    fixes.push('Нумерация здесь не помогает; не создавать End 2 или Final Hard Stop.');
  }
  if (['instrumental', 'instrumental-break', 'instrumental-interlude', 'instrument-full-band', 'instrument-acoustic-only', 'instrument-no-drums'].includes(tag.id)) {
    proposed = ['sectionEnergy', 'transition'];
    fixes.push('Состав/отсутствие вокала не отдельный солирующий инструмент: убрать instrumentRole/instrumentTone.');
  }
  if (['tempo-120-section', 'key-change', 'modulation', 'rubato', 'half-time', 'double-time', 'staccato', 'legato'].includes(tag.id)) {
    proposed = ['timing'];
    fixes.push('Общие громкость и переход не объясняют эту музыкальную операцию; точные дополнительные поля требуют отдельного профиля.');
  }
  if (tag.category === 'production') fixes.push('В следующем профиле отделить силу эффекта от области; фильтровать несовместимые значения пространства.');
  if (tag.category === 'vocal') fixes.push('Разделить регистр и роль в vocalRange; скрывать противоречащие самому тегу варианты, не запрещая творческие сочетания.');
  return {currentKeys:current, proposedKeys:proposed, changesRu:fixes};
}

function examples(tag) {
  const text = tag.sunoText;
  if (tag.category === 'avoid') return [
    {destination:'exclude', titleRu:'Отдельное исключение', text:text.replace(/^avoid:\s*/i,''), explanationRu:'Предлагаемый экспорт в Exclude. Не вставлять этот фрагмент как слова песни.'},
    {destination:'workflow-note', titleRu:'Проверка противоречий', text:'Сравните исключение с составом каждой секции: не запрещайте глобально то, что хотите услышать в припеве.', explanationRu:'Это памятка, не текст для копирования в Suno.'}
  ];
  const result = [];
  if (tag.placement !== 'lyrics') result.push({destination:'style', titleRu:'В описании звучания', text:text.replace(/^\[|\]$/g,''), explanationRu:'Минимальный пример одного музыкального пожелания; добавьте собственный жанровый контекст.'});
  if (tag.placement !== 'style') {
    const bracket = tag.id === 'piano-dynamic' ? '[Verse: soft dynamics]' : tag.id === 'silent-chorus' ? '[Chorus: stripped down]' : text.startsWith('[') ? text : `[${text}]`;
    let snippet;
    if (['end', 'hard-stop', 'big-finish', 'fade-out'].includes(tag.id)) snippet = `[Outro]\nПоследний свет хранит наш след.\n${bracket}`;
    else if (['intro','instrumental-intro','fade-in'].includes(tag.id)) snippet = `${bracket}\n\n[Verse 1]\nТихий город открывает окна.`;
    else if (tag.id === 'piano-dynamic') snippet = `${bracket}\nТихий город открывает окна.`;
    else if (['solo','interlude','break','build','drop','coda','climax'].includes(tag.id)) snippet = `[Verse 1]\nТихий город открывает окна.\n\n${bracket}\n\n[Chorus]\nМы оставим свет в окне.`;
    else if (tag.category === 'structure') snippet = `${bracket}\nМы оставим свет в окне.\nОн напомнит о весне.`;
    else if (tag.category === 'vocal') snippet = `[Verse 1]\n${bracket}\nТихий город открывает окна.`;
    else snippet = `[Verse 1]\nТихий город открывает окна.\n\n${bracket}\n\n[Chorus]\nМы оставим свет в окне.`;
    result.push({destination:'lyrics', titleRu:'Рядом с секцией', text:snippet, explanationRu:'Авторский пример размещения. Точная интерпретация подсказки не проверена генерацией; не является официальным шаблоном Suno.'});
  }
  if (result.length === 1) {
    if (tag.placement === 'style') {
      const context = tag.category === 'language' ? 'clear lead vocal' : tag.category === 'vocal' ? 'sparse accompaniment' : tag.category === 'rhythm' || tag.category === 'tempo' ? 'steady pulse' : 'instrumental';
      result.push({destination:'style', titleRu:'С контекстом', text:`${text}, ${context}`, explanationRu:'Пара пожеланий для отправной точки. Меняйте один элемент и сравнивайте результат на той же модели.'});
    } else {
      result.push({destination:'workflow-note', titleRu:'Проверка результата', text:`Сравните версию с ${text} и без него, сохранив слова, остальные подсказки и модель.`, explanationRu:'Это инструкция для опыта, не строка песни.'});
    }
  }
  return result;
}

function article(tag, isCandidate = false) {
  const [mechanism, placement, caveat] = categoryGuidance[tag.category];
  const settings = profile(tag);
  const directSection = ['verse','outro'].includes(tag.id);
  const contextSources = tag.category === 'avoid' ? ['S14'] : tag.category === 'production' ? ['S16',...(['production-phaser','production-flanger','production-chorus-effect'].includes(tag.id)?['M01']:[])] : tag.category === 'structure' ? ['S06','C01'] : tag.id === 'duet' ? ['C02'] : tag.placement === 'style' ? ['S14'] : ['C01'];
  const exactEvidence = directSection ? [{sourceId:'S06', scope:'В официальном анонсе приведено название секции; не все варианты скобок и не модификаторы.'}] : [];
  const related = oldKnowledge.get(tag.id)?.relatedTagIds.filter(id => tags.some(t => t.id === id)) ?? [];
  const overlaps = tags.filter(t => t.id !== tag.id && tag.aliases.some(a => normalize(a) === normalize(t.sunoText))).map(t => t.id);
  return {
    tagId:tag.id, label:tag.label, category:tag.category, placementCurrent:tag.placement,
    preferredDestination:tag.category === 'avoid' ? 'exclude' : tag.placement,
    sunoText:tag.sunoText, aliases:tag.aliases, summaryRu:isCandidate ? tag.descriptionRu : meaning(tag),
    musicalMechanismRu:mechanism, placementAdviceRu:placement,
    parameters:settings, exampleVariants: isCandidate ? [{destination:'style',titleRu:'Кандидат для проверки',text:tag.example,explanationRu:'Предложение для прослушивания, не испытанный рецепт.'}] : examples(tag),
    limitationsRu:[caveat, 'Внутреннее устройство модели неизвестно. Музыкальное объяснение не доказывает точное выполнение запроса.'],
    relatedTagIds:related, aliasCollisions:overlaps,
    evidence:{status:directSection?'documented-section-name':isCandidate?tag.evidence:'musical-description', directSupport:exactEvidence, contextSourceIds:isCandidate?tag.sourceIds:contextSources, contextScope:'Контекст применения и ограничения; не подтверждение каждого слова и модификатора.', audioTested:false},
    checkedAt:date, publicationStatus:'editorial-draft-audio-untested', candidate:isCandidate
  };
}

const articles = tags.map(t => article(t));
const additions = candidates.additions.map(t => ({...t,label:t.sunoText,aliases:[],confidence:'experimental'}));
const proposedArticles = additions.map(t => article(t,true));
const parameterDocs = settingCatalog.map(f => ({...f, explanationRu:settingsHelp[f.key], outputRuleRu:'none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.'}));
const update = {
  schemaVersion:1, status:'proposal-not-applied', checkedAt:date,
  sourceCatalog:'apps/web/src/data/tags.ts', sourceCount:tags.length,
  migrationPolicy:'Сохранять существующие ID и введённый текст. Ни одного автоматического удаления. Exclude переносить через просмотр изменений и подтверждение, с резервной копией проекта.',
  updates:articles.map(a => ({tagId:a.tagId,descriptionRu:a.summaryRu, keepSunoText:true, keepId:true, preferredDestination:a.preferredDestination, parameters:a.parameters, evidence:a.evidence, aliasCollisions:a.aliasCollisions})),
  additions:candidates.additions, forbiddenMagicTags:candidates.doNotAddAsTags,
  manualReview:[
    {tagId:'piano-dynamic',action:'Не переименовывать старый текст автоматически; предлагать [Verse: soft dynamics] по контексту.'},
    {tagId:'era-radio-ready',action:'Перенести категорию в production, сохранив ID; объединение с polished radio-ready mix предложить как related, не удалять старые ссылки.'},
    {tagId:'break',action:'Развести значение break/breakdown в поиске; не считать строгими синонимами.'},
    {tagId:'chorus-variation',action:'Оставить как необязательный пользовательский вариант, убрать требование его наличия.'},
    {tagId:'rhythm-dem bow rhythm',action:'Добавить поисковый alias dembow; сохранить ID с пробелами ради совместимости.'}
  ]
};

assert.equal(new Set(tags.map(t=>t.id)).size,tags.length,'Duplicate existing tag IDs');
assert.equal(articles.length,tags.length);
assert.equal(new Set([...tags,...additions].map(t=>t.id)).size,tags.length+additions.length,'Duplicate proposed ID');
for (const a of [...articles,...proposedArticles]) {
  assert(a.summaryRu.length > 20, `Thin article ${a.tagId}`);
  assert(a.exampleVariants.length > 0);
  for (const k of [...a.parameters.currentKeys,...a.parameters.proposedKeys]) assert(keySet.has(k) && settingsHelp[k],`Missing parameter ${k}`);
  for (const id of a.evidence.contextSourceIds) assert(sources.has(id),`Unknown source ${id}`);
  for (const e of a.exampleVariants) {
    assert.equal((e.text.match(/\[/g)||[]).length,(e.text.match(/\]/g)||[]).length,`Unbalanced example ${a.tagId}`);
    assert(!e.text.includes('<script'), 'Unsafe example');
  }
}
assert(parameterDocs.every(p=>p.explanationRu),'Missing settings help');
for (const s of sourceFile.sources) {
  assert(new URL(s.url).protocol==='https:');
  assert(s.date === null || s.date <= date, `Future source ${s.id}`);
}

const files = new Map();
files.set('tags-update.json',JSON.stringify(update,null,2)+'\n');
files.set('reference-data.json',JSON.stringify({schemaVersion:1,checkedAt:date,articles,proposedArticles,parameters:parameterDocs},null,2)+'\n');
const sourceLink = id => `[${id}: ${sources.get(id).title}](${sources.get(id).url})`;
files.set('settings.md', `# Настройки тегов\n\n[К оглавлению](README.md)\n\nЭто описание текущих полей приложения, а не API Suno. Изменения профилей указаны в каждой статье. Выбор \`none\` ничего не добавляет. Произвольные модификаторы добавляются обычным текстом, не запускают функции Studio. Не вставляйте API-ключи, пароли или личные данные.\n\n${parameterDocs.map(p=>`<a id="${p.key}"></a>\n## ${p.label} · ${p.key}\n\n${p.explanationRu}\n\nТип: ${p.type}. Варианты текущего интерфейса: ${p.options.map(o=>`\`${o}\``).join(', ')}.\n\n${p.outputRuleRu}`).join('\n\n')}\n\n## Пользовательские поля\n\n- text: добавляет пользовательскую фразу; это не новая возможность модели.\n- select: подставляет выбранный текст, а не скрытое числовое значение.\n- number: добавляет число; чтобы оно имело смысл, нужна единица и контекст. Число 8 не означает восемь тактов само по себе.\n- min/max и defaultValue ограничивают ввод в нашем интерфейсе, не поведение Suno.\n- Не создаём выдуманные параметры точности, процентов соблюдения и Seed без подтверждённого контроля в Suno.\n`);

for (const [category,name] of Object.entries(categoryNames)) {
  const entries=articles.filter(a=>a.category===category);
  const render = a => `<a id="${anchor(a.tagId)}"></a>\n## ${a.label}\n\nID: \`${a.tagId}\`. Назначение: ${a.preferredDestination}.\n\n**Что означает:** ${a.summaryRu}\n\n**Как понимать действие:** ${a.musicalMechanismRu}\n\n**Где применять:** ${a.placementAdviceRu}\n\n**Настройки:** ${a.parameters.currentKeys.map(k=>`[${settingCatalog.find(f=>f.key===k).label}](../settings.md#${k})`).join(', ') || 'Нет.'}\n\n${a.parameters.changesRu.length?`**Предлагаем исправить:** ${a.parameters.changesRu.join(' ')}\n\n`:''}**Примеры:**\n\n${a.exampleVariants.map(e=>`### ${e.titleRu} (${e.destination})\n\n${mdCode(e.text)}\n\n${e.explanationRu}`).join('\n\n')}\n\n**Ограничения:** ${a.limitationsRu.join(' ')}\n\n**Доказательства:** ${a.evidence.directSupport.length?'Официально приведено название секции, но не все модификаторы.':'Музыкальное описание; специальная поддержка этого синтаксиса не подтверждена.'} Аудиопроверка нами не проводилась. Контекст: ${a.evidence.contextSourceIds.map(sourceLink).join('; ')}. Эти ссылки не доказывают выполнение каждого тега.\n\n**Псевдонимы каталога:** ${a.aliases.length?a.aliases.map(s=>`\`${s}\``).join(', '):'нет'}. ${a.aliasCollisions.length?`Есть пересечение с отдельными тегами: ${a.aliasCollisions.join(', ')}; точное совпадение должно иметь приоритет.`:''}\n\n${a.relatedTagIds.length?`**См. также:** ${a.relatedTagIds.map(id=>`[${tags.find(t=>t.id===id).label}](../${href(id)})`).join(', ')}.\n\n`:''}[К категории](#top) · [Примеры песен](../recipes.md) · [Настройки](../settings.md)\n`;
  files.set(`reference/${category}.md`,`<a id="top"></a>\n# ${name}\n\n[Все категории](../README.md) · ${entries.length} записей · срез ${date}\n\nРедакционная справка. Значение музыкального термина не гарантирует его выполнение генератором.\n\n${entries.map(a=>`- [${a.label}](#${anchor(a.tagId)})`).join('\n')}\n\n${entries.map(render).join('\n---\n\n')}`);
}
files.set('coverage.json',JSON.stringify({checkedAt:date,existingTags:tags.length,oldArticles:tagKnowledge.length,missingBefore:tags.length-tagKnowledge.length,preparedArticles:articles.length,candidateArticles:proposedArticles.length,parameterDefinitions:parameterDocs.length,missingTagIds:tags.filter(t=>!articles.some(a=>a.tagId===t.id)).map(t=>t.id),audioVerifiedTags:0,categories:Object.fromEntries(Object.keys(categoryNames).map(c=>[c,articles.filter(a=>a.category===c).length]))},null,2)+'\n');
const template=await readFile(new URL('reference-template.html',base),'utf8');
const previewData=JSON.stringify({articles,proposedArticles,parameters:parameterDocs,categoryNames,sources:sourceFile.sources}).replaceAll('<','\\u003c');
files.set('reference.html',template.replace('__REFERENCE_DATA__',()=>previewData));
for (const [name,content] of files) if (name.endsWith('.md')) files.set(name,content.replace(/[ \t]+$/gm,''));

if (process.argv.includes('--check')) {
  for (const [name,content] of files) assert.equal(await readFile(new URL(name,base),'utf8'),content,`Stale generated file: ${name}`);
  console.log(`OK: ${articles.length} existing articles, ${proposedArticles.length} candidates, ${parameterDocs.length} settings; IDs, sources, examples and deterministic outputs checked.`);
} else {
  for (const [name,content] of files) {
    const url=new URL(name,base);
    await mkdir(new URL('./',url),{recursive:true});
    await writeFile(url,content);
  }
  console.log(`Generated ${files.size} research files in ${fileURLToPath(base)}. No runtime application files changed.`);
}
