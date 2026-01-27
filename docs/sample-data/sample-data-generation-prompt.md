# Sample Data Generation Prompt

**University:** Lakewood University
**Purpose:** Generate realistic demo data for GiveMetry

---

## Prompt for LLM

```
Generate a CSV dataset of 5,000 donor records for "Lakewood University," a fictional mid-sized private university with a $400M endowment, 15,000 alumni, and an advancement office of 12 gift officers.

## OUTPUT FORMAT
Generate a CSV with these exact column headers:

constituent_id, prefix, first_name, middle_name, last_name, suffix, email, phone, address_line1, address_line2, city, state, postal_code, country, constituent_type, class_year, school_college, employer, job_title, estimated_capacity, assigned_officer, portfolio_tier, total_lifetime_giving, largest_gift, first_gift_date, last_gift_date, gift_count, last_contact_date, last_contact_type, contact_count_12mo, event_attendance_count, email_open_rate, is_board_member, is_volunteer, spouse_name, spouse_class_year, notes

## DATA DISTRIBUTION REQUIREMENTS

### Constituent Types (5,000 total)
- Alumni: 70% (3,500) — class years 1965-2023
- Parents: 15% (750) — current and past parents
- Friends: 8% (400) — community members, grateful patients, etc.
- Corporations: 4% (200) — company matching, sponsorships
- Foundations: 3% (150) — private foundations

### Giving Levels
- Major donors ($25K+ lifetime): 3% (150)
- Leadership donors ($10K-$25K): 7% (350)
- Mid-level donors ($1K-$10K): 20% (1,000)
- Annual fund donors ($1-$1K): 40% (2,000)
- Non-donors (prospects): 30% (1,500)

### Gift Officers (12 total)
Assign portfolios realistically:
- Sarah Martinez (Major Gifts Director) — 120 prospects
- Michael Chen (Senior MGO) — 145 prospects
- Jennifer Williams (MGO) — 160 prospects
- David Kim (MGO) — 155 prospects
- Emily Thompson (Leadership Gifts) — 180 prospects
- Robert Johnson (Leadership Gifts) — 175 prospects
- Amanda Garcia (Regional, West Coast) — 140 prospects
- Christopher Lee (Regional, Northeast) — 150 prospects
- Jessica Brown (Corporate/Foundation) — 200 prospects
- Daniel Wilson (Parent Programs) — 180 prospects
- Ashley Davis (Young Alumni) — 220 prospects
- Matthew Taylor (Annual Fund) — 250 prospects
Remaining ~1,925 are unassigned prospects

### Schools/Colleges
- College of Arts & Sciences: 35%
- School of Business: 25%
- School of Engineering: 20%
- School of Education: 10%
- School of Nursing: 5%
- School of Law: 5%

### Capacity Distribution
- $1M+: 2%
- $500K-$1M: 3%
- $100K-$500K: 10%
- $25K-$100K: 20%
- $10K-$25K: 25%
- Under $10K: 40%

### Engagement Patterns
Create realistic patterns:
- Recent donors (gift in last 12 mo): 35%
- Lapsed (12-36 months): 25%
- Long lapsed (36+ months): 15%
- Never given: 25%

Contact recency:
- Contacted in last 90 days: 20%
- 90-180 days: 15%
- 180-365 days: 20%
- Over 1 year: 25%
- Never contacted: 20%

### Realistic Data Patterns
1. Higher capacity donors should have more contacts
2. Board members should be major donors
3. Class reunion years (ending in 0 or 5) should show giving bumps
4. Recent graduates should have lower giving but higher email engagement
5. Include some deceased/do not contact flags (~2%)
6. Include some with missing data (email, phone) for realism (~15%)
7. Spouse data for ~20% of records
8. Corporate records should have company name in first_name field
9. Foundations should have foundation name and "Foundation" in name

### Sample Data Scenarios to Include
- 10 board members (high capacity, high engagement, major donors)
- 25 reunion class captains (class years 1975, 1985, 1995, 2005, 2015)
- 50 scholarship recipients who became donors
- 15 grateful patients (School of Nursing connections)
- 30 corporate matching gift companies
- 20 family foundations
- 100 young alumni under 30 (small gifts, high digital engagement)
- 50 LYBUNT donors (gave last year but not this year)
- 75 SYBUNT donors (gave some year but not this year or last)

### Date Ranges
- Use dates from 2015-2026
- Current date context: January 2026
- Fiscal year: July 1 - June 30

Generate realistic names, addresses (US-based), companies, and job titles. Ensure data looks authentic and varied.
```

---

## Column Definitions

| Column | Type | Description |
|--------|------|-------------|
| constituent_id | String | Unique ID (e.g., "LU-00001") |
| prefix | String | Mr., Mrs., Ms., Dr., etc. |
| first_name | String | First name |
| middle_name | String | Middle name (optional) |
| last_name | String | Last name |
| suffix | String | Jr., III, etc. (optional) |
| email | String | Primary email |
| phone | String | Primary phone |
| address_line1 | String | Street address |
| address_line2 | String | Apt/Suite (optional) |
| city | String | City |
| state | String | State abbreviation |
| postal_code | String | ZIP code |
| country | String | Country (default: USA) |
| constituent_type | String | alumni, parent, friend, corporation, foundation |
| class_year | Integer | Graduation year (alumni only) |
| school_college | String | School/College affiliation |
| employer | String | Current employer |
| job_title | String | Job title |
| estimated_capacity | Decimal | Wealth estimate |
| assigned_officer | String | Gift officer name |
| portfolio_tier | String | major, leadership, annual, unassigned |
| total_lifetime_giving | Decimal | Total giving |
| largest_gift | Decimal | Largest single gift |
| first_gift_date | Date | First gift date |
| last_gift_date | Date | Most recent gift |
| gift_count | Integer | Number of gifts |
| last_contact_date | Date | Last contact |
| last_contact_type | String | meeting, call, email, event |
| contact_count_12mo | Integer | Contacts in last 12 months |
| event_attendance_count | Integer | Events attended |
| email_open_rate | Decimal | Email engagement (0-1) |
| is_board_member | Boolean | Board member flag |
| is_volunteer | Boolean | Volunteer flag |
| spouse_name | String | Spouse name (optional) |
| spouse_class_year | Integer | Spouse class year (optional) |
| notes | String | Free text notes |

---

## Usage Notes

1. This prompt works best with Claude, GPT-4, or similar capable LLMs
2. You may need to generate in batches (e.g., 500-1000 at a time) due to output limits
3. Request CSV format for direct import into GiveMetry
4. After generation, validate the distributions match requirements
5. The data should be ready to upload via GiveMetry's CSV import feature
