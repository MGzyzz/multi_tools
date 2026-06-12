import { useEffect, useRef, useState } from "react";

export type Token = { text: string; cls: string };
export type CodePhase = "idle" | "request" | "waiting" | "response" | "done";

export function splitTokens(
  tokens: Token[],
  charLimit: number,
  keyPrefix = "",
): [React.ReactNode[], React.ReactNode[]] {
  let remaining = charLimit;
  const visible: React.ReactNode[] = [];
  const hidden: React.ReactNode[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const { text, cls } = tokens[i];
    const k = `${keyPrefix}${i}`;

    if (remaining >= text.length) {
      visible.push(<span key={k} className={cls}>{text}</span>);
      remaining -= text.length;
    } else if (remaining > 0) {
      visible.push(<span key={`${k}a`} className={cls}>{text.slice(0, remaining)}</span>);
      hidden.push(<span key={`${k}b`} className={cls} style={{ opacity: 0 }}>{text.slice(remaining)}</span>);
      remaining = 0;
    } else {
      hidden.push(<span key={k} className={cls} style={{ opacity: 0 }}>{text}</span>);
    }
  }

  return [visible, hidden];
}

interface CodeTyperProps {
  titleLabel: string;
  langLabel: string;
  requestTokens: Token[];
  responseTokens: Token[];
  reqSpeed?: number;
  resSpeed?: number;
}

export function CodeTyper({
  titleLabel,
  langLabel,
  requestTokens,
  responseTokens,
  reqSpeed = 8,
  resSpeed = 10,
}: CodeTyperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<CodePhase>("idle");
  const [reqChars, setReqChars] = useState(0);
  const [resChars, setResChars] = useState(0);

  const totalReqChars = requestTokens.reduce((sum, tk) => sum + tk.text.length, 0);
  const totalResChars = responseTokens.reduce((sum, tk) => sum + tk.text.length, 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timerId: ReturnType<typeof setTimeout>;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("lp-visible");
          timerId = setTimeout(() => setPhase("request"), 600);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    if (phase !== "request") return;
    if (reqChars >= totalReqChars) {
      const id = setTimeout(() => setPhase("waiting"), 400);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setReqChars((c) => c + 1), reqSpeed);
    return () => clearTimeout(id);
  }, [phase, reqChars, totalReqChars, reqSpeed]);

  useEffect(() => {
    if (phase !== "waiting") return;
    const id = setTimeout(() => setPhase("response"), 900);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "response") return;
    if (resChars >= totalResChars) {
      const id = setTimeout(() => setPhase("done"), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setResChars((c) => c + 1), resSpeed);
    return () => clearTimeout(id);
  }, [phase, resChars, totalResChars, resSpeed]);

  return (
    <div className="code-block" ref={ref}>
      <div className="code-head">
        <span className="cttl">{titleLabel}</span>
        <span className="clang">{langLabel}</span>
      </div>
      <pre className="code">
        {(() => {
          const [reqVisible, reqHidden] = splitTokens(requestTokens, reqChars, "req");
          const resLimit = phase === "idle" || phase === "request" || phase === "waiting" ? 0 : resChars;
          const [resVisible, resHidden] = splitTokens(responseTokens, resLimit, "res");
          return (
            <>
              {reqVisible}
              {phase === "request" && <span className="lp-cursor lp-cursor-active">▋</span>}
              {reqHidden}
              {phase === "waiting" && <span className="lp-cursor lp-cursor-waiting">▋</span>}
              {resVisible}
              {phase === "response" && <span className="lp-cursor lp-cursor-active">▋</span>}
              {resHidden}
            </>
          );
        })()}
      </pre>
    </div>
  );
}
