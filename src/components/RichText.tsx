import type { ReactNode } from "react";

/**
 * 对话文本的轻量标记：**内容** 会以高亮粗体显示。
 * 任务简报用它来突出扇区名称，使目标一眼可见。
 */
export default function RichText({ text }: { text: string }) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  const out: ReactNode[] = [];

  parts.forEach((part, i) => {
    if (!part) return;
    if (i % 2 === 1) {
      out.push(
        <strong
          key={i}
          className="font-bold tracking-[0.08em] text-phosbrite"
          style={{ textShadow: "0 0 8px rgb(var(--phosrgb) / 0.45)" }}
        >
          {part}
        </strong>
      );
    } else {
      out.push(<span key={i}>{part}</span>);
    }
  });

  return <>{out}</>;
}
