# Community Connection App

Product requirements and implementation specification

DubHacks 2026  |  Community Kitchen  |  Version 1.0  |  October 17 2026

## Product direction

We help people turn a moment of wanting company into a feasible outing and, over time, a recurring social routine. People tell the assistant what they feel like doing, when they are available, and who they want to spend time with. It gathers private replies, proposes workable options, confirms a plan, and helps the group follow through.

The product supports meals, sports, parks, run clubs, music sessions, community events, and user ideas. The recommended hackathon release proves the journey with an existing friend circle through messaging. Product name remains open.

## What changed from the earlier concept

| Area | Earlier concept | Updated concept |
| --- | --- | --- |
| Main interface | Swiping led discovery; Photon helped coordinate. | The full journey works by text. The app adds richer discovery. |
| Outing workflow | Four broad steps ended at coordination. | Six steps explicitly include private matching, a confirmed group, and repeat invitations. |
| Private replies | Private preferences and declines were already part of the concept. | One-to-one replies and confirmed-only groups define the boundary more clearly. |
| Recurring connection | Recurring routines were already a goal. | A run-it-back follow-up is now an explicit opt-in step. |
| Track direction | Photon, SideShift, and VEYZL were recommended; SpaceXAI was conditional. | Photon is central; VEYZL remains strong. Cloudforce is optional. SideShift and SpaceXAI leave the proposal. |
| Unchanged core | Current interests, willingness, feasibility, privacy, and broad activities. | These remain the product foundation. Gemini remains an additional option; Perceptron stays out. |

## How to use this specification

Requirements preserve the updated concept. Demo choices and numeric defaults below are recommendations for a buildable first release, rather than new team commitments. The final section lists the decisions to settle and work that can be split among the team.

## 1 Users goals and release scope

### Who we are building for

The primary user wants to see friends but gets stuck turning vague interest into a specific plan. An invited friend wants an easy way to express interest or decline privately. A secondary user wants to enter a new community, especially after moving or graduating; that broader discovery journey follows the friend-circle release.

### What success means

The hackathon succeeds when three or four consenting participants can move from a text request to a confirmed outing, handle one material change, and opt into a follow-up without exposing private replies. A proposed plan is not evidence that a meetup happened or that loneliness decreased.

| Priority | Required scope |
| --- | --- |
| P0  Complete demo | Opt-in and STOP; existing circle; manual availability; current interests; yes/no/maybe replies; deterministic feasibility checks; exact-plan confirmation; confirmed-only thread; one reminder; lateness; material-change approval; run-it-back opt-in. |
| P1  If the loop works | Small web companion with activity cards and plan status; optional free/busy calendar connection; live venue or routing data; richer preference controls. |
| P2  Later product | New-people discovery with mutual acceptance, block/report and community hosts; broad event ingestion; recurring series; multiple messaging channels; larger groups. |
| Outside this release | Background screening, payments, ticket purchases, automatic bookings, live location tracking, social feeds, matching people by desirability, and a separate Cloudforce project by default. |

### Recommended demo defaults

Use one existing circle of up to four people, including the organizer, and two to four proposed attendees. Use America/Los_Angeles for display and UTC for stored instants. Manually share availability for one outing, with an expiry. Start with three activity options and one active proposal per outing. A four-person pickleball fixture demonstrates minimum attendance; a casual walk or meal demonstrates flexible attendance.

Use clearly labeled sample venues, travel estimates, and event records until live sources are connected. Real-world outings need venue availability checked before final confirmation. Demo time can be advanced explicitly to show reminders and the next-week follow-up.

### Product measures after the demo

Measure initiated outings that reach confirmed status, elapsed time to confirmation, required coordination replies, participant-reported attendance, and repeat opt-ins. Track unwanted-message reports and privacy defects alongside conversion. The hackathon gate is a working journey; longer-term targets need a pilot baseline.

## 2 Request discovery and private replies

### FR1 Start from a message

A user can text a request such as “Free Sunday 2 to 6, something active, with my weekend circle, under $15.” Extract the time window, activity interest, audience, budget, travel limit, and group size. Resolve relative dates in the sender’s timezone and echo the concrete date. Ask a short follow-up for missing hard constraints; do not infer permission to invite people from a vague name.

### FR2 Select the audience and group policy

The organizer selects an existing circle or explicitly selected friends. They choose either everyone together or whoever can attend. Everyone together requires the entire selected roster, including the organizer, to accept the same plan. Whoever can attend requires the organizer and the activity minimum, up to its capacity. Cap the demo roster at capacity before invitations; do not rank friends or invite replacements in waves.

### FR3 Gather availability and willingness separately

Manual availability must work without a connected calendar. A user grants a time interval to a named audience for this outing and sets an expiry. A free interval describes scheduling possibility; the person must separately express willingness to join. A calendar integration, if added, supplies authorized free/busy data and never turns empty calendar space into social permission.

### FR4 Offer a short list of activities

Return up to three activity ideas or specific outings. Each option states activity, proposed time or time range, duration, estimated per-person cost, place or area, travel basis, and whether it is an existing event or a proposed gathering. Include a brief reason it fits. Existing events need a source link and verification time; a generated meetup must not be presented as an event already organized by someone else.

### FR5 Make responses unambiguous

| Reply | Meaning | Effect |
| --- | --- | --- |
| Yes to an idea | I am interested in this activity. | Contributes preference; does not confirm attendance. |
| Maybe | I might join or need something clarified. | Never counts toward attendance minimum. |
| No or pass | I do not want this option or outing. | Stored privately; no reason required. |
| Confirm plan 2 | I accept the exact details in version 2. | Counts only for that version after server validation. |

### FR6 Keep replies private

Collect availability, budget, dietary needs, accessibility needs, and declines in direct messages. Invite the selected, opted-in circle together, subject to provider delivery delays. Never quote a private reason in a group explanation. If a response contains an unclear “yes” and multiple questions are pending, ask which one it answers.

## 3 Feasibility and proposal selection

### FR7 Apply hard constraints before preferences

The server enumerates candidate activity, venue, start time, and participant sets. A candidate passes only when each included person has authorized availability and willingness, the whole activity fits, the cost stays within every included budget, required accessibility or dietary conditions are met, and attendance satisfies the activity limits. An unknown required condition is unresolved, rather than assumed to pass.

For each person, departure must fit after their available start and arrival must precede the outing start. Include return travel before their available end when their stated window requires being back. Check minimum notice, travel limits, setup time, venue hours, event time, and booking requirements. Store each travel estimate’s basis and age. Unknown travel or court availability must be labeled and resolved or explicitly accepted as uncertain before a real plan is confirmed.

### FR8 Respect the selected group mode

For everyone together, evaluate the whole selected roster. If one person cannot join, offer the organizer another time or a new round without disclosing who declined. For whoever can attend, evaluate feasible, interested subsets while retaining the organizer. A later reply never silently adds someone to an already confirmed group. Joining later requires a new proposal if membership or capacity changes.

### FR9 Compare feasible options transparently

For flexible attendance, first prefer options that include more willing invitees. Among equal attendance counts, prefer more explicit yes votes for the activity, then lower worst individual travel time, then lower total travel, then lower maximum cost. Maybe and unanswered votes score zero and cannot establish willingness. Use a stable candidate ID to break a remaining tie. For everyone together, skip the attendance comparison. These are proposed deterministic demo rules; people receive no social scores.

Show at most three options. Explain the shared fit using approved plan fields, such as “Fits the group’s shared window and travel limits.” Each person can privately see their own travel estimate. Never explain an option by naming someone’s budget, disability, location, or rejection of another option. A user can request a different activity without resetting their consent settings.

### FR10 Handle no match honestly

If no option passes, say no workable plan was found under the current settings. Offer specific organizer-controlled adjustments, such as widening the time window or changing activity. Do not silently raise budgets, relax accessibility requirements, change group policy, or switch to strangers. Participants must approve changes to their own hard constraints.

### The technical contribution

The implementation combines present intent, private participant constraints, deterministic scheduling, fairer travel comparison, and a durable conversation lifecycle. The language model interprets flexible requests and explains eligible choices; it does not decide whether a constraint was satisfied.

## 4 Confirmation changes and repeat plans

### FR11 Confirm an exact plan

A proposal version contains the activity, venue, date, start and end, timezone, cost estimate and uncertainty, intended attendees, attendance rule, response deadline, and booking status. The organizer selects a proposal, then every intended attendee explicitly accepts that version and consents to sharing their contact identity with the confirmed group. Shared groups can reveal phone numbers or handles depending on channel.

Default response deadline is 30 minutes after proposal creation, capped so it falls before the earliest required departure. Do not send a proposal whose deadline has already passed. Silence and maybe are not acceptance. In flexible mode, nonresponders can be excluded only through a new exact proposal to the remaining attendees. In everyone mode, failure to obtain the complete roster sends the outing back for replanning.

| State | Allowed transition |
| --- | --- |
| Draft | Organizer sets audience and policy, then opens collecting. |
| Collecting | Private replies and constraints yield proposals, or expire. |
| Awaiting confirmation | Exact version sent. All intended accepts produce confirmed; a decline or timeout returns to proposals or expires. |
| Confirmed | Create or reconcile the confirmed group once. Schedule reminders; accept lateness or change requests. |
| Change pending | Keep a feasible old plan current; pause reminders if it becomes infeasible. Apply a revision only after retained and new attendees accept. |
| Completed or cancelled | Stop future outing reminders. Completed permits a private repeat-interest check; cancellation does not imply completion. |
| Expired | No attendance or automatic group creation. A renewed request starts a new round. |

### FR12 Coordinate with a quiet assistant

After confirmation, post the current plan to a thread containing only confirmed attendees. Send one reminder 60 minutes before start, or omit it if confirmation occurs within that period. A private “10 minutes late” can become a minimal group heads-up without location. Lateness alone does not move the outing start. Use explicit text commands first; reactions are optional only when the provider delivers them reliably and ties them to the correct message.

### FR13 Reconfirm material changes

Time, venue, activity, cost, booking status, or membership changes create a new version. Require all retained attendees and any newcomers to accept material changes. Withdrawal is immediate and never needs permission from the group. Recheck the minimum and group policy; everyone mode must replan or cancel after a withdrawal. Rejecting an update keeps a feasible old plan current. If the old plan is impossible, stay in change pending, label it infeasible, and pause reminders until replanned or cancelled.

### FR14 Run it back

After the outing ends, privately ask whether participants want another outing next week. Only yes respondents enter the next planning round. Recheck availability and confirm a fresh plan; a repeat preference is not a standing calendar booking. Each repetition has separate participation consent, and passes remain private.

## 5 Consent privacy and delivery failures

### Communication boundaries

Message only users who initiated contact or have recorded channel consent. An organizer entering a friend’s phone number does not establish that friend’s consent. Use a self-join link or an already opted-in demo roster. STOP disables future assistant messages immediately, cancels queued sends, and invalidates future use of the person’s shared availability. A user-initiated return requires fresh opt-in.

Confirm channel-specific identity exposure before group creation. Private data lives in participant-owned records; the public plan is a separate projection with an explicit list of allowed fields. Group generation receives only that public projection. Already delivered messages and other participants’ copies cannot be retracted by deleting server data. Do not promise that group membership or small-group outcomes cannot indirectly reveal who attended.

### Data minimization and permissions

Request approximate departure area only when travel checking needs it. Do not collect live whereabouts. Users can revoke or shorten availability grants. Revalidate grants before matching, confirmation, and sending a proposal that uses them. Other sends require current message consent and the correct audience. The organizer cannot read others’ constraints. Authorize every record access and state mutation on the server, including web companion routes.

Recommended demo retention: remove raw message bodies and private constraint notes seven days after the outing; expire availability at its stated expiry. Retain only minimal structured plan and consent records needed for the demo and troubleshooting, with no secrets in logs. Provide a delete-data action. A production retention policy is a separate decision.

### Failure behavior that must work

| Failure | Required behavior |
| --- | --- |
| Duplicate or delayed webhook | Deduplicate by provider event ID. Late replies cannot accept an obsolete version or resurrect a cancelled outing. |
| Model uncertainty or outage | Ask a narrow question or use structured commands. Preserve the current plan and private constraints. |
| Message send fails | Record failed status and retry only if safe. Provider acceptance is distinct from delivery; never claim the invite was read. |
| Group creation times out | Reconcile using provider IDs or a stable operation key before retrying. Do not create a second group blindly. |
| Opt-out during a queued send | Recheck consent at dispatch. Suppress the send and re-evaluate attendance. |
| Insufficient attendees | Return to planning or cancel explicitly. Never substitute an uninvited person. |
| Provider lacks needed groups | Use a clearly labeled web-thread fallback for product testing. Treat the live Photon group journey as incomplete until proven. |

### Before discovery of new people

New-people mode requires explicit selection, mutual acceptance, public meeting venues, and working block/report controls before launch. Bringing a friend and small groups remain supported design goals. Verification labels describe exactly what was checked. Background screening is deferred and must never be framed as a safety guarantee.

## 6 Architecture and persistent records

### Logical architecture

A Photon adapter receives messages and maps channel identities to internal users. A conversation service resolves the user’s current outing and intent. The model returns structured request fields or a proposed command. A deterministic domain service validates consent, matching, proposal versions, and transitions. A database persists the result. A worker sends allowed messages and runs reminders through an outbox.

Keep matching and outing rules independent of the messaging provider. The optional web companion uses the same domain commands and authorization rules. One backend, one relational database, and one durable worker or scheduled job are sufficient for the demo. Use the team’s familiar supported stack; this specification does not require a new framework.

| Record | Minimum fields and rules |
| --- | --- |
| User and channel identity | Internal user ID; timezone; provider identity; consent and STOP timestamps. Do not merge identities across platforms by matching a display name. |
| Circle and membership | Circle ID, owner, explicitly selected user IDs, membership consent. Each participant can leave. |
| Availability grant | User ID, audience or outing, start/end, timezone, expiry, revocation. Calendar contents never belong in a group record. |
| Private response | Outing and user IDs; activity choices; hard constraints; travel origin; notice; current reply. Access limited to its owner and authorized matching service. |
| Activity or event | Kind; source; venue; duration; cost; capacity; required needs; hours; booking status; verification time; live or fixture label. |
| Outing and proposal | Organizer; audience; group policy; lifecycle state; intended attendees; proposal version; exact plan fields; response deadline. |
| Acceptance | Outing, proposal version, participant, answer, timestamp, group identity-sharing consent. Unique per participant and version. |
| Conversation and delivery | Private/group space ID; allowed participants; provider event IDs; outbox jobs; idempotency keys; send status; reminder version. |
| Repeat interest | Previous outing; respondent; yes/no; timestamp; new outing ID if created. Never reuse an old attendance acceptance. |

### Atomic changes and restart recovery

Write state changes and outbound jobs in one transaction. Confirmation checks version, grants, consent, and intended attendees. Use one initial group-creation key per outing and one reminder key per version. Time-only changes reuse the group. Membership changes must update the provider roster before sending; if unsupported, create a new confirmed-only thread and stop posting updates to the old one. Restarted workers resume stored jobs and recheck version and consent before dispatch.

Persist context across messages rather than relying on a model transcript. Distinguish “plan confirmed” from “group delivered” in operational status. A delivery failure can leave the plan confirmed with group setup pending; the assistant must describe that state honestly.

## 7 Service contracts and AI boundaries

### Internal command contract

Every state-changing command carries an authenticated actor ID, outing ID, command ID, and expected proposal version where relevant. Private identity is resolved from the verified provider event or web session. Reject unauthorized commands, stale versions, invalid transitions, and duplicate operations without side effects. Return a structured result with the current state and permitted next action.

| Command | Inputs and result |
| --- | --- |
| Create outing | Window, timezone, audience, group policy, activity intent, constraints. Returns draft or collecting outing. |
| Submit private response | User-scoped constraints and choices. Returns only that user’s acknowledgment and next question. |
| Generate proposals | Current valid grants, responses, activity records. Returns eligible candidates and non-sensitive fit reasons. |
| Propose exact plan | Candidate ID, intended attendees, deadline. Creates immutable proposal version and private confirmation jobs. |
| Accept proposal | Exact version and explicit group consent. Records acceptance; atomically confirms only when all intended attendees pass. |
| Request change | Current version and changed fields. Creates a pending version; preserves the current plan until approval. |
| Record lateness | Private participant input; optional delay minutes. Sends only an authorized minimal heads-up. |
| Record repeat interest | User answer for previous outing. Starts a fresh round only for explicit opt-ins. |
| Opt out or revoke | User and scope. Suppresses pending sends, revokes grants, and triggers attendance re-evaluation. |

### What the language model may do

Parse requests into a schema, identify missing fields, interpret activity preferences, and draft concise explanations of server-approved candidates. Treat ambiguous dates and replies as questions. Gemini can fill this role if the team chooses that optional track and actually uses it meaningfully.

### What the server must decide

The model cannot invent event facts, calculate authoritative travel or budget feasibility, inspect unauthorized calendars, select additional recipients, disclose private notes, or confirm a plan. It proposes commands; deterministic code validates and executes them. Event descriptions and incoming messages are untrusted content and cannot override privacy rules or tool permissions.

### Messaging capability gate

Photon’s October 15 announcement describes a unified API organized around Users, Spaces, and Messages, while noting channel differences. Before building the rest, verify a real inbound DM, outbound reply, private participant reply, group creation, group message, and the delivery events available to this team’s account. Record the supported channel and provider identifiers. The announcement is not proof of account access or identical features on every channel. [2]

Do not invent Photon endpoint shapes or webhook signatures from this specification. Implement the adapter against the documentation and credentials actually issued to the team. Keep provider secrets on the server and use the provider’s supported authenticity checks for inbound events.

## 8 Acceptance checks and judging demo

### Functional acceptance

| Check | Pass condition |
| --- | --- |
| A1  Consent | An opted-in user receives replies; an unconsented contact does not. STOP suppresses queued jobs and later reminders. |
| A2  Willingness | An empty calendar or a maybe reply never counts as attendance. Manual availability supports the whole journey. |
| A3  Constraint checking | A test option that violates budget, travel, duration, accessibility, or required attendance is excluded. Unknown required facts are visible. |
| A4  Group policies | Everyone mode cannot confirm a subset. Flexible mode confirms only an exact, accepted subset meeting the activity minimum. |
| A5  Confirmation | Idea yes does not confirm. Old-version yes cannot confirm the new plan. Duplicate acceptances create one transition and one group operation. |
| A6  Privacy | No private decline, budget, note, origin, or raw calendar title appears in another user’s view, group payload, or public explanation. |
| A7  Change handling | Unapproved changes preserve a feasible current plan. An infeasible plan pauses reminders. Approval updates shared views and obsolete jobs. |
| A8  Recovery | Worker restart and duplicate webhook delivery do not produce duplicate groups or reminders. Cancelled outings remain cancelled. |
| A9  Repeat | Only explicit repeat opt-ins enter a new round. Original attendance consent and availability are not silently reused. |
| A10  Truthful demo | Sample event and route inputs are labeled. Actual delivery status and live-versus-simulated steps are disclosed. |

### One complete demo in about three minutes

1. An organizer texts a concrete active-outing request to the assistant. Show the short activity list and the private reply channels for the opted-in circle.

2. A participant privately supplies a constraint. The matcher rejects an incompatible option and proposes one feasible outing using labeled demo inputs. Show the short public explanation without the private reason.

3. Each intended attendee accepts the exact proposal. A real Photon group appears with only those attendees and the shared plan. This is the central live proof.

4. A participant requests a later start. Show the current plan remaining in force, obtain the required approvals, then show the updated version. A lateness message produces only a minimal heads-up.

5. Explicitly advance demo time. Show a reminder and a private next-week prompt. One person passes; the new round includes only yes respondents and needs fresh availability.

### Evidence to retain

Keep a short recording of the live journey, a sanitized state-transition trace, the failing and passing constraint fixture, and regression results. For VEYZL, retain the real audit output, a relevant finding, the resulting code change, and the check that demonstrates the fix. An unrun audit or invented finding is not submission evidence.

## 9 Team delivery and track decisions

### Suggested split for a team of four

| Workstream | Ownership and handoff |
| --- | --- |
| Messaging and consent | Photon spike, verified events, DMs, group creation, STOP and delivery status. Deliver normalized inbound events and a provider adapter. |
| Matching and data | Records, manual availability, activity fixtures, deterministic eligibility and ranking. Deliver tested candidate proposals and private/public projections. |
| Outing lifecycle | Versioned confirmations, group membership, changes, durable outbox, reminders and repeats. Deliver shared command handlers and recovery checks. |
| Experience and evidence | Conversation copy, optional web companion, integrated demo, acceptance run, VEYZL evidence, Devpost and recording. Integrate throughout the build. |

### Build sequence and scope cuts

First, prove Photon DMs and confirmed-only group creation. Next, agree on the records and command contracts, then connect a manual request to one deterministic proposal. Complete confirmation, change approval, reminders, and repeat opt-in before polishing the companion app. Run the privacy and recovery checks against the integrated flow. If time tightens, cut swiping, OAuth, live event ingestion, and the Cloudforce add-on before cutting confirmation or privacy behavior.

### Track plan

Community Kitchen remains the title track. Photon is the core integration; VEYZL remains the proposed evidence track. Based on the supplied concept, Cloudforce would be a separate optional Side Kick and needs direct sponsor confirmation before allocating time. Gemini remains optional if it meaningfully powers interpretation or proposals. SideShift and SpaceXAI are removed from this plan; Perceptron remains excluded. These selections do not establish sponsor eligibility.

The event page permits exactly one title track and up to three sponsored side tracks. It requires a Devpost draft with contributors and declared tracks before 10:30 PM PDT on October 17, followed by the final submission before 10:00 AM PDT on October 18. Confirm track-specific evidence and whether optional categories count toward the cap in the hacker guide. [1]

### Decisions to settle at kickoff

Choose the product name, actual messaging channel and account access, text-only or companion-app demo, exact friend-circle fixtures, and who owns each workstream. Decide whether Gemini is included and whether Cloudforce merits a separate effort. Recommended default: finish the text journey with existing friends, manual availability, labeled activity data, Photon, and a real VEYZL audit first.

### References and source status

Product baseline: DubHacks_2026_Community_App_Concept.docx, October 17, compared with the two team-provided screenshots captured at 2:14 PM. Sponsor-specific descriptions for Photon, VEYZL, and Cloudforce come from those screenshots and require confirmation against the relevant briefs.

[1] DubHacks 2026 event overview and requirements. https://dubhacks-2026.devpost.com/  Accessed October 17 2026.

[2] Photon, Introducing Photon 2.0, October 15 2026. https://photon.codes/blog/introducing-photon-2.0  Accessed October 17 2026.
