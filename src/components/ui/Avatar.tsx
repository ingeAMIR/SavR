/* eslint-disable @next/next/no-img-element */

function initials(name?: string | null, email?: string | null) {
  const base = name?.trim() || email?.split("@")[0] || "?";
  return base
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  src,
  name,
  email,
  size = 32,
  ring = false,
}: {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const cls = `rounded-full object-cover ${ring ? "ring-2 ring-ink-900" : ""}`;
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? email ?? "Colaborador"}
        width={size}
        height={size}
        className={cls}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      className={`${cls} grid place-items-center bg-ink-600 font-medium text-ink-100`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label={name ?? email ?? "Colaborador"}
    >
      {initials(name, email)}
    </span>
  );
}

export function AvatarStack({
  people,
  size = 24,
  max = 4,
}: {
  people: { avatar_url?: string | null; full_name?: string | null; email?: string | null }[];
  size?: number;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((p, i) => (
        <Avatar
          key={i}
          src={p.avatar_url}
          name={p.full_name}
          email={p.email}
          size={size}
          ring
        />
      ))}
      {rest > 0 && (
        <span
          className="grid place-items-center rounded-full bg-ink-600 text-[10px] font-medium ring-2 ring-ink-900"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
