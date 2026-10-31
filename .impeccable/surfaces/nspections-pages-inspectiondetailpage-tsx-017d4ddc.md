## Surface

- Scope: Inspector workflow shell and all four stages: Field Session, Evidence, Findings, and Report.
- Mode: Operate.
- Audience: Assigned field Inspector, on desktop, tablet, or phone.
- Job: Record the field session, attach evidence, review and confirm candidate findings, then author and submit a traceable report.
- Success: The Inspector can see the current stage, its blockers and available next action, and maintain a clear path from each report finding to its evidence.
- Constraints: Keep all current routes, controls, role and workflow gates, session outcomes, evidence and finding actions, and report/version behavior. Permit upload does not grant flight permission; AI is advisory; the Inspector makes finding decisions. Preserve audit provenance and free navigation between stages. Warn when leaving report edits that have not been saved.
- Direction: Trace Ledger, confirmed by the user; use an evidence-first “capture → finding → report” trace as the signature while maintaining ordinary web navigation and controls. Simplify the Findings surface using progressive disclosure.

## Direction contract

THESIS: Make the evidence chain the organizing idea of the Inspector workflow: every capture, finding, and report section reads as part of one traceable inspection. Refuse both a generic four-card wizard and a domain costume that obscures familiar web navigation.

OWN-WORLD: Trace Ledger uses a cool mineral-paper canvas, deep graphite text, tidal teal for active work, and restrained copper only for recorded or pending provenance; semantic green/amber/red remain reserved for actual state. One workhorse sans-serif and strong medium-scale type keep field labels readable. A thin trace rule connects capture references to their confirmed finding and report section; it never encodes status alone.

STORY: The Inspector arrives at a named asset and mission, sees which of four stages is active and why another stage may be blocked, completes field records, reviews evidence-linked AI candidates, explicitly confirms the findings set, then authors and submits a versioned report. Direct navigation remains available; each stage explains its prerequisites without pretending to grant legal clearance.

FIRST VIEWPORT: Keep the app shell, then a compact asset/mission header with permit record status and a four-step readiness rail. Below it, show one stage title, one-line task summary, and a primary work area. On Findings, lead with evidence-linked review and pending-decision count; tuck secondary filters behind “More filters,” leaving candidate decisions and the explicit zero-finding acknowledgement visible. On mobile, the rail becomes a concise current-step summary plus compact labeled stage navigation, not a four-row block.

FORM: Trace Ledger, top grounded direction; seed:46b551ab4919ce63. Signature move: the evidence trace rule starts at a capture reference, branches through an Inspector-confirmed finding, and resolves at its report section. Keep MUI controls and application routes; world expression contributes palette, density, typography, and that trace only. User confirmed primary user as Field Inspector, positioning as traceable inspection records, and must-preserve constraints as human decisions and audit trail. Keep existing React/MUI app behavior.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance