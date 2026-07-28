import { create } from 'zustand';

type ActivePanel = 'clipbin' | 'preview' | 'inspector' | 'timeline';
type Modal = 'export' | 'new-project' | null;

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface UiState {
  selectedClipId: string | null;
  activePanel: ActivePanel;
  activeModal: Modal;
  showSplash: boolean;
  previewFrame: string | null;
  toasts: Toast[];
  exportJobId: string | null;

  selectClip: (id: string | null) => void;
  setActivePanel: (panel: ActivePanel) => void;
  openModal: (modal: Modal) => void;
  closeModal: () => void;
  setShowSplash: (show: boolean) => void;
  setPreviewFrame: (frame: string | null) => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  setExportJobId: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedClipId: null,
  activePanel: 'preview',
  activeModal: null,
  showSplash: true,
  previewFrame: null,
  toasts: [],
  exportJobId: null,

  selectClip: (id) => set({ selectedClipId: id }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  setShowSplash: (show) => set({ showSplash: show }),
  setPreviewFrame: (frame) => set({ previewFrame: frame }),
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  setExportJobId: (id) => set({ exportJobId: id }),
}));
