\# MYARCH — MASTER IMPLEMENTATION ROADMAP



> This file is the master product specification, implementation roadmap,

> execution contract, testing checklist and project state for MYARCH.

>

> Claude Code MUST read this file before making changes.

>

> MYARCH is an existing production-oriented application.

> Do not rebuild working systems unnecessarily.

>

> ================================================================

> PROJECT STATE

> ================================================================



CURRENT\_PHASE: 0

STATUS: NOT\_STARTED

LAST\_COMPLETED\_PHASE: NONE

BLOCKED: FALSE

BLOCK\_REASON: NONE



\---



\# 0. MASTER EXECUTION RULES



\## 0.1 ROLE



Act as the senior:

\- product architect

\- full-stack engineer

\- database architect

\- security engineer

\- UX engineer

\- QA engineer

\- DevOps engineer



for the existing MYARCH codebase.



The objective is to evolve the existing application into a complete department-wide digital governance and technical operations platform.



MYARCH IS NOT A TnP PORTAL.



The product identity, terminology, navigation and workflows must reflect MYARCH and the Technical Secretary's responsibilities.



\---



\# 0.2 EXISTING CODEBASE FIRST



The existing repository is the source of truth for what already exists.



This roadmap is the source of truth for what MYARCH should become.



Reconcile both.



DO NOT:

\- blindly rebuild existing functionality

\- replace working architecture unnecessarily

\- create duplicate systems

\- assume something is missing without checking

\- assume something works without testing



\---



\# 0.3 FIRST ACTION — AUDIT ONLY



On the FIRST execution of this roadmap:



DO NOT:

\- modify source files

\- create application files

\- modify Prisma schema

\- create migrations

\- install packages

\- change environment variables

\- change deployment configuration

\- modify database data

\- seed production data

\- commit

\- push



Only inspect and understand the repository.



After the audit, create/update the implementation plan inside this roadmap.



Do not implement product features until the audit is complete.



\---



\# 0.4 NEVER GUESS



Inspect the actual repository before making architectural decisions.



Inspect at minimum:



\- package.json

\- lockfile

\- Prisma schema

\- migrations

\- authentication

\- authorization

\- middleware

\- API routes

\- services

\- use cases

\- components

\- layouts

\- dashboards

\- navigation

\- forms

\- storage

\- email

\- notifications

\- tests

\- deployment configuration

\- environment variable usage



Search the repository before creating anything.



\---



\# 0.5 REUSE BEFORE CREATE



Before creating any:



\- model

\- enum

\- API

\- route

\- service

\- use case

\- component

\- hook

\- utility

\- notification system

\- task system

\- file system

\- permission

\- search system

\- audit system



search the existing repository first.



If an existing implementation can safely be extended, extend it.



DO NOT create duplicate:

\- user systems

\- role systems

\- notification systems

\- task systems

\- upload systems

\- audit systems

\- search systems

\- form systems

\- workflow systems



\---



\# 0.6 DO NOT BREAK WORKING FEATURES



Do not unnecessarily:

\- rewrite authentication

\- replace Prisma

\- replace the database

\- replace the frontend framework

\- replace the existing API architecture

\- rename working models

\- delete working routes

\- delete migrations

\- remove working features



If a change is genuinely necessary, document why.



\---



\# 0.7 DATABASE SAFETY



NEVER run destructive commands against production.



NEVER:

\- run `prisma migrate reset`

\- reset production database

\- delete production records

\- run destructive production SQL

\- delete historical migrations

\- drop tables casually



Use safe additive migrations.



Before schema changes:

1\. inspect existing schema

2\. inspect migrations

3\. inspect affected relations

4\. identify data risks

5\. implement migration

6\. verify migration

7\. test affected workflows



\---



\# 0.8 SECRETS



Never hard-code:

\- passwords

\- database credentials

\- API keys

\- JWT secrets

\- email credentials

\- storage credentials

\- encryption keys



Never expose server-side secrets to clients.



Never commit secrets.



\---



\# 0.9 SERVER-SIDE SECURITY



Frontend permission checks are NOT security.



Every protected API/action must independently verify:

\- authentication

\- role

\- permission

\- ownership where applicable

\- entity state

\- academic year

\- confidentiality

\- administrative authority



Never trust:

\- client-submitted role

\- client-submitted user ID

\- client-submitted permission

\- client-submitted status

\- hidden UI controls



\---



\# 0.10 TERMINOLOGY



Use these exact terms:



MYARCH

Technical Secretary

Coordinator

Coordinators

Student

Alumni

Student Council

Core Committee

Committee

Election

Application

Maintenance Issue

Request

Project

Event

Resource

Asset

Facility



NEVER call the role:



"Technical Coordinator"



There are maximum 2 ACTIVE Coordinators.



\---



\# 0.11 IMPLEMENTATION METHOD



Always follow:



AUDIT

→ PLAN

→ IMPLEMENT

→ TEST

→ VERIFY

→ UPDATE ROADMAP

→ NEXT PHASE



Only one phase at a time.



Never work on multiple phases simultaneously unless the dependency genuinely requires it and is documented.



\---



\# 0.12 NO FAKE FEATURES



Every visible button/action must perform a real operation.



Do not create fake:

\- counters

\- charts

\- notifications

\- search

\- status changes

\- CRUD

\- workflows

\- database records



If something is not implemented, show an honest empty/unavailable state.



\---



\# 0.13 PHASE COMPLETION



A phase can only be marked COMPLETE when:



\- implementation works

\- database works

\- APIs work

\- authorization works

\- UI works

\- relevant tests pass

\- build passes

\- typecheck passes

\- lint passes

\- acceptance criteria pass

\- no known critical regression exists



\---



\# 0.14 BLOCKING RULE



If a serious problem occurs, STOP.



Examples:

\- production-data risk

\- destructive migration risk

\- security vulnerability

\- architectural conflict

\- unresolved build failure

\- unresolved test failure

\- missing information required for a safe decision

\- incompatible existing architecture



Set:



BLOCKED: TRUE



and document:

\- problem

\- affected files

\- cause

\- attempted solution

\- recommended solution

\- required decision



Do not silently invent a solution.



Do not continue to the next phase while BLOCKED.



\---



\# 0.15 PHASE REPORT



After every phase report:



PHASE:

STATUS:



IMPLEMENTED:

\- ...



FILES CHANGED:

\- ...



DATABASE:

\- ...



APIS:

\- ...



PERMISSIONS:

\- ...



TESTS:

\- ...



BUILD:

\- ...



SECURITY:

\- ...



KNOWN ISSUES:

\- ...



NEXT PHASE:

\- ...



Then update this roadmap.



\---



\# 1. COMPLETE REPOSITORY AUDIT



STATUS: NOT\_STARTED



\## OBJECTIVE



Understand exactly what already exists before modifying anything.



\## AUDIT



Inspect:



1\. repository architecture

2\. package configuration

3\. Next.js structure

4\. Prisma schema

5\. migrations

6\. authentication

7\. authorization

8\. roles

9\. permissions

10\. middleware

11\. API routes

12\. services/use-cases

13\. dashboards

14\. student profiles

15\. student cards

16\. Edit Mode

17\. notifications

18\. email

19\. storage

20\. maintenance

21\. requests

22\. tasks

23\. calendar

24\. events

25\. meetings

26\. council

27\. committees

28\. forms

29\. applications

30\. interviews

31\. elections

32\. projects

33\. assets

34\. facilities

35\. inventory

36\. resources

37\. alumni

38\. mentorship

39\. search

40\. reports

41\. analytics

42\. activity feed

43\. audit logs

44\. archive

45\. deployment

46\. tests



\## CLASSIFICATION



Classify every major requirement as:



DONE

PARTIAL

MISSING

BROKEN

SECURITY RISK

ARCHITECTURAL CONFLICT



Reference actual:

\- files

\- routes

\- models

\- services

\- components



where possible.



\## OUTPUT



Produce:

\- architecture summary

\- existing functionality map

\- missing functionality

\- broken functionality

\- duplicate systems

\- security risks

\- database changes

\- recommended implementation order



DO NOT implement features during this phase.



\## ACCEPTANCE



\- repository understood

\- existing systems mapped

\- duplicate systems identified

\- risks identified

\- implementation order established



\---



\# 2. PHASE 1 — MYARCH FOUNDATION



STATUS: NOT\_STARTED



\## OBJECTIVE



Establish the core MYARCH hierarchy, authentication, permissions and administration foundation.



\---



\## 2.1 HIERARCHY



Technical Secretary

└── Super Admin

&#x20;   ├── Coordinator 1

&#x20;   └── Coordinator 2



Maximum ACTIVE Coordinators = 2.



The limit must be enforced server-side and at database/business-logic level where appropriate.



\---



\## 2.2 TECHNICAL SECRETARY



Technical Secretary can:



\- manage MYARCH

\- create Coordinators

\- activate/deactivate Coordinators

\- delegate permissions

\- revoke permissions

\- assign work

\- reassign work

\- view Coordinator workload

\- view Coordinator activity

\- manage department workflows

\- manage elections

\- manage committees

\- manage events

\- manage maintenance

\- manage projects

\- manage resources

\- manage assets/facilities where authorized

\- manage reports

\- access audit information



\---



\## 2.3 COORDINATORS



Coordinator permissions must be granular.



Examples:



maintenance.view

maintenance.create

maintenance.assign

maintenance.manage



events.view

events.create

events.manage



applications.view

applications.review

applications.shortlist



interviews.manage



projects.manage



resources.manage



facilities.manage



assets.manage



inventory.manage



announcements.manage



A Coordinator must NOT automatically receive unrestricted Super Admin privileges.



\---



\## 2.4 AUTHENTICATION



Implement/verify:



\- signup

\- email verification

\- resend verification

\- login

\- logout

\- forgot password

\- password reset

\- password change

\- secure session/token handling

\- account activation/deactivation

\- rate limiting



Verification and reset URLs must use production APP\_BASE\_URL.



Never generate production links using localhost.



\---



\## 2.5 NOTIFICATIONS FOUNDATION



Create/reuse notification infrastructure.



Support:

\- in-app notifications

\- read/unread

\- notification history

\- relevant email notification hooks



\---



\## 2.6 AUDIT FOUNDATION



Create/reuse audit infrastructure.



Record important administrative actions.



\---



\## 2.7 ACADEMIC YEAR FOUNDATION



Support:

\- create academic year

\- activate

\- close

\- archive

\- current academic year

\- historical records



\---



\## ACCEPTANCE CRITERIA



\- Technical Secretary is Super Admin

\- maximum 2 active Coordinators

\- Coordinator permissions are granular

\- unauthorized API actions fail

\- signup works

\- email verification works

\- password reset works

\- notification foundation works

\- audit foundation works

\- academic year foundation works

\- existing authentication remains functional

\- build passes

\- typecheck passes

\- lint passes

\- relevant tests pass



\---



\# 3. PHASE 2 — MAINTENANCE \& REQUESTS



STATUS: NOT\_STARTED



\## OBJECTIVE



Create a complete, trackable department maintenance and request system.



\---



\## 3.1 MAINTENANCE CATEGORIES



\- electrical

\- plumbing

\- furniture

\- HVAC

\- network/internet

\- classroom/studio

\- lab

\- equipment

\- cleaning

\- safety

\- civil/building

\- other



\---



\## 3.2 REPORT



A maintenance issue can contain:



\- category

\- location

\- description

\- priority

\- photos

\- attachments

\- requester

\- created date



\---



\## 3.3 LIFECYCLE



SUBMITTED

→ ACKNOWLEDGED

→ ASSIGNED

→ IN\_PROGRESS

→ RESOLVED

→ VERIFIED

→ CLOSED



Support REOPENED.



\---



\## 3.4 COMPLAINANT TRACKING



Complainant must be able to see:



\- complaint ID

\- status

\- assigned person

\- timeline

\- updates

\- expected resolution

\- resolution details



When resolved:



\- notify complainant

\- show resolution

\- allow Confirm Resolved

\- allow Reopen



\---



\## 3.5 ASSIGNMENT



Technical Secretary/authorized Coordinator can:



\- assign

\- reassign

\- change priority

\- set deadline

\- add updates

\- resolve

\- reopen



All changes must be audited.



\---



\## 3.6 SLA / ESCALATION



Support:



\- priority

\- SLA

\- deadline

\- overdue

\- reminders

\- escalation



Reusable escalation engine should support future workflows.



Example:



Issue submitted

→ no action

→ Coordinator reminder

→ overdue

→ Technical Secretary alert

→ escalation



\---



\## 3.7 GENERIC REQUEST SYSTEM



Reusable request workflow:



SUBMITTED

→ REVIEW

→ ASSIGNED

→ IN\_PROGRESS

→ COMPLETED

→ CLOSED



Request contains:



\- requester

\- type

\- description

\- attachments

\- priority

\- owner

\- deadline

\- approval/rejection

\- comments

\- history



\---



\## 3.8 TASK / FOLLOW-UP ENGINE



Reusable tasks:



\- title

\- owner

\- deadline

\- priority

\- status

\- reminder

\- escalation

\- related entity



Statuses:



TODO

→ IN\_PROGRESS

→ BLOCKED

→ DONE

→ CANCELLED



Use this system for:

\- maintenance

\- requests

\- events

\- meetings

\- applications

\- interviews

\- elections

\- projects



Do not create separate task systems.



\---



\## 3.9 MAINTENANCE DASHBOARD



Show:



\- open

\- critical

\- overdue

\- assigned

\- in progress

\- resolved

\- average response time

\- average resolution time

\- category analytics

\- location analytics

\- recurring issues

\- escalation

\- Coordinator workload



\---



\## ACCEPTANCE



\- students can submit issues

\- issues persist correctly

\- assignment works

\- tracking works

\- resolution works

\- reopening works

\- notifications work

\- SLA works

\- escalation works

\- audit works

\- dashboard works

\- authorization works

\- mobile workflow works



\---



\# 4. PHASE 3 — CALENDAR, EVENTS \& MEETINGS



STATUS: NOT\_STARTED



\## 4.1 CENTRAL ACTIVITY CALENDAR



Include:



\- events

\- meetings

\- elections

\- interviews

\- application deadlines

\- workshops

\- competitions

\- reviews

\- submissions

\- maintenance shutdowns

\- council activities

\- technical activities

\- project milestones



Views:

\- month

\- week

\- day

\- agenda



Filters:

\- activity type

\- owner

\- academic year

\- committee

\- status



\---



\## 4.2 EVENT PLANNER



Event:



\- title

\- description

\- date/time

\- venue

\- organizer

\- Coordinators

\- volunteers

\- tasks

\- checklist

\- budget

\- documents

\- registration

\- attendance

\- announcements

\- media

\- post-event report



\---



\## 4.3 EVENT TASKS



Task:

\- owner

\- deadline

\- status

\- priority



Statuses:



TODO

→ IN\_PROGRESS

→ DONE



\---



\## 4.4 MEETING MANAGEMENT



Meeting:



\- title

\- date/time

\- venue/link

\- participants

\- agenda

\- attendance

\- notes

\- decisions

\- action items



Action items must use the shared task/follow-up system.



\---



\## 4.5 ANNOUNCEMENTS



Announcement:



\- title

\- content

\- audience

\- priority

\- publish date

\- expiry

\- attachments

\- author



Audience can include:

\- everyone

\- specific year

\- program

\- committee

\- council

\- Coordinators

\- selected groups



\---



\# 5. PHASE 4 — COUNCIL \& COMMITTEES



STATUS: NOT\_STARTED



\## OBJECTIVE



Create a structured governance system.



Support:



\- Student Council

\- Core Committee

\- Event Committees

\- Technical committees

\- project teams

\- temporary committees



Each organization/group can contain:



\- academic year

\- position

\- members

\- responsibilities

\- start date

\- end date

\- projects

\- meetings

\- documents

\- activity history



Preserve historical membership.



Do not destroy previous-year records.



\---



\# 6. PHASE 5 — FORMS, APPLICATIONS, SCRUTINY \& INTERVIEWS



STATUS: NOT\_STARTED



\## 6.1 FORM BUILDER



Reusable form builder.



Field types:



\- text

\- long text

\- number

\- email

\- dropdown

\- radio

\- multi-select

\- checkbox

\- date

\- rating

\- file upload

\- conditional fields



Lifecycle:



DRAFT

→ PUBLISHED

→ CLOSED

→ ARCHIVED



Support:



\- eligibility

\- deadlines

\- required fields

\- attachments

\- confirmation

\- notifications

\- preview

\- duplicate form



Use for:

\- council

\- core committee

\- committees

\- volunteering

\- events

\- technical initiatives

\- department applications



\---



\## 6.2 APPLICATION PIPELINE



SUBMITTED

→ UNDER\_REVIEW

→ SHORTLISTED

→ INTERVIEW\_SCHEDULED

→ INTERVIEWED

→ SELECTED / REJECTED



Admin capabilities:



\- search

\- filter

\- sort

\- compare

\- score

\- shortlist

\- reject

\- bulk actions

\- assign reviewers

\- notes

\- history



Applicants only see information they are authorized to see.



\---



\## 6.3 SCRUTINY



For elections and competitive applications:



SUBMITTED

→ ELIGIBILITY\_CHECK

→ DOCUMENT\_VERIFICATION

→ SCRUTINY

→ ELIGIBLE / INELIGIBLE

→ OBJECTION\_PERIOD

→ FINAL\_CANDIDATE



Store:

\- reviewer

\- decision

\- reason

\- timestamp

\- evidence

\- correction requests



Confidential reviewer notes must remain private.



\---



\## 6.4 INTERVIEW MANAGEMENT



Interview:



\- candidate

\- position

\- date/time

\- venue

\- online link

\- panel

\- interviewer

\- status



Support:

\- schedule

\- reschedule

\- cancel

\- reminders

\- completion



Notifications:

\- confirmation

\- change

\- cancellation

\- 24-hour reminder

\- 1-hour reminder



Evaluation:



\- technical understanding

\- leadership

\- communication

\- problem solving

\- vision

\- contribution

\- overall score

\- recommendation

\- confidential comments



Candidates cannot see confidential evaluator comments.



\---



\# 7. PHASE 6 — ELECTION MANAGEMENT



STATUS: NOT\_STARTED



\## 7.1 ELECTION LIFECYCLE



DRAFT

→ APPLICATION\_OPEN

→ APPLICATION\_CLOSED

→ SCRUTINY

→ SHORTLIST

→ INTERVIEWS

→ FINAL\_CANDIDATES

→ CAMPAIGN

→ VOTING

→ RESULTS

→ ARCHIVED



\---



\## 7.2 ELECTION CONFIGURATION



Election:



\- name

\- academic year

\- positions

\- eligibility

\- application dates

\- scrutiny dates

\- objection period

\- shortlist date

\- interview dates

\- campaign dates

\- voting dates

\- result date



Position:



\- title

\- responsibilities

\- eligibility

\- required documents

\- selection method

\- questions



\---



\## 7.3 ELECTION APPLICATION



Support:

\- application

\- documents

\- eligibility

\- scrutiny

\- correction

\- objection

\- shortlist

\- final candidate list



\---



\## 7.4 VOTER ELIGIBILITY



Only eligible authenticated users can vote.



Eligibility must be verified server-side.



Voting period must be enforced server-side.



\---



\## 7.5 ONE PERSON — ONE VOTE



Prevent:

\- duplicate votes

\- repeated submissions

\- client-side bypass

\- replay attacks where applicable



Use database constraints/idempotency where appropriate.



\---



\## 7.6 SECRET BALLOT



Individual voter choices must not be exposed to ordinary administrators.



Keep voter eligibility/audit information separate from ballot choice where architecture permits.



Do not create audit records that reveal individual voter choices.



\---



\## 7.7 BALLOT



Support:



\- position

\- candidates

\- candidate selection

\- confirmation

\- optional NOTA only if configured



\---



\## 7.8 VOTING SECURITY



Implement:



\- authenticated voter

\- server-side eligibility

\- election state validation

\- candidate validation

\- rate limiting

\- CSRF protection where applicable

\- duplicate submission protection

\- immutable finalized votes

\- election lock after closing



\---



\## 7.9 ADMINISTRATION



Technical Secretary manages election configuration.



Election administrators cannot silently edit submitted votes.



Important actions are audited.



Audit:

\- election creation

\- configuration changes

\- candidate changes

\- voting opened

\- voting closed

\- result finalization



Do not expose ballot secrecy through audit logs.



\---



\## 7.10 COUNTING



Count votes server-side.



Validate:

\- totals

\- eligible voters

\- submitted ballots

\- duplicate prevention



Handle ties according to configured election rules.



Record result finalization timestamp.



\---



\## 7.11 RESULTS



Support:



\- calculation

\- verification

\- finalization

\- selected candidate

\- position assignment

\- publication

\- candidate notification

\- announcement

\- PDF export

\- historical archive



Finalized results cannot be casually edited.



\---



\# 8. PHASE 7 — TECHNICAL OPERATIONS



STATUS: NOT\_STARTED



\## 8.1 PROJECT MANAGEMENT



Project:



\- title

\- description

\- owner

\- Coordinator

\- members

\- start date

\- end date

\- status

\- tasks

\- milestones

\- files

\- updates

\- activity



Statuses:



PLANNED

→ ACTIVE

→ BLOCKED

→ COMPLETED

→ ARCHIVED



\---



\## 8.2 ASSETS / EQUIPMENT



Track:



\- asset

\- category

\- serial number

\- location

\- condition

\- assigned person

\- purchase date

\- warranty

\- maintenance history

\- replacement status

\- documents



Statuses:



ACTIVE

MAINTENANCE

DAMAGED

RETIRED



\---



\## 8.3 FACILITIES



Manage:



\- rooms

\- studios

\- labs

\- capacity

\- equipment

\- availability

\- bookings

\- maintenance



Prevent conflicting bookings.



Integrate:



FACILITY

↔ BOOKING

↔ MAINTENANCE

↔ ASSET



\---



\## 8.4 INVENTORY



Track:



\- item

\- category

\- quantity

\- minimum stock

\- issue

\- return

\- responsible person

\- history



Support:

\- low-stock alerts

\- transaction history

\- permissions



\---



\## 8.5 RESOURCE REPOSITORY



Categories:



\- forms

\- regulations

\- council documents

\- election documents

\- technical documents

\- manuals

\- event documents

\- reports

\- archives



Support:



\- upload

\- download

\- preview

\- search

\- tags

\- categories

\- permissions

\- versioning

\- archive



\---



\# 9. PHASE 8 — STUDENT EXPERIENCE



STATUS: NOT\_STARTED



\## 9.1 STUDENT PROFILE



Identity:

\- profile photo

\- full name

\- preferred name

\- roll number

\- program

\- department

\- year

\- batch

\- academic status



Academic:

\- semester

\- CGPA/SGPA where appropriate

\- interests

\- specialization

\- coursework

\- achievements



Skills:

\- architecture/design

\- technical

\- software

\- programming

\- BIM/CAD

\- visualization

\- proficiency



Portfolio:

\- projects

\- title

\- description

\- category

\- year

\- role

\- tools/software

\- images

\- documents

\- external links



Achievements:

\- competitions

\- awards

\- certifications

\- workshops

\- publications

\- conferences

\- internships

\- positions



Activities:

\- council

\- committees

\- clubs

\- volunteering

\- events

\- technical activities

\- leadership



Interests:

\- academic

\- technical

\- design

\- career

\- hobbies



Professional links:

\- portfolio

\- LinkedIn

\- GitHub

\- Behance

\- other links



\---



\## 9.2 PROFILE VISIBILITY



Levels:



PUBLIC

DEPARTMENT\_ONLY

PRIVATE

CONFIDENTIAL where required



Server-side enforcement mandatory.



Private documents must remain private unless explicitly shared.



\---



\## 9.3 STUDENT CARDS



Compact cards should show:



\- profile photo

\- name

\- year

\- program

\- key skills

\- short bio

\- selected achievements

\- status

\- profile completion



Actions:

\- View

\- Edit if authorized

\- Share if permitted

\- Save/Shortlist where applicable

\- Export where permitted



\---



\## 9.4 EDIT MODE



Support explicit:



NORMAL MODE

→ view/use



EDIT MODE

→ edit content

→ reorder cards

→ change visibility

→ edit metadata

→ upload/change images

→ archive where authorized



Edit Mode MUST NOT bypass server authorization.



Student cards must support permission-controlled:

\- View

\- Edit

\- Visibility

\- Archive



\---



\## 9.5 PROFILE COMPLETION



Show completion percentage.



Example:



82% COMPLETE



Missing:

\- photo

\- skills

\- project



Do not require sensitive/private information merely to reach 100%.



\---



\## 9.6 IMAGE OPTIMIZATION



Profile image input:

\- maximum approximately 1 MB



Target stored profile image:

\- preferably 50–250 KB



Maximum profile dimensions:

\- approximately 800×800



Card thumbnail:

\- approximately 30–150 KB



Use:

\- resizing

\- compression

\- WebP/AVIF where appropriate

\- thumbnail generation

\- responsive variants

\- metadata stripping where appropriate



Do not store unnecessary duplicate large originals.



Portfolio/project images may have larger limits.



Validate:

\- MIME

\- extension

\- file signature where appropriate

\- dimensions

\- file size



Never trust extension alone.



\---



\## 9.7 STUDENT DASHBOARD



Show:



\- profile completion

\- upcoming events

\- pending requests

\- maintenance complaints

\- applications

\- interviews

\- notifications

\- announcements

\- deadlines

\- opportunities

\- projects

\- achievements

\- elections

\- resources



Quick actions:



\- Raise Maintenance Issue

\- Submit Request

\- Update Profile

\- Add Project

\- View Events

\- Apply

\- View Resources



\---



\## 9.8 OPPORTUNITY HUB



Include:



\- council positions

\- committees

\- events

\- workshops

\- competitions

\- volunteering

\- technical projects

\- mentorship

\- department initiatives



Each:

\- title

\- organizer

\- deadline

\- eligibility

\- seats

\- status

\- application action



\---



\## 9.9 STUDENT ACTIVITY TIMELINE



Support:

\- joined MYARCH

\- project added

\- committee joined

\- application submitted

\- event attended

\- achievement

\- project completed

\- certificate

\- position



Privacy must be respected.



\---



\## 9.10 DOCUMENT WALLET



Private documents:

\- resume

\- certificates

\- portfolio PDFs

\- proof documents

\- application documents



Each:

\- name

\- type

\- size

\- upload date

\- visibility

\- replace

\- download

\- delete



Never expose private files through predictable public URLs.



\---



\## 9.11 PROFILE SHARING



Support controlled sharing:



\- public profile

\- department profile

\- application/recruiter profile



Private documents remain private unless explicitly shared.



\---



\## 9.12 NOTIFICATION PREFERENCES



Allow preferences for:

\- email

\- event reminders

\- application updates

\- maintenance updates

\- announcements

\- opportunities



Critical:

\- security

\- password

\- account

\- verification



notifications cannot be disabled.



\---



\# 10. PHASE 9 — COMMUNICATION



STATUS: NOT\_STARTED



\## NOTIFICATIONS



Support:

\- in-app

\- email

\- read/unread

\- notification history

\- templates



Trigger notifications for:



\- complaint assigned

\- complaint updated

\- complaint resolved

\- request updated

\- application submitted

\- shortlisted

\- interview scheduled

\- interview changed

\- interview reminder

\- election opened

\- election result

\- event reminder

\- project assignment

\- task deadline

\- announcement



\---



\## EMAIL



Support:

\- verification

\- password reset

\- application confirmation

\- application updates

\- shortlist

\- interview

\- interview changes

\- reminders

\- election notifications

\- results

\- maintenance updates

\- requests

\- events

\- tasks



Use reusable templates.



Production URLs MUST use APP\_BASE\_URL.



Never use localhost for production email links.



\---



\## MESSAGING



Support where compatible with existing architecture:



\- direct messages

\- discussion threads

\- project discussions

\- request comments

\- event discussions



Respect permissions and privacy.



\---



\# 11. PHASE 10 — ALUMNI \& MENTORSHIP



STATUS: NOT\_STARTED



\## ALUMNI



Support:

\- profile

\- directory

\- graduation year

\- professional information

\- expertise

\- availability



\## MENTORSHIP



Support:

\- alumni mentor registration

\- student request

\- acceptance

\- session

\- communication

\- history

\- feedback



Integrate with:

\- student dashboard

\- notifications

\- calendar where appropriate



\---



\# 12. PHASE 11 — SEARCH, ANALYTICS \& REPORTS



STATUS: NOT\_STARTED



\## 12.1 GLOBAL SEARCH



Permission-aware search across:



\- students

\- alumni

\- Coordinators

\- events

\- complaints

\- requests

\- applications

\- projects

\- resources

\- assets

\- facilities

\- committees

\- elections

\- documents



Never return unauthorized data.



\---



\## 12.2 ACTIVITY FEED



Separate from audit log.



Human-readable examples:



\- complaint assigned

\- event created

\- application opened

\- interview scheduled

\- election opened

\- task completed

\- project updated



\---



\## 12.3 AUDIT LOG



Audit:



\- account creation

\- activation/deactivation

\- permission changes

\- Coordinator delegation

\- complaint assignment/status

\- request decisions

\- application decisions

\- shortlisting

\- interview evaluation

\- election configuration

\- voting open/close

\- result finalization

\- resource changes

\- project changes

\- administrative actions



Store:

\- actor

\- action

\- entity

\- entity ID

\- timestamp

\- relevant old/new state

\- metadata



Protect audit logs from ordinary modification/deletion.



\---



\## 12.4 REPORTS



Maintenance:

\- response time

\- resolution time

\- overdue

\- category

\- location

\- recurring issues



Governance:

\- applications

\- shortlist

\- interviews

\- results

\- participation



Events:

\- registrations

\- attendance

\- participation



Projects:

\- progress

\- tasks

\- deadlines



Operations:

\- Coordinator workload

\- unresolved items

\- overdue tasks

\- response performance



\---



\# 13. PHASE 12 — ANNUAL ARCHIVE



STATUS: NOT\_STARTED



Archive by academic year:



YEAR

├── Council

├── Elections

├── Committees

├── Events

├── Projects

├── Maintenance

├── Applications

├── Reports

└── Resources



Historical records must remain searchable according to permissions.



Archived records should not be casually modified.



Support:

\- archive

\- view

\- search

\- reports

\- historical comparison where useful



\---



\# 14. PHASE 13 — SECURITY, PRIVACY \& HARDENING



STATUS: NOT\_STARTED



\## AUTHENTICATION



Verify:

\- secure password hashing

\- secure sessions

\- secure cookies/tokens

\- email verification

\- password reset

\- account status



\## AUTHORIZATION



Test:

\- student attempting admin action

\- Coordinator without permission

\- Coordinator with permission

\- Technical Secretary

\- inactive Coordinator

\- inactive account

\- cross-user access

\- cross-year access



\## PRIVACY



Classify data:



PUBLIC

DEPARTMENT\_ONLY

PRIVATE

CONFIDENTIAL

ADMIN



Confidential examples:

\- interview evaluations

\- internal notes

\- election administration

\- administrative decisions



\## FILE SECURITY



Verify:

\- MIME validation

\- size limits

\- secure names

\- access control

\- private storage

\- no predictable private URLs

\- deletion handling



\## API SECURITY



Verify:

\- validation

\- authentication

\- authorization

\- rate limiting

\- safe errors

\- no secret leakage

\- SQL/ORM safety

\- XSS protection

\- CSRF protection where applicable



\---



\# 15. PHASE 14 — PERFORMANCE \& ACCESSIBILITY



STATUS: NOT\_STARTED



\## PERFORMANCE



Use:

\- pagination

\- indexed queries

\- server-side filtering

\- efficient fetching

\- caching where appropriate

\- lazy loading

\- optimized images

\- responsive images

\- minimal client JS



Avoid:

\- N+1 queries

\- loading huge datasets

\- unnecessary polling

\- duplicate files

\- duplicate API logic



\---



\## ACCESSIBILITY



Support:

\- semantic HTML

\- keyboard navigation

\- focus states

\- labels

\- accessible dialogs

\- accessible forms

\- readable contrast

\- responsive layouts



Maintenance reporting must work well on mobile.



\---



\# 16. PHASE 15 — BACKUP \& RECOVERY



STATUS: NOT\_STARTED



Verify backup/recovery strategy for:



\- database

\- file/object storage

\- critical configuration



Document:

\- backup frequency

\- retention

\- recovery procedure

\- migration safety

\- restoration verification



Do not claim backups are solved without verifying the actual architecture.



\---



\# 17. PHASE 16 — FINAL PRODUCTION VERIFICATION



STATUS: NOT\_STARTED



Perform a complete production-readiness audit.



Verify:



\## BUILD

\- production build

\- typecheck

\- lint

\- tests



\## DATABASE

\- connection

\- migrations

\- indexes

\- relations

\- backup



\## AUTHENTICATION

\- signup

\- email verification

\- login

\- logout

\- password reset

\- password change



\## AUTHORIZATION

\- roles

\- Coordinator permissions

\- max 2 Coordinators

\- API authorization

\- private data



\## STORAGE

\- profile images

\- card images

\- documents

\- private files

\- compression

\- limits



\## WORKFLOWS

\- maintenance

\- requests

\- tasks

\- calendar

\- events

\- meetings

\- committees

\- applications

\- interviews

\- elections

\- voting

\- results

\- projects

\- resources

\- mentorship



\## NOTIFICATIONS

\- in-app

\- email

\- reminders



\## SECURITY

\- secrets

\- rate limiting

\- validation

\- authorization

\- privacy

\- file security

\- election security



\## DEPLOYMENT

\- production environment variables

\- APP\_BASE\_URL

\- database

\- storage

\- email

\- HTTPS

\- domain



\---



\# 18. DASHBOARD REQUIREMENTS



\## TECHNICAL SECRETARY DASHBOARD



Show:



\- critical maintenance

\- overdue maintenance

\- pending requests

\- Coordinator workload

\- overdue tasks

\- applications

\- interviews

\- elections

\- upcoming events

\- projects

\- approvals

\- recent activity

\- notifications

\- announcements



Quick actions:



\- Raise Request

\- Create Event

\- Create Application

\- Create Election

\- Create Announcement

\- Assign Coordinator

\- Add Resource

\- Create Project



\---



\## COORDINATOR DASHBOARD



Show ONLY delegated/authorized modules.



Show:

\- assigned work

\- complaints

\- requests

\- projects

\- events

\- tasks

\- deadlines

\- workload

\- notifications



\---



\## STUDENT DASHBOARD



Show:

\- profile completion

\- complaints

\- requests

\- applications

\- interviews

\- events

\- deadlines

\- announcements

\- opportunities

\- projects

\- achievements

\- elections

\- resources

\- notifications



\---



\# 19. DASHBOARD EDIT MODE



Authorized administrators can configure dashboard widgets.



Support:

\- show/hide

\- reorder

\- configure

\- reset layout



Do not allow:

\- arbitrary code

\- unsafe HTML

\- permission bypass



Student dashboard must remain functional.



\---



\# 20. DEMO MODE



If compatible with existing architecture, provide safe demo mode.



Demo mode:

\- clearly marked DEMO

\- demo data only

\- no production data

\- no real emails

\- destructive operations disabled

\- allows exploration of major workflows



\---



\# 21. STORAGE RULES



All file uploads must support:



\- file-size limits

\- MIME validation

\- secure filename handling

\- authorization

\- lifecycle management

\- deletion handling



Track storage usage where practical.



Support:

\- replacement

\- archival

\- orphan cleanup



Do not expose private files through public URLs.



\---



\# 22. API ARCHITECTURE



Preferred:



ROUTE

→ AUTHENTICATION

→ AUTHORIZATION

→ VALIDATION

→ SERVICE / USE CASE

→ DATABASE

→ RESPONSE



Complex business logic should not live entirely in route handlers.



Use reusable services/use cases.



Use consistent API error responses.



\---



\# 23. DATABASE ARCHITECTURE



Before adding models:

\- inspect Prisma schema

\- inspect enums

\- inspect migrations

\- inspect relations

\- search for equivalent concepts



Prefer normalized relational design.



Important entities should have appropriate:

\- IDs

\- createdAt

\- updatedAt

\- owner/actor

\- status

\- academic year

\- history/audit where needed



Add indexes for:

\- status

\- academic year

\- foreign keys

\- ownership

\- frequent search/filter fields



\---



\# 24. ERROR / EMPTY / LOADING STATES



Every major workflow/page must support:



\- loading

\- empty

\- error

\- unauthorized

\- success



Production errors must not expose:

\- stack traces

\- secrets

\- database internals

\- sensitive information



\---



\# 25. RESPONSIVE DESIGN



MYARCH must work on:



\- desktop

\- laptop

\- tablet

\- mobile



Especially optimize:

\- student dashboard

\- maintenance reporting

\- applications

\- event registration

\- interview schedules

\- notifications



\---



\# 26. TESTING REQUIREMENTS



For every phase, run appropriate:



\- unit tests

\- integration tests

\- API tests

\- authorization tests

\- workflow tests

\- UI tests where appropriate



Critical tests include:



\### AUTH

\- signup

\- verification

\- login

\- logout

\- password reset



\### RBAC

\- unauthorized student

\- Coordinator without permission

\- Coordinator with permission

\- Technical Secretary

\- inactive account



\### MAINTENANCE

\- create

\- assign

\- update

\- resolve

\- verify

\- close

\- reopen

\- escalation



\### APPLICATION

\- submit

\- review

\- shortlist

\- interview

\- select/reject



\### ELECTION

\- eligibility

\- duplicate vote prevention

\- voting period

\- ballot security

\- counting

\- results



\### FILES

\- upload

\- validation

\- private access

\- unauthorized access



\---



\# 27. PHASE STATE MANAGEMENT



After successfully completing a phase:



Update:



STATUS: COMPLETE



and update:



LAST\_COMPLETED\_PHASE: \[phase number]



CURRENT\_PHASE: \[next phase]



BLOCKED: FALSE



If currently working:



STATUS: IN\_PROGRESS



If blocked:



STATUS: BLOCKED

BLOCKED: TRUE

BLOCK\_REASON: \[specific reason]



Never mark a phase COMPLETE before verification.



\---



\# 28. AUTOMATED EXECUTION RULE



Claude should process phases sequentially.



Algorithm:



1\. Read entire roadmap.

2\. Read PROJECT STATE.

3\. Find first incomplete phase.

4\. Read that phase completely.

5\. Inspect relevant existing code.

6\. Plan implementation.

7\. Implement only that phase.

8\. Test.

9\. Verify.

10\. Inspect git diff.

11\. Update roadmap state.

12\. If successful, continue to next phase.

13\. If blocked, STOP.

14\. Never skip phases.

15\. Never silently mark incomplete work as complete.



When the current phase is complete and safe to continue, automatically continue to the next phase.



Do not ask for confirmation between normal low-risk phases.



However, STOP and request human approval before:

\- destructive database changes

\- production database operations

\- deleting production data

\- changing production secrets

\- changing authentication architecture

\- changing election security architecture

\- irreversible migrations

\- potentially destructive storage operations



\---



\# 29. DEFINITION OF DONE



MYARCH is considered complete only when:



\- all roadmap phases are COMPLETE

\- all acceptance criteria pass

\- production build passes

\- typecheck passes

\- lint passes

\- tests pass

\- authentication works

\- authorization works

\- student privacy works

\- maintenance workflow works

\- calendar works

\- events work

\- applications work

\- interviews work

\- elections work

\- voting security works

\- results work

\- projects work

\- resources work

\- assets/facilities work

\- student profiles work

\- Edit Mode works

\- image optimization works

\- notifications work

\- email verification works

\- alumni/mentorship works

\- search works

\- analytics/reports work

\- archive works

\- audit works

\- production environment is verified

\- backup/recovery is documented

\- no critical security issue remains



\---



\# 30. FINAL RULE



DO NOT blindly follow the roadmap at the expense of the existing application.



DO NOT blindly follow the existing application at the expense of the roadmap.



Inspect.

Reconcile.

Implement safely.

Test.

Verify.

Document.

Continue.



Never guess.

Never silently break.

Never use destructive shortcuts.



===============================================================

END OF MYARCH MASTER ROADMAP

===============================================================

