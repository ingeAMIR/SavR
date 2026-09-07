import { getProfile, getWishlist } from "@/lib/data/queries";
import { WishlistBoard } from "@/components/wishlist/WishlistBoard";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const [profile, items] = await Promise.all([getProfile(), getWishlist()]);
  if (!profile) return null;

  return (
    <div className="space-y-4 pt-2">
      <header>
        <h1 className="text-xl font-semibold">Wishlist</h1>
        <p className="text-sm text-ink-400">
          El congelador de metas: anota lo que quieres sin comprometerte todavía.
        </p>
      </header>

      <WishlistBoard items={items} currency={profile.currency} userId={profile.id} />
    </div>
  );
}
