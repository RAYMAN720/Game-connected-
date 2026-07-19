from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "14-diagrammi-completi.pdf"

PAGE_W, PAGE_H = landscape(A4)
MARGIN = 1.25 * cm
BLUE = colors.HexColor("#134a73")
CYAN = colors.HexColor("#24b7c5")
LIGHT = colors.HexColor("#edf6fb")
MID = colors.HexColor("#b9d3e5")
DARK = colors.HexColor("#1f2d3d")
GREEN = colors.HexColor("#2c7a4b")
ORANGE = colors.HexColor("#c46a20")
PURPLE = colors.HexColor("#6157a6")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="Small", fontName="Helvetica", fontSize=8.5, leading=10.5, textColor=DARK))
styles.add(ParagraphStyle(name="Tiny", fontName="Helvetica", fontSize=7.3, leading=8.8, textColor=DARK))


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
    c.drawString(MARGIN, 0.75 * cm, "PlayConnect - Diagrammi completi")
    c.drawRightString(PAGE_W - MARGIN, 0.75 * cm, f"{page}")


def wrap_text(text, width, font="Helvetica", size=8):
    words = text.split()
    lines = []
    line = ""
    for word in words:
        trial = f"{line} {word}".strip()
        if stringWidth(trial, font, size) <= width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def box(c, x, y, w, h, title, body=None, fill=LIGHT, stroke=MID, title_color=BLUE, size=8.5):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(1)
    c.roundRect(x, y, w, h, 5, fill=1, stroke=1)
    c.setFillColor(title_color)
    c.setFont("Helvetica-Bold", size)
    title_lines = wrap_text(title, w - 0.35 * cm, "Helvetica-Bold", size)
    ty = y + h - 0.38 * cm
    for line in title_lines[:2]:
        c.drawString(x + 0.18 * cm, ty, line)
        ty -= 0.32 * cm
    if body:
        c.setFillColor(DARK)
        c.setFont("Helvetica", size - 1)
        by = ty - 0.08 * cm
        for line in wrap_text(body, w - 0.35 * cm, "Helvetica", size - 1)[:5]:
            c.drawString(x + 0.18 * cm, by, line)
            by -= 0.27 * cm


def arrow(c, x1, y1, x2, y2, label=None, color=DARK):
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(1.1)
    c.line(x1, y1, x2, y2)
    dx = x2 - x1
    dy = y2 - y1
    if abs(dx) >= abs(dy):
        sign = 1 if dx >= 0 else -1
        pts = [(x2, y2), (x2 - sign * 7, y2 + 4), (x2 - sign * 7, y2 - 4)]
    else:
        sign = 1 if dy >= 0 else -1
        pts = [(x2, y2), (x2 - 4, y2 - sign * 7), (x2 + 4, y2 - sign * 7)]
    p = c.beginPath()
    p.moveTo(*pts[0])
    p.lineTo(*pts[1])
    p.lineTo(*pts[2])
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    if label:
        c.setFont("Helvetica", 7)
        c.setFillColor(color)
        c.drawCentredString((x1 + x2) / 2, (y1 + y2) / 2 + 0.12 * cm, label)


def page_index(c):
    header(c, "Diagrammi completi", "1 / 11")
    y = PAGE_H - 4.0 * cm
    items = [
        "1. Casi d'uso",
        "2. Diagramma del dominio",
        "3. Diagramma dei package",
        "4. Classi e moduli di implementazione",
        "5. Microservizi: input, output e logica",
        "6. Sequenza login",
        "7. Sequenza partita MQTT",
        "8. Sequenza offline e sincronizzazione",
        "9. Sequenza torneo",
        "10. Deployment Docker",
    ]
    c.setFillColor(DARK)
    c.setFont("Helvetica", 13)
    c.drawString(MARGIN, y, "Versione grafica renderizzata dei diagrammi del progetto.")
    y -= 0.75 * cm
    c.setFillColor(colors.HexColor("#f7fafc"))
    c.setStrokeColor(MID)
    c.roundRect(MARGIN, y - 6.0 * cm, PAGE_W - 2 * MARGIN, 6.3 * cm, 6, fill=1, stroke=1)
    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(MARGIN + 0.5 * cm, y - 0.2 * cm, "Indice")
    c.setFillColor(DARK)
    c.setFont("Helvetica", 11)
    for i, item in enumerate(items):
        c.drawString(MARGIN + 0.8 * cm, y - (0.9 + i * 0.48) * cm, item)
    c.setFillColor(colors.HexColor("#56616d"))
    c.setFont("Helvetica", 9)
    c.drawString(MARGIN, 2.5 * cm, "Il file docs/03-diagrammi.pdf conserva la versione testuale Mermaid.")
    c.drawString(MARGIN, 2.1 * cm, "Questo documento e pensato per la relazione e la discussione orale.")


def page_use_cases(c):
    header(c, "1. Casi d'uso", "2 / 11")
    actors = [
        ("Giocatore", ["Vedere giochi", "Vedere partite", "Statistiche", "Tornei"]),
        ("Admin locale", ["Giochi locale", "Edge e sensori", "Attuatori", "Squadre", "Partite"]),
        ("Admin gioco", ["Tipi di gioco", "Regole eventi", "Modelli sensore"]),
        ("Admin piattaforma", ["Locali", "Utenti", "Tornei", "Statistiche globali"]),
    ]
    left = MARGIN
    top = PAGE_H - 4.2 * cm
    actor_w = 4.2 * cm
    use_w = 4.6 * cm
    colors_by = [GREEN, ORANGE, PURPLE, BLUE]
    for idx, (actor, cases) in enumerate(actors):
        y = top - idx * 3.25 * cm
        box(c, left, y, actor_w, 1.05 * cm, actor, fill=colors.HexColor("#f8fbfd"), stroke=colors_by[idx], title_color=colors_by[idx], size=9)
        for j, use_case in enumerate(cases):
            x = left + actor_w + 1.1 * cm + (j % 3) * (use_w + 0.8 * cm)
            yy = y + (0.35 if j < 3 else -0.65) * cm
            box(c, x, yy, use_w, 0.82 * cm, use_case, fill=colors.white, stroke=MID, title_color=DARK, size=8)
            arrow(c, left + actor_w, y + 0.52 * cm, x, yy + 0.41 * cm, color=colors_by[idx])


def page_domain(c):
    header(c, "2. Diagramma del dominio", "3 / 11")
    nodes = [
        ("Locale", "name, city, address", 1, 3),
        ("User", "username, role, locale_id", 0, 2),
        ("Game", "name, type, status", 2, 2),
        ("GameType", "rules, score_limit", 3, 3),
        ("SensorTemplate", "event_type", 4, 2),
        ("EdgeDevice", "status, last_sync", 1, 1),
        ("Sensor", "sensor_type, topic", 2, 0),
        ("Actuator", "type, state, topic", 3, 0),
        ("Match", "scores, status", 4, 1),
        ("MatchEvent", "uuid, sync_status", 5, 0),
        ("Tournament", "game_type, mode", 5, 3),
        ("Team", "name, locale_id", 0, 0),
    ]
    x0, y0 = MARGIN, 3.15 * cm
    bw, bh = 4.0 * cm, 1.3 * cm
    gapx, gapy = 0.45 * cm, 1.25 * cm
    pos = {}
    for name, body, col, row in nodes:
        x = x0 + col * (bw + gapx)
        y = y0 + row * (bh + gapy)
        pos[name] = (x, y)
        box(c, x, y, bw, bh, name, body, fill=colors.white, stroke=MID, size=8)
    rels = [
        ("Locale", "User", "1..*"), ("Locale", "Game", "1..*"), ("Locale", "EdgeDevice", "1..*"),
        ("Locale", "Team", "1..*"), ("GameType", "Game", "1..*"), ("GameType", "SensorTemplate", "1..*"),
        ("EdgeDevice", "Sensor", "1..*"), ("EdgeDevice", "Actuator", "1..*"), ("Game", "Match", "1..*"),
        ("Match", "MatchEvent", "1..*"), ("Tournament", "Match", "matches"), ("Tournament", "Team", "teams"),
    ]
    for a, b, lab in rels:
        ax, ay = pos[a]
        bx, by = pos[b]
        arrow(c, ax + bw / 2, ay + bh / 2, bx + bw / 2, by + bh / 2, lab, color=colors.HexColor("#5a6b7c"))


def page_packages(c):
    header(c, "3. Diagramma dei package", "4 / 11")
    packages = [
        ("Frontend", "HTML pages\nBrowser JS\nCSS", MARGIN, 12.3 * cm, 5.1 * cm, 2.3 * cm, BLUE),
        ("API Gateway", "Routing REST\nHealth check", 7.0 * cm, 12.3 * cm, 5.0 * cm, 2.3 * cm, PURPLE),
        ("Backend services", "Routes\nMiddleware\nControllers\nServices\nRules/Utils", 13.2 * cm, 11.5 * cm, 6.2 * cm, 3.1 * cm, GREEN),
        ("Database", "db.js\nMySQL schema", 21.0 * cm, 12.3 * cm, 4.8 * cm, 2.3 * cm, ORANGE),
        ("Edge Service", "API locale\nCoda JSON\nMQTT client\nUI locale", 7.0 * cm, 6.3 * cm, 5.6 * cm, 3.0 * cm, BLUE),
        ("MQTT Broker", "Eventi sensori\nComandi attuatori\nHeartbeat", 14.5 * cm, 6.8 * cm, 5.8 * cm, 2.5 * cm, PURPLE),
    ]
    for title, body, x, y, w, h, col in packages:
        box(c, x, y, w, h, title, body.replace("\n", " - "), fill=colors.white, stroke=col, title_color=col, size=9)
    arrow(c, 6.1 * cm, 13.45 * cm, 7.0 * cm, 13.45 * cm, "REST")
    arrow(c, 12.0 * cm, 13.45 * cm, 13.2 * cm, 13.45 * cm, "forward")
    arrow(c, 19.4 * cm, 13.45 * cm, 21.0 * cm, 13.45 * cm, "SQL")
    arrow(c, 12.6 * cm, 7.75 * cm, 14.5 * cm, 7.95 * cm, "publish")
    arrow(c, 18.2 * cm, 9.3 * cm, 17.0 * cm, 11.5 * cm, "subscribe")
    arrow(c, 16.0 * cm, 11.5 * cm, 16.8 * cm, 9.3 * cm, "commands")


def page_modules(c):
    header(c, "4. Classi e moduli di implementazione", "5 / 11")
    cols = [
        ("Gateway", ["server.js", "serviceFor(path)", "forward request", "health"]),
        ("Catalog", ["authController", "userController", "localeController", "gameController", "deviceController"]),
        ("Match", ["matchController", "matchEventService", "actuatorService", "mqttClient"]),
        ("Tournament", ["tournamentController", "tournamentService", "tournamentRules", "statsController"]),
        ("Edge", ["simulator.js", "publishOrQueue", "syncQueue", "offline-queue.json"]),
    ]
    x = MARGIN
    w = (PAGE_W - 2 * MARGIN - 4 * 0.45 * cm) / 5
    for idx, (title, lines) in enumerate(cols):
        xx = x + idx * (w + 0.45 * cm)
        box(c, xx, 5.0 * cm, w, 9.7 * cm, title, fill=colors.white, stroke=[PURPLE, GREEN, GREEN, GREEN, BLUE][idx], title_color=[PURPLE, GREEN, GREEN, GREEN, BLUE][idx], size=10)
        c.setFont("Helvetica", 8.2)
        c.setFillColor(DARK)
        yy = 13.7 * cm
        for line in lines:
            c.drawString(xx + 0.25 * cm, yy, f"- {line}")
            yy -= 0.55 * cm
    arrow(c, MARGIN + w, 10.0 * cm, MARGIN + w + 0.45 * cm, 10.0 * cm, "REST")
    arrow(c, MARGIN + 2 * (w + 0.45 * cm) + w, 10.0 * cm, MARGIN + 3 * (w + 0.45 * cm), 10.0 * cm, "ranking")
    arrow(c, MARGIN + 4 * (w + 0.45 * cm), 8.0 * cm, MARGIN + 2 * (w + 0.45 * cm) + w, 8.0 * cm, "MQTT")


def page_microservices(c):
    header(c, "5. Microservizi: input, output e logica", "6 / 11")
    rows = [
        ("Catalog Service", "Input: auth, users, locales, games, game-types, devices", "Output: configurazione e inventario", "Logica: ruoli, ownership locale, sensori e attuatori"),
        ("Match Service", "Input: REST matches + eventi MQTT", "Output: match, eventi, punteggi, comandi attuatori", "Logica: UUID, deduplicazione, score, fine partita"),
        ("Tournament Service", "Input: tournaments, teams, statistics", "Output: calendario, ranking, statistiche", "Logica: compatibilita tipo/modalita/locale, classifica"),
        ("Edge Service", "Input: sensori simulati e comandi", "Output: MQTT QoS 1, coda offline, UI locale", "Logica: publishOrQueue, syncQueue, heartbeat"),
    ]
    y = 13.6 * cm
    for idx, (name, inp, out, logic) in enumerate(rows):
        col = [GREEN, BLUE, PURPLE, ORANGE][idx]
        box(c, MARGIN, y - 1.55 * cm, 5.4 * cm, 1.3 * cm, name, fill=colors.white, stroke=col, title_color=col, size=9)
        box(c, 7.4 * cm, y - 1.55 * cm, 5.6 * cm, 1.3 * cm, inp, fill=colors.HexColor("#fbfdff"), stroke=MID, title_color=DARK, size=7.5)
        box(c, 14.1 * cm, y - 1.55 * cm, 5.6 * cm, 1.3 * cm, out, fill=colors.HexColor("#fbfdff"), stroke=MID, title_color=DARK, size=7.5)
        box(c, 20.8 * cm, y - 1.55 * cm, 6.2 * cm, 1.3 * cm, logic, fill=colors.HexColor("#fbfdff"), stroke=MID, title_color=DARK, size=7.5)
        arrow(c, 6.4 * cm, y - 0.9 * cm, 7.4 * cm, y - 0.9 * cm, color=col)
        arrow(c, 13.0 * cm, y - 0.9 * cm, 14.1 * cm, y - 0.9 * cm, color=col)
        arrow(c, 19.7 * cm, y - 0.9 * cm, 20.8 * cm, y - 0.9 * cm, color=col)
        y -= 2.7 * cm


def sequence_page(c, title, page, participants, messages):
    header(c, title, page)
    x0 = MARGIN + 0.4 * cm
    usable = PAGE_W - 2 * MARGIN - 0.8 * cm
    top = 13.6 * cm
    bottom = 2.0 * cm
    spacing = usable / (len(participants) - 1)
    xs = []
    for i, p in enumerate(participants):
        x = x0 + i * spacing
        xs.append(x)
        box(c, x - 1.25 * cm, top, 2.5 * cm, 0.8 * cm, p, fill=colors.white, stroke=BLUE, size=7.5)
        c.setStrokeColor(colors.HexColor("#aab7c4"))
        c.setDash(3, 3)
        c.line(x, top, x, bottom)
        c.setDash()
    y = top - 1.0 * cm
    c.setFont("Helvetica", 7.4)
    for src, dst, label, col in messages:
        x1, x2 = xs[src], xs[dst]
        arrow(c, x1, y, x2, y, color=col)
        c.setFillColor(DARK)
        c.drawCentredString((x1 + x2) / 2, y + 0.16 * cm, label)
        y -= 0.75 * cm


def page_deployment(c):
    header(c, "10. Deployment Docker", "11 / 11")
    host_x, host_y, host_w, host_h = MARGIN, 2.0 * cm, PAGE_W - 2 * MARGIN, 12.4 * cm
    c.setFillColor(colors.HexColor("#f7fafc"))
    c.setStrokeColor(MID)
    c.roundRect(host_x, host_y, host_w, host_h, 8, fill=1, stroke=1)
    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(host_x + 0.4 * cm, host_y + host_h - 0.6 * cm, "Computer studente - docker compose")
    coords = {
        "Frontend :8080": (2.2, 11.3, BLUE),
        "API Gateway :3000": (9.5, 11.3, PURPLE),
        "Edge Service :8090": (20.0, 11.3, ORANGE),
        "Catalog :3001": (4.1, 7.4, GREEN),
        "Match :3002": (10.4, 7.4, GREEN),
        "Tournament :3003": (16.2, 7.4, GREEN),
        "MySQL :3306": (7.4, 3.7, BLUE),
        "Mosquitto :1883": (20.0, 3.7, PURPLE),
    }
    pos = {}
    for name, (xcm, ycm, col) in coords.items():
        x, y = xcm * cm, ycm * cm
        pos[name] = (x, y)
        box(c, x, y, 5.0 * cm, 1.15 * cm, name, fill=colors.white, stroke=col, title_color=col, size=8.5)
    arrow(c, pos["Frontend :8080"][0] + 5 * cm, pos["Frontend :8080"][1] + 0.6 * cm, pos["API Gateway :3000"][0], pos["API Gateway :3000"][1] + 0.6 * cm, "REST")
    for service in ["Catalog :3001", "Match :3002", "Tournament :3003"]:
        arrow(c, pos["API Gateway :3000"][0] + 2.5 * cm, pos["API Gateway :3000"][1], pos[service][0] + 2.5 * cm, pos[service][1] + 1.15 * cm)
        arrow(c, pos[service][0] + 2.5 * cm, pos[service][1], pos["MySQL :3306"][0] + 2.5 * cm, pos["MySQL :3306"][1] + 1.15 * cm, "SQL")
    arrow(c, pos["Edge Service :8090"][0] + 2.5 * cm, pos["Edge Service :8090"][1], pos["Mosquitto :1883"][0] + 2.5 * cm, pos["Mosquitto :1883"][1] + 1.15 * cm, "MQTT")
    arrow(c, pos["Match :3002"][0] + 5 * cm, pos["Match :3002"][1] + 0.55 * cm, pos["Mosquitto :1883"][0], pos["Mosquitto :1883"][1] + 1.0 * cm, "sub/pub")


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=landscape(A4))
    page_index(c)
    c.showPage()
    page_use_cases(c)
    c.showPage()
    page_domain(c)
    c.showPage()
    page_packages(c)
    c.showPage()
    page_modules(c)
    c.showPage()
    page_microservices(c)
    c.showPage()
    sequence_page(
        c,
        "6. Sequenza login",
        "7 / 11",
        ["Utente", "Browser", "Gateway", "Catalog", "MySQL"],
        [
            (0, 1, "username/password", BLUE),
            (1, 2, "POST /api/auth/login", BLUE),
            (2, 3, "forward", PURPLE),
            (3, 4, "SELECT user", GREEN),
            (4, 3, "utente + ruolo", GREEN),
            (3, 2, "JSON user", PURPLE),
            (2, 1, "response", BLUE),
            (1, 0, "dashboard ruolo", BLUE),
        ],
    )
    c.showPage()
    sequence_page(
        c,
        "7. Sequenza partita MQTT",
        "8 / 11",
        ["Admin locale", "Frontend", "Gateway", "Match", "Edge", "Broker", "MySQL"],
        [
            (0, 1, "avvia partita", BLUE),
            (1, 2, "POST /matches/start", BLUE),
            (2, 3, "forward", PURPLE),
            (3, 6, "INSERT match", GREEN),
            (3, 4, "POST /simulate", ORANGE),
            (4, 5, "publish evento QoS 1", ORANGE),
            (5, 3, "evento MQTT", PURPLE),
            (3, 6, "UUID + update score", GREEN),
            (3, 5, "comando attuatore", PURPLE),
            (5, 4, "display/LED", ORANGE),
        ],
    )
    c.showPage()
    sequence_page(
        c,
        "8. Sequenza offline e sincronizzazione",
        "9 / 11",
        ["Sensore", "Edge", "Coda JSON", "Broker", "Match", "MySQL"],
        [
            (0, 1, "evento locale", BLUE),
            (1, 2, "salva PENDING", ORANGE),
            (1, 3, "riconnessione", PURPLE),
            (2, 1, "legge coda", ORANGE),
            (1, 3, "ripubblica stesso UUID", PURPLE),
            (3, 4, "evento MQTT", PURPLE),
            (4, 5, "verifica UUID", GREEN),
            (4, 5, "salva una sola volta", GREEN),
            (1, 2, "svuota coda", ORANGE),
        ],
    )
    c.showPage()
    sequence_page(
        c,
        "9. Sequenza torneo",
        "10 / 11",
        ["Admin piattaforma", "Frontend", "Tournament", "MySQL", "Ranking"],
        [
            (0, 1, "crea torneo", BLUE),
            (1, 2, "POST /api/tournaments", BLUE),
            (2, 3, "INSERT tournament", GREEN),
            (2, 3, "INSERT locations/teams", GREEN),
            (0, 1, "collega partita", BLUE),
            (1, 2, "POST /tournaments/id/matches", BLUE),
            (2, 3, "verifica compatibilita", GREEN),
            (2, 3, "INSERT tournament_matches", GREEN),
            (2, 4, "calcola classifica", PURPLE),
            (4, 1, "punti e ranking", PURPLE),
        ],
    )
    c.showPage()
    page_deployment(c)
    c.save()
    print(OUT)


if __name__ == "__main__":
    main()
