# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user for the inspection workflow is the assigned Field Inspector, working on-site or shortly after a mission. The Inspector records the field session, uploads evidence, reviews defect suggestions, confirms findings, and authors a report.

## Product Purpose

SmartDroneInspection supports traceable infrastructure inspections by connecting an asset and mission to field-session records, evidence, Inspector-confirmed findings, and a versioned inspection report. Success means the Inspector can complete and verify that chain without confusing recorded documents or AI suggestions with human or legal authorization.

## Positioning

Inspection evidence, findings, and reports are connected in an auditable workflow. AI-assisted detection and drafting support the Inspector; they do not replace human confirmation or author responsibility.

## Operating Context

Inspectors use the web and mobile applications during and after infrastructure inspection work. The four web workflow stages are Field Session / Flight Permit, Evidence, Findings, and Report. The field flow records pre-flight notes and session outcomes, then associates captures with the inspection and supports review of findings before report drafting.

## Capabilities and Constraints

- Uploading a flight-permit file records that document; it does not by itself validate legal clearance or grant permission to fly.
- Starting a field session records the Inspector's activity in software; it does not control or arm the aircraft.
- AI defect detections are advisory candidates. An Inspector reviews, edits, confirms, or removes them; the confirmed finding set is the report basis.
- Report drafts are versioned. Submission locks the submitted version while awaiting independent review; published reports are immutable.
- Evidence provenance and the relationship between captures, findings, and reports must remain traceable.
- Keep existing React, TypeScript, and Material UI application behavior, route structure, and role/workflow gates unless a separately authorized change requires otherwise.
- Review the SRS and executable code together; a documented target is not proof that a behavior is implemented.

## Evidence on Hand

- Report 3 functional requirements: `SmartDroneInspection-docs/reports/report-3-software-requirement-specification/03-functional-requirements.md`, sections 3.7, 3.9, and 3.10.
- Existing frontend route/components and workflow tests in `src/features/inspections/`.
- The local test account and inspection data are development-only; do not present them as real customer evidence.
- No customer testimonials, independently verified performance benchmarks, or public certifications have been confirmed for use in product UI.

## Product Principles

- Preserve the evidence chain from mission to report.
- Make human responsibility explicit wherever automation assists.
- Distinguish operational records from legal or flight authorization.
- Keep consequential workflow states and audit history understandable.

## Accessibility & Inclusion

No additional product-specific accessibility standard was supplied during the interview. Preserve accessible names, keyboard operation, readable contrast and text, and usable phone-width interactions as implementation requirements.
