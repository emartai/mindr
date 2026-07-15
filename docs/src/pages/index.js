import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';

const REPO = 'https://github.com/emartai/mindr';

/* --- tiny inline line-icons (no external assets) --- */
const Icon = {
  brain: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 3A2.5 2.5 0 0 0 7 5.5 2.5 2.5 0 0 0 5 8a2.5 2.5 0 0 0 0 5 2.5 2.5 0 0 0 2 4.5 2.5 2.5 0 0 0 5 0V4.5A1.5 1.5 0 0 0 10.5 3z" />
      <path d="M14.5 3A2.5 2.5 0 0 1 17 5.5 2.5 2.5 0 0 1 19 8a2.5 2.5 0 0 1 0 5 2.5 2.5 0 0 1-2 4.5 2.5 2.5 0 0 1-5 0" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" /><path d="M9 10.76V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6.76a2 2 0 0 0 .59 1.42l1.7 1.7a1 1 0 0 1 .3.7v.72a1 1 0 0 1-1 1H6.41a1 1 0 0 1-1-1v-.72a1 1 0 0 1 .3-.7l1.7-1.7A2 2 0 0 0 9 10.76z" />
    </svg>
  ),
  warn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  bug: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="6" width="8" height="14" rx="4" /><path d="m19 7-3 2" /><path d="m5 7 3 2" /><path d="M19 13h-3" /><path d="M8 13H5" /><path d="m19 19-3-2" /><path d="m5 19 3-2" /><path d="M12 2v2" />
    </svg>
  ),
  plug: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M8 9h2" />
    </svg>
  ),
  git: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="6" r="3" /><circle cx="5" cy="18" r="3" /><path d="M5 9v6" /><circle cx="19" cy="6" r="3" /><path d="M12 6h4" /><path d="M12 6a6 6 0 0 1-6 6" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  ),
};

const FEATURES = [
  { icon: Icon.brain, title: 'Learns your conventions', text: 'Tree-sitter parses every commit to detect naming, file, and test-layout patterns per language — with confidence scores.' },
  { icon: Icon.pin, title: 'Captures decisions', text: 'Meaningful commits (switch, migrate, refactor, dependency changes) become durable decision memories agents can recall.' },
  { icon: Icon.warn, title: 'Tracks technical debt', text: 'TODO / FIXME / HACK markers are captured, aged, and severity-scored — then resolved automatically when you remove them.' },
  { icon: Icon.bug, title: 'Remembers bug patterns', text: 'Structural fixes are recorded so agents can be warned before they write the same class of bug again.' },
  { icon: Icon.plug, title: 'MCP for any agent', text: 'One stdio MCP server exposes get_context, remember, query, and more to Claude Code, Cursor, Codex, Aider, and others.' },
  { icon: Icon.doc, title: 'Generates AGENTS.md', text: 'Auto-detected commands, stack, conventions, decisions, and warnings — written to AGENTS.md / CLAUDE.md, kept fresh.' },
];

const STEPS = [
  { n: '1', title: 'You commit', text: 'A post-commit git hook fires on every commit — nothing to run manually.', code: 'git commit -m "migrate auth to JWT + Redis"' },
  { n: '2', title: 'Mindr learns', text: 'It extracts conventions, decisions, debt, and bug patterns, and stores them in SQLite or Remembr.', code: 'mindr status  # memories per type' },
  { n: '3', title: 'Agents stay oriented', text: 'Your agent calls get_context (or reads AGENTS.md) and starts every session already knowing the codebase.', code: 'mindr generate agents-md' },
];

const INTEGRATIONS = [
  ['Claude Code', '/docs/integrations/claude-code'],
  ['Cursor', '/docs/integrations/cursor'],
  ['Codex', '/docs/integrations/codex'],
  ['Aider', '/docs/integrations/aider'],
  ['Windsurf', '/docs/integrations/windsurf'],
  ['Continue', '/docs/integrations/continue-dev'],
  ['OpenCode', '/docs/integrations/opencode'],
];

const CONTEXT_SAMPLE = `=== MINDR CONTEXT ===

[RECENT DECISIONS]
  2026-05-01 — migrate auth to JWT + Redis [keyword]
  2026-04-15 — switch internal APIs to tRPC [keyword]

[COMMANDS]
  Install: pnpm install
  Build:   pnpm build
  Test:    pnpm test
  Lint:    pnpm lint

[CONVENTIONS]
  typescript: functionNames=camelCase(97%), classNames=PascalCase(100%)

[STACK OVERVIEW]
  Languages: TypeScript
  Stack: Express, PostgreSQL, tRPC, Redis
  Hot modules: api (12), auth (7)

=== END CONTEXT ===`;

function Hero() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <div>
          <span className={styles.badge}>
            <span className={styles.badgeDot} /> Open source · MCP-native
          </span>
          <h1 className={styles.title}>
            Persistent memory for your <span className={styles.titleGrad}>coding agents</span>
          </h1>
          <p className={styles.subtitle}>
            Mindr watches your commits and learns your codebase — conventions, decisions,
            and debt — then feeds that context to any AI agent so it stops re-reading the
            world at the start of every session.
          </p>
          <div className={styles.ctaRow}>
            <Link className={styles.buttonPrimary} to="/docs/quickstart">
              Get started {Icon.arrow}
            </Link>
            <Link className={styles.buttonGhost} to={REPO}>
              {Icon.git} Star on GitHub
            </Link>
          </div>
          <div className={styles.heroMetaRow}>
            <span><b>npm i -g mindragent</b> · Node 22+</span>
            <span>Works with <b>SQLite</b> or <b>Remembr</b></span>
          </div>
        </div>

        <div className={styles.terminal}>
          <div className={styles.terminalBar}>
            <span className={styles.dot} style={{ background: '#ff5f57' }} />
            <span className={styles.dot} style={{ background: '#febc2e' }} />
            <span className={styles.dot} style={{ background: '#28c840' }} />
            <span className={styles.terminalTitle}>zsh — your-project</span>
          </div>
          <pre className={styles.terminalBody}>
            <span className={styles.termComment}># install &amp; initialize — once</span>{'\n'}
            <span className={styles.termPrompt}>$</span> npm i -g mindragent{'\n'}
            <span className={styles.termPrompt}>$</span> mindr init{'\n'}
            <span className={styles.termOut}>  ✓ Backend: sqlite</span>{'\n'}
            <span className={styles.termOut}>  ✓ Hook installed · convention scan done</span>{'\n'}
            {'\n'}
            <span className={styles.termComment}># every commit is captured automatically</span>{'\n'}
            <span className={styles.termPrompt}>$</span> git commit -m <span className={styles.termKey}>"migrate to tRPC"</span>{'\n'}
            <span className={styles.termOut}>  → decision stored (confidence 0.8)</span>{'\n'}
            {'\n'}
            <span className={styles.termComment}># your agent now starts oriented</span>{'\n'}
            <span className={styles.termPrompt}>$</span> mindr generate agents-md{'\n'}
            <span className={styles.termOut}>  ✓ AGENTS.md — commands, conventions, decisions</span>
          </pre>
        </div>
      </div>
    </header>
  );
}

function Features() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <p className={styles.eyebrow}>What it captures</p>
        <h2 className={styles.sectionTitle}>Memory that maintains itself</h2>
        <p className={styles.sectionLede}>
          No prompting, no manual note-taking. Mindr derives durable context from the work
          you already do — commits — and keeps it current.
        </p>
        <div className={styles.grid}>
          {FEATURES.map((f) => (
            <div className={styles.card} key={f.title}>
              <div className={styles.cardIcon}>{f.icon}</div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardText}>{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <div className={styles.sectionInner}>
        <p className={styles.eyebrow}>How it works</p>
        <h2 className={styles.sectionTitle}>Three steps, then it runs itself</h2>
        <div className={styles.steps}>
          {STEPS.map((s) => (
            <div className={styles.step} key={s.n}>
              <div className={styles.stepNum}>{s.n}</div>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepText}>{s.text}</p>
              <div className={styles.stepCode}>{s.code}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContextExample() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.ctxGrid}>
          <div>
            <p className={styles.eyebrow}>At session start</p>
            <h2 className={styles.sectionTitle}>Exactly what your agent receives</h2>
            <p className={styles.sectionLede}>
              A compact, token-budgeted brief — ordered by priority and trimmed to fit. One
              call to <code>get_context</code> and the agent knows your stack, commands,
              conventions, and recent decisions.
            </p>
          </div>
          <div className={styles.terminal}>
            <div className={styles.terminalBar}>
              <span className={styles.dot} style={{ background: '#ff5f57' }} />
              <span className={styles.dot} style={{ background: '#febc2e' }} />
              <span className={styles.dot} style={{ background: '#28c840' }} />
              <span className={styles.terminalTitle}>mindr:get_context</span>
            </div>
            <pre className={styles.terminalBody}>{CONTEXT_SAMPLE}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function Integrations() {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <div className={styles.sectionInner}>
        <p className={styles.eyebrow}>Bring your own agent</p>
        <h2 className={styles.sectionTitle}>One memory, every tool</h2>
        <p className={styles.sectionLede}>
          Mindr speaks the Model Context Protocol, so the same memory works across the
          agents your team already uses.
        </p>
        <div className={styles.pills}>
          {INTEGRATIONS.map(([name, href]) => (
            <Link className={styles.pill} to={href} key={name}>{name}</Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={styles.section}>
      <div className={styles.finalCta}>
        <h2>Give your agents a memory</h2>
        <p>Install, commit, and let Mindr do the rest. Local SQLite by default — zero config.</p>
        <div className={styles.ctaRow} style={{ justifyContent: 'center' }}>
          <Link className={styles.buttonPrimary} to="/docs/quickstart">Read the quickstart {Icon.arrow}</Link>
          <Link className={styles.buttonGhost} to={REPO}>{Icon.git} GitHub</Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Persistent memory for coding agents"
      description={siteConfig.tagline}
    >
      <Hero />
      <main>
        <Features />
        <HowItWorks />
        <ContextExample />
        <Integrations />
        <FinalCta />
      </main>
    </Layout>
  );
}
