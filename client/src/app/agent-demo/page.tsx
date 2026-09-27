import type { Metadata } from 'next';
import { AgentPanel } from '@/agent/demo/AgentPanel';

export const metadata: Metadata = {
  title: 'Agent Demo — EduAgent Connect',
  description:
    'A demonstration of an AI agent completing the course-enquiry journey through the site\u2019s WebMCP capabilities, with explicit human confirmation. Synthetic data only.',
};

/**
 * Agent demonstration route (Spec 14).
 *
 * A dedicated, additive route that shows an agent completing the reference journey
 * transparently — visible tool calls, inspectable input/output, and explicit human
 * approval before any submission. The rest of the human website is unchanged; this
 * page simply hosts the {@link AgentPanel}.
 */
export default function AgentDemoPage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <section aria-labelledby="agent-demo-heading" className="space-y-3">
        <h1 id="agent-demo-heading" className="text-3xl font-bold tracking-tight text-slate-900">
          Agent demonstration
        </h1>
        <p className="max-w-2xl text-slate-600">
          Watch an AI agent complete an end-to-end course enquiry using the site&rsquo;s
          agent-ready capabilities. Every tool call is shown with its input and
          output, and the enquiry is only submitted after you explicitly confirm.
          All data is synthetic and for demonstration only.
        </p>
      </section>

      <AgentPanel />
    </div>
  );
}
