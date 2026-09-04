export const meta = {
  name: 'prizevault-frontend-audit',
  description: 'Exhaustively map the PrizeVault frontend: apps, routes, state, features, design tokens, bugs, and dead code',
  phases: [
    { title: 'Map', detail: 'parallel readers over each app + shared layer' },
    { title: 'Synthesize', detail: 'merge into one architecture + redesign brief' },
  ],
}

const ROOT = 'D:/stellar1/prizevault/frontend'

const MAP_SCHEMA = {
  type: 'object',
  required: ['area', 'summary', 'entryPoints', 'components', 'features', 'stateAndData', 'designNotes', 'problems', 'deadOrDuplicate'],
  properties: {
    area: { type: 'string' },
    summary: { type: 'string', description: '3-6 sentence prose overview of what this area does and how it is structured' },
    entryPoints: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'role'],
        properties: { file: { type: 'string' }, role: { type: 'string' } },
      },
    },
    components: {
      type: 'array',
      description: 'EVERY component file in this area',
      items: {
        type: 'object',
        required: ['file', 'lines', 'purpose', 'keyProps', 'renders'],
        properties: {
          file: { type: 'string' },
          lines: { type: 'number' },
          purpose: { type: 'string' },
          keyProps: { type: 'string', description: 'props / context it consumes' },
          renders: { type: 'string', description: 'concrete UI it renders: cards, tables, modals, forms, fields, buttons, empty states' },
        },
      },
    },
    features: {
      type: 'array',
      description: 'Every user-facing capability. Must be exhaustive — this is the preservation contract for a redesign.',
      items: {
        type: 'object',
        required: ['name', 'where', 'howItWorks', 'userFlow'],
        properties: {
          name: { type: 'string' },
          where: { type: 'string', description: 'file:line' },
          howItWorks: { type: 'string' },
          userFlow: { type: 'string', description: 'click-by-click what the user does' },
        },
      },
    },
    stateAndData: {
      type: 'array',
      description: 'Contexts, localStorage keys, Firebase collections, network calls, Stellar/Soroban interactions',
      items: {
        type: 'object',
        required: ['kind', 'identifier', 'shape', 'readBy', 'writtenBy'],
        properties: {
          kind: { type: 'string', description: 'context | localStorage | firebase | http | stellar | soroban | other' },
          identifier: { type: 'string' },
          shape: { type: 'string' },
          readBy: { type: 'string' },
          writtenBy: { type: 'string' },
        },
      },
    },
    designNotes: {
      type: 'object',
      required: ['palette', 'typography', 'spacingAndRadius', 'componentPatterns', 'cssArchitecture', 'responsiveness', 'accessibility'],
      properties: {
        palette: { type: 'string', description: 'actual hex values found, and where defined' },
        typography: { type: 'string', description: 'font families, sizes, weights actually used' },
        spacingAndRadius: { type: 'string' },
        componentPatterns: { type: 'string', description: 'button/card/modal/table/badge class names and variants' },
        cssArchitecture: { type: 'string', description: 'which css files, import order, cascade collisions, use of CSS vars' },
        responsiveness: { type: 'string', description: 'breakpoints present, what breaks on mobile' },
        accessibility: { type: 'string', description: 'aria usage, focus handling, contrast, keyboard traps' },
      },
    },
    problems: {
      type: 'array',
      description: 'Concrete defects: bugs, broken links, unhandled errors, react key/effect issues, contrast failures, layout breaks',
      items: {
        type: 'object',
        required: ['file', 'line', 'severity', 'issue', 'evidence'],
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          severity: { type: 'string', description: 'critical | high | medium | low' },
          issue: { type: 'string' },
          evidence: { type: 'string', description: 'the actual code that proves it' },
        },
      },
    },
    deadOrDuplicate: {
      type: 'array',
      description: 'Files that are never imported, or duplicate .js/.ts .jsx/.tsx pairs. Prove it with import evidence.',
      items: {
        type: 'object',
        required: ['file', 'verdict', 'evidence'],
        properties: {
          file: { type: 'string' },
          verdict: { type: 'string', description: 'dead | duplicate-of-X | live' },
          evidence: { type: 'string' },
        },
      },
    },
  },
}

const AREAS = [
  {
    key: 'landing',
    prompt: `Read and fully analyze the PrizeVault LANDING page area under ${ROOT}:
- index.html
- src/landing.jsx
- styles.css  (the GLOBAL stylesheet, 1016 lines — read ALL of it; it is shared by every app so document its full token/class inventory carefully)
- src/components/SharedHeader.jsx
- src/utils/authSession.ts
- vercel.json and vite.config.js (routing/rewrites)
Also list what is in public/logos/.
Read every file top to bottom. Do not sample.`,
  },
  {
    key: 'organizer',
    prompt: `Read and fully analyze the PrizeVault ORGANIZER (issuer) app under ${ROOT}:
- issuer.html, src/main-issuer.jsx, src/issuer/IssuerApp.jsx
- src/issuer/context/IssuerContext.jsx
- EVERY file in src/issuer/components/ (18 files: AuditLogPage, BulkUploadScreen, CreateHackathonForm, CredentialDetailModal, Header, IssueCredentialModal, IssuedCredentialsView, KeyManagementModal, OrganizerDashboard, OrganizerHackathonList, ParticipantManager, PayoutProposal, RevokedCredentialsView, RevokeModal, Sidebar, StudentTable, Timeline, TwoFASetup)
- src/issuer/styles.css and src/issuer/issuerApp.css (2075 lines — read it ALL)
- src/utils/timelinePdfParser.js, src/utils/issuerAuditLog.js, src/utils/hackathonSync.ts, src/utils/organizerPortalFilter.ts, src/utils/payoutProposalsStorage.js and .ts, src/types/hackathon.ts, src/constants/escrow.js
Read every file top to bottom. Do not sample. This is the largest app — be exhaustive about its navigation structure, every screen, every form field, and every button.`,
  },
  {
    key: 'holder',
    prompt: `Read and fully analyze the PrizeVault HOLDER WALLET app under ${ROOT}:
- holder-wallet.html, src/holderWallet.tsx, src/holderWallet.jsx, src/holderWallet.css (1177 lines — read it ALL)
- src/holder/HolderApp.tsx, src/holder/HolderApp.jsx, src/holder/ConnectedHolderView.tsx, src/holder/StellarConnectBlock.tsx
- src/holder/context/HolderContext.jsx (926 lines — read it ALL, it is the state core)
- EVERY file in src/holder/components/ (AuditTrail, CredentialInbox, CredentialVault, DidManager, DocumentUpload, HackathonList, ParticipantDashboard, ProfileForm, RevocationMonitor, SecurityCenter, SelectiveDisclosure, ShareCenter, SponsorDashboard, StatsBar, StellarLogin, VerificationRequests)
- src/holder/stellarWallet.ts, src/holder/utils/ (crypto.js, roleDetection.ts, ui.js, userProfileStorage.ts)
- src/types/holder.ts, src/utils/qrSession.ts, src/constants/qrWallets.ts, src/assets/ (QR pngs)
Read every file top to bottom. Do not sample. Pay special attention to how role detection (participant vs sponsor vs organizer) routes the UI, and to the Freighter/Stellar wallet connection lifecycle.`,
  },
  {
    key: 'sponsor-and-shared',
    prompt: `Read and fully analyze the PrizeVault SPONSOR (recruiter) app AND the shared src/components/ layer under ${ROOT}:
- recruiter.html, src/recruiter.jsx (744 lines — read it ALL), src/recruiter.css (610 lines — read it ALL)
- EVERY file in src/recruiter/components/ (AdvancedToolkit, AIInsightsPanel, OfflineVerificationPanel, SemanticSearchPanel, VerificationWorkbench, VPIntakePanel)
- EVERY file in src/components/ and its CSS: CredentialList, DIDView, Header, InstitutionIntegration, KeyRecovery, PresentVCModal, ReceivedCredentials, ReceiveVCModal, WalletConnector, WalletView, shared.css
- src/App.jsx, src/App.css, src/main.jsx, src/index.css, src/services/storageService.js
Read every file top to bottom. Do not sample. For src/components/ and src/App.jsx especially: determine whether each file is actually imported by any live entry point (index.html -> landing.jsx, issuer.html -> main-issuer.jsx, holder-wallet.html -> holderWallet.tsx, recruiter.html -> recruiter.jsx). src/main.jsx and src/App.jsx have NO html entry — confirm and flag. Grep for imports to prove liveness.`,
  },
]

phase('Map')
const maps = await parallel(
  AREAS.map((a) => () =>
    agent(
      `${a.prompt}

You are producing the authoritative reference map for a full professional redesign of this frontend. Another agent will rebuild the UI from your map alone, so ANY feature you omit will be silently dropped. Be exhaustive and concrete: real file paths, real line numbers, real hex colors, real class names, real localStorage keys, real form field names.

Use Read on every file listed. Use Grep to prove import graphs and to find every localStorage key and every fetch/axios call. Do not guess.`,
      { label: `map:${a.key}`, phase: 'Map', schema: MAP_SCHEMA, effort: 'high' }
    )
  )
)

const live = maps.filter(Boolean)
log(`Mapped ${live.length}/${AREAS.length} areas; ${live.reduce((n, m) => n + (m.features?.length || 0), 0)} features, ${live.reduce((n, m) => n + (m.problems?.length || 0), 0)} problems found`)

phase('Synthesize')
const BRIEF_SCHEMA = {
  type: 'object',
  required: ['architecture', 'appInventory', 'featureContract', 'currentDesignSystem', 'topProblems', 'deadCode', 'redesignRisks', 'openQuestions'],
  properties: {
    architecture: { type: 'string', description: 'How the MPA is wired: html entries -> react roots -> apps -> shared. Include routing/rewrites.' },
    appInventory: {
      type: 'array',
      items: {
        type: 'object',
        required: ['app', 'route', 'entry', 'screens', 'lines'],
        properties: {
          app: { type: 'string' }, route: { type: 'string' }, entry: { type: 'string' },
          screens: { type: 'array', items: { type: 'string' } }, lines: { type: 'number' },
        },
      },
    },
    featureContract: {
      type: 'array',
      description: 'The complete deduplicated list of user-facing features that MUST survive a redesign. Group by app.',
      items: {
        type: 'object',
        required: ['app', 'feature', 'files'],
        properties: { app: { type: 'string' }, feature: { type: 'string' }, files: { type: 'string' } },
      },
    },
    currentDesignSystem: {
      type: 'object',
      required: ['colors', 'fonts', 'patterns', 'cssFiles', 'weaknesses'],
      properties: {
        colors: { type: 'string' }, fonts: { type: 'string' }, patterns: { type: 'string' },
        cssFiles: { type: 'string' }, weaknesses: { type: 'string', description: 'why it does not look like Luma/HackerRank/Devfolio today' },
      },
    },
    topProblems: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'file', 'issue'],
        properties: { severity: { type: 'string' }, file: { type: 'string' }, issue: { type: 'string' } },
      },
    },
    deadCode: { type: 'array', items: { type: 'string' } },
    redesignRisks: { type: 'array', items: { type: 'string' }, description: 'What a redesign could easily break: shared styles.css cascade, context coupling, wallet flows, etc.' },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
}

const brief = await agent(
  `Here are four exhaustive area maps of the PrizeVault frontend (a Stellar hackathon-prize-escrow app at ${ROOT}), produced by four readers:

${live.map((m) => `===== AREA: ${m.area} =====\n${JSON.stringify(m, null, 1)}`).join('\n\n')}

Merge these into ONE authoritative architecture + redesign brief.

Rules:
- Deduplicate features that appear in multiple maps, but NEVER drop one. The featureContract is a preservation contract — if a feature is listed in any map it must appear in the contract.
- Verify the dead-code claims yourself with Grep before listing a file as dead. A file imported by any of the four live html entry points transitively is NOT dead.
- For currentDesignSystem.weaknesses, be specific and critical: compare against how Luma, Devfolio/HackCulture, and HackerRank actually present event/registration UIs (clean light-first surfaces, generous whitespace, strong typographic hierarchy, restrained accent color, real data density in tables, crisp empty states, obvious primary actions).
- Rank topProblems by real user impact.
- openQuestions should only contain things that genuinely change the redesign plan and cannot be answered from the code.`,
  { label: 'synthesize:brief', phase: 'Synthesize', schema: BRIEF_SCHEMA, effort: 'high' }
)

return brief
