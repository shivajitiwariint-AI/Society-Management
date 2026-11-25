# Maintenance Expense Management Module

## Society Management Application -- Functional and Technical Requirements

**Document type:** Module specification\
**Module location:** Finance & Accounts → Maintenance Expense
Management\
**Currency:** INR (₹)\
**Historical sample period:** April 2022 through November 2026 (56
monthly periods)\
**Approval model:** Maker--Checker\
**Database:** Existing MySQL database\
**Application:** Existing Next.js Society Management application

------------------------------------------------------------------------

## 1. Purpose

Enhance the existing Society Management application with a complete
Maintenance Expense Management module. This is an enhancement to the
current application, not a separate application or database.

The module must help each company and its societies record, review,
approve, pay, report and reconcile maintenance expenses. It must support
historical expense imports, supporting documents, monthly and
financial-year summaries, and a clear audit trail.

The Oasis Venetia Heights dashboard is an example of how the information
should be presented. Oasis Venetia Heights must not be hardcoded as the
only supported society. The same module must work for every society
managed by every company (tenant).

## 2. Existing project constraints

The implementation must respect the existing project architecture and
these established constraints:

-   Next.js web application; do not create native Android or iOS
    applications as part of this scope.
-   Use the existing MySQL database.
-   Do not introduce Docker or Docker Compose.
-   Reuse the existing authentication, company/tenant management,
    society management, RBAC and navigation wherever possible.
-   Keep the module inside the existing application.
-   Enforce company and society data isolation on the server and in
    database relationships.
-   Inspect the existing codebase and schema before changing files or
    creating duplicate tables.
-   Do not claim that implementation, tests or deployment are complete
    until they have actually been performed and verified.

If the existing project uses a different but compatible implementation
detail, preserve it where practical instead of replacing working
infrastructure unnecessarily.

## 3. Navigation and module structure

Add the following navigation under **Finance & Accounts**:

1.  Maintenance Expense Dashboard
2.  Expense Entries
3.  Month-wise Summary
4.  Financial Year Summary
5.  Expense Categories
6.  Vendors / Payees
7.  Bills, Vouchers and Documents
8.  Payments
9.  Bank Reconciliation
10. Excel Import / Export

The module should be enabled or disabled through the application's
existing module-entitlement mechanism, if available.

## 4. Dashboard requirements

Provide a dashboard for the currently selected company and society. The
dashboard must use actual database records and must not rely on
hardcoded totals.

### 4.1 Filters

-   Company and society context, derived from the authenticated user's
    authorized memberships.
-   Date range.
-   Month.
-   Financial year (April--March).
-   Expense category.
-   Vendor / payee.
-   Record status (draft, submitted, approved, rejected, paid,
    reconciled, etc.).
-   Record type / sample status (sample or actual).

### 4.2 Summary cards

Display, as applicable:

-   Total approved / recognized expenses for the selected period.
-   Average monthly expenses.
-   Number of months covered.
-   Number of expense categories.
-   Pending approval amount.
-   Rejected expense count or amount.
-   Paid amount.
-   Unpaid / outstanding amount.
-   Partially paid amount.
-   Unreconciled payment amount.

The dashboard must define each figure clearly. For example, the
recognized expense total must not be calculated by adding payment
transactions to expense entries.

### 4.3 Charts and tables

-   Month-wise expense trend.
-   Category-wise expense distribution.
-   Financial-year comparison.
-   Vendor-wise expense summary.
-   Monthly category breakdown.
-   Pending approval and payment status summaries.

Allow users to open a chart or summary row to view the underlying
expense records, subject to permissions.

## 5. Expense categories

Create these 12 default categories for a society. Authorized
administrators may be allowed to rename, deactivate or add categories,
while historical records must retain their original category reference
and reporting meaning.

    \# Category                           Illustrative monthly base
  ---- -------------------------------- ---------------------------
     1 Common Area Electricity                              ₹18,000
     2 Plumbing & Sanitary Repairs                           ₹4,500
     3 Lift Maintenance / AMC                               ₹12,000
     4 Garbage Collection                                    ₹8,500
     5 Housekeeping                                         ₹25,000
     6 Security Services                                    ₹35,000
     7 Water / STP / Pump Maintenance                        ₹9,000
     8 DG / Generator Maintenance                            ₹6,500
     9 Fire Safety & Equipment                               ₹2,500
    10 Common Area Repairs                                   ₹5,000
    11 Pest Control                                          ₹1,800
    12 Miscellaneous Society Expenses                        ₹3,000

These amounts are illustrative examples only. They must not be treated
as actual society expenses, verified invoices, payments or audited
figures.

## 6. Monthly expense entry

Provide a form to create and manage individual expense records.

### 6.1 Suggested fields

-   Company ID and society ID (server-derived; never trusted from an
    unrestricted client input).
-   Expense title / description.
-   Expense category.
-   Expense date.
-   Accounting period / month.
-   Financial year.
-   Vendor / payee.
-   Invoice number.
-   Invoice date.
-   Invoice amount.
-   Tax amount, where applicable.
-   Total recognized expense amount.
-   Voucher number / reference.
-   Expense treatment: accrued or paid, according to the society's
    accounting policy.
-   Due date, if applicable.
-   Remarks.
-   Supporting document attachments.
-   Created by and timestamps.

Use decimal-safe database types for currency. Do not use floating-point
types for financial amounts.

### 6.2 Editing rules

-   Draft records may be edited by authorized makers.
-   Submitted records should not be freely edited while awaiting
    approval.
-   Rejected records may be corrected and resubmitted, retaining their
    history.
-   Approved records must not be silently overwritten. Corrections
    should use a controlled amendment, reversal or adjustment process
    with permissions and audit history.
-   Cancelled records must retain their audit trail and cancellation
    reason.

## 7. Maker--Checker approval workflow

The module must use a Maker--Checker process.

### 7.1 Workflow

1.  **Draft:** Accountant / Maker creates an expense and attaches
    supporting documents.
2.  **Submit:** Maker submits the expense for review.
3.  **Pending approval:** The record becomes read-only for ordinary
    editing while awaiting a decision.
4.  **Review:** Society Manager / Checker reviews the amount, category,
    vendor, invoice, voucher and supporting documents.
5.  **Approve or reject:** Checker approves or rejects the record.
    Rejection requires a reason.
6.  **Payment processing:** An authorized payment operator records full
    or partial payments separately.
7.  **Reconciliation:** Authorized finance staff match payments to bank
    statement or cash-book entries.
8.  **Complete:** The expense and related payment records show their
    respective accounting and reconciliation statuses.

### 7.2 Approval controls

-   The person who created/submitted an expense cannot approve that same
    expense.
-   Enforce separation of duties in server-side authorization and
    service logic, not only by hiding a button in the UI.
-   A user with both Maker and Checker permissions must still be
    prevented from approving their own record.
-   Record approver identity, decision, timestamp, comments and
    rejection reason.
-   Prevent unauthorized changes after approval.
-   Provide an authorized correction / reversal process.
-   Apply company and society scope checks to every approval action.

### 7.3 Suggested roles

  -----------------------------------------------------------------------
  Role                                Permissions
  ----------------------------------- -----------------------------------
  Accountant / Maker                  Create drafts, edit own permitted
                                      drafts, attach documents and submit

  Society Manager / Checker           Review, approve or reject expenses;
                                      cannot approve own submissions

  Payment Operator                    Record authorized payments and
                                      payment references

  Auditor                             Read-only access to permitted
                                      records, documents and audit
                                      history

  Company Admin                       Configure company users and
                                      permissions, subject to
                                      separation-of-duties rules

  Super Admin                         Platform-level administration; not
                                      a substitute for society-level
                                      financial approval
  -----------------------------------------------------------------------

Actual role names and permission identifiers should be mapped to the
existing RBAC system rather than creating a parallel authorization
system.

## 8. Status model

Keep expense approval status separate from payment status and
reconciliation status.

### 8.1 Approval status

-   Draft
-   Submitted
-   Approved
-   Rejected
-   Cancelled

### 8.2 Payment status

-   Unpaid
-   Partially Paid
-   Paid

### 8.3 Reconciliation status

-   Not Reconciled
-   Partially Reconciled
-   Reconciled
-   Exception / Needs Review

Do not combine these into one status field. An approved expense can be
unpaid, partially paid or paid; a paid transaction may still be
unreconciled.

## 9. Accounting and payment controls

Expense recognition and payment recording must be separate concepts.

### 9.1 Example: invoice received in April and paid in May

Assume an approved lift AMC expense of ₹12,000 is recognized in April
and paid in May.

  Period     Expense recognized   Payment made
  -------- -------------------- --------------
  April                 ₹12,000             ₹0
  May                        ₹0        ₹12,000

The May payment must not create a second ₹12,000 expense. The payment
must be linked to the original expense.

### 9.2 Required behaviour

-   Support accrued expenses and paid expenses according to the
    society's accounting policy.
-   Record one expense and one or more linked payment transactions.
-   Support partial payments.
-   Prevent total allocated payments from exceeding the outstanding
    amount unless an authorized adjustment or advance-payment workflow
    explicitly supports it.
-   Store payment date, amount, payment mode, bank/cash account,
    transaction reference and recorded-by details.
-   Support payment reversal or correction with authorization and audit
    history.
-   Do not infer expense recognition solely from the date of payment.
-   Avoid double counting invoices, payments, refunds, reversals and
    adjustments in all reports.
-   Where formal accounting ledgers already exist in the application,
    integrate with them instead of maintaining conflicting duplicate
    balances.

## 10. Supporting documents

Allow authorized users to attach and retrieve relevant documents,
including:

-   Electricity bills.
-   Vendor invoices.
-   Lift AMC agreements and bills.
-   Garbage collection bills.
-   Work orders.
-   Payment approvals.
-   Bank statements.
-   Payment receipts.
-   Other supporting vouchers.

### Security requirements

-   Store files in private storage outside the public web root, or use
    the existing secure document-storage service.
-   Store file metadata and access relationships in MySQL.
-   Enforce authorization and company/society ownership checks on every
    upload and download.
-   Validate file extension, MIME type, file size and file content where
    supported.
-   Generate safe server-side filenames; do not trust uploaded filenames
    as storage paths.
-   Prevent executable files and unsafe content from being served
    directly.
-   Keep an audit record of uploads, replacements and downloads where
    required.
-   Do not expose private document URLs publicly.

## 11. Month-wise and financial-year summaries

### 11.1 Month-wise summary

For each month, automatically calculate:

-   Total recognized expenses.
-   Category-wise expense totals.
-   Vendor-wise expense totals.
-   Paid amount.
-   Outstanding amount.
-   Pending approval amount.
-   Rejected amount, where useful.
-   Reconciliation status.

Provide drill-down to the underlying records.

### 11.2 Financial-year summary

Use the Indian financial year, April through March.

Examples:

-   FY 2022--23: April 2022 to March 2023.
-   FY 2023--24: April 2023 to March 2024.
-   FY 2024--25: April 2024 to March 2025.
-   FY 2025--26: April 2025 to March 2026.
-   FY 2026--27: April 2026 to March 2027.

For the sample period ending November 2026, FY 2026--27 contains data
only through November 2026. Do not display future months as if actual
records exist.

## 12. Historical sample data and import

The requested historical sample covers 56 monthly periods from April
2022 through November 2026.

### 12.1 Sample data warning

All supplied sample figures are illustrative estimates only. They are
not actual society records, verified bills, payments or audited figures.
No real resident or vendor payment should be asserted from sample data.

The sample dashboard figures supplied are:

-   Total expenses: ₹80,06,000.
-   Average monthly expenses: ₹1,42,964.29.
-   Months covered: 56.
-   Expense categories: 12.

Treat these totals as supplied sample metadata until independently
checked against the imported monthly detail. Do not assume the totals
reconcile merely because they appear in the source workbook.

### 12.2 Data classification

Every imported record must have a clear classification, such as:

-   SAMPLE --- illustrative data, excluded from actual accounting.
-   ACTUAL --- entered or imported from source documents and subject to
    normal validation and approval.

Do not automatically convert SAMPLE records into ACTUAL records. Require
an explicit, authorized replacement or verification process that retains
the source and audit history.

### 12.3 Import requirements

-   Provide an Excel template with required columns and sample rows.
-   Validate dates, amounts, categories, vendor references and duplicate
    invoice/voucher references.
-   Show a preview and validation errors before committing an import.
-   Support row-level error reporting.
-   Use an import batch identifier and record who imported the data and
    when.
-   Prevent accidental duplicate imports using appropriate duplicate
    checks and idempotency controls.
-   Keep an import summary and downloadable error report.
-   Export filtered results and summaries to Excel.

## 13. Reconciliation

Provide a reconciliation workspace to compare payment records with:

-   Bank statements.
-   Cash book.
-   Vendor ledgers.
-   Society accounting records.

### 13.1 Reconciliation features

-   Import bank statement data using supported formats.
-   Match transactions using amount, date, reference and account.
-   Allow authorized manual matching when automatic matching is
    inconclusive.
-   Support partial matches and multiple payments where applicable.
-   Flag unmatched, duplicate, reversed and amount-mismatch
    transactions.
-   Record who matched or adjusted a transaction and when.
-   Require a reason for manual overrides and corrections.
-   Provide unreconciled and exception reports.

A record must not be marked reconciled simply because a payment was
entered into the application.

## 14. Suggested database design

Inspect the existing schema before creating tables. Reuse existing
company, society, user, vendor, finance, document and audit tables
wherever suitable.

Potential entities include:

  -----------------------------------------------------------------------
  Entity / table                      Purpose
  ----------------------------------- -----------------------------------
  `expense_categories`                Society expense category master

  `expenses`                          Expense details, accounting period
                                      and approval status

  `vendors`                           Vendor / payee master, if not
                                      already present

  `expense_approvals`                 Submission and Maker--Checker
                                      decisions

  `expense_payments`                  Full and partial payments linked to
                                      expenses

  `expense_attachments`               Private document metadata and
                                      ownership

  `expense_audit_logs`                Immutable or append-only history of
                                      sensitive actions

  `bank_transactions`                 Imported bank statement
                                      transactions, if not already
                                      present

  `reconciliation_records`            Matching and reconciliation
                                      decisions

  `expense_import_batches`            Historical import tracking and
                                      validation results
  -----------------------------------------------------------------------

### 14.1 Data integrity

-   Include company and society scope on applicable records.
-   Enforce valid relationships using foreign keys and appropriate
    composite constraints.
-   Ensure a vendor, category, expense, payment or attachment cannot be
    linked across unauthorized companies or societies.
-   Use database transactions for submission, approval, payment and
    import operations where multiple records must change together.
-   Use decimal types with suitable precision for INR amounts.
-   Add indexes for company, society, accounting period, category,
    vendor and status filters.
-   Preserve financial history; do not cascade-delete approved expenses
    or payments.
-   Use soft deletion or controlled archival for master data where
    appropriate.

The exact table names and columns must be aligned with the existing
project's naming conventions and ORM schema.

## 15. API and service requirements

Follow the existing project's API conventions. The following are logical
operations, not a mandate to create duplicate endpoints if equivalent
services already exist.

-   List and filter expenses.
-   Create and update permitted drafts.
-   Submit an expense for approval.
-   Approve or reject an expense.
-   Record a payment or partial payment.
-   Reverse or correct a payment with authorization.
-   Upload and download supporting documents securely.
-   Get month-wise and financial-year summaries.
-   Manage expense categories and vendors.
-   Import and export Excel data.
-   Import bank statements and reconcile transactions.
-   Retrieve audit history.

All server operations must validate authentication, company membership,
society membership, module entitlement, permission, input schema and
record ownership. Never trust a company ID, society ID, role or approval
identity supplied by the browser without server-side verification.

## 16. Audit trail

Record important actions, including:

-   Expense creation and edits.
-   Submission.
-   Approval and rejection.
-   Resubmission.
-   Payment creation, edits and reversals.
-   Document upload and replacement.
-   Import and export events where appropriate.
-   Reconciliation and manual overrides.
-   Cancellation and authorized corrections.

Audit entries should include actor, action, entity, entity ID,
timestamp, company/society scope, reason or comment where applicable,
and relevant before/after values without logging passwords, secrets or
unnecessary sensitive document contents.

Ordinary users must not be able to edit or delete audit history.

## 17. Reports and exports

Provide:

1.  Maintenance Expense Dashboard.
2.  Monthly Expense Detail.
3.  Month-wise Category Summary.
4.  Financial Year Summary.
5.  Vendor-wise Expense Report.
6.  Approved / Rejected / Pending Approval Report.
7.  Paid / Unpaid / Partially Paid Report.
8.  Unreconciled Payment Report.
9.  Expense Register with voucher and invoice references.
10. Import Validation and History Report.

Reports must respect selected company, society, date range, financial
year and user permissions. Clearly distinguish sample data from actual
data.

## 18. Non-functional requirements

-   Tenant and society isolation must be enforced server-side.
-   Use role-based access control and module entitlements already
    present in the application.
-   Validate all input on the server.
-   Use safe database queries and transactions.
-   Protect against IDOR, privilege escalation, CSRF where applicable,
    injection, unsafe file uploads and unauthorized document access.
-   Apply pagination and filtering for large expense histories.
-   Use indexes and efficient aggregation queries for reports.
-   Ensure financial calculations use decimal-safe arithmetic.
-   Keep date, timezone and financial-year handling consistent.
-   Provide useful validation messages and audit-friendly error
    handling.
-   Back up the database and private document storage together, and test
    restoration procedures.

## 19. Testing and acceptance criteria

The module is acceptable only when the following have been tested:

### Functional tests

-   Create, edit and submit an expense.
-   Checker can approve and reject with a reason.
-   Maker cannot approve their own expense, including when they have
    multiple roles.
-   Rejected expense can be corrected and resubmitted with history
    retained.
-   Full and partial payments work correctly.
-   Payment does not create a duplicate expense.
-   Month-wise and financial-year summaries match the underlying
    approved accounting records.
-   Sample records are clearly marked and excluded from actual
    accounting totals by default.
-   Excel import preview, validation, duplicate detection and export
    work.
-   Attachments are accessible only to authorized users.
-   Reconciliation correctly handles matches, partial matches and
    exceptions.

### Security tests

-   Company A cannot access Company B expenses, vendors, payments,
    documents or reports.
-   A user cannot access an unauthorized society by changing an ID in a
    URL or request.
-   Unauthorized roles cannot submit, approve, pay, cancel or reconcile
    records.
-   A Maker cannot approve their own expense through direct API calls.
-   Private attachments cannot be accessed through guessed or shared
    public URLs.
-   Approved financial records and audit history cannot be silently
    altered.

### Data validation tests

-   Recalculate dashboard totals from underlying records.
-   Check the 56-month historical period from April 2022 through
    November 2026.
-   Check financial-year boundaries (April--March).
-   Check that the supplied sample total and monthly average are
    consistent with imported monthly detail before presenting them as
    calculated results.
-   Verify that payment totals, outstanding amounts and reconciliation
    totals do not double count.

## 20. Implementation plan

Implement incrementally in the existing repository:

1.  Inspect the current application, navigation, RBAC, finance features
    and MySQL schema.
2.  Map existing entities and identify what can be reused.
3.  Prepare a database migration plan; do not drop or overwrite existing
    data.
4.  Add or extend expense categories and expense records.
5.  Implement Maker--Checker authorization and audit history.
6.  Implement payment and partial-payment tracking.
7.  Implement private document handling.
8.  Build monthly and financial-year reporting.
9.  Add sample/actual data classification and Excel import/export.
10. Implement reconciliation.
11. Add tests for accounting logic, tenant isolation and approval
    controls.
12. Run existing tests and build checks; resolve regressions.
13. Document deployment, backup and restoration steps.

Do not rebuild the entire Society Management application for this
module. Preserve existing working features and make focused, reviewed
changes.

------------------------------------------------------------------------

## 21. Important implementation notes

-   This document defines the required behaviour; it does not mean the
    module has already been implemented.
-   The Oasis Venetia Heights amounts are sample estimates only.
-   Actual accounting treatment must follow the society's adopted
    accounting policy.
-   The Maker--Checker workflow is confirmed: the expense creator cannot
    approve their own submission.
-   Payment recording and reconciliation are separate from expense
    approval.
-   The module must support multiple companies and multiple societies
    without mixing their data.
-   Inspect the latest project files before deciding exact filenames,
    migrations, endpoint paths or table definitions.
