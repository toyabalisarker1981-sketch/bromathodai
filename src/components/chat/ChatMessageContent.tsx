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
            <div className="my-3 w-full overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full border-collapse text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-muted/40" {...props}>{children}</thead>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-border/40 px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border/40 px-3 py-2 text-muted-foreground" {...props}>
              {children}
            </td>
          ),
          tr: ({ children, ...props }) => (
            <tr className="even:bg-muted/20" {...props}>{children}</tr>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default ChatMessageContent;
