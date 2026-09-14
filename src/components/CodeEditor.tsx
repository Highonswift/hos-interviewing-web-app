'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { CodingLanguage, LANGUAGE_META } from '@/lib/types';

const MONACO_LANG: Record<CodingLanguage, string> = {
  python3:    'python',
  javascript: 'javascript'
};

interface CodeEditorProps {
  language:            CodingLanguage;
  value:               string;
  onChange:            (code: string) => void;
  onLanguageChange:    (lang: CodingLanguage) => void;
  availableLanguages:  CodingLanguage[];
  readOnly?:           boolean;
  height?:             string;
}

function LangButton({
  lang, active, onClick,
}: { lang: CodingLanguage; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
        font-display font-semibold text-xs
        border transition-all duration-150
        ${active
          ? 'bg-brand-600 text-white border-brand-600 shadow-brand-sm'
          : 'bg-white text-charcoal-600 border-warm-300 hover:border-brand-300 hover:text-brand-600'
        }
      `}
    >
      {LANGUAGE_META[lang].label}
    </button>
  );
}

function IconBtn({
  onClick, title, children, active = false, danger = false,
}: {
  onClick: () => void; title: string; children: React.ReactNode;
  active?: boolean; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`
        p-1.5 rounded-lg border transition-all duration-150
        ${danger
          ? 'text-red-500 border-warm-200 hover:bg-red-50 hover:border-red-200'
          : active
          ? 'bg-brand-100 text-brand-700 border-brand-200'
          : 'text-charcoal-500 border-warm-200 hover:bg-warm-100 hover:text-charcoal-800'
        }
      `}
    >
      {children}
    </button>
  );
}

export default function CodeEditor({
  language,
  value,
  onChange,
  onLanguageChange,
  availableLanguages,
  readOnly   = false,
  height     = '480px',
}: CodeEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  const [fontSize, setFontSize] = useState(14);
  const [copied, setCopied] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState(400);
  const [langConfirm, setLangConfirm] = useState<CodingLanguage | null>(null);

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme('hos-light', {
      base:    'vs',
      inherit: true,
      rules: [
        { token: 'comment',   foreground: '888888', fontStyle: 'italic' },
        { token: 'keyword',   foreground: 'e8483a', fontStyle: 'bold'   },
        { token: 'string',    foreground: '2e7d32'  },
        { token: 'number',    foreground: '0277bd'  },
        { token: 'type',      foreground: '6a1b9a'  },
        { token: 'function',  foreground: '1565c0'  },
        { token: 'variable',  foreground: '2d2d2d'  },
        { token: 'delimiter', foreground: '5d5d5d'  },
        { token: 'operator',  foreground: 'e8483a'  },
      ],
      colors: {
        'editor.background':              '#ffffff',
        'editor.foreground':              '#2d2d2d',
        'editor.lineHighlightBackground': '#fff8f7',
        'editor.selectionBackground':     '#ffcdc8',
        'editorLineNumber.foreground':    '#ccc7c1',
        'editorLineNumber.activeForeground': '#e8483a',
        'editorCursor.foreground':        '#e8483a',
        'editorIndentGuide.background':   '#eeece9',
        'editorIndentGuide.activeBackground': '#ccc7c1',
        'editor.inactiveSelectionBackground': '#ffe4e1',
        'scrollbarSlider.background':     '#e2deda80',
        'scrollbarSlider.hoverBackground':'#ccc7c1',
        'scrollbarSlider.activeBackground':'#e8483a40',
      },
    });
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current  = editor;
    monacoRef.current  = monaco;
    setIsLoading(false);

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {},
    );
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const h = Math.floor(e.contentRect.height);
        if (h > 0) setEditorHeight(h);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const increaseFontSize = () => setFontSize(f => Math.min(f + 1, 22));
  const decreaseFontSize = () => setFontSize(f => Math.max(f - 1, 10));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    onChange(LANGUAGE_META[language].defaultCode);
    setShowReset(false);
    editorRef.current?.focus();
  };

  const handleLangClick = (lang: CodingLanguage) => {
    if (lang === language) return;
    const defaultCode = LANGUAGE_META[language].defaultCode;
    if (value !== defaultCode && value.trim().length > 0) {
      setLangConfirm(lang);
    } else {
      switchLanguage(lang);
    }
  };

  const switchLanguage = (lang: CodingLanguage) => {
    onChange(LANGUAGE_META[lang].defaultCode);
    onLanguageChange(lang);
    setLangConfirm(null);
  };

  return (
    <div className="flex flex-col border border-warm-200 rounded-2xl overflow-hidden shadow-sm bg-white" style={{ flex: 1, minHeight: 0 }}>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-warm-200 bg-warm-50/80">
        <div className="flex items-center gap-1.5 flex-wrap">
          <svg
            width="13" height="13"
            className="text-charcoal-400 flex-shrink-0"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          {availableLanguages.map(lang => (
            <LangButton
              key={lang}
              lang={lang}
              active={language === lang}
              onClick={() => handleLangClick(lang)}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1 bg-white border border-warm-200 rounded-lg px-1.5 py-1">
            <IconBtn onClick={decreaseFontSize} title="Decrease font size">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </IconBtn>
            <span className="font-mono text-xs text-charcoal-500 w-6 text-center select-none">
              {fontSize}
            </span>
            <IconBtn onClick={increaseFontSize} title="Increase font size">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </IconBtn>
          </div>
          <IconBtn
            onClick={handleCopy}
            title="Copy code"
            active={copied}
          >
            {copied ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            )}
          </IconBtn>
          <IconBtn
            onClick={() => setShowReset(true)}
            title="Reset to default code"
            danger
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </IconBtn>

          {readOnly && (
            <span className="inline-flex items-center gap-1 text-xs font-display font-semibold text-charcoal-400 bg-warm-100 border border-warm-200 px-2.5 py-1 rounded-lg">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Read-only
            </span>
          )}
        </div>
      </div>
      <div className="relative" ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="flex items-center gap-2 text-charcoal-400 text-sm font-medium">
              <svg className="animate-spin text-brand-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Loading editor…
            </div>
          </div>
        )}

        <Editor
          height={editorHeight}
          language={MONACO_LANG[language]}
          value={value}
          theme="hos-light"
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          onChange={v => onChange(v ?? '')}
          options={{
            fontSize,
            fontFamily:          '"JetBrains Mono", "Fira Code", monospace',
            fontLigatures:       true,
            lineNumbers:         'on',
            minimap:             { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap:            'on',
            tabSize:             4,
            insertSpaces:        true,
            automaticLayout:     true,
            readOnly,
            padding:             { top: 12, bottom: 12 },
            renderLineHighlight: 'line',
            cursorBlinking:      'smooth',
            smoothScrolling:     true,
            contextmenu:         true,
            suggest:             { showWords: true },
            quickSuggestions:    !readOnly,
            scrollbar: {
              verticalScrollbarSize:   6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>
      <div className="flex items-center justify-between px-4 py-1.5 bg-warm-50 border-t border-warm-200">
        <span className="font-mono text-[10px] text-charcoal-400">
          {LANGUAGE_META[language].label}
        </span>
        <span className="font-mono text-[10px] text-charcoal-400">
          {value.split('\n').length} lines · {value.length} chars
        </span>
      </div>
      {langConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div
            className="absolute inset-0 bg-charcoal-950/40 backdrop-blur-sm"
            onClick={() => setLangConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-sm my-auto bg-white rounded-3xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in">
            <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 to-brand-700" />
            <div className="p-6 overflow-y-auto">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" className="text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <path d="M12 9v4"/><path d="M12 17h.01"/>
                </svg>
              </div>
              <h3 className="font-display font-bold text-charcoal-900 text-base text-center mb-2">
                Switch language?
              </h3>
              <p className="text-charcoal-500 text-sm text-center leading-relaxed mb-5">
                Switching to <span className="font-semibold text-charcoal-800">{LANGUAGE_META[langConfirm].label}</span> will replace your current code with the default template. This cannot be undone.
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setLangConfirm(null)}
                  className="flex-1 py-2.5 rounded-2xl font-display font-semibold text-sm bg-warm-100 text-charcoal-600 hover:bg-warm-200 border border-warm-200 transition-colors"
                >
                  Keep current
                </button>
                <button
                  onClick={() => switchLanguage(langConfirm)}
                  className="flex-1 py-2.5 rounded-2xl font-display font-semibold text-sm bg-brand-600 hover:bg-brand-700 !text-white hover:!text-white shadow-brand-sm transition-all duration-200 active:scale-[0.97]"
                >
                  Switch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div
            className="absolute inset-0 bg-charcoal-950/40 backdrop-blur-sm"
            onClick={() => setShowReset(false)}
          />
          <div className="relative z-10 w-full max-w-sm my-auto bg-white rounded-3xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in">
            <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-red-600" />
            <div className="p-6 overflow-y-auto">
              <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" className="text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
              </div>
              <h3 className="font-display font-bold text-charcoal-900 text-base text-center mb-2">
                Reset code?
              </h3>
              <p className="text-charcoal-500 text-sm text-center leading-relaxed mb-5">
                Your code will be replaced with the default template for <span className="font-semibold text-charcoal-800">{LANGUAGE_META[language].label}</span>. This cannot be undone.
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowReset(false)}
                  className="flex-1 py-2.5 rounded-2xl font-display font-semibold text-sm bg-warm-100 text-charcoal-600 hover:bg-warm-200 border border-warm-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-2xl font-display font-semibold text-sm bg-red-600 hover:bg-red-700 !text-white hover:!text-white transition-all duration-200 active:scale-[0.97]"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}