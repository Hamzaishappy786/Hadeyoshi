import { useEffect } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

export function useTimelineKeyboard() {
  const store = useTimelineStore;
  const { openModal } = useUiStore.getState();

  useEffect(() => {
    let jkl = 0; // for J/L speed cycling

    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;

      const { playhead, isPlaying, setPlayhead, setPlaying, selectedClipId,
        splitClip, tracks, removeClip, undo, redo, setZoom, zoom, duration } = store.getState();
      const { fps } = useProjectStore.getState();

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) redo(); else undo();
            return;
          case 's':
            e.preventDefault();
            // Handled in App.tsx
            document.dispatchEvent(new CustomEvent('app:save'));
            return;
          case 'e':
            e.preventDefault();
            openModal('export');
            return;
          case 'o':
            e.preventDefault();
            document.dispatchEvent(new CustomEvent('app:open'));
            return;
        }
        return;
      }

      if (isTyping) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setPlaying(!isPlaying);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setPlayhead(playhead - (e.shiftKey ? 1 : 1 / fps));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setPlayhead(playhead + (e.shiftKey ? 1 : 1 / fps));
          break;
        case 'j': case 'J':
          setPlaying(false);
          setPlayhead(Math.max(0, playhead - 5));
          break;
        case 'k': case 'K':
          setPlaying(false);
          break;
        case 'l': case 'L':
          setPlaying(false);
          setPlayhead(Math.min(duration, playhead + 5));
          break;
        case 's': case 'S':
          if (selectedClipId) splitClip(selectedClipId, playhead);
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedClipId) {
            for (const t of tracks) {
              const c = t.clips.find(cl => cl.id === selectedClipId);
              if (c) { removeClip(t.id, c.id); break; }
            }
          }
          break;
        case '+': case '=':
          setZoom(zoom * 1.3);
          break;
        case '-':
          setZoom(zoom / 1.3);
          break;
        case '\\':
          // Zoom to fit
          if (duration > 0) {
            const timelineEl = document.querySelector('[data-timeline-scroll]') as HTMLElement;
            if (timelineEl) setZoom((timelineEl.clientWidth - 150) / duration);
          }
          break;
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
