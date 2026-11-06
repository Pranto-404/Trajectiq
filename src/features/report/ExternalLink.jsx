import {safeUrl} from './format.js';

/** A link that opens safely (noopener noreferrer, new tab) and only for plain https URLs; otherwise the text alone. */
export function ExternalLink({href, children, className = ''}) {
  const url = safeUrl(href);
  if (!url) return <span className={className}>{children}</span>;
  return (
    <a className={className} href={url} target="_blank" rel="noopener noreferrer">
      {children}<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
