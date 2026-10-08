import Fuse from 'fuse.js';
import rawReferenceData from '../../../../docs/suno-2026-09-29/reference-data.json';
import rawSources from '../../../../docs/suno-2026-09-29/sources.json';
import { tags } from './tags';
import { getOfficialEvidence, officialSources } from './officialTags';
import { buildTagSettingProfile, settingCatalog } from '../domain/tagSettings';

export type ReferenceArticle = {
  tagId: string;
  label: string;
  category: string;
  placementCurrent: string;
  preferredDestination: string;
  sunoText: string;
  aliases: string[];
  summaryRu: string;
  musicalMechanismRu: string;
  placementAdviceRu: string;
  parameters: { currentKeys: string[]; proposedKeys: string[]; changesRu: string[] };
  exampleVariants: Array<{ destination: string; titleRu: string; text: string; explanationRu: string }>;
  limitationsRu: string[];
  relatedTagIds: string[];
  evidence: {
    status: string;
    directSupport: Array<{ sourceId: string; scope: string }>;
    contextSourceIds: string[];
    contextScope: string;
    audioTested: boolean;
  };
  checkedAt: string;
};

export type ReferenceRoute =
  | { kind: 'list' }
  | { kind: 'tag'; value: string }
  | { kind: 'category'; value: string }
  | { kind: 'invalid' };

const preparedArticles = new Map((rawReferenceData.articles as ReferenceArticle[]).map((article) => [article.tagId, article]));
export const referenceArticles: ReferenceArticle[] = tags.map((tag) => {
  const proofs = getOfficialEvidence(tag);
  const prepared = preparedArticles.get(tag.id);
  const article: ReferenceArticle = prepared ?? {
    tagId: tag.id, label: tag.label, category: tag.category, placementCurrent: tag.placement,
    preferredDestination: tag.placement, sunoText: tag.sunoText, aliases: tag.aliases,
    summaryRu: tag.descriptionRu,
    musicalMechanismRu: `${tag.descriptionRu} В редакторе это словесное описание желаемого результата. Оно не устанавливает числовые параметры аудио и не гарантирует одинаковое исполнение при повторной генерации.`,
    placementAdviceRu: tag.placement === 'lyrics'
      ? 'Поместите инструкцию отдельной строкой в нужном месте текста. Подтверждение источником относится к указанному примеру или названию, а не ко всем добавленным настройкам.'
      : 'Добавьте описание в поле стиля и уточните инструмент, роль или характер изменения. Термин из глоссария не следует автоматически превращать в команду в квадратных скобках.',
    parameters: { currentKeys: [], proposedKeys: [], changesRu: [] },
    exampleVariants: tag.examples.map((text) => ({ destination: tag.placement, titleRu: 'Редакторский пример размещения', text, explanationRu: 'Пример составлен для приложения и не является цитатой или аудиопроверенным рецептом Suno.' })),
    limitationsRu: ['Результат зависит от модели, контекста и генерации. Модификаторы редактора не являются документированными настройками Suno.'],
    relatedTagIds: [], checkedAt: '2026-10-08',
    evidence: { status: 'musical-description', directSupport: [], contextSourceIds: [], contextScope: 'Музыкальное объяснение и примеры подготовлены редакцией приложения.', audioTested: false }
  };
  const currentArticle = { ...article, parameters: { ...article.parameters, currentKeys: buildTagSettingProfile(tag).fields.map((field) => field.key) } };
  return proofs.length ? {
    ...currentArticle, checkedAt: '2026-10-08',
    evidence: { ...article.evidence, status: 'officially-documented', directSupport: proofs.map((proof) => ({ sourceId: proof.sourceId, scope: proof.scope })) }
  } : currentArticle;
});
export const referenceById = new Map(referenceArticles.map((article) => [article.tagId, article]));
export const referenceParameters = new Map([
  ...rawReferenceData.parameters.map((parameter) => [parameter.key, { explanationRu: parameter.explanationRu }] as const),
  ...settingCatalog.filter((field) => field.explanationRu).map((field) => [field.key, { explanationRu: field.explanationRu! }] as const)
]);
export const referenceSources = new Map([...rawSources.sources, ...officialSources].map((source) => [source.id, source]));

const tagById = new Map(tags.map((tag) => [tag.id, tag]));
const searchable = referenceArticles.map((article) => ({
  article,
  description: tagById.get(article.tagId)?.descriptionRu ?? '',
  text: [
    article.summaryRu,
    article.musicalMechanismRu,
    article.placementAdviceRu,
    ...article.aliases,
    ...article.parameters.currentKeys.map((key) => referenceParameters.get(key)?.explanationRu ?? ''),
    ...article.exampleVariants.map((example) => example.text),
    ...article.limitationsRu
  ].join(' ')
}));
const fuse = new Fuse(searchable, {
  keys: ['article.tagId', 'article.label', 'article.sunoText', 'article.aliases', 'description', 'text'],
  threshold: 0.32,
  ignoreLocation: true
});

export function searchReference(query: string, category = 'all', placement = 'all', evidence = 'all'): ReferenceArticle[] {
  const normalized = query.trim().toLocaleLowerCase();
  const bare = normalized.replace(/^\[/, '').replace(/\]$/, '');
  const candidates = normalized
    ? [
        ...searchable.filter(({ article }) => article.tagId.toLocaleLowerCase() === bare
          || article.sunoText.toLocaleLowerCase().replace(/^\[/, '').replace(/\]$/, '') === bare),
        ...searchable.filter(({ article }) => article.aliases.some((alias) => alias.toLocaleLowerCase() === normalized)),
        ...searchable.filter(({ article, text, description }) => [
          article.label, article.sunoText, article.tagId, text, description
        ].join(' ').toLocaleLowerCase().includes(normalized)),
        ...fuse.search(query).map((result) => result.item)
      ]
    : searchable;
  const seen = new Set<string>();
  return candidates
    .filter(({ article }) => {
      if (seen.has(article.tagId)) return false;
      seen.add(article.tagId);
      return (category === 'all' || article.category === category)
        && (placement === 'all' || article.placementCurrent === placement || article.placementCurrent === 'both')
        && (evidence === 'all' || (evidence === 'official') === (article.evidence.status === 'officially-documented'));
    })
    .map(({ article }) => article);
}

export function parseReferenceHash(hash: string): ReferenceRoute {
  if (hash === '#reference' || hash === '#reference/') return { kind: 'list' };
  const match = /^#reference\/(tag|category)\/(.+)$/.exec(hash);
  if (!match) return { kind: 'invalid' };
  try {
    const value = decodeURIComponent(match[2]);
    if (!value) return { kind: 'invalid' };
    return { kind: match[1] as 'tag' | 'category', value };
  } catch {
    return { kind: 'invalid' };
  }
}
