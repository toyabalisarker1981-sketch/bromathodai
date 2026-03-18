import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface ChatMessageContentProps {
  content: string;
}

const ChatMessageContent = ({ content }: ChatMessageContentProps) => {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          table: ({ children, ...props }) => (
            <div className="my-3 w-full overflow-x-auto -mx-1 px-1">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
                  <table className="min-w-full border-collapse text-sm" {...props}>
                    {children}
                  </table>
                </div>
              </div>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-primary/10 dark:bg-primary/15" {...props}>{children}</thead>
          ),
          th: ({ children, ...props }) => (
            <th className="border-b border-r last:border-r-0 border-border/40 px-3 py-2.5 text-left font-semibold text-foreground text-xs uppercase tracking-wider whitespace-nowrap" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border-b border-r last:border-r-0 border-border/30 px-3 py-2 text-foreground/80 whitespace-normal break-words" {...props}>
              {children}
            </td>
          ),
          tr: ({ children, ...props }) => (
            <tr className="even:bg-muted/30 dark:even:bg-muted/10 hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors" {...props}>{children}</tr>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default ChatMessageContent;
