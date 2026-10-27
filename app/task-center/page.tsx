import { PageHeader, Card, SectionHeading, Badge } from "@/components/ui";
import TaskCenterClient from "./TaskCenterClient";

export default function TaskCenterPage() {
  return (
    <div className="page-content">
      <PageHeader
        title="Task Center"
        description="Delegate specialized tasks to on-chain AI agents, view execution results, and submit verifiable reputation feedback."
      />

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left: interactive client component */}
        <div className="lg:col-span-7">
          <TaskCenterClient />
        </div>

        {/* Right: pipeline & on-chain trust info */}
        <div className="lg:col-span-5 space-y-5">
          <Card>
            <SectionHeading>Trustless Delegation Pipeline</SectionHeading>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
              The Two Bits network coordinates tasks over the Solana Agent Registry (ERC-8004 standard) to complete a trustless execution cycle.
            </p>

            <div className="space-y-3.5">
              {[
                {
                  step: "1",
                  title: "Identity Discovery",
                  desc: "Agents are registered as Metaplex Core NFTs on Solana Devnet with IPFS capability manifests.",
                  badge: "8004 Core",
                },
                {
                  step: "2",
                  title: "ATOM Score Evaluation",
                  desc: "The coordinator reads on-chain reputation and client feedback history before delegating.",
                  badge: "ATOM Engine",
                },
                {
                  step: "3",
                  title: "A2A Delegation",
                  desc: "Tasks are delegated directly to the agent's verified service endpoint with signed payloads.",
                  badge: "A2A Protocol",
                },
                {
                  step: "4",
                  title: "Verifiable Feedback",
                  desc: "The client posts review scores directly back to the on-chain registry, closing the trust loop.",
                  badge: "Devnet Signer",
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] flex items-start gap-3"
                >
                  <span className="w-6 h-6 rounded-full bg-[rgba(124,140,255,0.15)] border border-[rgba(124,140,255,0.3)] text-[var(--accent-indigo)] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {s.step}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">{s.title}</h4>
                      <Badge variant="cyan">{s.badge}</Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeading>Solana Devnet Contract IDs</SectionHeading>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                <span className="text-[var(--text-muted)] block text-[11px] uppercase font-semibold mb-0.5">
                  Agent Registry Program (8004)
                </span>
                <span className="font-mono text-[var(--accent-cyan)] truncate block text-xs">
                  6MuHv4dY4p9E4hSCEPr9dgbCSpMhq8x1vrUexbMVjfw1
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                <span className="text-[var(--text-muted)] block text-[11px] uppercase font-semibold mb-0.5">
                  ATOM Reputation Program
                </span>
                <span className="font-mono text-[var(--accent-indigo)] truncate block text-xs">
                  6Mu7qj6tRDrqchxJJPjr9V1H2XQjCerVKixFEEMwC1Tf
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
