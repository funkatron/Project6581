import {buildDrumGroove, parseDrumGrooveText, serializeDrumGroove} from './drum-groove.js?v=0.31.0+20261128T022520326Z';

export function mountDrumGrooveIo({$, collectGroove, applyGroove, onStatus}) {
  if (!$) throw new TypeError('mountDrumGrooveIo requires $');

  const file = $('drumGrooveFile');

  function report(message) {
    onStatus?.(message);
    const el = $('drumStatus');
    if (el && message) el.textContent = message;
  }

  $('drumGrooveExport')?.addEventListener('click', () => {
    try {
      const payload = collectGroove();
      const groove = buildDrumGroove(payload);
      const text = serializeDrumGroove(groove);
      const blob = new Blob([text], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const safeName = groove.name.replace(/[^\w\-]+/g, '-').replace(/^-+|-+$/g, '') || 'groove';
      anchor.href = url;
      anchor.download = safeName + '.6581drum.json';
      anchor.click();
      URL.revokeObjectURL(url);
      report('Exported groove "' + groove.name + '".');
    } catch (error) {
      report('Export failed: ' + (error?.message ?? error));
    }
  });

  $('drumGrooveImportBtn')?.addEventListener('click', () => file?.click());

  file?.addEventListener('change', async () => {
    const selected = file.files?.[0];
    file.value = '';
    if (!selected) return;
    try {
      const text = await selected.text();
      const groove = parseDrumGrooveText(text);
      applyGroove(groove);
      report('Imported groove "' + groove.name + '".');
    } catch (error) {
      report('Import failed: ' + (error?.message ?? error));
    }
  });
}