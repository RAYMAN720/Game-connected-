from pathlib import Path
import runpy

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "03-diagrammi.pdf"
COMMON = runpy.run_path(str(Path(__file__).with_name("generate-diagrammi-completi.py")))

PAGE_W, PAGE_H = landscape(A4)
MARGIN = COMMON["MARGIN"]
BLUE = COMMON["BLUE"]
CYAN = COMMON["CYAN"]
LIGHT = COMMON["LIGHT"]
MID = COMMON["MID"]
DARK = COMMON["DARK"]
GREEN = COMMON["GREEN"]
ORANGE = COMMON["ORANGE"]
PURPLE = COMMON["PURPLE"]
box = COMMON["box"]
arrow = COMMON["arrow"]


def header(c, title, page):
    c.setFillColor(LIGHT)
    c.setStrokeColor(MID)
    c.roundRect(MARGIN, PAGE_H - 1.55 * cm, PAGE_W - 2 * MARGIN, 0.75 * cm, 6, fill=1, stroke=1)
    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 0.35 * cm, PAGE_H - 1.08 * cm, "PLAYCONNECT")
    c.setFillColor(DARK)
    c.setFont("Helvetica", 10.5)
    c.drawRightString(PAGE_W - MARGIN - 0.35 * cm, PAGE_H - 1.08 * cm, "Documentazione tecnica PISSIR - A.A. 2025/2026")
    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(MARGIN, PAGE_H - 2.55 * cm, title)
    c.setStrokeColor(CYAN)
    c.setLineWidth(2)
    c.line(MARGIN, PAGE_H - 2.85 * cm, PAGE_W - MARGIN, PAGE_H - 2.85 * cm)
    c.setFillColor(colors.HexColor("#56616d"))
    c.setFont("Helvetica", 8)
    c.drawString(MARGIN, 0.75 * cm, "PlayConnect - Diagrammi principali")
    c.drawRightString(PAGE_W - MARGIN, 0.75 * cm, page)


def page_index(c):
    header(c, "Diagrammi principali", "1 / 5")
    c.setFillColor(DARK)
    c.setFont("Helvetica", 13)
    c.drawString(MARGIN, PAGE_H - 4.0 * cm, "Sintesi grafica dei diagrammi richiesti dal progetto PISSIR.")
    c.setFillColor(colors.HexColor("#f7fafc"))
    c.setStrokeColor(MID)
    c.roundRect(MARGIN, 6.7 * cm, PAGE_W - 2 * MARGIN, 7.2 * cm, 6, fill=1, stroke=1)
    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(MARGIN + 0.5 * cm, 13.1 * cm, "Contenuto")
    c.setFillColor(DARK)
    c.setFont("Helvetica", 11)
    items = [
        "1. Casi d'uso e ruoli",
        "2. Diagramma del dominio",
        "3. Package e architettura dei microservizi",
        "4. Sequenze principali: login, partita MQTT, offline, torneo",
    ]
    for i, item in enumerate(items):
        c.drawString(MARGIN + 0.8 * cm, 12.1 * cm - i * 0.8 * cm, item)
    c.setFillColor(colors.HexColor("#56616d"))
    c.setFont("Helvetica", 9)
    c.drawString(MARGIN, 4.0 * cm, "Per la versione estesa usare docs/14-diagrammi-completi.pdf.")


def page_use_cases(c):
    header(c, "1. Casi d'uso e ruoli", "2 / 5")
    actors = [
        ("Giocatore", ["Giochi", "Partite", "Statistiche", "Tornei"], GREEN),
        ("Admin locale", ["Giochi locale", "Edge/sensori", "Attuatori", "Squadre", "Partite"], ORANGE),
        ("Admin gioco", ["Tipi di gioco", "Regole eventi", "Modelli sensore"], PURPLE),
        ("Admin piattaforma", ["Locali", "Utenti", "Tornei", "Statistiche globali"], BLUE),
    ]
    top = PAGE_H - 4.0 * cm
    actor_w, use_w = 4.3 * cm, 4.5 * cm
    for i, (actor, cases, col) in enumerate(actors):
        y = top - i * 3.2 * cm
        box(c, MARGIN, y, actor_w, 1.0 * cm, actor, fill=colors.white, stroke=col, title_color=col, size=9)
        for j, use_case in enumerate(cases):
            x = MARGIN + actor_w + 1.0 * cm + (j % 3) * (use_w + 0.75 * cm)
            yy = y + (0.32 if j < 3 else -0.68) * cm
            box(c, x, yy, use_w, 0.8 * cm, use_case, fill=colors.HexColor("#fbfdff"), stroke=MID, title_color=DARK, size=8)
            arrow(c, MARGIN + actor_w, y + 0.5 * cm, x, yy + 0.4 * cm, color=col)


def page_domain(c):
    header(c, "2. Diagramma del dominio", "3 / 5")
    nodes = {
        "Locale": (3.0, 12.5, "name, city, address"),
        "User": (1.3, 9.3, "username, role"),
        "Game": (8.0, 9.3, "type, status"),
        "GameType": (11.7, 12.5, "rules, score limit"),
        "EdgeDevice": (5.0, 6.4, "status, last sync"),
        "Sensor": (9.0, 4.1, "event, topic"),
        "Actuator": (13.0, 4.1, "state, topic"),
        "Match": (16.8, 7.2, "score, status"),
        "MatchEvent": (21.5, 4.1, "uuid, sync"),
        "Tournament": (21.5, 12.5, "game type, mode"),
        "Team": (1.3, 4.1, "members"),
    }
    w, h = 3.6 * cm, 1.05 * cm
    centers = {}
    for name, (xcm, ycm, body) in nodes.items():
        x, y = xcm * cm, ycm * cm
        centers[name] = (x + w / 2, y + h / 2)
        box(c, x, y, w, h, name, body, fill=colors.white, stroke=MID, title_color=BLUE, size=7.8)
    rels = [
        ("Locale", "User", "1..*"), ("Locale", "Game", "1..*"), ("Locale", "EdgeDevice", "1..*"),
        ("Locale", "Team", "1..*"), ("GameType", "Game", "1..*"), ("EdgeDevice", "Sensor", "1..*"),
        ("EdgeDevice", "Actuator", "1..*"), ("Game", "Match", "1..*"), ("Match", "MatchEvent", "1..*"),
        ("Tournament", "Match", "partite"), ("Tournament", "Team", "squadre"),
    ]
    for a, b, label in rels:
        x1, y1 = centers[a]
        x2, y2 = centers[b]
        arrow(c, x1, y1, x2, y2, label, color=colors.HexColor("#5a6b7c"))


def page_architecture(c):
    header(c, "3. Package e architettura", "4 / 5")
    boxes = {
        "Frontend :8080": (1.6, 12.1, BLUE),
        "API Gateway :3000": (8.2, 12.1, PURPLE),
        "Catalog Service": (3.0, 8.0, GREEN),
        "Match Service": (9.0, 8.0, GREEN),
        "Tournament Service": (15.0, 8.0, GREEN),
        "Edge Service :8090": (21.0, 12.1, ORANGE),
        "MySQL :3306": (6.2, 4.0, BLUE),
        "Mosquitto :1883": (18.0, 4.0, PURPLE),
    }
    w, h = 4.6 * cm, 1.1 * cm
    pos = {}
    for name, (xcm, ycm, col) in boxes.items():
        x, y = xcm * cm, ycm * cm
        pos[name] = (x, y)
        box(c, x, y, w, h, name, fill=colors.white, stroke=col, title_color=col, size=8.4)
    arrow(c, pos["Frontend :8080"][0] + w, pos["Frontend :8080"][1] + h / 2, pos["API Gateway :3000"][0], pos["API Gateway :3000"][1] + h / 2, "REST")
    for service in ["Catalog Service", "Match Service", "Tournament Service"]:
        arrow(c, pos["API Gateway :3000"][0] + w / 2, pos["API Gateway :3000"][1], pos[service][0] + w / 2, pos[service][1] + h)
        arrow(c, pos[service][0] + w / 2, pos[service][1], pos["MySQL :3306"][0] + w / 2, pos["MySQL :3306"][1] + h, "SQL")
    arrow(c, pos["Edge Service :8090"][0] + w / 2, pos["Edge Service :8090"][1], pos["Mosquitto :1883"][0] + w / 2, pos["Mosquitto :1883"][1] + h, "MQTT")
    arrow(c, pos["Match Service"][0] + w, pos["Match Service"][1] + h / 2, pos["Mosquitto :1883"][0], pos["Mosquitto :1883"][1] + h, "eventi/comandi")


def sequence_row(c, y, title, steps, color):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN, y + 0.45 * cm, title)
    x = MARGIN + 4.0 * cm
    w, h = 3.8 * cm, 0.85 * cm
    for i, step in enumerate(steps):
        box(c, x + i * (w + 0.75 * cm), y, w, h, step, fill=colors.white, stroke=color, title_color=DARK, size=7.2)
        if i:
            arrow(c, x + i * (w + 0.75 * cm) - 0.75 * cm, y + h / 2, x + i * (w + 0.75 * cm), y + h / 2, color=color)


def page_sequences(c):
    header(c, "4. Sequenze principali", "5 / 5")
    sequence_row(c, 12.2 * cm, "Login", ["Browser", "Gateway", "Catalog", "MySQL", "Dashboard"], BLUE)
    sequence_row(c, 9.2 * cm, "Partita MQTT", ["Start match", "Edge simulate", "Broker", "Match update", "Attuatore"], GREEN)
    sequence_row(c, 6.2 * cm, "Offline sync", ["Evento", "Coda JSON", "Online", "Stesso UUID", "Deduplica"], ORANGE)
    sequence_row(c, 3.2 * cm, "Torneo", ["Crea torneo", "Locali/team", "Partite", "Ranking", "Statistiche"], PURPLE)


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=landscape(A4))
    for page in [page_index, page_use_cases, page_domain, page_architecture, page_sequences]:
        page(c)
        c.showPage()
    c.save()
    print(OUT)


if __name__ == "__main__":
    main()
