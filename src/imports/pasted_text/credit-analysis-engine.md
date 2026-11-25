Create a modern enterprise web application screen called:

FINANCE > CREDIT ANALYSIS ENGINE

Purpose:
Provide a configurable rule-driven credit analysis engine where business users can define, manage, compare, simulate, and test the complete credit calculation process used for farmer credit approvals.

The solution should consist of 4 integrated modules:

1. Analysis Profile Configuration
2. Claim Rules Configuration
3. Profile Comparison
4. Credit Simulation & What-If Analysis

Use a design similar to enterprise ERP systems with:
- Left navigation
- Breadcrumb navigation
- Filters at top
- Data tables
- Expandable rule panels
- Status indicators
- Workflow visualization
- Modern card-based layout
- Action buttons for Add, Edit, Save, Activate and Simulate

====================================================================
SCREEN 1: ANALYSIS PROFILE CONFIGURATION
====================================================================

Header Information:
- Profile Name
- Credit Type
- Crop Year
- Payment Policy
- Retention Rule
- Status (Active/Inactive)
- Last Modified By
- Last Modified Date

Credit Types:
- Buying
- Rebuying
- Complementary Invoice
- Insurance
- Bank Deposit
- Other Credits

Display all credit types in a left-side menu with claim count.

Main Section:
Show an ordered list of Claims executed during credit analysis.

Claim Execution Flow:

1. Forecast
2. Social Security (Funrural)
3. Policy Reserve
4. Debt
5. Retention
6. Free Payment

For each claim display:

- Sequence Number
- Claim Name
- Description
- Calculation Purpose
- Reference Data Source
- Enabled Toggle
- Configure Rules Button
- Reorder Capability (Drag & Drop)

Claim Details:

Forecast
Purpose:
Reduce debt before net revenue calculation.

Example:
Revenue = 100,000
Debt = 40,000
Forecast = 20,000

Adjusted Debt = 20,000
Net Revenue = 80,000
30% Ceiling = 24,000

Without Forecast:
Net Revenue = 60,000
30% Ceiling = 18,000

Business Benefit:
Forecast increases available credit ceiling.

Fields:
- Enable Forecast
- Forecast Source
- Forecast Percentage
- Forecast Adjustment Method

--------------------------------------------------

Social Security (Funrural)

Purpose:
Apply social security deductions.

Fields:
- Rate Table
- Percentage
- Effective Date
- Credit Types Applicable

Applicable To:
- Buying
- Rebuying
- Complementary Invoice

--------------------------------------------------

Policy Reserve

Purpose:
Apply configured payment policies before debt calculation.

Fields:
- Payment Policy
- Restriction Type
- Percentage
- Effective Period

--------------------------------------------------

Debt

Purpose:
Calculate indebtedness.

Components:
- Existing Debt
- Linked Cluster Debt
- Future Debt
- Anticipated Debt
- Third Party Debt
- Credit Bureau Debt

Options:
- Include Cluster Debts
- Include Future Debts
- Include Credit Bureau Exposure

--------------------------------------------------

Retention

Purpose:
Retain a configured percentage before payment release.

Fields:
- Retention Rule
- Retention Percentage
- Trigger Conditions

--------------------------------------------------

Free Payment

Purpose:
Final stage before payment approval.

Actions:
- Hold Payment
- Approve Payment
- Mark Credit Used
- Block Credit

--------------------------------------------------

Exception Flags Section

Title:
Skip Policy and Jump Directly to Debt

Flags:

- Deviator
- Risk Level
- Commercial Disagreement
- Recheio Filler

Behavior:
When enabled, bypass Policy Reserve and continue directly to Debt Analysis.

Display explanatory note indicating:

"These conditions are evaluated before any claim execution and determine whether the normal credit flow should be altered."

====================================================================
SCREEN 2: CLAIM RULE CONFIGURATION
====================================================================

Purpose:
Allow business users to configure the rules inside each claim.

Left Panel:
List all claims.

Example:
- Forecast
- Funrural
- Policy Reserve
- Debt
- Retention
- Free Payment

Main Rules Grid

Columns:

- Rule Reference
- Rule Name
- Condition
- Parameter Tested
- Action
- Effect
- Priority
- Status
- Edit

Example Rules

FUNRURAL

Rule 44
Condition:
Credit raised from invoice

Action:
Apply Funrural rate from rate table

Effect:
Deduct social security amount

--------------------------------------------------

Rule 45

Condition:
Funrural posting exists

Action:
Skip processing

Effect:
Prevent double posting

--------------------------------------------------

Rule 46

Condition:
No Funrural posting exists

Action:
Create receivable

Effect:
Generate Funrural receivable

--------------------------------------------------

DEBT

Rule 22

Condition:
Farmer belongs to cluster

Action:
Include linked cluster debts

--------------------------------------------------

Rule 24

Condition:
Future debt exists

Action:
Add future debt exposure

--------------------------------------------------

Rule 28

Condition:
Credit bureau negative

Action:
Include anticipation and third-party debt

--------------------------------------------------

FREE PAYMENT

Rule 39

Condition:
Credit Hold Flag = Yes

Action:
Hold Payment

--------------------------------------------------

Rule 63

Condition:
Credit Balance = Zero

Action:
Mark Credit Used

--------------------------------------------------

Rule 64

Condition:
Farmer Deceased

Action:
Block Payment

--------------------------------------------------

Features:

- Add Rule
- Clone Rule
- Disable Rule
- Rule Reordering
- Rule Priority Management
- Effective Date Management

====================================================================
SCREEN 3: PROFILE COMPARISON
====================================================================

Purpose:
Compare claim execution strategy across all credit types.

Display matrix.

Rows:
- Buying
- Rebuying
- Complementary Invoice
- Insurance
- Bank Deposit
- Other Credits

Columns:

- Forecast
- Funrural
- Policy Reserve
- Debt
- Retention
- Free Payment

Each cell should show:

- Runs
- Disabled
- Not Applicable

Color Coding:

Green:
Runs

Red:
Disabled

Gray:
Not Applicable

Features:

- Compare Profiles
- Highlight Differences
- Export Comparison
- Version Comparison

Summary Panel:

Display:

Total Profiles
Total Active Rules
Claims Enabled
Claims Disabled

====================================================================
SCREEN 4: CREDIT SIMULATION & WHAT-IF ANALYSIS
====================================================================

Purpose:
Allow business users to test a credit calculation before applying it in production.

This screen was specifically requested during business discussions to understand the impact of Forecast, Debt, Policies and Retention on the final credit amount.

Header Filters:

- Credit Type
- Farmer
- Crop Year
- Profile
- Payment Policy

Buttons:

- Run Simulation
- Save Scenario
- Compare Scenarios
- Export PDF

--------------------------------------------------

Input Data Section

Farmer Details

Fields:

- Farmer
- Contract
- Cluster
- Risk Level
- Credit Bureau Status

Financial Data

Fields:

- Gross Revenue
- Existing Debt
- Forecast Amount
- Future Debt
- Cluster Debt
- Third Party Debt
- Requested Credit
- Retention %
- Funrural %

--------------------------------------------------

Simulation Workflow

Visual Step Flow

Forecast
↓
Funrural
↓
Policy Reserve
↓
Debt
↓
Retention
↓
Free Payment
↓
Final Credit Decision

Display which rules executed at every step.

--------------------------------------------------

Calculation Trace Table

Columns:

- Step
- Claim
- Input Value
- Formula Applied
- Result
- Rule Triggered

Example:

Step 1
Forecast

Debt = 40,000
Forecast = 20,000

Adjusted Debt = 20,000

--------------------------------------------------

Step 2

Revenue = 100,000

Net Revenue = 80,000

--------------------------------------------------

Step 3

30% of 80,000

Credit Ceiling = 24,000

--------------------------------------------------

Step 4

Funrural Deduction Applied

--------------------------------------------------

Step 5

Debt Adjustments Applied

--------------------------------------------------

Step 6

Retention Applied

--------------------------------------------------

Step 7

Final Payment Determined

--------------------------------------------------

Before vs After Comparison

Card 1:
Original

Debt = 40,000
Net Revenue = 60,000
Ceiling = 18,000

Card 2:
Forecast Enabled

Debt = 20,000
Net Revenue = 80,000
Ceiling = 24,000

Card 3:
Impact

Increase = 6,000

--------------------------------------------------

Rule Execution Log

Display every rule evaluated.

Columns:

- Rule ID
- Claim
- Condition
- Result
- Execution Time

Status:

Green:
Applied

Yellow:
Skipped

Red:
Blocked

--------------------------------------------------

Exception Route Simulation

Show alternate path when flags are enabled.

Normal Flow

Forecast → Funrural → Policy → Debt → Retention → Payment

Flag Flow

Forecast → Funrural → Debt → Retention → Payment

Display visual indication of skipped steps.

--------------------------------------------------

Scenario Comparison

Allow multiple simulations side by side.

Example:

Scenario A
Forecast Disabled

Scenario B
Forecast Enabled

Scenario C
Forecast Enabled + Debt Recovery

Compare:

- Debt
- Net Revenue
- Ceiling
- Approved Credit
- Retention
- Final Payment

--------------------------------------------------

Final Decision Panel

Display KPI Cards:

- Requested Credit
- Eligible Credit
- Approved Credit
- Retention Amount
- Payment Amount
- Debt Exposure
- Final Decision

Decision States:

✅ Approved

⚠ Approved with Restrictions

❌ Rejected

--------------------------------------------------

Overall Business Flow

Start
↓
Forecast Adjustment
↓
Social Security (Funrural)
↓
Policy Reserve
↓
Debt Assessment
↓
Retention
↓
Free Payment
↓
Final Approved Credit

Exception Flow

Start
↓
Check Flags
↓
If Deviator / Risk Level / Commercial Disagreement
↓
Skip Policy Reserve
↓
Proceed to Debt Assessment
↓
Continue Flow

The system must provide a fully configurable, no-code credit analysis engine where business users can manage credit calculation profiles, define claim rules, compare credit strategies, and run simulations to understand the impact of every rule on the final approved credit amount.