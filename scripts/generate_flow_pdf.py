"""Generate a Simba user-flow PDF: onboarding -> plan click -> provider redirect."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUTPUT = Path(r"C:\Users\AliAl\simba_2026\docs\simba-user-flow.pdf")

ACCENT = colors.HexColor("#0F766E")
ACCENT_DARK = colors.HexColor("#0B524C")
MUTED = colors.HexColor("#475569")
LIGHT = colors.HexColor("#F1F5F9")
BORDER = colors.HexColor("#CBD5E1")

styles = getSampleStyleSheet()

H1 = ParagraphStyle(
    "H1",
    parent=styles["Heading1"],
    fontName="Helvetica-Bold",
    fontSize=22,
    textColor=ACCENT_DARK,
    spaceAfter=6,
    leading=26,
)
H2 = ParagraphStyle(
    "H2",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=15,
    textColor=ACCENT_DARK,
    spaceBefore=14,
    spaceAfter=6,
    leading=19,
)
H3 = ParagraphStyle(
    "H3",
    parent=styles["Heading3"],
    fontName="Helvetica-Bold",
    fontSize=12,
    textColor=ACCENT,
    spaceBefore=10,
    spaceAfter=4,
    leading=15,
)
BODY = ParagraphStyle(
    "Body",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=10,
    leading=14,
    textColor=colors.HexColor("#1E293B"),
    alignment=TA_LEFT,
    spaceAfter=4,
)
SUBTLE = ParagraphStyle(
    "Subtle",
    parent=BODY,
    fontSize=9,
    textColor=MUTED,
)
CODE = ParagraphStyle(
    "Code",
    parent=BODY,
    fontName="Courier",
    fontSize=9,
    textColor=colors.HexColor("#0F172A"),
    backColor=LIGHT,
    borderPadding=4,
    leading=12,
)
STEPNUM = ParagraphStyle(
    "StepNum",
    parent=BODY,
    fontName="Helvetica-Bold",
    fontSize=11,
    textColor=colors.white,
    alignment=1,
)


def step_header(num: str, title: str, route: str) -> Table:
    badge = Table(
        [[Paragraph(num, STEPNUM)]],
        colWidths=[14 * mm],
        rowHeights=[10 * mm],
    )
    badge.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), ACCENT),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("ROUNDEDCORNERS", [3, 3, 3, 3]),
            ]
        )
    )
    title_block = [
        Paragraph(f"<b>{title}</b>", H3),
        Paragraph(f"Route: <font face='Courier'>{route}</font>", SUBTLE),
    ]
    wrap = Table(
        [[badge, title_block]],
        colWidths=[18 * mm, 150 * mm],
    )
    wrap.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return wrap


def info_table(rows: list[tuple[str, str]]) -> Table:
    data = [
        [Paragraph(f"<b>{label}</b>", BODY), Paragraph(value, BODY)]
        for label, value in rows
    ]
    tbl = Table(data, colWidths=[35 * mm, 133 * mm])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), LIGHT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return tbl


def section_divider() -> Table:
    line = Table([[""]], colWidths=[168 * mm], rowHeights=[0.5])
    line.setStyle(
        TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.7, ACCENT)])
    )
    return line


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(20 * mm, 12 * mm, "SimbaApp – User Journey Reference")
    canvas.drawRightString(
        A4[0] - 20 * mm, 12 * mm, f"Page {doc.page}"
    )
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.4)
    canvas.line(20 * mm, 14 * mm, A4[0] - 20 * mm, 14 * mm)
    canvas.restoreState()


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
        title="Simba User Flow",
        author="SimbaApp",
    )

    s: list = []

    s.append(Paragraph("SimbaApp – User Journey", H1))
    s.append(
        Paragraph(
            "From first onboarding screen to clicking a plan and being redirected "
            "to the provider's website. Covers all <b>4 onboarding A/B/C/D variants</b>.",
            SUBTLE,
        )
    )
    s.append(Spacer(1, 4))
    s.append(section_divider())
    s.append(Spacer(1, 6))

    overview_rows = [
        ("Onboarding variants", "4 (A/B/C/D) – random assignment, persisted in localStorage, ?ob=A|B|C|D override"),
        ("Total visible steps", "varies by variant – see matrix below"),
        ("Phases", "Onboarding → Discovery → Plan Detail → Provider Redirect"),
        (
            "Critical conversion event",
            "<font face='Courier'>get_plan_clicked</font> (sent via Beacon API before redirect)",
        ),
        (
            "Redirect mechanism",
            "Direct browser navigation – no backend tracking proxy. "
            "<font face='Courier'>&lt;a href={plan.url} target=&quot;_blank&quot;&gt;</font> "
            "or <font face='Courier'>window.open(...)</font>",
        ),
        (
            "Source field",
            "<font face='Courier'>plan.url</font> – served from "
            "<font face='Courier'>backend/src/data/plans.ts</font> via "
            "<font face='Courier'>GET /api/plans/cards</font>",
        ),
    ]
    s.append(info_table(overview_rows))
    s.append(Spacer(1, 10))

    # ==== VARIANT MATRIX ====
    s.append(Paragraph("Onboarding A/B/C/D variant matrix", H2))
    s.append(
        Paragraph(
            "Two orthogonal axes. <b>Kind</b> swaps the onboarding component shown on first visit. "
            "<b>autoGuide</b> changes what happens when the user lands on /advisor afterwards.",
            BODY,
        )
    )
    s.append(Spacer(1, 4))

    matrix = [
        ["Variant", "Kind", "autoGuide", "Onboarding component", "/advisor behaviour after"],
        ["A", "classic", "false", "Onboarding.tsx", "Shows ‘Guide me / I know what I want’ choice"],
        ["B", "classic", "true",  "Onboarding.tsx", "Skips choice, auto-launches Guide-Me wizard"],
        ["C", "chat",    "false", "OnboardingChat.tsx", "Shows ‘Guide me / I know what I want’ choice"],
        ["D", "chat",    "true",  "OnboardingChat.tsx", "Skips choice, auto-launches Guide-Me wizard"],
    ]
    m_tbl = Table(matrix, colWidths=[16 * mm, 18 * mm, 20 * mm, 38 * mm, 76 * mm])
    m_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (3, 1), (3, -1), "Courier"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("ALIGN", (0, 0), (2, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    s.append(m_tbl)
    s.append(Spacer(1, 6))
    s.append(
        Paragraph(
            "Variant assignment: <font face='Courier'>App.tsx · lines 30–93</font>. Mixpanel super-properties "
            "<font face='Courier'>onboarding_variant</font>, <font face='Courier'>onboarding_kind</font>, "
            "<font face='Courier'>onboarding_auto_guide</font> are registered at module load so every event "
            "carries them. Override per session with <font face='Courier'>?ob=A|B|C|D</font>.",
            SUBTLE,
        )
    )
    s.append(Spacer(1, 12))

    # ==== PHASE 1: ONBOARDING ====
    s.append(Paragraph("Phase 1 – Onboarding (first-time visitor)", H2))
    s.append(
        Paragraph(
            "Two delivery modes. Variants A & B use the <b>classic</b> full-screen card flow. "
            "Variants C & D use the <b>chat</b> bubble flow. Both collect the same answers "
            "(<font face='Courier'>language, absher, status</font>) and reach the same exits.",
            BODY,
        )
    )
    s.append(Spacer(1, 4))

    s.append(Paragraph("1.1 Variants A &amp; B – Classic flow", H3))
    s.append(
        Paragraph(
            "Triggered when <font face='Courier'>localStorage.getItem('simba-onboarded')</font> "
            "is missing. Renders as a fullscreen overlay on the HomePage. "
            "Component: <font face='Courier'>frontend/src/components/Onboarding.tsx</font>.",
            BODY,
        )
    )
    s.append(Spacer(1, 4))

    s.append(step_header("1", "Language Selection", "/  (overlay)"))
    s.append(
        info_table(
            [
                ("User sees", "English / العربية picker (chat variant exposes 6 languages: en, ar, ur, hi, bn, tl)"),
                ("Action", "Tap a language card"),
                ("State updated", "<font face='Courier'>LanguageContext.setLang()</font>"),
                (
                    "Analytics",
                    "<font face='Courier'>onboarding_started</font>, "
                    "<font face='Courier'>onboarding_answered(language)</font>",
                ),
                ("File", "Onboarding.tsx · lines 649–695"),
                ("Exit", "Auto-advance to Step 2"),
            ]
        )
    )
    s.append(Spacer(1, 6))

    s.append(step_header("2", "Intro Slides", "/  (overlay)"))
    s.append(
        info_table(
            [
                ("User sees", "Two animated value-prop slides: ‘All carriers in one place’, ‘Matched in seconds’"),
                ("Action", "Tap Next arrow"),
                ("Analytics", "<font face='Courier'>onboarding_step_reached</font> on each slide"),
                ("File", "Onboarding.tsx · lines 698–760"),
                ("Exit", "Continue to Absher question"),
            ]
        )
    )
    s.append(Spacer(1, 6))

    s.append(step_header("3", "Absher Check (intent qualifier)", "/  (overlay)"))
    s.append(
        info_table(
            [
                ("User sees", "Two large cards: ‘Yes, I have Absher’ vs ‘No, not yet’"),
                ("Action", "Tap one"),
                (
                    "State updated",
                    "Stored to <font face='Courier'>localStorage 'simba-onboarding-answers'</font>; "
                    "<font face='Courier'>AuthContext.markOnboarded()</font> when complete",
                ),
                (
                    "Analytics",
                    "<font face='Courier'>onboarding_answered(absher, has_absher=YES|NO)</font>",
                ),
                ("File", "Onboarding.tsx · lines 835–857"),
                (
                    "Exit",
                    "<b>YES</b> → finish onboarding &amp; route to <font face='Courier'>/advisor</font>. "
                    "<b>NO</b> → Step 4 (status question)",
                ),
            ]
        )
    )
    s.append(Spacer(1, 6))

    s.append(step_header("4", "Residence Status", "/  (overlay)"))
    s.append(
        info_table(
            [
                ("User sees", "‘Moving to live here’ vs ‘Just visiting’"),
                ("Action", "Tap one"),
                (
                    "Analytics",
                    "<font face='Courier'>onboarding_answered(residence_intent, moving|visiting)</font>",
                ),
                ("File", "Onboarding.tsx · lines 860–881"),
                ("Exit", "MOVING → Step 5a explainer · VISITING → Step 5b visitor plans"),
            ]
        )
    )
    s.append(Spacer(1, 6))

    s.append(PageBreak())

    s.append(step_header("5a", "Moving Info (long-term path)", "/  (overlay)"))
    s.append(
        info_table(
            [
                (
                    "User sees",
                    "4-step explainer: Get Iqama → Visit store → Create Absher → Buy online; CTA ‘Get temporary plan’",
                ),
                ("Action", "Tap CTA to jump to visitor plans"),
                (
                    "Analytics",
                    "<font face='Courier'>onboarding_answered(get_temp_plan=true)</font>",
                ),
                ("File", "Onboarding.tsx · lines 884–931"),
                ("Exit", "Falls through to Step 5b"),
            ]
        )
    )
    s.append(Spacer(1, 6))

    s.append(step_header("5b", "Visitor Plans (first redirect path!)", "/  (overlay)"))
    s.append(
        info_table(
            [
                (
                    "User sees",
                    "Horizontal carousel of short-stay carrier plans (Salam Mobile, Mobily, Zain) with price &amp; specs",
                ),
                (
                    "Action",
                    "Tap ‘How to Buy’ → opens provider URL in new tab. "
                    "OR tap ‘Go to home page’ → finish onboarding",
                ),
                (
                    "Redirect call",
                    "<font face='Courier'>window.open(url, '_blank', 'noopener,noreferrer')</font>",
                ),
                (
                    "Analytics fired first",
                    "<font face='Courier'>get_plan_clicked</font> "
                    "(useBeacon: true) + <font face='Courier'>onboarding_carrier_opened</font>",
                ),
                ("File", "Onboarding.tsx · lines 934–1155 (open call line 1018)"),
                (
                    "Exit",
                    "Provider site (new tab) OR HomePage with onboarding marked complete",
                ),
            ]
        )
    )
    s.append(Spacer(1, 10))

    # ==== 1.2 CHAT VARIANT ====
    s.append(PageBreak())
    s.append(Paragraph("1.2 Variants C &amp; D – Chat flow", H3))
    s.append(
        Paragraph(
            "Same questions, conversational delivery. Bot bubbles + quick-reply chips, 350–900 ms typing delays. "
            "Skips the two intro slides – greeting and Absher question are merged into one bubble. "
            "Component: <font face='Courier'>frontend/src/components/OnboardingChat.tsx</font>.",
            BODY,
        )
    )
    s.append(Spacer(1, 4))

    s.append(step_header("C1", "Welcome + Language picker (chat)", "/  (overlay)"))
    s.append(
        info_table(
            [
                (
                    "User sees",
                    "‘Welcome to Simba 👋’ bubble + 6 language chips: English, العربية, اردو, हिन्दी, বাংলা, Filipino",
                ),
                (
                    "Difference vs classic",
                    "Classic exposes only English &amp; Arabic on its first screen; chat exposes 6 languages",
                ),
                (
                    "Analytics",
                    "<font face='Courier'>onboarding_step_reached(language, kind=chat)</font>, "
                    "<font face='Courier'>onboarding_answered(language)</font>",
                ),
                ("File", "OnboardingChat.tsx · lines 168–182, 262, 344"),
                ("Exit", "Auto-advance to greeting + Absher bubble"),
            ]
        )
    )
    s.append(Spacer(1, 6))

    s.append(step_header("C2", "Greeting + Absher question (merged bubble)", "/  (overlay)"))
    s.append(
        info_table(
            [
                (
                    "User sees",
                    "Combined bubble: ‘I'm Simba… do you have a valid Saudi ID or Iqama?’ + chips ‘Yes’ / ‘No’",
                ),
                (
                    "Difference vs classic",
                    "Classic shows two intro slides between language &amp; Absher; chat skips them entirely",
                ),
                (
                    "Analytics",
                    "<font face='Courier'>onboarding_answered(has_absher, kind=chat)</font>",
                ),
                ("File", "OnboardingChat.tsx · lines 82–89, 265, 276"),
                (
                    "Exit",
                    "<b>YES</b> → finish, navigate to /advisor (autoGuide flag set if variant D). "
                    "<b>NO</b> → status question",
                ),
            ]
        )
    )
    s.append(Spacer(1, 6))

    s.append(step_header("C3", "Status question (chat)", "/  (overlay)"))
    s.append(
        info_table(
            [
                ("User sees", "Bot bubble + chips ‘Moving’ / ‘Visiting’"),
                (
                    "Analytics",
                    "<font face='Courier'>onboarding_answered(residence_intent, kind=chat)</font>",
                ),
                ("File", "OnboardingChat.tsx · lines 281, 292"),
                ("Exit", "MOVING → C4a · VISITING → C4b"),
            ]
        )
    )
    s.append(Spacer(1, 6))

    s.append(step_header("C4a", "Moving explainer (single rich bubble)", "/  (overlay)"))
    s.append(
        info_table(
            [
                (
                    "User sees",
                    "One scrollable bubble: title + subtitle + 4 numbered steps (Iqama → Absher → buy → keep) + "
                    "chips ‘Get a temporary plan’ / ‘Go home’",
                ),
                (
                    "Difference vs classic",
                    "Classic uses a dedicated card screen; chat compresses it into one markdown bubble",
                ),
                (
                    "Analytics",
                    "<font face='Courier'>onboarding_answered(get_temp_plan=true)</font> if user asks for temp plan",
                ),
                ("File", "OnboardingChat.tsx · lines 210–223"),
                ("Exit", "‘Get temporary plan’ → C4b · ‘Go home’ → mark complete + route to /"),
            ]
        )
    )
    s.append(Spacer(1, 6))

    s.append(step_header("C4b", "Visitor plans carousel (chat – second redirect path)", "/  (overlay)"))
    s.append(
        info_table(
            [
                (
                    "User sees",
                    "Bot bubble ‘Here are short-stay plans’ + horizontal carousel of <b>14 plans</b>: "
                    "Salam Mobile (3) · Mobily (6) · Zain (5). Each card shows price, validity, data, mins, SMS",
                ),
                (
                    "Action",
                    "Tap ‘Get’ on a plan card",
                ),
                (
                    "Redirect call",
                    "<font face='Courier'>window.open(url, '_blank', 'noopener,noreferrer')</font> · line 321",
                ),
                (
                    "Analytics fired first",
                    "<font face='Courier'>get_plan_clicked</font> (useBeacon: true) at line 304 + "
                    "<font face='Courier'>onboarding_carrier_opened(kind=chat)</font> at line 316",
                ),
                (
                    "Difference vs classic",
                    "Chat carousel exposes the full short-stay catalog (14 plans). Classic onboarding exposes a "
                    "smaller curated subset on the same screen",
                ),
                ("File", "OnboardingChat.tsx · PlansCarousel lines 471–596"),
                ("Exit", "Provider site in new tab OR ‘Go home’ chip → / with onboarding complete"),
            ]
        )
    )
    s.append(Spacer(1, 10))

    # ==== 1.3 AUTO-GUIDE EFFECT ====
    s.append(Paragraph("1.3 Variants B &amp; D – autoGuide effect on /advisor", H3))
    s.append(
        Paragraph(
            "When onboarding completes (Absher YES path), the user is routed to "
            "<font face='Courier'>/advisor</font> with "
            "<font face='Courier'>navigate('/advisor', { state: { fromOnboarding: true, autoGuide } })</font>. "
            "<font face='Courier'>autoGuide</font> is computed as "
            "<font face='Courier'>variant === 'B' || variant === 'D'</font> "
            "(Onboarding.tsx line 612 · OnboardingChat.tsx line 143).",
            BODY,
        )
    )
    s.append(Spacer(1, 4))
    s.append(
        info_table(
            [
                (
                    "Variants A &amp; C (autoGuide = false)",
                    "AdvisorPage shows two large quick-action cards: ‘Guide me’ vs ‘I know what I want’. "
                    "User must pick. File: AdvisorPage.tsx line 654",
                ),
                (
                    "Variants B &amp; D (autoGuide = true)",
                    "Quick-action cards are not rendered (<font face='Courier'>!autoGuide</font> guard at line 654). "
                    "A useEffect at lines 542–548 fires once on mount, calling "
                    "<font face='Courier'>handleQuickAction('guide')</font> – the 5-step guided questionnaire "
                    "(Internet → Local calls → Intl calls → Social → Budget) starts immediately",
                ),
                (
                    "Scope",
                    "autoGuide only affects the /advisor mount UX. It does NOT change how plans are recommended "
                    "or how the redirect happens",
                ),
            ]
        )
    )
    s.append(Spacer(1, 12))

    # ==== PHASE 2: DISCOVERY ====
    s.append(Paragraph("Phase 2 – Plan Discovery (returning user)", H2))
    s.append(
        Paragraph(
            "Three concurrent paths. After onboarding, returning users land on HomePage. "
            "Each path eventually surfaces a plan card the user can click.",
            BODY,
        )
    )
    s.append(Spacer(1, 4))

    s.append(step_header("6", "HomePage – Trending & Hero CTAs", "/"))
    s.append(
        info_table(
            [
                (
                    "User sees",
                    "Hero section, two CTAs (Smart Advisor, Browse Plans), trending plan carousel, plan finder banner",
                ),
                (
                    "Trending source",
                    "<font face='Courier'>getRecommendations(isLoggedIn, 8)</font> from "
                    "<font face='Courier'>services/recommendations.service.ts</font>",
                ),
                (
                    "Analytics",
                    "<font face='Courier'>homepage_cta_clicked { cta: finder | browse_plans | finder_banner }</font>",
                ),
                ("File", "frontend/src/pages/HomePage.tsx · lines 31–236"),
                (
                    "Exit",
                    "/advisor (AI), /plans (categories), or click trending card → /plan/:id",
                ),
            ]
        )
    )
    s.append(Spacer(1, 6))

    s.append(step_header("7a", "ExplorePage – Category Discovery", "/plans"))
    s.append(
        info_table(
            [
                (
                    "User sees",
                    "7 category tabs: Students, Budget, Balanced, Gamers, Expats, Unlimited, Data-Only",
                ),
                (
                    "Sub-filters",
                    "Carrier (multi-select), price slider 0–1000 SAR, intl-calls toggle, social-data toggle, keyword search",
                ),
                (
                    "Backend",
                    "<font face='Courier'>GET /api/plans/cards</font> (lightweight payload)",
                ),
                (
                    "Analytics",
                    "<font face='Courier'>explore_category_clicked { category }</font>, "
                    "<font face='Courier'>plan_card_clicked</font>",
                ),
                ("File", "frontend/src/pages/ExplorePage.tsx"),
                ("Exit", "Click plan card → /plan/:id"),
            ]
        )
    )
    s.append(Spacer(1, 6))

    s.append(step_header("7b", "AdvisorPage – AI Discovery", "/advisor"))
    s.append(
        info_table(
            [
                (
                    "User sees",
                    "Mode picker: ‘Guide me’ (5-step wizard) or ‘I know what I want’ (freeform chat)",
                ),
                (
                    "Guide steps",
                    "Internet usage → Local calls → Intl calls → Social media → Budget",
                ),
                (
                    "Backend",
                    "<font face='Courier'>POST /api/advisor/message</font> – OpenAI GPT-4 mini, "
                    "full plan catalog passed in system prompt",
                ),
                (
                    "Output",
                    "Assistant messages contain a <font face='Courier'>planIds[]</font> array → ConnectedPlanCard rendered inline",
                ),
                (
                    "Analytics",
                    "<font face='Courier'>advisor_started { mode }</font>, "
                    "<font face='Courier'>advisor_guide_step_answered</font>, "
                    "<font face='Courier'>advisor_guide_completed</font>, "
                    "<font face='Courier'>advisor_plan_card_clicked</font>",
                ),
                ("File", "frontend/src/pages/AdvisorPage.tsx · lines 417–789"),
                ("Exit", "Click recommended plan card → /plan/:id"),
            ]
        )
    )
    s.append(Spacer(1, 10))

    s.append(PageBreak())

    # ==== PHASE 3: PLAN DETAIL ====
    s.append(Paragraph("Phase 3 – Plan Detail", H2))

    s.append(step_header("8", "Plan Card", "(any list view)"))
    s.append(
        info_table(
            [
                (
                    "User sees",
                    "Carrier logo + colored accent, plan name, type badge, price, 3–4 metric boxes "
                    "(data / mins / SMS / social), engagement counts, action buttons",
                ),
                ("Action", "Click card body or ‘View Details’"),
                ("File", "frontend/src/components/PlanCard.tsx"),
                ("Exit", "React Router Link → <font face='Courier'>/plan/:id</font>"),
            ]
        )
    )
    s.append(Spacer(1, 6))

    s.append(step_header("9", "Plan Detail Page", "/plan/:id"))
    s.append(
        info_table(
            [
                (
                    "Data flow",
                    "id from URL params → "
                    "<font face='Courier'>plans.find(p =&gt; p.id === planId)</font> against PlansContext",
                ),
                (
                    "User sees",
                    "Header (carrier, name, price, type, bookmark) · spec table (data, mins, SMS, intl, roaming, contract, features) · "
                    "<b>Get This Plan</b> CTA · Compare button · Like/Dislike · Comments thread",
                ),
                (
                    "Backend",
                    "Reactions/comments via <font face='Courier'>/api/plan-interactions/*</font> "
                    "(60s in-memory cache for engagement)",
                ),
                (
                    "Analytics on view",
                    "<font face='Courier'>plan_detail_viewed { plan_id, plan_name, provider, price, source }</font>",
                ),
                ("File", "frontend/src/pages/PlanDetailPage.tsx · lines 48–400+"),
                ("Exit", "Click ‘Get This Plan’ → Phase 4"),
            ]
        )
    )
    s.append(Spacer(1, 10))

    # ==== PHASE 4: REDIRECT ====
    s.append(Paragraph("Phase 4 – Provider Redirect (conversion moment)", H2))

    s.append(step_header("10", "Get This Plan – outbound click", "/plan/:id  →  provider site"))
    s.append(
        info_table(
            [
                (
                    "Markup",
                    "<font face='Courier'>&lt;a href={plan.url} target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot;&gt;</font>",
                ),
                (
                    "URL field",
                    "<font face='Courier'>plan.url</font> – string defined per plan in "
                    "<font face='Courier'>backend/src/data/plans.ts</font>",
                ),
                (
                    "Pre-redirect event",
                    "<font face='Courier'>get_plan_clicked</font> with "
                    "<font face='Courier'>{ plan_id, plan_name, provider, url, source }</font>, "
                    "sent <b>useBeacon: true</b> so it survives navigation",
                ),
                (
                    "Tracking proxy?",
                    "<b>None.</b> Browser navigates straight to the carrier URL – no backend "
                    "click-through endpoint, so click attribution lives entirely in GA4 + Mixpanel",
                ),
                (
                    "Files",
                    "PlanDetailPage.tsx lines 234–243 · "
                    "Onboarding.tsx line 1018 (visitor-plan variant)",
                ),
                ("Exit", "New tab opens on the carrier’s subscription page"),
            ]
        )
    )
    s.append(Spacer(1, 12))

    # ==== APPENDIX: FLOW DIAGRAM ====
    s.append(PageBreak())
    s.append(Paragraph("Appendix A – Flow at a glance", H2))

    flow = [
        ["Variant", "Phase", "Step", "Trigger", "Outcome"],
        ["A/B", "Onboarding", "Language (en/ar)", "First visit", "Set lang"],
        ["A/B", "Onboarding", "Intro slides ×2", "Auto", "Reach Absher Q"],
        ["A/B", "Onboarding", "Absher YES", "Tap card", "→ /advisor"],
        ["A/B", "Onboarding", "Absher NO", "Tap card", "Status Q"],
        ["A/B", "Onboarding", "Status Moving", "Tap card", "Show explainer 5a"],
        ["A/B", "Onboarding", "Status Visiting", "Tap card", "Visitor plans 5b"],
        ["A/B", "Onboarding", "Visitor plan click", "Tap ‘How to Buy’", "REDIRECT (new tab)"],
        ["C/D", "Onboarding", "Welcome + 6-lang chips", "First visit", "Set lang"],
        ["C/D", "Onboarding", "Greeting + Absher", "Auto bubble", "Yes/No chips"],
        ["C/D", "Onboarding", "Absher YES", "Chip", "→ /advisor"],
        ["C/D", "Onboarding", "Absher NO", "Chip", "Status Q"],
        ["C/D", "Onboarding", "Moving explainer", "Chip", "Get-temp / Go-home"],
        ["C/D", "Onboarding", "Visitor carousel (14 plans)", "Chip", "REDIRECT (new tab)"],
        ["A/C", "/advisor", "Choice cards shown", "Lands on /advisor", "Pick Guide-Me or freeform"],
        ["B/D", "/advisor", "AUTO Guide-Me launch", "Mount effect", "Step 1 of wizard immediately"],
        ["all", "Discovery", "HomePage trending", "Returning user", "Pick path"],
        ["all", "Discovery", "Explore /plans", "Tap ‘Browse Plans’", "Filter, click card"],
        ["all", "Discovery", "Advisor /advisor", "Tap ‘Smart Advisor’", "AI suggests cards"],
        ["all", "Detail", "/plan/:id", "Click any card", "Show full specs"],
        ["all", "Redirect", "Get This Plan", "Tap CTA", "REDIRECT (new tab)"],
    ]
    tbl = Table(flow, colWidths=[16 * mm, 22 * mm, 44 * mm, 36 * mm, 50 * mm])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    s.append(tbl)

    s.append(Spacer(1, 14))
    s.append(Paragraph("Appendix B – Backend endpoints touched", H2))
    api = [
        ["Endpoint", "Method", "Auth", "Used in"],
        ["/api/plans/cards", "GET", "No", "Explore, Home trending, Card grids"],
        ["/api/plans", "GET", "No", "Detail page (full payload)"],
        ["/api/plans/:id", "GET", "No", "Detail page (single)"],
        ["/api/advisor/message", "POST", "No", "Advisor chat (OpenAI)"],
        ["/api/plan-interactions/engagement", "GET", "No", "Card grids (likes / comment counts)"],
        ["/api/plan-interactions/:id/reactions/like", "POST", "Yes", "Detail page like button"],
        ["/api/plan-interactions/:id/reactions/dislike", "POST", "Yes", "Detail page dislike button"],
        ["/api/plan-interactions/:id/comments", "GET", "No", "Detail page comments"],
        ["/api/plan-interactions/:id/comments", "POST", "Yes", "Post a comment"],
    ]
    api_tbl = Table(api, colWidths=[68 * mm, 18 * mm, 14 * mm, 68 * mm])
    api_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (0, -1), "Courier"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("ALIGN", (1, 0), (2, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    s.append(api_tbl)

    s.append(Spacer(1, 14))
    s.append(Paragraph("Appendix C – Analytics events fired along the journey", H2))
    events = [
        ["Phase", "Event", "Provider"],
        ["Onboarding", "onboarding_started", "GA4 + Mixpanel"],
        ["Onboarding", "onboarding_step_reached", "GA4 + Mixpanel"],
        ["Onboarding", "onboarding_answered", "GA4 + Mixpanel"],
        ["Onboarding", "onboarding_carrier_opened", "GA4 + Mixpanel"],
        ["Onboarding", "onboarding_completed / abandoned", "GA4 + Mixpanel"],
        ["Discovery", "homepage_cta_clicked", "GA4 + Mixpanel"],
        ["Discovery", "explore_category_clicked", "GA4 + Mixpanel"],
        ["Discovery", "advisor_started / guide_step_answered / guide_completed", "GA4 + Mixpanel"],
        ["Discovery", "advisor_message_sent", "GA4 + Mixpanel"],
        ["Discovery", "plan_card_clicked / advisor_plan_card_clicked", "GA4 + Mixpanel"],
        ["Detail", "plan_detail_viewed", "GA4 + Mixpanel"],
        ["Redirect", "get_plan_clicked  (CRITICAL conversion)", "GA4 + Mixpanel (Beacon API)"],
    ]
    ev_tbl = Table(events, colWidths=[26 * mm, 92 * mm, 50 * mm])
    ev_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (1, 1), (1, -1), "Courier"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    s.append(ev_tbl)
    s.append(Spacer(1, 8))
    s.append(
        Paragraph(
            "Microsoft Clarity also runs throughout (session recording + heatmaps), "
            "loaded lazily via <font face='Courier'>requestIdleCallback</font>.",
            SUBTLE,
        )
    )

    doc.build(s, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    build()
