import { useMemo, useState, type CSSProperties } from 'react';
import { useShareUrl } from '../hooks/use-share-url';
import { useClipboard } from '../hooks/use-clipboard';
import { useTheme } from '../theme/theme-provider';
import { useT } from '../i18n/locale-provider';
import { cn } from '../utils/cn';

export type EmbedKind = 'iframe' | 'html' | 'markdown';

export interface EmbedCodeGeneratorProps {
  /** URL to embed. Falls back to provider default. */
  url?: string;
  /** Initial embed kind. Default `iframe`. */
  initialKind?: EmbedKind;
  /** Default iframe width attribute. Default `100%`. */
  width?: string | number;
  /** Default iframe height attribute. Default `420`. */
  height?: string | number;
  /** Optional title for HTML/markdown variants. Falls back to provider title. */
  title?: string;
  /** Show the kind selector tabs. Default true. */
  showKindSelector?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Renders a copy-ready embed snippet for a URL — `<iframe>`, plain HTML link,
 * or Markdown. The iframe variant includes safe sandbox attributes by default
 * (`sandbox="allow-scripts allow-same-origin"`).
 */
export function EmbedCodeGenerator({
  url,
  initialKind = 'iframe',
  width = '100%',
  height = 420,
  title,
  showKindSelector = true,
  className,
  style,
}: EmbedCodeGeneratorProps) {
  const theme = useTheme();
  const t = useT();
  const resolvedUrl = useShareUrl({ url, platformId: 'embed' });
  const { copy, copied } = useClipboard();
  const [kind, setKind] = useState<EmbedKind>(initialKind);

  const snippet = useMemo(() => {
    const safeTitle = title?.replace(/"/g, '&quot;') ?? '';
    if (kind === 'iframe') {
      return [
        `<iframe`,
        `  src="${escapeAttr(resolvedUrl)}"`,
        `  width="${width}"`,
        `  height="${height}"`,
        `  frameborder="0"`,
        `  loading="lazy"`,
        `  referrerpolicy="no-referrer"`,
        `  sandbox="allow-scripts allow-same-origin allow-popups"`,
        safeTitle ? `  title="${safeTitle}"` : null,
        `></iframe>`,
      ].filter(Boolean).join('\n');
    }
    if (kind === 'html') {
      return `<a href="${escapeAttr(resolvedUrl)}" target="_blank" rel="noopener noreferrer">${
        title ? escapeHtml(title) : escapeHtml(resolvedUrl)
      }</a>`;
    }
    return `[${title ?? resolvedUrl}](${resolvedUrl})`;
  }, [kind, resolvedUrl, width, height, title]);

  const containerStyle: CSSProperties = {
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius,
    background: theme.surface,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontFamily: 'inherit',
    color: theme.onSurface,
    ...style,
  };

  const tabStyle = (active: boolean): CSSProperties => ({
    padding: '4px 10px',
    fontSize: 12,
    border: 'none',
    background: active ? theme.primary : 'transparent',
    color: active ? theme.surface : theme.onSurface,
    borderRadius: theme.radius,
    cursor: 'pointer',
    fontWeight: 500,
  });

  const codeStyle: CSSProperties = {
    width: '100%',
    minHeight: 96,
    padding: 10,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius,
    background: theme.surface,
    color: theme.onSurface,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    resize: 'vertical',
    boxSizing: 'border-box',
  };

  const copyStyle: CSSProperties = {
    alignSelf: 'flex-end',
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    border: 'none',
    borderRadius: theme.radius,
    background: theme.primary,
    color: theme.surface,
    cursor: 'pointer',
  };

  return (
    <div className={cn('caspian-embed-generator', className)} style={containerStyle}>
      {showKindSelector && (
        <div role="tablist" style={{ display: 'flex', gap: 4 }}>
          {(['iframe', 'html', 'markdown'] as EmbedKind[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              type="button"
              style={tabStyle(kind === k)}
              onClick={() => setKind(k)}
            >
              {k}
            </button>
          ))}
        </div>
      )}
      <textarea
        readOnly
        style={codeStyle}
        value={snippet}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={`Embed code (${kind})`}
      />
      <button type="button" style={copyStyle} onClick={() => copy(snippet)}>
        {copied ? t('button.copied') : t('button.copyLink')}
      </button>
    </div>
  );
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
