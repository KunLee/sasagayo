/** Structured data for search engines (schema.org). */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape "<" so a title can never close the script element.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
