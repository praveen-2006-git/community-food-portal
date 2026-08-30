import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def create_presentation_pdf():
    pdf_path = r"C:\Users\acer\.gemini\antigravity\brain\79e34265-fd6c-4774-8267-52635931bc9d\Presentation_Slides_Content.pdf"
    
    # Page setup - letter size, 0.5 inch margins for standard printing
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles for Academic Presentation Document
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        alignment=1, # Centered
        textColor=colors.HexColor('#0F172A'), # Deep Slate
        spaceAfter=20
    )
    
    sub_title_style = ParagraphStyle(
        'CoverSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=13,
        leading=16,
        alignment=1,
        textColor=colors.HexColor('#475569'),
        spaceAfter=40
    )
    
    slide_header_style = ParagraphStyle(
        'SlideHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#1E3A8A'), # Navy Blue
        spaceAfter=15,
        borderPadding=(0, 0, 2, 0),
        borderColor=colors.HexColor('#1E3A8A'),
        borderWidth=1
    )
    
    content_style = ParagraphStyle(
        'ContentBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor('#1E293B'), # Slate 800
        spaceAfter=10
    )
    
    bold_content_style = ParagraphStyle(
        'ContentBold',
        parent=content_style,
        fontName='Helvetica-Bold'
    )
    
    table_text_style = ParagraphStyle(
        'TableText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#1E293B')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )
    
    story = []
    
    # ------------------ COVER PAGE ------------------
    story.append(Spacer(1, 40))
    story.append(Paragraph("BANNARI AMMAN INSTITUTE OF TECHNOLOGY", ParagraphStyle('InstName', parent=title_style, fontSize=16, leading=20, spaceAfter=5)))
    story.append(Paragraph("SATHYAMANGALAM - 638401, ERODE DISTRICT, TAMILNADU, INDIA", ParagraphStyle('InstLoc', parent=sub_title_style, fontSize=9, spaceAfter=40)))
    
    story.append(Spacer(1, 30))
    story.append(Paragraph("ACADEMIC YEAR 2024 - 25", ParagraphStyle('AY', parent=sub_title_style, fontName='Helvetica-Bold', fontSize=12, spaceAfter=10)))
    story.append(Paragraph("S8 PROJECT WORK II - FIRST REVIEW", ParagraphStyle('Review', parent=title_style, fontSize=15, spaceAfter=20)))
    
    story.append(Spacer(1, 10))
    story.append(Paragraph("PROJECT TITLE:<br/>COMMUNITY SURPLUS FOOD INGREDIENT INVENTORY ROUTING PORTAL", title_style))
    story.append(Paragraph("BIP PROJECT ID: 24S7INT369", ParagraphStyle('ProjId', parent=sub_title_style, fontSize=11, fontName='Helvetica-Bold')))
    
    story.append(Spacer(1, 50))
    
    # Author details table
    members_data = [
        [Paragraph("<b>BATCH MEMBERS</b>", ParagraphStyle('MHead', parent=content_style, fontName='Helvetica-Bold')), 
         Paragraph("<b>GUIDE</b>", ParagraphStyle('GHead', parent=content_style, fontName='Helvetica-Bold'))],
        [Paragraph("PRAVEEN M (231CS265)<br/><i>Role: Front End Developer</i>", content_style), 
         Paragraph("Dr Venkatesan R<br/><i>Associate Professor</i>", content_style)],
        [Paragraph("VASANTHAN V (231CS341)<br/><i>Role: Back End Developer</i>", content_style), 
         Paragraph("Department of Information Technology", content_style)]
    ]
    t_members = Table(members_data, colWidths=[270, 270])
    t_members.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_members)
    story.append(PageBreak())
    
    # ------------------ SLIDE 2 & 3: LITERATURE SURVEY ------------------
    survey_intro = "This literature survey reviews the primary academic foundations from your uploaded Literature_Survey.pdf:"
    
    # Literature Survey Table
    headers = [Paragraph("Sl.No", table_header_style), Paragraph("Reference", table_header_style), Paragraph("Methodology / Works", table_header_style), Paragraph("Project Relevance", table_header_style)]
    
    lit_rows = [
        ("1", "J. Gómez-Pantoja et al. (2021)", "Resource allocation based on stock levels and recipient compatibility.", "Matching logic; validates ingredient profiles and kitchen capabilities."),
        ("2", "L. A. Ogazán et al. (2022)", "Routing and logistical control under variable supply & demand.", "Route sequencing; tracks donor and kitchen locations for path visualizers."),
        ("3", "A. F. Rivera et al. (2023)", "Complete supply chain stages (intake, tracking, routing, decisions).", "Unifies listing, matching, claiming, routing, and stock batches in one workflow."),
        ("4", "S. Esmaeilidouki et al. (2023)", "Analyzed operations research math models (LP, MILP, DEA).", "Simplifies theoretical formulas into instant, rule-based web matching filters."),
        ("5", "R. Akkerman et al. (2023)", "Identified supply chain issues (spoilage, lack of visibility, poor IT).", "Addresses issues via quantities, expiry fields, storage checks, and handover verification."),
        ("6", "M. Reusken et al. (2023)", "Investigated storage capacity investments and vehicle capabilities.", "Real-time coordinate sharing and matching compatibility checks."),
        ("7", "P. R. Orgut et al. (2023)", "Distribution optimization of highly perishable items.", "Prioritizes claims using expiry deadlines to prevent spoilage."),
        ("8", "N. A. Chaim & N. A. M. Arraes (2024)", "Performance evaluation frameworks for food banks.", "Status logging tracking models and verification records."),
        ("9", "M. Reusken et al. (2024)", "Collection routing models under travel time uncertainty.", "Simplifies complex routes into Leaflet overlays and stop sequencing."),
        ("10", "M. Safayet et al. (2024)", "Evaluated spatial accessibility indices and route access.", "Supports proximity-aware feeds and Leaflet Maps integrations."),
        ("11", "A. F. Rivera et al. (2026)", "Analyzed allocation planning under uncertain inventory supply.", "Provides a lightweight inventory tool for routine daily redistribution.")
    ]
    
    survey_table_data = [headers]
    for row in lit_rows:
        survey_table_data.append([
            Paragraph(row[0], table_text_style),
            Paragraph(f"<b>{row[1]}</b>", table_text_style),
            Paragraph(row[2], table_text_style),
            Paragraph(row[3], table_text_style)
        ])
        
    t_survey = Table(survey_table_data, colWidths=[35, 140, 180, 185])
    t_survey.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    
    story.append(Paragraph("LITERATURE SURVEY (Slides 2 & 3)", slide_header_style))
    story.append(Paragraph(survey_intro, content_style))
    story.append(Spacer(1, 10))
    story.append(t_survey)
    story.append(PageBreak())
    
    # ------------------ SLIDE 4: AIM & OBJECTIVES ------------------
    story.append(Paragraph("AIM & OBJECTIVES (Slide 4)", slide_header_style))
    story.append(Paragraph("<b>Problem Statement:</b>", bold_content_style))
    story.append(Paragraph("Commercial food venues (hotels, caterers, marriage halls) discard tons of raw perishable ingredients daily. At the same time, local soup kitchens face sourcing deficits. The core issue is a coordination gap: available surplus, storage types, expiries, and locations are not tracked in a shared inventory or routed efficiently.", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Aim:</b>", bold_content_style))
    story.append(Paragraph("To develop a rule-based, coordinate-aware redistribution portal connecting commercial food donors with local soup kitchens to collect and log surplus raw ingredients.", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Core Objectives:</b>", bold_content_style))
    story.append(Paragraph("• Build an atomic database claim pipeline to prevent race-condition over-allocations.<br/>• Establish secure timing-safe 6-digit confirmation codes for physical handover verification.<br/>• Build a dynamic FEFO (First-Expired, First-Out) inventory queue mapping for kitchens.", content_style))
    story.append(PageBreak())
    
    # ------------------ SLIDE 5: SCOPE OF THE PROJECT ------------------
    story.append(Paragraph("SCOPE OF THE PROJECT (Slide 5)", slide_header_style))
    story.append(Paragraph("<b>Functional Bounds:</b>", bold_content_style))
    story.append(Paragraph("Connects raw ingredient listing, inventory tracking, matching, claiming, routed pickup, and kitchen stock updates into a single closed-loop web workflow.", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Geographical Radius Limit:</b>", bold_content_style))
    story.append(Paragraph("Restricts available listings and routing filters to a local 15 km spatial radius using MongoDB spatial index checks.", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Perishability Focus:</b>", bold_content_style))
    story.append(Paragraph("Focuses strictly on raw perishable surplus ingredients (fresh vegetables/fruits) from commercial donors (restaurants, banquet halls, hotels) to soup kitchens. Dry goods (rice, oil) remain secondary since donors tend to store them for personal future use.", content_style))
    story.append(PageBreak())
    
    # ------------------ SLIDE 6: NEED FOR THE STUDY ------------------
    story.append(Paragraph("NEED FOR THE CURRENT STUDY (Slide 6)", slide_header_style))
    story.append(Paragraph("<b>Priority Focus on Fresh Vegetables:</b>", bold_content_style))
    story.append(Paragraph("Commercial entities are less likely to donate long-lasting items (like rice or cooking oil) because they store them for personal use. Surplus donations instead consist of raw perishables (fresh vegetables) that spoil quickly and require immediate local routing before deadline expiry.", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Resolving the Research Gap:</b>", bold_content_style))
    story.append(Paragraph("Existing literature presents theoretical optimizations or broad disaster response setups. There is a lack of a lightweight, day-to-day web platform that small soup kitchens and local donors can easily use to match inventory, track transport coordinates, and verify handovers securely.", content_style))
    story.append(PageBreak())
    
    # ------------------ SLIDE 7 & 8: FEASIBILITY ANALYSIS ------------------
    story.append(Paragraph("FEASIBILITY ANALYSIS (Slides 7 & 8)", slide_header_style))
    story.append(Paragraph("<b>Technical Feasibility:</b>", bold_content_style))
    story.append(Paragraph("• Express/Node.js backend with Mongoose ODM handles atomic database transactions to protect inventory numbers.<br/>• MongoDB 2dsphere spatial indexing calculates distances dynamically.", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Operational Feasibility:</b>", bold_content_style))
    story.append(Paragraph("• Simple web-based responsive dashboards require zero local client app installs.<br/>• Indian venue profile structures (mandapams, banquet halls, catering facilities) match the exact operational classification of local bulk surplus sources.", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Economic Feasibility:</b>", bold_content_style))
    story.append(Paragraph("• Deployed completely on free, open-source technology frameworks (React, Leaflet, Node, Express, MongoDB) with zero platform licensing fees.<br/>• Driving route coordinates are calculated using the free OpenStreetMap (OSRM) driving route API.", content_style))
    story.append(PageBreak())
    
    # ------------------ SLIDE 9: METHODOLOGY (Flow Chart) ------------------
    story.append(Paragraph("PROPOSED METHODOLOGY (Flow Chart) (Slide 9)", slide_header_style))
    story.append(Paragraph("Following the exact visual layout structure of the review template:", content_style))
    story.append(Spacer(1, 5))
    
    arrow_style = ParagraphStyle('Arrow', parent=content_style, fontName='Helvetica-Bold', fontSize=12, alignment=1, textColor=colors.HexColor('#1E3A8A'))
    box_header_style = ParagraphStyle('BoxHeader', parent=content_style, fontName='Helvetica-Bold', alignment=1)
    
    flow_data = [
        [Paragraph("<b>START</b>", box_header_style), ""],
        [Paragraph("▼", arrow_style), ""],
        [Paragraph("<b>Literature Reviews</b><br/>(Analysis of Food banks & supply chains)", ParagraphStyle('B1', parent=content_style, alignment=1, fontSize=9, leading=11)), 
         Paragraph("<b>Mastering MERN Stack</b><br/>(Learning Node, Mongoose & React)", ParagraphStyle('B2', parent=content_style, alignment=1, fontSize=9, leading=11))],
        [Paragraph("▼", arrow_style), ""],
        [Paragraph("<b>Setup MongoDB Spatial Indexing</b><br/>(Defining location coordinates & 2dsphere points)", ParagraphStyle('B3', parent=content_style, alignment=1, fontSize=9, leading=11)), ""],
        [Paragraph("▼", arrow_style), ""],
        [Paragraph("<b>Develop REST API & Mongoose Transactions</b><br/>(Creating schemas & transactional sessions)", ParagraphStyle('B4', parent=content_style, alignment=1, fontSize=9, leading=11)), ""],
        [Paragraph("▼", arrow_style), ""],
        [Paragraph("<b>Implement timingSafeEqual Handovers</b><br/>(Hashing confirmation keys & lockout rules)", ParagraphStyle('B5', parent=content_style, alignment=1, fontSize=9, leading=11)), ""],
        [Paragraph("▼", arrow_style), ""],
        [Paragraph("<b>Result Analysis & Complete Integration Tests</b><br/>(Verifying 23 test suites & sweepers)", ParagraphStyle('B6', parent=content_style, alignment=1, fontSize=9, leading=11)), ""],
        [Paragraph("▼", arrow_style), ""],
        [Paragraph("<b>END</b>", box_header_style), ""]
    ]
    
    t_flow = Table(flow_data, colWidths=[270, 270])
    t_flow.setStyle(TableStyle([
        ('SPAN', (0,0), (1,0)), # Span START
        ('SPAN', (0,1), (1,1)), # Span arrow
        ('SPAN', (0,3), (1,3)), # Span arrow
        ('SPAN', (0,4), (1,4)), # Span Spatial
        ('SPAN', (0,5), (1,5)), # Span arrow
        ('SPAN', (0,6), (1,6)), # Span API
        ('SPAN', (0,7), (1,7)), # Span arrow
        ('SPAN', (0,8), (1,8)), # Span Handover
        ('SPAN', (0,9), (1,9)), # Span arrow
        ('SPAN', (0,10), (1,10)), # Span Tests
        ('SPAN', (0,11), (1,11)), # Span arrow
        ('SPAN', (0,12), (1,12)), # Span END
        
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        
        # Add border box outline ONLY around the actual steps (no border for arrows)
        ('BOX', (0,0), (1,0), 1, colors.HexColor('#1E3A8A')),
        ('BACKGROUND', (0,0), (1,0), colors.HexColor('#EFF6FF')),
        
        ('BOX', (0,2), (0,2), 1, colors.HexColor('#475569')),
        ('BACKGROUND', (0,2), (0,2), colors.HexColor('#F8FAFC')),
        ('BOX', (1,2), (1,2), 1, colors.HexColor('#475569')),
        ('BACKGROUND', (1,2), (1,2), colors.HexColor('#F8FAFC')),
        
        ('BOX', (0,4), (1,4), 1, colors.HexColor('#475569')),
        ('BACKGROUND', (0,4), (1,4), colors.HexColor('#F8FAFC')),
        
        ('BOX', (0,6), (1,6), 1, colors.HexColor('#475569')),
        ('BACKGROUND', (0,6), (1,6), colors.HexColor('#F8FAFC')),
        
        ('BOX', (0,8), (1,8), 1, colors.HexColor('#475569')),
        ('BACKGROUND', (0,8), (1,8), colors.HexColor('#F8FAFC')),
        
        ('BOX', (0,10), (1,10), 1, colors.HexColor('#475569')),
        ('BACKGROUND', (0,10), (1,10), colors.HexColor('#F8FAFC')),
        
        ('BOX', (0,12), (1,12), 1, colors.HexColor('#EF4444')),
        ('BACKGROUND', (0,12), (1,12), colors.HexColor('#FEF2F2')),
        
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_flow)
    story.append(PageBreak())
    
    # ------------------ SLIDE 10: METHODOLOGY (Gantt Chart) ------------------
    story.append(Paragraph("PROPOSED METHODOLOGY (Gantt Chart) (Slide 10)", slide_header_style))
    story.append(Paragraph("Gantt Chart representing week-by-week implementation timeline:", content_style))
    story.append(Spacer(1, 10))
    
    gantt_headers = [
        Paragraph("<b>Tasks</b>", table_header_style),
        Paragraph("<b>Week 1</b>", table_header_style),
        Paragraph("<b>Week 2</b>", table_header_style),
        Paragraph("<b>Week 3</b>", table_header_style),
        Paragraph("<b>Week 4</b>", table_header_style),
        Paragraph("<b>Week 5</b>", table_header_style),
        Paragraph("<b>Week 6</b>", table_header_style),
        Paragraph("<b>Week 7</b>", table_header_style),
    ]
    
    # Visual task bars using colored table backgrounds
    gantt_rows = [
        [Paragraph("Research (Literature Survey)", content_style), "■■■", "■■■", "", "", "", "", ""],
        [Paragraph("Content (Schema Modeling)", content_style), "■■■", "■■■", "■■■", "", "", "", ""],
        [Paragraph("Design (System Architecture)", content_style), "", "■■■", "■■■", "", "", "", ""],
        [Paragraph("Uploading (Database Seed)", content_style), "", "", "■■■", "■■■", "", "", ""],
        [Paragraph("Developing (Claim APIs)", content_style), "", "", "", "■■■", "", "", ""],
        [Paragraph("Finalizing (Leaflet & Sweeper)", content_style), "", "", "", "", "■■■", "■■■", ""],
        [Paragraph("Marketing (Testing & Verification)", content_style), "", "", "", "", "", "■■■", "■■■"],
    ]
    
    gantt_data = [gantt_headers] + gantt_rows
    t_gantt = Table(gantt_data, colWidths=[200, 48, 48, 48, 48, 48, 48, 48])
    t_gantt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        
        # Color specific cells to represent Gantt bars matching the uploaded image exactly
        ('BACKGROUND', (1,1), (2,1), colors.HexColor('#A3E635')), # Lime Green for Research
        ('TEXTCOLOR', (1,1), (2,1), colors.HexColor('#A3E635')),
        
        ('BACKGROUND', (1,2), (3,2), colors.HexColor('#22D3EE')), # Cyan for Content
        ('TEXTCOLOR', (1,2), (3,2), colors.HexColor('#22D3EE')),
        
        ('BACKGROUND', (2,3), (3,3), colors.HexColor('#60A5FA')), # Blue for Design
        ('TEXTCOLOR', (2,3), (3,3), colors.HexColor('#60A5FA')),
        
        ('BACKGROUND', (3,4), (4,4), colors.HexColor('#3B82F6')), # Darker Blue for Uploading
        ('TEXTCOLOR', (3,4), (4,4), colors.HexColor('#3B82F6')),
        
        ('BACKGROUND', (4,5), (4,5), colors.HexColor('#F59E0B')), # Orange/Yellow for Developing
        ('TEXTCOLOR', (4,5), (4,5), colors.HexColor('#F59E0B')),
        
        ('BACKGROUND', (5,6), (6,6), colors.HexColor('#EA580C')), # Orange for Finalizing
        ('TEXTCOLOR', (5,6), (6,6), colors.HexColor('#EA580C')),
        
        ('BACKGROUND', (6,7), (7,7), colors.HexColor('#EF4444')), # Red for Marketing
        ('TEXTCOLOR', (6,7), (7,7), colors.HexColor('#EF4444')),
        
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_gantt)
    story.append(PageBreak())
    
    # ------------------ SLIDE 11, 12, 13: CHOICE OF COMPONENTS ------------------
    story.append(Paragraph("CHOICE OF COMPONENTS & MODULES (Slides 11, 12, 13)", slide_header_style))
    story.append(Paragraph("<b>Frontend Framework (Vite + React.js + Leaflet):</b>", bold_content_style))
    story.append(Paragraph("Allows compiling high-speed Single Page Applications (SPAs). Leaflet is used to pin coordinates on the route map cleanly without paying Google Maps API fees.", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Backend Runtime (Node.js + Express.js):</b>", bold_content_style))
    story.append(Paragraph("Node.js handles asynchronous event loops to manage parallel claims. Secure timing-safe comparisons are managed via Node's native crypto module.", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Database & GIS Tier (MongoDB + Mongoose + OSRM):</b>", bold_content_style))
    story.append(Paragraph("MongoDB parses GeoJSON point indexes, and Mongoose handles isolated transaction sessions. OSRM evaluates driving path matrices dynamically.", content_style))
    story.append(PageBreak())
    
    # ------------------ SLIDE 14, 15, 16: DESIGN/ARCHITECTURE ------------------
    story.append(Paragraph("DESIGN & SOFTWARE ARCHITECTURE (Slides 14, 15, 16)", slide_header_style))
    story.append(Paragraph("<b>System Layering Architecture:</b>", bold_content_style))
    story.append(Paragraph("1. React Dashboards (UI segment selectors and maps).<br/>2. Express Controller Gates (role validations, claim controllers).<br/>3. Database Transactions (isolated document reads and updates).", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Main REST API Routes:</b>", bold_content_style))
    story.append(Paragraph("• GET /api/kitchen/ingredients (retrieves spatial matches).<br/>• POST /api/kitchen/claims (starts transactional sessions, generates verification codes).<br/>• POST /api/reservations/:id/verify (hashes inputs, timingsafe equals verification).", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Mongoose Model Schema Relations:</b>", bold_content_style))
    story.append(Paragraph("• Ingredient stores donorRef (ref User).<br/>• Request stores ingredientRef and soupKitchenRef.<br/>• Reservation links to requestRef and holds pickupCodeHash.", content_style))
    story.append(PageBreak())
    
    # ------------------ SLIDE 17: INDIVIDUAL CONTRIBUTIONS ------------------
    story.append(Paragraph("INDIVIDUAL CONTRIBUTIONS TO THE WORK (Slide 17)", slide_header_style))
    story.append(Paragraph("<b>PRAVEEN M (231CS265) — Front End Developer:</b>", bold_content_style))
    story.append(Paragraph("• Built Vite React portal dashboards, Leaflet maps overlays, and route render visualizers.<br/>• Deployed modern segmented navigation controller selectors and CSS configurations.", content_style))
    story.append(Spacer(1, 15))
    story.append(Paragraph("<b>VASANTHAN V (231CS341) — Back End Developer:</b>", bold_content_style))
    story.append(Paragraph("• Built Express backend routes, role checking gates, and database schema layouts.<br/>• Set up isolated Mongoose sessions, HMAC-SHA256 hashing, timing-safe checks, and sweeper scheduler utilities.", content_style))
    story.append(PageBreak())
    
    # ------------------ SLIDE 18, 19, 20: PENDING WORKS, PUBLICATIONS & REF ------------------
    story.append(Paragraph("PENDING WORKS, PUBLICATIONS & REFERENCES (Slides 18, 19, 20)", slide_header_style))
    story.append(Paragraph("<b>Pending Works:</b>", bold_content_style))
    story.append(Paragraph("• Develop Admin dispute panels and link dispute resolutions directly to reputation scores.<br/>• Optimize viewport sizes for delivery collectors.", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Plan for Publications:</b>", bold_content_style))
    story.append(Paragraph("• Submit to IEEE International Conference on Advanced Computing Technologies (October 2025).<br/>• Submit to Journal of Humanitarian Logistics and Supply Chain Management (December 2025).", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Selected References:</b>", bold_content_style))
    story.append(Paragraph("[1] J. Gómez-Pantoja et al., 'The Food Bank Resource Allocation Problem,' TOP, 2021.<br/>[2] L. A. Ogazán et al., 'Planning Food-Bank Routing and Logistics,' Computers & Industrial Engineering, 2022.<br/>[3] A. F. Rivera et al., 'Food Banks’ Supply Chain Operations,' J. of Humanitarian Logistics, 2023.", content_style))
    
    doc.build(story)
    print("PDF presentation content compiled successfully!")

if __name__ == "__main__":
    create_presentation_pdf()
