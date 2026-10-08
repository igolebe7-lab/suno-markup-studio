import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Copy, FilePenLine, SlidersHorizontal } from 'lucide-react';
import { projectLimits } from '@suno/shared';
import { buildSectionEditRequest, emptySectionEditRequest, getSectionRequestOptions, shouldConfirmRequestReplace, sunoModeLabels } from '../domain/sectionEditRequest';
import type { SectionEditRequest } from '../domain/types';
import { navigateAuxiliaryView } from '../lib/auxiliaryNavigation';
import { useProjectStore } from '../stores/projectStore';

export default function PreparationPage({ onEditContext }: { onEditContext: () => void }) {
  const project = useProjectStore((state) => state.project);
  const request = project.sectionEditRequest ?? emptySectionEditRequest;
  const options = useMemo(() => getSectionRequestOptions(project.lyrics), [project.lyrics]);
  const [copyStatus, setCopyStatus] = useState('');
  const [copyError, setCopyError] = useState('');
  const copyAttempt = useRef(0);

  function update(patch: Partial<SectionEditRequest>) {
    copyAttempt.current++;
    setCopyStatus('');
    setCopyError('');
    const state = useProjectStore.getState();
    state.setSectionEditRequest({ ...(state.project.sectionEditRequest ?? emptySectionEditRequest), ...patch });
  }

  function build() {
    const result = buildSectionEditRequest(request);
    if (!result) return;
    if (shouldConfirmRequestReplace(request.result, result) && !window.confirm('Заменить текущий запрос заново сформированным текстом? Ручные изменения будут удалены.')) return;
    update({ result });
  }

  async function copy() {
    const { id } = project;
    const text = request.result;
    const attempt = ++copyAttempt.current;
    const isCurrent = () => attempt === copyAttempt.current && useProjectStore.getState().project.id === id && useProjectStore.getState().project.sectionEditRequest?.result === text;
    setCopyStatus('');
    setCopyError('');
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if (isCurrent()) setCopyStatus('Запрос скопирован');
    } catch {
      if (isCurrent()) setCopyError('Не удалось скопировать. Выделите текст запроса и скопируйте его вручную.');
    }
  }

  return (
    <main className="preparation-page" data-testid="preparation-page">
      <div className="preparation-topline">
        <div><FilePenLine size={19} /><h1>Шаблоны и запросы</h1></div>
        <button className="button secondary" onClick={() => navigateAuxiliaryView('editor')}><ArrowLeft size={16} />Вернуться в редактор</button>
      </div>
      <div className="preparation-context">
        <span><strong>Условия генерации</strong><span>{project.sunoContext?.modelId || 'Модель не указана'} · {project.sunoContext?.mode ? sunoModeLabels[project.sunoContext.mode] : 'Режим не указан'}</span></span>
        <button className="button secondary" onClick={onEditContext}><SlidersHorizontal size={15} />Изменить условия</button>
      </div>
      <div className="preparation-workspace">
        <section className="preparation-inputs" aria-labelledby="request-heading">
          <h2 id="request-heading">Изменить фрагмент</h2>
          <div className="preparation-form">
            <label>Выбрать секцию из песни
              <select value="" onChange={(event) => { if (event.target.value) update({ fragment: event.target.value }); }}>
                <option value="">Выбрать секцию</option>
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>Фрагмент песни
              <input value={request.fragment} onChange={(event) => update({ fragment: event.target.value })} placeholder="Например, последний припев или 0:45–1:10" maxLength={projectLimits.requestFragment} />
            </label>
            <label>Что изменить
              <textarea value={request.change} onChange={(event) => update({ change: event.target.value })} rows={5} maxLength={projectLimits.requestChange} placeholder="Добавить тихий ответ хора после фраз основного вокала" />
            </label>
            <label>Что сохранить
              <textarea value={request.preserve} onChange={(event) => update({ preserve: event.target.value })} rows={4} maxLength={projectLimits.requestPreserve} placeholder="Например, текст, темп и основную мелодию" />
            </label>
            <div className="preparation-actions">
              <button className="button primary" disabled={!request.change.trim()} onClick={build}><FilePenLine size={16} />Сформировать запрос</button>
            </div>
          </div>
        </section>
        <section className="preparation-result" aria-label="Итоговый запрос">
          <div className="preparation-form">
            <label>Запрос для Suno
              <textarea data-testid="section-request-result" value={request.result} onChange={(event) => update({ result: event.target.value })} maxLength={projectLimits.requestResult} rows={16} spellCheck={false} />
            </label>
            <p className="preparation-hint">Перенесите запрос в поле редактирования Suno и выберите исходную песню там же. Это не текст для Lyrics. Сохранение остальных фрагментов зависит от результата Suno.</p>
            <div className="preparation-copy-state">
              <span role="status" aria-live="polite">{copyStatus}</span>
              {copyError && <p role="alert">{copyError}</p>}
            </div>
            <div className="preparation-actions">
              <button data-testid="copy-section-request" className="button primary" disabled={!request.result.trim()} onClick={() => void copy()}><Copy size={16} />Скопировать запрос</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
