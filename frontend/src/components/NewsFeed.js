import React from "react";
import { Newspaper, ExternalLink, ThumbsUp, ThumbsDown, Minus } from "lucide-react";

export default function NewsFeed({ headlines = [] }) {
  if (!headlines || headlines.length === 0) {
    return (
      <div className="terminal-bottom-strip" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-dim)" }}>
          NO RECENT NEWS HEADLINES FOUND FOR THIS TICKER
        </span>
      </div>
    );
  }

  return (
    <div className="terminal-bottom-strip">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }} className="font-mono">
          <Newspaper size={13} color="var(--accent-emerald)" />
          RECENT NEWS HEADLINES & VADER SENTIMENT TAGS ({headlines.length})
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
        {headlines.map((item, idx) => {
          const compound = item.compound ?? 0;
          let label = "NEUTRAL";
          let badgeStyle = "badge-neutral";
          let Icon = Minus;

          if (compound >= 0.05) {
            label = "BULLISH";
            badgeStyle = "badge-bullish";
            Icon = ThumbsUp;
          } else if (compound <= -0.05) {
            label = "BEARISH";
            badgeStyle = "badge-bearish";
            Icon = ThumbsDown;
          }

          return (
            <div
              key={idx}
              style={{
                minWidth: "300px",
                maxWidth: "340px",
                background: "var(--bg-canvas)",
                border: "1px solid var(--border-main)",
                borderRadius: "4px",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span className="font-mono" style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                    {item.publisher || "News"} • {item.source || "Yahoo Finance"}
                  </span>
                  <span className={badgeStyle} style={{ fontSize: "9px", padding: "1px 5px" }}>
                    <Icon size={9} />
                    {label} ({compound >= 0 ? "+" : ""}{compound})
                  </span>
                </div>
                
                <a
                  href={item.link || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "11px",
                    color: "var(--text-main)",
                    textDecoration: "none",
                    fontWeight: 500,
                    lineHeight: "1.4",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.title}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
