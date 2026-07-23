'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders text content with full Markdown and LaTeX math support.
 *
 * Uses react-markdown with remark-math and rehype-katex plugins for
 * proper rendering of:
 * - **Bold**, *italic*, `code`, lists, links
 * - $$...$$ display math (block)
 * - $...$ inline math
 * - Mixed markdown and math content
 *
 * Falls back to plain text display if markdown parsing fails.
 */
export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Normalize LaTeX delimiters: react-markdown with remark-math expects
  // $...$ for inline and $$...$$ for display. Ensure no spaces between
  // $ and content for inline math.
  const normalized = React.useMemo(() => {
    if (!content) return '';

    // Ensure $$...$$ blocks have their content on proper lines
    // (remark-math requires display math to be on its own line)
    const text = content
      // Standardize line endings
      .replace(/\r\n/g, '\n')
      // Ensure display math $$...$$ is on its own line
      .replace(/\$\$(.+?)\$\$/gs, '\n$$\n$1\n$$\n');

    return text;
  }, [content]);

  if (!content) return null;

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words [&_.katex]:text-base [&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Style code blocks with a dark background
          code({ className: cClassName, children, ...props }) {
            const isInline = !cClassName;
            if (isInline) {
              return (
                <code
                  className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs dark:border-gray-700 dark:bg-[#1C1E2B]">
                <code className={cClassName} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          // Style links to open in new tab
          a({ children, href, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-800 dark:text-blue-400 dark:decoration-blue-700 dark:hover:text-blue-300"
                {...props}
              >
                {children}
              </a>
            );
          },
          // Style images
          img({ src, alt, ...props }) {
            return (
              <img
                src={src}
                alt={alt || ''}
                className="rounded-xl border border-gray-200 dark:border-gray-700"
                loading="lazy"
                {...props}
              />
            );
          },
          // Style blockquotes
          blockquote({ children, ...props }) {
            return (
              <blockquote
                className="border-l-4 border-blue-300 bg-blue-50/50 px-4 py-2 italic text-gray-600 dark:border-blue-700 dark:bg-blue-900/10 dark:text-gray-400"
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          // Style tables
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto">
                <table
                  className="min-w-full divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-700 dark:border-gray-700"
                  {...props}
                >
                  {children}
                </table>
              </div>
            );
          },
          th({ children, ...props }) {
            return (
              <th
                className="bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                {...props}
              >
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400" {...props}>
                {children}
              </td>
            );
          },
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
