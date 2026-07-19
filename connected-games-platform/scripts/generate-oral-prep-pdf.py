from pathlib import Path
import html
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    Preformatted,
    KeepTogether,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "17-preparation-orale.md"
OUTPUT = ROOT / "docs" / "17-preparation-orale.pdf"

BLUE = colors.HexColor("#194f7a")
LIGHT_BLUE = colors.HexColor("#e9f3fb")
GREEN = colors.HexColor("#1f7a5c")
LIGHT_GREEN = colors.HexColor("#e8f5ef")
AMBER = colors.HexColor("#8a5b00")
LIGHT_AMBER = colors.HexColor("#fff4d8")
GRAY = colors.HexColor("#3c4856")
LIGHT_GRAY = colors.HexColor("#f4f6f8")
LINE = colors.HexColor("#c8d7e2")


def clean(text):
    text = html.escape(text)
    text = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    return text


def blocks(text):
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line:
            i += 1
            continue
        if line.startswith("```"):
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1
            yield ("code", "\n".join(code))
            continue
        if line.startswith("|") and i + 1 < len(lines) and lines[i + 1].startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                if not re.match(r"^\|\s*-", lines[i]):
                    rows.append([c.strip() for c in lines[i].strip("|").split("|")])
                i += 1
            yield ("table", rows)
            continue
        if line.startswith("#"):
            level = len(line) - len(line.lstrip("#"))
            yield (f"h{min(level, 3)}", line[level:].strip())
            i += 1
            continue
        if line.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(lines[i][2:].strip())
                i += 1
            yield ("ul", items)
            continue
        if re.match(r"^\d+\. ", line):
            items = []
            while i < len(lines) and re.match(r"^\d+\. ", lines[i]):
                items.append(re.sub(r"^\d+\. ", "", lines[i]).strip())
                i += 1
            yield ("ol", items)
            continue
        para = [line]
        i += 1
        while (
            i < len(lines)
            and lines[i].strip()
            and not lines[i].startswith(("#", "- ", "```", "|"))
            and not re.match(r"^\d+\. ", lines[i])
        ):
            para.append(lines[i].strip())
            i += 1
        yield ("p", " ".join(para))


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(BLUE)
    canvas.rect(0, height - 1.05 * cm, width, 1.05 * cm, fill=True, stroke=False)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(1.4 * cm, height - 0.67 * cm, "PlayConnect - Preparazione orale")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(width - 1.4 * cm, height - 0.67 * cm, f"Pagina {doc.page}")
    canvas.setStrokeColor(LINE)
    canvas.line(1.4 * cm, 1.15 * cm, width - 1.4 * cm, 1.15 * cm)
    canvas.setFillColor(colors.HexColor("#667789"))
    canvas.setFont("Helvetica", 7.5)
    canvas.drawCentredString(width / 2, 0.72 * cm, "Fiche de revision - discussion laboratoire PISSIR")
    canvas.restoreState()


def cover(story, styles):
    title = Paragraph("Preparazione Orale", styles["CoverTitle"])
    sub = Paragraph("PlayConnect - Connected Games Platform", styles["CoverSub"])
    meta = Paragraph(
        "Objectif: savoir expliquer, demontrer et defendre le projet en discussion individuelle.",
        styles["CoverMeta"],
    )
    story.extend([Spacer(1, 3.0 * cm), title, Spacer(1, 0.25 * cm), sub, Spacer(1, 1.0 * cm), meta])
    chips = [
        ["REST", "MQTT", "Edge/offline"],
        ["Microservizi", "Docker", "MySQL"],
        ["Demo", "Codice", "Domande piege"],
    ]
    table = Table(chips, colWidths=[5.0 * cm, 5.0 * cm, 5.0 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BLUE),
                ("TEXTCOLOR", (0, 0), (-1, -1), BLUE),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.white),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.extend([Spacer(1, 1.0 * cm), table, PageBreak()])


def callout(text, styles, color=BLUE, background=LIGHT_BLUE):
    t = Table([[Paragraph(clean(text), styles["Callout"])]], colWidths=[17.0 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.8, color),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return t


def build():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("CoverTitle", parent=styles["Title"], fontSize=30, leading=36, textColor=BLUE, alignment=TA_CENTER))
    styles.add(ParagraphStyle("CoverSub", parent=styles["Heading2"], fontSize=16, leading=20, textColor=GRAY, alignment=TA_CENTER))
    styles.add(ParagraphStyle("CoverMeta", parent=styles["BodyText"], fontSize=11, leading=15, textColor=GRAY, alignment=TA_CENTER))
    styles.add(ParagraphStyle("H1", parent=styles["Heading1"], fontSize=17, leading=21, textColor=BLUE, spaceBefore=14, spaceAfter=8))
    styles.add(ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, leading=16, textColor=GREEN, spaceBefore=10, spaceAfter=6))
    styles.add(ParagraphStyle("H3", parent=styles["Heading3"], fontSize=11, leading=14, textColor=AMBER, spaceBefore=8, spaceAfter=4))
    styles.add(ParagraphStyle("Body", parent=styles["BodyText"], fontSize=9.2, leading=12.3, textColor=colors.black, spaceAfter=5))
    styles.add(ParagraphStyle("OralBullet", parent=styles["Body"], leftIndent=13, firstLineIndent=-8, spaceAfter=3))
    styles.add(ParagraphStyle("Callout", parent=styles["Body"], fontSize=9.4, leading=12.8, textColor=colors.black, spaceAfter=0))
    styles.add(ParagraphStyle("CodeSmall", parent=styles["Code"], fontName="Courier", fontSize=8.0, leading=10.0, backColor=LIGHT_GRAY, borderColor=LINE, borderWidth=0.3, borderPadding=5))

    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=1.35 * cm,
        rightMargin=1.35 * cm,
        topMargin=1.45 * cm,
        bottomMargin=1.35 * cm,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height - 0.35 * cm, id="normal")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=header_footer)])

    story = []
    cover(story, styles)
    first = True
    for kind, value in blocks(SOURCE.read_text(encoding="utf-8")):
        if kind == "h1":
            if not first:
                story.append(PageBreak())
            first = False
            story.append(Paragraph(clean(value), styles["H1"]))
        elif kind == "h2":
            story.append(Paragraph(clean(value), styles["H1"]))
        elif kind == "h3":
            story.append(Paragraph(clean(value), styles["H2"]))
        elif kind == "p":
            if value.startswith("Obiettivo:") or value.startswith("Frase chiave:") or value.startswith("Risultati attesi:"):
                story.append(callout(value, styles, GREEN, LIGHT_GREEN))
                story.append(Spacer(1, 0.15 * cm))
            elif value.startswith("Regola:") or value.startswith("Ultima checklist:"):
                story.append(callout(value, styles, AMBER, LIGHT_AMBER))
                story.append(Spacer(1, 0.15 * cm))
            else:
                story.append(Paragraph(clean(value), styles["Body"]))
        elif kind == "ul":
            for item in value:
                story.append(Paragraph("- " + clean(item), styles["OralBullet"]))
        elif kind == "ol":
            for idx, item in enumerate(value, 1):
                story.append(Paragraph(f"{idx}. {clean(item)}", styles["OralBullet"]))
        elif kind == "code":
            story.append(Preformatted(value, styles["CodeSmall"]))
            story.append(Spacer(1, 0.16 * cm))
        elif kind == "table":
            rows = [[Paragraph(clean(c), styles["Body"]) for c in row] for row in value]
            table = Table(rows, repeatRows=1, colWidths=[6.0 * cm, 11.0 * cm])
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BLUE),
                        ("TEXTCOLOR", (0, 0), (-1, 0), BLUE),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ]
                )
            )
            story.append(table)
            story.append(Spacer(1, 0.25 * cm))

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build()
