import { ArrowLeft, BookOpen, Copy, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { tags } from '../data/tags';
import { getOfficialEvidence } from '../data/officialTags';
import {
  parseReferenceHash,
  referenceArticles,
  referenceById,
  referenceParameters,
  referenceSources,
  searchReference,
  type ReferenceArticle
} from '../data/referenceCatalog';
import { buildTagSettingProfile } from '../domain/tagSettings';
import { useProjectStore } from '../stores/projectStore';

const categoryLabels: Record<string, string> = {
  structure: 'Структура', vocal: 'Вокал', instrument: 'Инструменты',
  dynamics: 'Динамика', production: 'Звук и обработка', genre: 'Жанр',
  subgenre: 'Поджанр', mood: 'Настроение', tempo: 'Темп',
  rhythm: 'Ритм', era: 'Эпоха', language: 'Язык', avoid: 'Исключения',
  custom: 'Свои теги'
};
const placementLabels: Record<string, string> = {
  style: 'Стиль', lyrics: 'Текст песни', both: 'Стиль и текст песни'
};
const tagById = new Map(tags.map((tag) => [tag.id, tag]));

function referenceUrl(id: string): string {
  return `#reference/tag/${encodeURIComponent(id)}`;
}

function BuiltInArticle({ article, onSelect }: {
  article: ReferenceArticle;
  onSelect: (id: string) => void;
}) {
  const tag = tagById.get(article.tagId);
  const [copyStatus, setCopyStatus] = useState('');
  const fields = tag ? buildTagSettingProfile(tag).fields : [];
  const official = tag ? getOfficialEvidence(tag) : [];
  const examples = article.exampleVariants.filter((example) => example.destination !== 'workflow-note');
  const notes = article.exampleVariants.filter((example) => example.destination === 'workflow-note');
  const sourceIds = [...new Set([
    ...article.evidence.directSupport.map((support) => support.sourceId),
    ...article.evidence.contextSourceIds
  ])];

  return (
    <article className="reference-detail" data-testid={`reference-article-${article.tagId}`}>
      <header className="reference-detail-head">
        <div>
          <small>{categoryLabels[article.category] ?? article.category} · {placementLabels[article.placementCurrent] ?? article.placementCurrent}</small>
          <h1>{article.label}</h1>
          <p>{article.summaryRu}</p>
        </div>
        <span className="reference-evidence" title={official.map((proof) => proof.scope).join('\n')}>
          {official.length ? `Официальный · ${official.some((proof) => proof.kind === 'lyrics-example') ? 'пример в тексте песни' : official.every((proof) => proof.kind === 'style-example') ? 'пример описания' : 'термин Suno'}` : 'Редакторское описание · аудио не проверено'}
        </span>
      </header>
      <div className="reference-detail-body">
        <section>
          <h2>Что означает</h2>
          <p>{article.musicalMechanismRu}</p>
          <p>{article.placementAdviceRu}</p>
        </section>
        <section>
          <h2>Настройки в редакторе</h2>
          {fields.length ? (
            <ul>
              {fields.map((field) => {
                const definition = referenceParameters.get(field.key);
                return <li key={field.key}><strong>{field.label}.</strong> {definition?.explanationRu ?? 'Добавляет текстовое уточнение к тегу; это не регулятор Suno.'}</li>;
              })}
            </ul>
          ) : <p>У этого тега нет отдельных настроек в редакторе. Его текст можно изменить вручную.</p>}
          <p className="reference-note">Поля настройки формируют текст подсказки, а не управляют параметрами модели напрямую.</p>
        </section>
        <section>
          <h2>Примеры размещения</h2>
          {examples.map((example, index) => (
            <div className="reference-example" key={index}>
              <div><strong>{example.titleRu}</strong><span>{placementLabels[example.destination] ?? example.destination}</span></div>
              <pre>{example.text}</pre>
              <p>{example.explanationRu}</p>
              <button className="button secondary" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(example.text);
                  setCopyStatus('Пример скопирован');
                } catch {
                  setCopyStatus('Не удалось скопировать пример');
                }
              }} aria-label={`Скопировать пример: ${example.titleRu}`}><Copy size={14} />Скопировать пример</button>
            </div>
          ))}
        </section>
        {copyStatus && <p role="status" className="reference-note">{copyStatus}</p>}
        {notes.length > 0 && (
          <section>
            <h2>Как проверить в Suno</h2>
            {notes.map((note, index) => <p key={index}>{note.text}</p>)}
            <p className="reference-note">Эти заметки не предназначены для вставки в поле песни.</p>
          </section>
        )}
        <section>
          <h2>Ограничения</h2>
          <ul>{article.limitationsRu.map((limit, index) => <li key={index}>{limit}</li>)}</ul>
        </section>
        <section>
          <h2>Основания и источники</h2>
          {article.evidence.directSupport.length > 0 && <ul>{article.evidence.directSupport.map((support) => <li key={support.sourceId}>{support.scope}</li>)}</ul>}
          <p>{article.evidence.contextScope}</p>
          {official.length > 0 && <p className="reference-note">Пометка «официальный» относится только к подтверждённому термину или примеру. Настройки и примеры приложения не становятся официальными; аудиопроверка не проводилась.</p>}
          {sourceIds.length > 0 && (
            <ul>{sourceIds.map((id) => {
              const source = referenceSources.get(id);
              return source ? <li key={id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> · {source.supports}</li> : null;
            })}</ul>
          )}
          <p className="reference-note">Дата проверки материалов: {article.checkedAt}. Ссылки не подтверждают каждый вариант тега или слышимый результат.</p>
        </section>
        {article.relatedTagIds.length > 0 && (
          <section>
            <h2>Связанные теги</h2>
            <div className="reference-related">
              {article.relatedTagIds.filter((id) => referenceById.has(id)).map((id) => (
                <button key={id} className="button secondary" onClick={() => onSelect(id)}>{referenceById.get(id)?.label}</button>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

export default function ReferencePage() {
  const { ui, user, setFilter } = useProjectStore();
  const [hash, setHash] = useState(() => window.location.hash);
  const [query, setQuery] = useState('');
  const [placement, setPlacement] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [evidence, setEvidence] = useState('all');

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const route = parseReferenceHash(hash);
  const category = route.kind === 'category' ? route.value : categoryFilter;
  const filtered = useMemo(() => searchReference(query, category, placement, evidence), [query, category, placement, evidence]);
  const customTags = user ? ui.customTags : [];
  const customMatches = customTags.filter((tag) =>
    evidence !== 'official' && (category === 'all' || category === 'custom')
    && (placement === 'all' || tag.placement === placement || tag.placement === 'both')
    && (!query.trim() || [tag.label, tag.sunoText, tag.descriptionRu, ...tag.aliases]
      .join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const selectedId = route.kind === 'tag' ? route.value : filtered[0]?.tagId ?? customMatches[0]?.id;
  const article = selectedId ? referenceById.get(selectedId) : undefined;
  const customArticle = customTags.find((tag) => tag.id === selectedId);
  const invalidTag = route.kind === 'tag' && !article && !customArticle;
  const showArticleOnMobile = route.kind === 'tag';

  const selectTag = (id: string) => {
    window.location.hash = referenceUrl(id);
    setHash(window.location.hash);
  };
  const selectCategory = (value: string) => {
    setCategoryFilter(value);
    window.location.hash = value === 'all' ? '#reference' : `#reference/category/${encodeURIComponent(value)}`;
    setHash(window.location.hash);
  };
  const backToList = () => {
    window.location.hash = category === 'all' ? '#reference' : `#reference/category/${encodeURIComponent(category)}`;
    setHash(window.location.hash);
  };
  const backToEditor = () => {
    window.history.pushState(null, '', window.location.pathname + window.location.search);
    setFilter('activeView', 'editor');
  };

  return (
    <main className="reference-page reference-v2" data-testid="reference-page">
      <div className="reference-topline">
        <div><BookOpen size={19} /><strong>Справочник тегов</strong><span>{referenceArticles.length} статей</span></div>
        <button className="button secondary" onClick={backToEditor}><ArrowLeft size={15} />Редактор</button>
      </div>
      <div className={`reference-browser ${showArticleOnMobile ? 'reference-mobile-detail' : ''}`}>
        <aside className="reference-index" aria-label="Список тегов">
          <div className="reference-filters">
            <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Тег или смысл" aria-label="Поиск по справочнику" /></label>
            <select value={category} onChange={(event) => selectCategory(event.target.value)} aria-label="Категория справочника">
              <option value="all">Все категории</option>
              {Object.entries(categoryLabels).filter(([id]) => id !== 'custom' || user).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <select value={placement} onChange={(event) => setPlacement(event.target.value)} aria-label="Место вставки">
              <option value="all">Любое место</option>
              <option value="style">Стиль</option>
              <option value="lyrics">Текст песни</option>
            </select>
            <select value={evidence} onChange={(event) => setEvidence(event.target.value)} aria-label="Основание описания">
              <option value="all">Все источники</option>
              <option value="official">Официальные материалы Suno</option>
              <option value="editorial">Редакторские описания</option>
            </select>
          </div>
          <div className="reference-count">{filtered.length + customMatches.length} результатов</div>
          <nav className="reference-results">
            {filtered.map((item) => <button key={item.tagId} className={selectedId === item.tagId ? 'active' : ''} onClick={() => selectTag(item.tagId)}><strong>{item.label}</strong><small>{item.summaryRu}</small></button>)}
            {customMatches.map((item) => <button key={item.id} className={selectedId === item.id ? 'active' : ''} onClick={() => selectTag(item.id)}><strong>{item.sunoText}</strong><small>{item.descriptionRu}</small></button>)}
            {!filtered.length && !customMatches.length && <p className="reference-empty">Ничего не найдено. Попробуйте другое слово или категорию.</p>}
          </nav>
        </aside>
        <div className="reference-content">
          <button className="button secondary reference-mobile-back" onClick={backToList}><ArrowLeft size={15} />К списку тегов</button>
          {article && <BuiltInArticle article={article} onSelect={selectTag} />}
          {customArticle && (
            <article className="reference-detail" data-testid={`reference-article-${customArticle.id}`}>
              <header className="reference-detail-head"><div><small>Свои теги · {placementLabels[customArticle.placement]}</small><h1>{customArticle.sunoText}</h1><p>{customArticle.descriptionRu}</p></div><span className="reference-evidence">Ваш тег · внешних подтверждений нет</span></header>
              <div className="reference-detail-body">
                <section><h2>Настройки</h2><ul>{customArticle.parameters?.map((field) => <li key={field.key}><strong>{field.label}</strong> · {field.type}</li>)}</ul></section>
                <section><h2>Примеры автора</h2>{customArticle.examples.map((example, index) => <pre key={index}>{example}</pre>)}</section>
              </div>
            </article>
          )}
          {invalidTag && <div className="reference-empty"><h1>Тег не найден</h1><p>Статья могла быть удалена или ссылка содержит ошибку.</p><button className="button secondary" onClick={backToList}>К списку тегов</button></div>}
          {!article && !customArticle && !invalidTag && <div className="reference-empty"><h1>Выберите тег</h1><p>Поиск работает по английскому написанию, русскому описанию и псевдонимам.</p></div>}
        </div>
      </div>
    </main>
  );
}
