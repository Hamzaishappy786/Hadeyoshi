import React, { useEffect, useRef, useState } from 'react';
import { Film, Plus, FolderOpen, Clock, ChevronRight } from 'lucide-react';
import { useUiStore } from '../store/uiStore';

const TYPEWRITER_PHRASES = [
  'Nothing here yet...',
  'Create a new project to begin.',
  'Your stories start here.',
  'Hit "New Project" to get going.',
];

type TwPhase = 'typing' | 'holding' | 'exit' | 'enter';

function TypewriterEmpty() {
  const [displayed, setDisplayed] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [phase, setPhase] = useState<TwPhase>('typing');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const phrase = TYPEWRITER_PHRASES[phraseIdx];
    const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); };

    if (phase === 'typing') {
      if (charIdx < phrase.length) {
        timerRef.current = setTimeout(() => {
          setDisplayed(phrase.slice(0, charIdx + 1));
          setCharIdx(c => c + 1);
        }, 52);
      } else {
        timerRef.current = setTimeout(() => setPhase('exit'), 1900);
      }
    } else if (phase === 'exit') {
      // Wait for exit animation to finish, then swap phrase
      timerRef.current = setTimeout(() => {
        setPhraseIdx(i => (i + 1) % TYPEWRITER_PHRASES.length);
        setCharIdx(0);
        setDisplayed('');
        setPhase('enter');
      }, 400);
    } else if (phase === 'enter') {
      // Wait for enter animation, then start typing
      timerRef.current = setTimeout(() => setPhase('typing'), 360);
    }

    return clear;
  }, [charIdx, phase, phraseIdx]);

  const animStyle: React.CSSProperties =
    phase === 'exit'  ? { animation: 'tw-exit 380ms ease-in forwards' } :
    phase === 'enter' ? { animation: 'tw-enter 340ms ease-out forwards' } :
    {};

  return (
    <div style={{ padding: '36px 16px', textAlign: 'center', minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <style>{`
        @keyframes tw-exit  { to   { transform: translateX(-44px); opacity: 0; } }
        @keyframes tw-enter { from { transform: translateX(36px);  opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes tw-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
      <span style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'inline-block', ...animStyle }}>
        {displayed}
        <span style={{ borderRight: '2px solid var(--accent)', marginLeft: 2, animation: 'tw-blink 0.85s step-end infinite' }}>&nbsp;</span>
      </span>
    </div>
  );
}

interface RecentProject {
  name: string;
  path: string;
  mtime: number;
}

interface Props {
  onClose: () => void;
  onLoad: () => void;
  onOpenPath: (filePath: string) => Promise<void>;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

export function SplashScreen({ onClose, onLoad, onOpenPath }: Props) {
  const { openModal } = useUiStore();
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [projectsDir, setProjectsDir] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!window.electronAPI) { setLoading(false); return; }
      const [projects, dir] = await Promise.all([
        window.electronAPI.listProjects(),
        window.electronAPI.getProjectsDir(),
      ]);
      setRecent(projects);
      setProjectsDir(dir);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(14,14,15,0.97)',
      zIndex: 900,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex',
        gap: 40,
        maxWidth: 820,
        width: '100%',
        padding: '0 32px',
        alignItems: 'flex-start',
      }}>

        {/* Left: logo + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48,
              background: 'var(--accent)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Film size={28} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Video Editor</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Personal Desktop Editor</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-accent"
              style={{ padding: '12px 0', fontSize: 14, justifyContent: 'center' }}
              onClick={() => openModal('new-project')}
            >
              <Plus size={16} /> New Project
            </button>
            <button
              className="btn"
              style={{ padding: '12px 0', fontSize: 14, justifyContent: 'center' }}
              onClick={() => { onLoad(); onClose(); }}
            >
              <FolderOpen size={16} /> Browse Files…
            </button>
          </div>

          {projectsDir && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Projects saved to:<br />
              <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{projectsDir}</span>
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Press Escape to dismiss
          </div>
        </div>

        {/* Right: recent projects */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}>
            <Clock size={12} /> RECENT PROJECTS
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: 2,
            maxHeight: 400, overflowY: 'auto',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
          }}>
            {!loading && recent.length === 0 && <TypewriterEmpty />}
            {recent.map((proj, i) => (
              <button
                key={proj.path}
                onClick={() => onOpenPath(proj.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  borderRadius: i === 0 ? '8px 8px 0 0' : i === recent.length - 1 ? '0 0 8px 8px' : 0,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--accent-dim, rgba(79,110,247,0.15))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Film size={18} color="var(--accent)" strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proj.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {timeAgo(proj.mtime)}
                  </div>
                </div>
                <ChevronRight size={14} color="var(--text-muted)" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
