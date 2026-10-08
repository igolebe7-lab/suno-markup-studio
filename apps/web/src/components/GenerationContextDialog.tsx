import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { projectLimits } from '@suno/shared';
import type { SunoContext } from '../domain/types';
import { sunoModeLabels } from '../domain/sectionEditRequest';
import { useProjectStore } from '../stores/projectStore';
import { AppModal } from './AppModal';

export function GenerationContextDialog({ onClose }: { onClose: () => void }) {
  const context = useProjectStore((state) => state.project.sunoContext);
  const setSunoContext = useProjectStore((state) => state.setSunoContext);
  const [modelId, setModelId] = useState(context?.modelId ?? '');
  const [mode, setMode] = useState<SunoContext['mode']>(context?.mode);
  const [notes, setNotes] = useState(context?.notes ?? '');

  return (
    <AppModal ariaLabel="Условия генерации" className="generation-context-dialog" backdropClassName="tag-settings-backdrop generation-context-backdrop" testId="generation-context-dialog" onClose={onClose} closeOnBackdrop={false} returnFocusSelector="#project-menu-trigger">
      <div className="preparation-dialog-heading">
        <h2>Условия генерации</h2>
        <button className="icon-button" onClick={onClose} aria-label="Закрыть условия генерации"><X size={18} /></button>
      </div>
      <form className="preparation-form" onSubmit={(event) => {
        event.preventDefault();
        setSunoContext({ modelId, mode, notes });
        onClose();
      }}>
        <div className="context-field-pair">
          <label>Модель
            <input value={modelId} onChange={(event) => setModelId(event.target.value)} list="suno-model-suggestions" placeholder="Не указана" maxLength={projectLimits.modelId} />
            <datalist id="suno-model-suggestions"><option value="v6" /><option value="v6-wild" /><option value="v6-mini" /></datalist>
          </label>
          <label>Режим в Suno
            <select value={mode ?? ''} onChange={(event) => setMode(event.target.value ? event.target.value as SunoContext['mode'] : undefined)}>
              <option value="">Не указан</option>
              {Object.entries(sunoModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <p className="preparation-hint">Custom — отдельные поля стиля и текста; Simple — общий запрос; Studio — работа в студии; Sounds — отдельные звуки и петли.</p>
        <label>Заметки
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} maxLength={projectLimits.contextNotes} placeholder="Особенности настроек и результаты" />
        </label>
        <div className="preparation-actions">
          <button type="button" className="button secondary" onClick={onClose}>Отменить</button>
          <button type="submit" className="button primary"><Save size={16} />Сохранить</button>
        </div>
      </form>
    </AppModal>
  );
}
