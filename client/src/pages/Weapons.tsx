import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

const WEAPON_SKINS = ["default", "crimson", "void", "neon", "ghost"];

const SKIN_COLORS: Record<string, string> = {
  default: "oklch(0.72 0.28 195)",
  crimson: "oklch(0.58 0.28 25)",
  void: "oklch(0.60 0.28 290)",
  neon: "oklch(0.80 0.28 130)",
  ghost: "oklch(0.70 0.02 240)",
};

export default function Weapons() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [selectedSkin, setSelectedSkin] = useState("default");

  const { data: weapons } = trpc.weapons.getAll.useQuery();
  const { data: loadout, refetch } = trpc.weapons.getLoadout.useQuery(undefined, { enabled: isAuthenticated });

  const equipMutation = trpc.weapons.equip.useMutation({
    onSuccess: () => {
      toast.success("Weapon equipped!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-mono mb-4">AUTHENTICATION REQUIRED</p>
          <a href={getLoginUrl()} className="border border-primary text-primary px-6 py-2 font-mono text-sm hover:bg-primary hover:text-primary-foreground transition-all">
            CONNECT
          </a>
        </div>
      </div>
    );
  }

  const equippedWeaponId = loadout?.loadout?.weaponId;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-14">
          <button onClick={() => navigate("/")} className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors">
            ← BACK
          </button>
          <span className="font-mono text-xs text-muted-foreground tracking-widest">ARSENAL_MODULE</span>
          <div />
        </div>
      </nav>

      <div className="container py-8 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="error-code mb-2">WEAPON_SELECTION_TERMINAL</div>
          <h1 className="text-3xl font-black neon-cyan">CHOOSE YOUR WEAPON</h1>
          <p className="text-muted-foreground font-mono text-xs mt-2">COSMETIC SKINS ONLY — NO GAMEPLAY ADVANTAGE</p>
        </div>

        {/* Currently equipped */}
        {loadout && (
          <div className="game-panel p-4 mb-6 flex items-center gap-4">
            <div className="error-code">EQUIPPED:</div>
            <div
              className="text-sm font-bold"
              style={{ color: loadout.weapon.effectColor }}
            >
              {loadout.weapon.name}
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              SKIN: {loadout.loadout.skinKey?.toUpperCase()}
            </div>
          </div>
        )}

        {/* Weapon grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {weapons?.map((weapon) => {
            const isEquipped = weapon.id === equippedWeaponId;
            return (
              <div
                key={weapon.id}
                className={`game-panel p-5 cursor-pointer transition-all ${isEquipped ? "neon-border-cyan" : "hover:border-border/60"}`}
                style={isEquipped ? { borderColor: weapon.effectColor, boxShadow: `0 0 12px ${weapon.effectColor}40` } : {}}
              >
                {/* Weapon visual */}
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="relative w-20 h-8 flex items-center"
                  >
                    {/* Gun body */}
                    <div
                      className="w-14 h-5 relative"
                      style={{ background: weapon.effectColor, boxShadow: `0 0 10px ${weapon.effectColor}60` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-6 h-2" style={{ background: weapon.effectColor }} />
                      <div className="absolute left-2 bottom-0 translate-y-full w-3 h-2" style={{ background: weapon.effectColor + "80" }} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-black" style={{ color: weapon.effectColor }}>{weapon.name}</div>
                    <div className="error-code">{weapon.slug.toUpperCase()}</div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-mono mb-4">{weapon.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div>
                    <div className="error-code mb-1">DAMAGE</div>
                    <div className="h-1.5 bg-muted overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${weapon.damage}%`, background: weapon.effectColor }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="error-code mb-1">RECOIL</div>
                    <div className="h-1.5 bg-muted overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${weapon.recoilStrength}%`, background: "oklch(0.65 0.30 320)" }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => equipMutation.mutate({ weaponId: weapon.id, skinKey: selectedSkin })}
                  disabled={isEquipped || equipMutation.isPending}
                  className={`w-full py-2 font-mono text-xs transition-all ${
                    isEquipped
                      ? "border border-primary text-primary cursor-default"
                      : "border border-border text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {isEquipped ? "EQUIPPED" : "EQUIP"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Skin selector */}
        <div className="game-panel p-6">
          <div className="error-code mb-4">COSMETIC_SKINS — NO GAMEPLAY EFFECT</div>
          <div className="grid grid-cols-5 gap-3">
            {WEAPON_SKINS.map(skin => (
              <button
                key={skin}
                onClick={() => setSelectedSkin(skin)}
                className={`py-3 border-2 font-mono text-xs transition-all ${selectedSkin === skin ? "border-primary" : "border-border"}`}
                style={selectedSkin === skin ? { borderColor: SKIN_COLORS[skin], color: SKIN_COLORS[skin], boxShadow: `0 0 8px ${SKIN_COLORS[skin]}40` } : {}}
              >
                <div
                  className="w-4 h-4 mx-auto mb-1 rounded-full"
                  style={{ background: SKIN_COLORS[skin] }}
                />
                {skin.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="mt-3 error-code opacity-60 text-center">
            SKINS ARE COSMETIC ONLY · EQUIP A WEAPON TO APPLY SELECTED SKIN
          </div>
        </div>
      </div>
    </div>
  );
}
