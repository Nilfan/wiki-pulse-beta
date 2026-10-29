import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AssistantMarkdown({ children }: { children: string }) {
  return <div className="min-w-0 whitespace-normal [overflow-wrap:anywhere] [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h1]:my-3 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:my-2 [&_h3]:font-semibold [&_h4]:my-2 [&_h4]:font-semibold [&_h5]:my-2 [&_h5]:font-semibold [&_h6]:my-2 [&_h6]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_li>p]:my-1 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-[#a9b9e4] [&_blockquote]:pl-3 [&_blockquote]:text-[#5a6478] [&_hr]:my-3 [&_hr]:border-[#cdd5e2] [&_code]:rounded [&_code]:bg-[#e6ecfd] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[#0e1630] [&_pre]:p-3 [&_pre]:text-[#e6ecfd] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:whitespace-pre [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_th]:border [&_th]:border-[#cdd5e2] [&_th]:bg-[#e6ecfd] [&_th]:px-2 [&_th]:py-1.5 [&_td]:border [&_td]:border-[#cdd5e2] [&_td]:px-2 [&_td]:py-1.5 [&_input]:mr-1">
    <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#2b59e8] underline underline-offset-2 hover:text-[#2148c2] focus-visible:outline-2 focus-visible:outline-[#2b59e8]">{children}</a>,
      table: ({ children }) => <div role="region" aria-label="Assistant response table" tabIndex={0} className="my-3 max-w-full overflow-x-auto rounded-md focus-visible:outline-2 focus-visible:outline-[#2b59e8]"><table>{children}</table></div>,
      // Model-generated image URLs must not trigger remote requests.
      img: ({ alt }) => <span>{alt || "Image"}</span>,
    }}>{children}</Markdown>
  </div>;
}
