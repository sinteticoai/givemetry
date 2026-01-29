#!/usr/bin/env python3
"""
Generate realistic sample data for Lakewood University advancement office.

This creates a donor database that represents real-world patterns:
- 80/20 giving distribution (20% of donors = 80% of dollars)
- Mix of constituent types: alumni, parents, friends, foundations, corporations
- Various donor behaviors: consistent, lapsed, upgrading, new
- Realistic contact patterns by portfolio tier
"""

import csv
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import os

# Seed for reproducibility
random.seed(42)

# Configuration
NUM_CONSTITUENTS = 800  # More manageable size for demo
OUTPUT_DIR = "/opt/apps/givemetry/docs/data"

# Names data
FIRST_NAMES_MALE = [
    "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph",
    "Thomas", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Mark",
    "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth", "Kevin", "Brian",
    "George", "Timothy", "Ronald", "Edward", "Jason", "Jeffrey", "Ryan", "Jacob",
    "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott",
    "Brandon", "Benjamin", "Samuel", "Raymond", "Gregory", "Frank", "Alexander",
    "Patrick", "Jack", "Dennis", "Jerry", "Tyler", "Aaron", "Jose", "Adam", "Nathan"
]

FIRST_NAMES_FEMALE = [
    "Mary", "Patricia", "Jennifer", "Linda", "Barbara", "Elizabeth", "Susan",
    "Jessica", "Sarah", "Karen", "Lisa", "Nancy", "Betty", "Margaret", "Sandra",
    "Ashley", "Kimberly", "Emily", "Donna", "Michelle", "Dorothy", "Carol",
    "Amanda", "Melissa", "Deborah", "Stephanie", "Rebecca", "Sharon", "Laura",
    "Cynthia", "Kathleen", "Amy", "Angela", "Shirley", "Anna", "Brenda", "Pamela",
    "Emma", "Nicole", "Helen", "Samantha", "Katherine", "Christine", "Debra",
    "Rachel", "Carolyn", "Janet", "Catherine", "Maria", "Heather", "Diane"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts", "Chen", "Kim", "Park", "Patel", "Cohen", "Goldstein",
    "Schwartz", "Murphy", "O'Brien", "Sullivan", "Kelly", "Walsh", "McCarthy"
]

MIDDLE_NAMES = ["A.", "B.", "C.", "D.", "E.", "F.", "G.", "H.", "J.", "K.", "L.",
                "M.", "N.", "P.", "R.", "S.", "T.", "W.", "Lynn", "Marie", "Ann",
                "Rose", "Jane", "Beth", "Lee", "Ray", "James", "Joseph", "Robert", ""]

PREFIXES = ["Mr.", "Mrs.", "Ms.", "Dr.", "Rev.", ""]
SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", ""]

# Foundation and corporation names
FOUNDATION_NAMES = [
    "The Baker Family Foundation", "Ward Foundation", "Campbell Foundation",
    "Morrison Family Trust", "Lakewood Community Foundation", "Henderson Foundation",
    "The Patricia & Robert Chen Fund", "Goldman Family Foundation", "Parker Foundation",
    "The Williams Family Charitable Trust", "Greenfield Foundation", "Taylor Family Fund",
    "The Sullivan Foundation", "Mitchell Charitable Trust", "Community First Foundation",
    "The Legacy Foundation", "Bright Futures Foundation", "Education Forward Foundation"
]

CORPORATION_NAMES = [
    "Global Industries", "Tech Innovations Inc.", "Lakewood Medical Group",
    "First National Bank", "Regional Health Systems", "Pacific Manufacturing",
    "Apex Financial Services", "Summit Consulting Group", "Metro Construction Co.",
    "Evergreen Development", "Blue Sky Technologies", "Midwest Energy Partners",
    "Atlantic Insurance Group", "Valley Agricultural Co-op", "Precision Engineering LLC"
]

# Schools and colleges at Lakewood University
SCHOOLS = [
    "College of Arts & Sciences", "School of Business", "School of Engineering",
    "School of Education", "School of Nursing", "School of Law", "Graduate School"
]

# Funds
FUNDS = [
    ("Annual Fund - Unrestricted", "FND-1001"),
    ("School of Business", "FND-2001"),
    ("School of Engineering", "FND-2002"),
    ("School of Law", "FND-2003"),
    ("School of Nursing", "FND-2004"),
    ("Scholarship Fund", "FND-3001"),
    ("Athletics", "FND-4001"),
    ("Capital Campaign - Building Excellence", "FND-5001"),
    ("Student Emergency Fund", "FND-6001"),
    ("Library Endowment", "FND-7001"),
    ("Faculty Research Fund", "FND-8001"),
]

# Campaigns and appeals
CAMPAIGNS = ["", "Scholarship Initiative", "Building Excellence Campaign", "Annual Giving"]
APPEALS = [
    "Annual Fund Drive", "Spring Appeal", "Year-End Appeal", "Giving Tuesday",
    "Reunion Giving", "President's Circle", "Parent Appeal", "Faculty/Staff Campaign",
    "Phonathon", "Matching Gift", "Planned Giving", "Leadership Society"
]

# Contact subjects
CONTACT_SUBJECTS = [
    "Introduction meeting", "Annual fund renewal", "Stewardship update",
    "Campus tour", "Event follow-up", "Gift agreement review", "Planned giving discussion",
    "Year-end appeal", "Reunion planning", "Recognition event invite",
    "Student impact report", "Capital campaign ask", "Estate planning conversation",
    "Faculty connection", "Alumni weekend planning", "Corporate partnership",
    "Giving Tuesday outreach", "Thank you call", "Major gift cultivation",
    "Scholarship recipient connection"
]

CONTACT_NOTES = [
    "", "Great conversation about campus updates.", "Expressed interest in scholarship support.",
    "Considering increased support.", "Interested in naming opportunity.",
    "Asked about matching gift program.", "Wants to connect with students.",
    "Requested information about planned giving.", "Will follow up after board meeting.",
    "Left voicemail, awaiting callback.", "Discussed family foundation priorities.",
    "Shared impact of previous gift.", "Excited about new building project.",
    "Concerned about recent policy changes.", "Wants to visit campus this spring."
]

# Cities by region (for realistic geographic distribution)
CITIES = [
    ("Boston", "MA"), ("Cambridge", "MA"), ("Wellesley", "MA"), ("Worcester", "MA"),
    ("New York", "NY"), ("Manhattan", "NY"), ("Brooklyn", "NY"), ("Rochester", "NY"),
    ("Greenwich", "CT"), ("Darien", "CT"), ("Hartford", "CT"), ("Summit", "NJ"),
    ("Philadelphia", "PA"), ("Villanova", "PA"), ("Pittsburgh", "PA"),
    ("Washington", "DC"), ("McLean", "VA"), ("Fairfax", "VA"), ("Richmond", "VA"),
    ("Charlottesville", "VA"), ("Baltimore", "MD"), ("Potomac", "MD"), ("Bethesda", "MD"),
    ("Raleigh", "NC"), ("Durham", "NC"), ("Chapel Hill", "NC"), ("Cary", "NC"),
    ("Charlotte", "NC"), ("Atlanta", "GA"), ("Marietta", "GA"), ("Buckhead", "GA"),
    ("Miami", "FL"), ("Boca Raton", "FL"), ("Tampa", "FL"), ("Orlando", "FL"),
    ("Coral Gables", "FL"), ("Chicago", "IL"), ("Naperville", "IL"), ("Lake Forest", "IL"),
    ("Dallas", "TX"), ("Houston", "TX"), ("Fort Worth", "TX"), ("Austin", "TX"),
    ("Denver", "CO"), ("Cherry Hills Village", "CO"), ("Boulder", "CO"),
    ("Seattle", "WA"), ("Bellevue", "WA"), ("Mercer Island", "WA"), ("Sammamish", "WA"),
    ("San Francisco", "CA"), ("Palo Alto", "CA"), ("Los Angeles", "CA"), ("San Diego", "CA"),
    ("Phoenix", "AZ"), ("Scottsdale", "AZ"), ("Redmond", "WA"), ("Portland", "OR")
]

STREETS = [
    "Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Pine St", "Elm St", "Park Blvd",
    "Lake Dr", "River Rd", "Hill Rd", "Valley Way", "Forest Ave", "Meadow Ln",
    "Spring St", "Garden St", "Cherry Ln", "Sunset Blvd", "Highland Ave",
    "Washington Ave", "Lincoln Blvd", "Ocean View Dr", "Willow St", "Birch Rd"
]

# Gift officers - Use actual UUIDs from the database
# In a real deployment, these would be actual user IDs
# For demo purposes, we use the available gift officer and manager
GIFT_OFFICERS = [
    ("1ac9d0ea-888d-48a4-b963-d2d61e96c073", "John Officer", "major"),      # gift_officer
    ("807c31b2-1052-48c8-8ff7-c26e17fa8e16", "Sarah Manager", "leadership"), # manager
    # Empty string means unassigned - most constituents won't have an officer
    ("", "Unassigned", "annual"),
    ("", "Unassigned", "parent"),
    ("", "Unassigned", "foundation"),
    ("", "Unassigned", "corporate"),
]


class DonorProfile:
    """Represents a donor's giving behavior pattern."""

    def __init__(self, profile_type: str):
        self.profile_type = profile_type

    @staticmethod
    def create_random() -> 'DonorProfile':
        """Create a random donor profile weighted by realistic distribution."""
        profiles = [
            ("consistent_major", 3),      # Reliable major donors
            ("consistent_leadership", 7), # Reliable leadership donors
            ("consistent_annual", 15),    # Reliable annual donors
            ("upgrading", 8),             # Increasing their giving
            ("downgrading", 5),           # Decreasing their giving
            ("lybunt", 12),               # Gave last year, not this year (lapse risk!)
            ("sybunt", 10),               # Gave some year, been lapsed
            ("new_donor", 10),            # First gift in last 2 years
            ("sporadic", 15),             # Gives occasionally
            ("one_time", 10),             # Single gift ever
            ("never", 5),                 # In system but never gave (prospects)
        ]

        total = sum(w for _, w in profiles)
        r = random.randint(1, total)
        cumulative = 0
        for profile_type, weight in profiles:
            cumulative += weight
            if r <= cumulative:
                return DonorProfile(profile_type)
        return DonorProfile("consistent_annual")


def generate_phone() -> str:
    """Generate a realistic US phone number."""
    area_codes = ["212", "617", "312", "415", "310", "202", "404", "713", "303", "206"]
    return f"({random.choice(area_codes)}) {random.randint(200,999)}-{random.randint(1000,9999)}"


def generate_email(first_name: str, last_name: str) -> str:
    """Generate a realistic email address."""
    domains = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "aol.com", "hotmail.com"]

    # Various email formats people use
    formats = [
        f"{first_name.lower()}.{last_name.lower()}",
        f"{first_name.lower()}{last_name.lower()}",
        f"{first_name[0].lower()}{last_name.lower()}",
        f"{first_name.lower()}{last_name[0].lower()}",
        f"{last_name.lower()}{first_name[0].lower()}",
    ]

    return f"{random.choice(formats)}@{random.choice(domains)}"


def generate_address() -> Dict[str, str]:
    """Generate a realistic address."""
    city, state = random.choice(CITIES)
    street_num = random.randint(100, 9999)
    street = random.choice(STREETS)

    # Some addresses have apt/suite numbers
    line2 = ""
    if random.random() < 0.25:
        line2 = f"Apt {random.randint(1, 999)}" if random.random() < 0.5 else f"Suite {random.randint(100, 999)}"

    return {
        "address_line1": f"{street_num} {street}",
        "address_line2": line2,
        "city": city,
        "state": state,
        "postal_code": str(random.randint(10000, 99999)),
        "country": "USA"
    }


def generate_constituent(idx: int) -> Dict[str, Any]:
    """Generate a single constituent record."""

    # Determine constituent type with realistic distribution
    # 70% alumni, 12% parents, 6% friends, 6% foundations, 6% corporations
    r = random.random()
    if r < 0.70:
        const_type = "alumni"
    elif r < 0.82:
        const_type = "parent"
    elif r < 0.88:
        const_type = "friend"
    elif r < 0.94:
        const_type = "foundation"
    else:
        const_type = "corporation"

    constituent_id = f"LU-{idx:05d}"

    # Generate name based on type
    if const_type == "foundation":
        # Use foundation name - put it in last_name field
        org_name = FOUNDATION_NAMES[idx % len(FOUNDATION_NAMES)]
        prefix, first_name, middle_name, last_name, suffix = "", "", "", org_name, ""
        email = f"grants@{org_name.lower().replace(' ', '').replace('the', '')[:20]}.org"
        class_year = None
        school = None
    elif const_type == "corporation":
        # Use corporation name - put it in last_name field
        org_name = CORPORATION_NAMES[idx % len(CORPORATION_NAMES)]
        prefix, first_name, middle_name, last_name, suffix = "", "", "", org_name, ""
        email = f"giving@{org_name.lower().replace(' ', '').replace('inc.', '').replace('llc', '')[:15]}.com"
        class_year = None
        school = None
    else:
        # Individual donor
        is_female = random.random() < 0.52
        first_name = random.choice(FIRST_NAMES_FEMALE if is_female else FIRST_NAMES_MALE)
        last_name = random.choice(LAST_NAMES)
        middle_name = random.choice(MIDDLE_NAMES) if random.random() < 0.4 else ""

        if is_female:
            prefix = random.choice(["Mrs.", "Ms.", "Dr.", ""]) if random.random() < 0.5 else ""
        else:
            prefix = random.choice(["Mr.", "Dr.", "Rev.", ""]) if random.random() < 0.5 else ""

        suffix = random.choice(SUFFIXES) if random.random() < 0.05 else ""
        email = generate_email(first_name, last_name) if random.random() < 0.85 else ""

        if const_type == "alumni":
            # Class years from 1960 to 2024
            class_year = random.randint(1960, 2024)
            school = random.choice(SCHOOLS)
        else:
            class_year = None
            school = None

    # Generate contact info
    phone = generate_phone() if random.random() < 0.75 else ""
    address = generate_address() if random.random() < 0.90 else {
        "address_line1": "", "address_line2": "", "city": "", "state": "", "postal_code": "", "country": ""
    }

    # Capacity rating (wealth screening)
    # Realistic distribution: most people have modest capacity
    capacity_r = random.random()
    if capacity_r < 0.60:
        capacity = random.uniform(1000, 25000)
    elif capacity_r < 0.85:
        capacity = random.uniform(25000, 100000)
    elif capacity_r < 0.95:
        capacity = random.uniform(100000, 500000)
    elif capacity_r < 0.99:
        capacity = random.uniform(500000, 2000000)
    else:
        capacity = random.uniform(2000000, 10000000)

    capacity_source = random.choice(["WealthEngine", "iWave", "DonorSearch", "Manual Research", "Self-Reported"])

    # Portfolio assignment based on capacity
    # Only 2 real officers available - assign top prospects, leave rest unassigned
    john_officer = ("1ac9d0ea-888d-48a4-b963-d2d61e96c073", "John Officer", "major")
    sarah_manager = ("807c31b2-1052-48c8-8ff7-c26e17fa8e16", "Sarah Manager", "leadership")

    if capacity >= 500000:
        officer = john_officer  # Major gifts officer
        tier = "major"
    elif capacity >= 100000:
        officer = random.choice([john_officer, sarah_manager])
        tier = "leadership"
    elif capacity >= 25000:
        # 50% chance of assignment for leadership-level
        officer = random.choice([sarah_manager, None])
        tier = "leadership"
    elif capacity >= 5000:
        tier = "annual"
        officer = None  # Unassigned
    else:
        tier = ""
        officer = None

    return {
        "constituent_id": constituent_id,
        "prefix": prefix,
        "first_name": first_name,
        "middle_name": middle_name,
        "last_name": last_name,
        "suffix": suffix,
        "email": email,
        "phone": phone,
        **address,
        "constituent_type": const_type,
        "class_year": class_year if class_year else "",
        "school_college": school if school else "",
        "estimated_capacity": round(capacity, 2),
        "capacity_source": capacity_source,
        "assigned_officer_id": officer[0] if officer else "",
        "portfolio_tier": tier,
        "_profile": DonorProfile.create_random(),  # Internal use for gift generation
    }


def generate_gifts_for_constituent(constituent: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate gift history for a constituent based on their profile."""

    gifts = []
    profile = constituent["_profile"]
    capacity = constituent["estimated_capacity"]
    const_id = constituent["constituent_id"]
    const_type = constituent["constituent_type"]

    today = datetime(2026, 1, 29)

    # Typical gift amounts based on capacity (people give 1-5% of capacity typically)
    base_gift = capacity * random.uniform(0.01, 0.05)

    # Define gift generation logic by profile type
    if profile.profile_type == "never":
        return []  # Prospect, no gifts

    if profile.profile_type == "one_time":
        # Single gift sometime in the past
        gift_date = today - timedelta(days=random.randint(365, 2000))
        amount = base_gift * random.uniform(0.5, 1.5)
        gifts.append(create_gift(const_id, gift_date, amount, const_type))
        return gifts

    if profile.profile_type == "new_donor":
        # First gift in last 2 years, maybe 1-3 gifts total
        start_date = today - timedelta(days=random.randint(30, 730))
        num_gifts = random.randint(1, 3)
        for i in range(num_gifts):
            gift_date = start_date + timedelta(days=i * random.randint(60, 180))
            if gift_date > today:
                break
            amount = base_gift * random.uniform(0.8, 1.2)
            gifts.append(create_gift(const_id, gift_date, amount, const_type))
        return gifts

    if profile.profile_type == "lybunt":
        # Gave last year (2025), but not yet in 2026 - LAPSE RISK
        # History of giving for several years
        years_giving = random.randint(3, 10)
        for year_offset in range(years_giving):
            year = 2025 - year_offset
            if year < 2015:
                break
            # 1-3 gifts per year
            for _ in range(random.randint(1, 3)):
                gift_date = datetime(year, random.randint(1, 12), random.randint(1, 28))
                amount = base_gift * random.uniform(0.8, 1.2)
                gifts.append(create_gift(const_id, gift_date, amount, const_type))
        return gifts

    if profile.profile_type == "sybunt":
        # Lapsed for 2+ years
        last_gift_year = random.randint(2020, 2023)
        years_giving = random.randint(2, 6)
        for year_offset in range(years_giving):
            year = last_gift_year - year_offset
            if year < 2015:
                break
            for _ in range(random.randint(1, 2)):
                gift_date = datetime(year, random.randint(1, 12), random.randint(1, 28))
                amount = base_gift * random.uniform(0.8, 1.2)
                gifts.append(create_gift(const_id, gift_date, amount, const_type))
        return gifts

    if profile.profile_type == "sporadic":
        # Random years, not consistent
        num_gifts = random.randint(3, 8)
        years = random.sample(range(2015, 2026), min(num_gifts, 10))
        for year in years:
            gift_date = datetime(year, random.randint(1, 12), random.randint(1, 28))
            amount = base_gift * random.uniform(0.5, 1.5)
            gifts.append(create_gift(const_id, gift_date, amount, const_type))
        return gifts

    if profile.profile_type == "upgrading":
        # Increasing giving over time
        years_giving = random.randint(4, 10)
        multiplier = 1.0
        for year_offset in range(years_giving):
            year = 2026 - year_offset
            if year < 2015:
                break
            # More gifts in recent years
            num_gifts = 1 if year_offset > 3 else random.randint(1, 3)
            for _ in range(num_gifts):
                month = random.randint(1, 12) if year < 2026 else 1
                gift_date = datetime(year, month, random.randint(1, 28))
                if gift_date > today:
                    continue
                amount = base_gift * multiplier * random.uniform(0.9, 1.1)
                gifts.append(create_gift(const_id, gift_date, amount, const_type))
            multiplier *= 0.7  # Earlier years had smaller gifts
        return gifts

    if profile.profile_type == "downgrading":
        # Decreasing giving - warning sign
        years_giving = random.randint(4, 10)
        multiplier = 1.0
        for year_offset in range(years_giving):
            year = 2026 - year_offset
            if year < 2015:
                break
            num_gifts = random.randint(1, 2)
            for _ in range(num_gifts):
                month = random.randint(1, 12) if year < 2026 else 1
                gift_date = datetime(year, month, random.randint(1, 28))
                if gift_date > today:
                    continue
                amount = base_gift * multiplier * random.uniform(0.9, 1.1)
                gifts.append(create_gift(const_id, gift_date, amount, const_type))
            multiplier *= 1.3  # Earlier years had LARGER gifts (they're declining)
        return gifts

    # Consistent donors (major, leadership, annual)
    years_giving = random.randint(5, 15)
    gifts_per_year = 2 if "major" in profile.profile_type else (2 if "leadership" in profile.profile_type else random.randint(1, 3))

    for year_offset in range(years_giving):
        year = 2026 - year_offset
        if year < 2010:
            break
        for _ in range(gifts_per_year):
            month = random.randint(1, 12) if year < 2026 else 1
            gift_date = datetime(year, month, random.randint(1, 28))
            if gift_date > today:
                continue
            # Consistent donors give similar amounts
            amount = base_gift * random.uniform(0.9, 1.1)
            gifts.append(create_gift(const_id, gift_date, amount, const_type))

    return gifts


def create_gift(const_id: str, gift_date: datetime, amount: float, const_type: str) -> Dict[str, Any]:
    """Create a single gift record."""

    # Gift type distribution
    gift_types = ["Check", "Credit Card", "Cash", "Stock", "DAF", "Wire", "Pledge Payment"]
    weights = [30, 35, 10, 8, 10, 5, 2]
    gift_type = random.choices(gift_types, weights=weights)[0]

    # Round amount appropriately
    if amount > 10000:
        amount = round(amount / 100) * 100  # Round to nearest $100
    elif amount > 1000:
        amount = round(amount / 10) * 10  # Round to nearest $10
    else:
        amount = round(amount, 2)

    fund_name, fund_code = random.choice(FUNDS)

    # Matching gift (5% chance for individuals)
    is_matching = random.random() < 0.05 and const_type not in ("foundation", "corporation")
    matching_company = random.choice(["Microsoft", "Google", "Amazon", "JPMorgan Chase", "Bank of America", "Goldman Sachs"]) if is_matching else ""

    # Tribute gift (3% chance)
    tribute = random.random() < 0.03
    tribute_type = random.choice(["In Memory Of", "In Honor Of"]) if tribute else ""
    tribute_name = f"{'Professor ' if random.random() < 0.5 else 'Dr. '}{random.choice(FIRST_NAMES_FEMALE + FIRST_NAMES_MALE)} {random.choice(LAST_NAMES)}" if tribute else ""

    # Anonymous gift (2% chance)
    is_anonymous = random.random() < 0.02

    gift_id = f"G-{const_id}-{random.randint(100, 999)}"

    return {
        "gift_id": gift_id,
        "constituent_id": const_id,
        "amount": amount,
        "gift_date": gift_date.strftime("%Y-%m-%d"),
        "gift_type": gift_type,
        "fund_name": fund_name,
        "fund_code": fund_code,
        "campaign": random.choice(CAMPAIGNS),
        "appeal": random.choice(APPEALS),
        "recognition_amount": amount,
        "is_anonymous": str(is_anonymous).lower(),
        "is_matching": str(is_matching).lower(),
        "matching_company": matching_company,
        "tribute_type": tribute_type,
        "tribute_name": tribute_name,
    }


def generate_contacts_for_constituent(constituent: Dict[str, Any], gifts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate contact history for a constituent."""

    contacts = []
    tier = constituent["portfolio_tier"]
    officer_id = constituent["assigned_officer_id"]
    const_id = constituent["constituent_id"]

    if not officer_id:
        # Unassigned constituents get minimal contacts (phonathon, events)
        if random.random() < 0.1:  # 10% chance of any contact
            contact_date = datetime(2025, random.randint(1, 12), random.randint(1, 28))
            contacts.append(create_contact(const_id, contact_date, "phonathon"))
        return contacts

    today = datetime(2026, 1, 29)

    # Contact frequency based on tier
    if tier == "major":
        contacts_per_year = random.randint(8, 15)
    elif tier == "leadership":
        contacts_per_year = random.randint(4, 8)
    else:
        contacts_per_year = random.randint(1, 4)

    # Generate contacts over past 3 years
    for year in [2023, 2024, 2025]:
        num_contacts = contacts_per_year + random.randint(-2, 2)
        num_contacts = max(1, num_contacts)

        for _ in range(num_contacts):
            month = random.randint(1, 12)
            day = random.randint(1, 28)
            contact_date = datetime(year, month, day)

            if contact_date > today:
                continue

            # Contact type based on tier
            if tier == "major":
                contact_type = random.choice(["meeting", "visit", "call", "email", "event"])
            elif tier == "leadership":
                contact_type = random.choice(["call", "email", "meeting", "event"])
            else:
                contact_type = random.choice(["email", "call", "event", "phonathon"])

            contacts.append(create_contact(const_id, contact_date, contact_type))

    return contacts


def create_contact(const_id: str, contact_date: datetime, contact_type: str) -> Dict[str, Any]:
    """Create a single contact record."""

    subject = random.choice(CONTACT_SUBJECTS)
    notes = random.choice(CONTACT_NOTES)

    # Outcome
    outcomes = ["positive", "neutral", "negative", "no_response"]
    weights = [35, 40, 10, 15]
    outcome = random.choices(outcomes, weights=weights)[0]

    # Next action (30% chance if positive outcome)
    next_action = ""
    next_action_date = ""
    if outcome == "positive" and random.random() < 0.3:
        next_actions = [
            "Schedule follow-up meeting", "Send thank you note", "Prepare gift agreement",
            "Schedule campus visit", "Connect with faculty", "Send impact report",
            "Follow up on pledge", "Invite to event"
        ]
        next_action = random.choice(next_actions)
        next_action_date = (contact_date + timedelta(days=random.randint(7, 60))).strftime("%Y-%m-%d")

    contact_id = f"C-{const_id}-{random.randint(100, 999)}"

    return {
        "contact_id": contact_id,
        "constituent_id": const_id,
        "contact_date": contact_date.strftime("%Y-%m-%d"),
        "contact_type": contact_type,
        "subject": subject,
        "notes": notes,
        "outcome": outcome,
        "next_action": next_action,
        "next_action_date": next_action_date,
    }


def main():
    """Generate all sample data files."""

    print("Generating Lakewood University sample data...")
    print(f"Output directory: {OUTPUT_DIR}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Generate constituents
    print(f"\nGenerating {NUM_CONSTITUENTS} constituents...")
    constituents = []
    for i in range(1, NUM_CONSTITUENTS + 1):
        constituents.append(generate_constituent(i))

    # Count by type
    type_counts = {}
    for c in constituents:
        t = c["constituent_type"]
        type_counts[t] = type_counts.get(t, 0) + 1
    print(f"  Types: {type_counts}")

    # Generate gifts
    print("\nGenerating gifts...")
    all_gifts = []
    for const in constituents:
        gifts = generate_gifts_for_constituent(const)
        all_gifts.extend(gifts)
    print(f"  Total gifts: {len(all_gifts)}")

    # Deduplicate gift IDs
    seen_ids = set()
    unique_gifts = []
    for g in all_gifts:
        while g["gift_id"] in seen_ids:
            g["gift_id"] = f"G-{g['constituent_id']}-{random.randint(100, 999)}"
        seen_ids.add(g["gift_id"])
        unique_gifts.append(g)
    all_gifts = unique_gifts

    # Generate contacts
    print("\nGenerating contacts...")
    all_contacts = []
    const_gifts = {}
    for g in all_gifts:
        const_gifts.setdefault(g["constituent_id"], []).append(g)

    for const in constituents:
        gifts = const_gifts.get(const["constituent_id"], [])
        contacts = generate_contacts_for_constituent(const, gifts)
        all_contacts.extend(contacts)
    print(f"  Total contacts: {len(all_contacts)}")

    # Deduplicate contact IDs
    seen_ids = set()
    unique_contacts = []
    for c in all_contacts:
        while c["contact_id"] in seen_ids:
            c["contact_id"] = f"C-{c['constituent_id']}-{random.randint(100, 999)}"
        seen_ids.add(c["contact_id"])
        unique_contacts.append(c)
    all_contacts = unique_contacts

    # Write constituents CSV
    const_file = os.path.join(OUTPUT_DIR, "lakewood-constituents.csv")
    print(f"\nWriting {const_file}...")
    with open(const_file, "w", newline="") as f:
        # Remove internal _profile field
        fieldnames = [k for k in constituents[0].keys() if not k.startswith("_")]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for c in constituents:
            row = {k: v for k, v in c.items() if not k.startswith("_")}
            writer.writerow(row)

    # Write gifts CSV
    gifts_file = os.path.join(OUTPUT_DIR, "lakewood-gifts.csv")
    print(f"Writing {gifts_file}...")
    with open(gifts_file, "w", newline="") as f:
        fieldnames = list(all_gifts[0].keys()) if all_gifts else []
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for g in all_gifts:
            writer.writerow(g)

    # Write contacts CSV
    contacts_file = os.path.join(OUTPUT_DIR, "lakewood-contacts.csv")
    print(f"Writing {contacts_file}...")
    with open(contacts_file, "w", newline="") as f:
        fieldnames = list(all_contacts[0].keys()) if all_contacts else []
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for c in all_contacts:
            writer.writerow(c)

    # Print statistics
    print("\n" + "=" * 50)
    print("GENERATION COMPLETE")
    print("=" * 50)
    print(f"\nConstituents: {len(constituents)}")
    print(f"  - Alumni: {type_counts.get('alumni', 0)}")
    print(f"  - Parents: {type_counts.get('parent', 0)}")
    print(f"  - Friends: {type_counts.get('friend', 0)}")
    print(f"  - Foundations: {type_counts.get('foundation', 0)}")
    print(f"  - Corporations: {type_counts.get('corporation', 0)}")

    profile_counts = {}
    for c in constituents:
        p = c["_profile"].profile_type
        profile_counts[p] = profile_counts.get(p, 0) + 1
    print(f"\nDonor profiles:")
    for p, count in sorted(profile_counts.items(), key=lambda x: -x[1]):
        print(f"  - {p}: {count}")

    total_giving = sum(g["amount"] for g in all_gifts)
    print(f"\nGifts: {len(all_gifts)}")
    print(f"Total giving: ${total_giving:,.2f}")

    print(f"\nContacts: {len(all_contacts)}")

    print(f"\nFiles created:")
    print(f"  - {const_file}")
    print(f"  - {gifts_file}")
    print(f"  - {contacts_file}")


if __name__ == "__main__":
    main()
