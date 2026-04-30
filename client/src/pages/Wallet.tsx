import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

const TOPUP_AMOUNTS = [0.50, 1.00, 5.00, 10.00, 25.00, 50.00];

const TX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  topup: { label: "TOP UP", color: "text-green-400" },
  stake: { label: "STAKE", color: "text-destructive" },
  payout: { label: "PAYOUT", color: "text-primary" },
  commission: { label: "FEE", color: "text-muted-foreground" },
  refund: { label: "REFUND", color: "text-yellow-400" },
};

const PAINT_PALETTE = ["#00e5ff","#ff3333","#ff6600","#cc00ff","#00ff88","#ffcc00","#ff0088","#0088ff"];
function getPaintColor(name: string): string {
  if (!name) return "#00e5ff";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return PAINT_PALETTE[Math.abs(hash) % PAINT_PALETTE.length];
}

export default function Wallet() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedAmount, setSelectedAmount] = useState(5.00);
  const [customAmount, setCustomAmount] = useState("");

  const { data: walletData, refetch } = trpc.wallet.getBalance.useQuery(undefined, { enabled: isAuthenticated });
  const { data: transactions } = trpc.wallet.getTransactions.useQuery({ limit: 50 }, { enabled: isAuthenticated });

  const demoTopUp = trpc.wallet.demoTopUp.useMutation({
    onSuccess: (data) => {
      toast.success(`Wallet credited! New balance: $${data.newBalance.toFixed(2)}`);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const createTopUpSession = trpc.wallet.createTopUpSession.useMutation({
    onSuccess: (data) => {
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        toast.info("Stripe integration coming soon. Using demo top-up.");
        demoTopUp.mutate({ amount: selectedAmount });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleTopUp = () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (isNaN(amount) || amount < 0.05) {
      toast.error("Minimum top-up is $0.05");
      return;
    }
    createTopUpSession.mutate({ amount, origin: window.location.origin });
  };

  const handleDemoTopUp = () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (isNaN(amount) || amount < 0.05) {
      toast.error("Minimum top-up is $0.05");
      return;
    }
    demoTopUp.mutate({ amount });
  };

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

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-14">
          <button onClick={() => navigate("/")} className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors">
            ← BACK
          </button>
          <span className="font-mono text-xs text-muted-foreground tracking-widest">WALLET_TERMINAL</span>
          <div />
        </div>
      </nav>

      <div className="container py-8 max-w-2xl mx-auto">
        {/* Balance display */}
        {(() => {
          const pc = getPaintColor(user?.name ?? "");
          return (
            <div className="game-panel p-8 mb-6 text-center" style={{ borderTop: `3px solid ${pc}`, boxShadow: `0 0 32px ${pc}22` }}>
              <div className="error-code mb-2">CURRENT_BALANCE</div>
              <div className="text-6xl font-black mb-2" style={{ color: pc, textShadow: `0 0 24px ${pc}88`, fontFamily: "Rajdhani, sans-serif" }}>
                ${walletData?.balance.toFixed(2) ?? "0.00"}
              </div>
              <div className="flex items-center justify-center gap-4 mb-2">
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: pc, boxShadow: `0 0 8px ${pc}` }} />
                <span className="error-code">PAINT ID: {pc.toUpperCase()}</span>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: pc, boxShadow: `0 0 8px ${pc}` }} />
              </div>
              <div className="error-code">MINIMUM_STAKE: $0.05 | COMMISSION: 10% | PAYOUT: 90%</div>
            </div>
          );
        })()}

        {/* Top-up panel */}
        <div className="game-panel p-6 mb-6">
          <div className="error-code mb-4">DEPOSIT_FUNDS</div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {TOPUP_AMOUNTS.map(amount => (
              <button
                key={amount}
                onClick={() => { setSelectedAmount(amount); setCustomAmount(""); }}
                className={`zone-btn py-3 text-sm font-bold ${selectedAmount === amount && !customAmount ? "selected" : ""}`}
              >
                ${amount.toFixed(2)}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">$</span>
              <input
                type="number"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
                placeholder="Custom amount"
                min="0.05"
                step="0.01"
                className="w-full bg-input border border-border text-foreground font-mono text-sm pl-7 pr-3 py-2 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDemoTopUp}
              disabled={demoTopUp.isPending}
              className="py-3 border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all font-mono text-sm disabled:opacity-40"
            >
              {demoTopUp.isPending ? "PROCESSING..." : "DEMO TOP-UP (FREE)"}
            </button>
            <button
              onClick={handleTopUp}
              disabled={createTopUpSession.isPending}
              className="py-3 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all font-black tracking-widest disabled:opacity-40"
            >
              {createTopUpSession.isPending ? "PROCESSING..." : "PAY WITH STRIPE"}
            </button>
          </div>

          <div className="mt-3 error-code text-center opacity-60">
            STRIPE PAYMENTS SECURED · MINIMUM $0.05 · INSTANT CREDIT
          </div>
        </div>

        {/* Transaction history */}
        <div className="game-panel">
          <div className="p-4 border-b border-border">
            <div className="error-code">TRANSACTION_LEDGER</div>
          </div>
          <div className="divide-y divide-border">
            {!transactions || transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                NO TRANSACTIONS RECORDED
              </div>
            ) : (
              transactions.map((tx) => {
                const typeInfo = TX_TYPE_LABELS[tx.type] || { label: tx.type.toUpperCase(), color: "text-foreground" };
                const amount = parseFloat(tx.amount as string);
                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className={`text-sm font-bold ${typeInfo.color}`}>{typeInfo.label}</div>
                      <div className="error-code">{tx.description?.slice(0, 40) || "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-sm font-bold ${amount >= 0 ? "text-green-400" : "text-destructive"}`}>
                        {amount >= 0 ? "+" : ""}${Math.abs(amount).toFixed(2)}
                      </div>
                      <div className="error-code">
                        BAL: ${parseFloat(tx.balanceAfter as string).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
