/**
 * JsonLd — lightweight server component that injects a JSON-LD <script> tag.
 * Usage: <JsonLd data={{ "@context": "...", ... }} />
 * Can be placed in any Server Component (layout, page, etc.)
 */
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
