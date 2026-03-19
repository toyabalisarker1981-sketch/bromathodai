import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface ChatMessageContentProps {
  content: string;
}

const ChatMessageContent = ({ content }: ChatMessageContentProps) => {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-headings:my-2.5 prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1 prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:not-italic">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Block tables from rendering - convert to list instead
          table: ({ children }) => (
            <div className="my-2 p-3 rounded-xl bg-muted/20 border border-border/30">
              {children}
            </div>
          ),
          thead: () => null,
          tbody: ({ children }) => <div>{children}</div>,
          tr: ({ children }) => (
            <div className="flex flex-wrap gap-x-4 gap-y-1 py-1 border-b border-border/20 last:border-0">
              {children}
            </div>
          ),
          th: ({ children }) => (
            <span className="font-semibold text-primary text-xs">{children}</span>
          ),
          td: ({ children }) => (
            <span className="text-sm text-foreground/80">{children}</span>
          ),
          // Enhanced blockquote with colored left border
          blockquote: ({ children }) => (
            <div className="my-3 p-3 rounded-xl bg-primary/5 border-l-4 border-primary/60 dark:bg-primary/10">
              <div className="text-sm text-foreground/90">{children}</div>
            </div>
          ),
          // Better strong/bold
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
          // Better emphasis/italic
          em: ({ children }) => (
            <em className="text-muted-foreground not-italic text-[0.95em]">{children}</em>
          ),
          // Enhanced headings
          h2: ({ children }) => (
            <h2 className="text-base font-display font-bold mt-4 mb-2 flex items-center gap-1.5 text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-display font-semibold mt-3 mb-1.5 text-foreground/90">
              {children}
            </h3>
          ),
          // Better list items
          li: ({ children }) => (
            <li className="text-sm leading-relaxed text-foreground/85">{children}</li>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default ChatMessageContent;
