// src/app/blog/[slug]/opengraph-image.js
import { ImageResponse } from "next/og";
import { getPost } from "@/lib/blog";

export const runtime = "edge";

export const alt = "Jammify Editorial Blog";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#09090b",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            color: "white",
            fontSize: "48px",
            fontWeight: "bold",
          }}
        >
          Jammify Blog
        </div>
      ),
      {
        ...size,
      }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Ambient background glow effect */}
        <div
          style={{
            position: "absolute",
            top: "-150px",
            right: "-150px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0) 70%)",
          }}
        />
        
        {/* Top Header - Logo and brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(to bottom, #34d399, #10b981)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
          <span style={{ fontSize: "26px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.5px" }}>
            Jammify
          </span>
        </div>

        {/* Dynamic Post Information */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", zIndex: 10 }}>
          <span
            style={{
              fontSize: "16px",
              fontWeight: "800",
              color: "#34d399",
              letterSpacing: "2.5px",
              textTransform: "uppercase",
            }}
          >
            {post.category}
          </span>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: "900",
              color: "#ffffff",
              lineHeight: "1.2",
              margin: 0,
              maxWidth: "1040px",
              letterSpacing: "-1.5px",
            }}
          >
            {post.title}
          </h1>
        </div>

        {/* Bottom Footer - Read stats and URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "24px",
          }}
        >
          <span style={{ fontSize: "16px", color: "#a1a1aa", fontWeight: "500" }}>
            {post.readTime} • {post.date}
          </span>
          <span style={{ fontSize: "16px", color: "#34d399", fontWeight: "700" }}>
            jammify-music.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
