import React, { useMemo } from 'react';

interface DocumentViewerProps {
  content: string;
}

const renderInline = (text: string, keyPrefix: string) => {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  const patterns = [
    { type: 'link', regex: /\[([^\]]+)\]\(([^)]+)\)/ },
    { type: 'bold', regex: /\*\*([^*]+)\*\*/ },
    { type: 'italic', regex: /\*([^*]+)\*/ }
  ];

  while (remaining.length > 0) {
    let matchInfo: { type: string; match: RegExpExecArray } | null = null;

    for (const pattern of patterns) {
      const match = pattern.regex.exec(remaining);
      if (match) {
        if (!matchInfo || match.index < matchInfo.match.index) {
          matchInfo = { type: pattern.type, match };
        }
      }
    }

    if (!matchInfo) {
      nodes.push(remaining);
      break;
    }

    const { type, match } = matchInfo;
    const [fullMatch, label, linkTarget] = match;
    const startIndex = match.index;
    if (startIndex > 0) {
      nodes.push(remaining.slice(0, startIndex));
    }

    if (type === 'link') {
      nodes.push(
        <a
          key={`${keyPrefix}-link-${keyIndex++}`}
          href={linkTarget}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-600 font-semibold underline underline-offset-2 hover:text-emerald-700"
        >
          {label}
        </a>
      );
    } else if (type === 'bold') {
      nodes.push(
        <strong key={`${keyPrefix}-bold-${keyIndex++}`} className="font-bold text-slate-900">
          {label}
        </strong>
      );
    } else if (type === 'italic') {
      nodes.push(
        <em key={`${keyPrefix}-italic-${keyIndex++}`} className="italic text-slate-700">
          {label}
        </em>
      );
    }

    remaining = remaining.slice(startIndex + fullMatch.length);
  }

  return nodes;
};

const DocumentViewer: React.FC<DocumentViewerProps> = ({ content }) => {
  const blocks = useMemo(() => {
    const lines = content.split('\n');
    const nodes: React.ReactNode[] = [];
    let listItems: string[] = [];
    let inCode = false;
    let codeLines: string[] = [];

    const flushList = (index: number) => {
      if (listItems.length === 0) return;
      nodes.push(
        <ul key={`list-${index}`} className="list-disc pl-6 space-y-2 text-slate-700 my-4">
          {listItems.map((item, itemIndex) => (
            <li key={`list-${index}-${itemIndex}`} className="leading-relaxed">
              {renderInline(item, `list-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    };

    const flushCode = (index: number) => {
      if (!inCode) return;
      nodes.push(
        <pre key={`code-${index}`} className="bg-slate-900 text-emerald-200 rounded-xl p-6 overflow-x-auto text-sm font-mono my-6 border border-slate-700">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      codeLines = [];
      inCode = false;
    };

    lines.forEach((rawLine, index) => {
      const line = rawLine.trimEnd();

      if (line.startsWith('```')) {
        if (inCode) {
          flushCode(index);
        } else {
          flushList(index);
          inCode = true;
        }
        return;
      }

      if (inCode) {
        codeLines.push(rawLine);
        return;
      }

      if (!line.trim()) {
        flushList(index);
        nodes.push(<div key={`spacer-${index}`} className="h-6" />);
        return;
      }

      if (line.startsWith('#')) {
        flushList(index);
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, '');
        if (level === 1) {
          nodes.push(
            <h1 key={`h1-${index}`} className="text-3xl md:text-4xl font-black text-slate-900 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
              {renderInline(text, `h1-${index}`)}
            </h1>
          );
        } else if (level === 2) {
          nodes.push(
            <h2 key={`h2-${index}`} className="text-2xl md:text-3xl font-bold text-slate-900 mt-8 mb-3">
              {renderInline(text, `h2-${index}`)}
            </h2>
          );
        } else {
          nodes.push(
            <h3 key={`h3-${index}`} className="text-xl font-bold text-slate-800 mt-6 mb-3">
              {renderInline(text, `h3-${index}`)}
            </h3>
          );
        }
        return;
      }

      const listMatch = line.match(/^[-*]\s+(.*)/);
      if (listMatch) {
        listItems.push(listMatch[1]);
        return;
      }

      flushList(index);
      nodes.push(
        <p key={`p-${index}`} className="text-slate-700 leading-relaxed text-base my-3">
          {renderInline(line, `p-${index}`)}
        </p>
      );
    });

    flushList(lines.length);
    flushCode(lines.length + 1);
    return nodes;
  }, [content]);

  return <div className="prose prose-slate max-w-none">{blocks}</div>;
};

export default DocumentViewer;
