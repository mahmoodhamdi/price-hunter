import { getEditionFromEnv } from "@/lib/editions";

export function EditionBadge() {
  const edition = getEditionFromEnv();
  if (edition.slug === "all-general") return null;

  return (
    <div
      className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border"
      style={{
        backgroundColor: `${edition.vertical.primaryColor}14`,
        color: edition.vertical.primaryColor,
        borderColor: `${edition.vertical.primaryColor}40`,
      }}
      aria-label={`Edition: ${edition.name.en}`}
    >
      <span aria-hidden>{edition.country.flagEmoji}</span>
      <span aria-hidden>{edition.vertical.heroEmoji}</span>
      <span>{edition.name.en}</span>
    </div>
  );
}
