rooms = [
 ("balcony","Балкон","5,2","130,545 175,515 175,605 130,605",(152,585),True),
 ("kids","Детская","18,5","175,512 300,512 300,615 175,615",(237,563),False),
 ("bath","Ванная","4,1","300,512 318,492 336,480 354,492 372,512 372,568 300,568",(336,522),False),
 ("corridor2","","","300,568 372,568 372,615 300,615",(0,0),False),
 ("corridor","Коридор","18,2","300,615 372,615 372,720 300,720",(336,665),False),
 ("bedroom","Спальня","22,0","372,512 505,512 505,615 372,615",(438,563),False),
 ("hall","Зал","28,2","125,615 300,615 300,720 125,720",(212,667),False),
 ("kitchen","Кухня","21,3","125,720 230,720 230,825 95,825 95,750",(145,764),False),
 ("storage","Кладовка","3,6","230,775 285,775 285,825 230,825",(257,810),False),
 ("wc","WC","1,4","285,775 320,775 320,825 285,825",(302,810),False),
 ("entry","Прихожая","15,4","230,720 370,720 370,825 320,825 320,775 230,775",(345,803),False),
]
SIDE_ROOMS = [("Зал", 5, "mdi:sofa"), ("Кухня", 1, "mdi:stove"), ("Спальня", 4, "mdi:bed-king"),
              ("Детская", 8, "mdi:teddy-bear"), ("Прихожая", 7, "mdi:door"), ("Коридор", 6, "mdi:walk"),
              ("Малый коридор", 2, "mdi:walk"), ("Проход к кухне", 3, "mdi:walk")]
themes = {
 "dark": dict(bg="#1c1c1c", room="#262a31", balcony="#1a1d22", wall="#4a505c", text="#e6e6e6", sub="#8b919c", win="#5aa9e6"),
 "light":dict(bg="#ffffff", room="#f1f3f6", balcony="#e6e9ee", wall="#b8bdc6", text="#1f2328", sub="#6b7280", win="#3b8fd9"),
}
windows = [(130,560,130,595),(175,548,175,600),(505,535,505,590),(125,640,125,695),(95,760,95,815),(100,745,122,724)]
openings=[
 ("door","v",300,585,609,1,"a"),   # детская: наружу в коридор, к ванной
 ("door","v",372,585,609,-1,"a"),  # спальня: наружу в коридор, к ванной
 ("door","h",568,324,348,-1,"b"),  # ванная
 ("slide","v",300,640,690,0,""),   # зал-коридор: купе
 ("door","v",230,730,756,1,"a"),   # кухня: в прихожую, к залу
 ("door","h",775,260,282,-1,"a"),  # кладовка: наружу, к кухне
 ("door","h",775,293,313,-1,"a"),  # WC: наружу, к кухне
 ("door","h",825,336,364,1,"b"),   # входная: наружу, петли справа
 ("door","v",175,518,540,1,"a"),   # балкон: внутрь детской, к верху
 ("arch","h",615,310,362,0,""),
 ("arch","h",720,312,362,0,""),
 ("door","h",720,178,204,1,"b"),    # зал-кухня: проход
]
for name,c in themes.items():
    o=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 465 620 395" font-family="Roboto, Segoe UI, sans-serif">',
       f'<rect x="-10" y="465" width="620" height="395" fill="{c["bg"]}"/>']
    for rid,label,area,pts,(x,y),balc in rooms:
        o.append(f'<polygon id="{rid}" points="{pts}" fill="{c["balcony"] if balc else c["room"]}" stroke="{c["wall"]}" stroke-width="4" stroke-linejoin="round"/>')
    for x1,y1,x2,y2 in windows:
        o.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c["win"]}" stroke-width="3" stroke-linecap="round"/>')
    for kind,orient,c0,a,b,d,hg in openings:
        P=(lambda t:(c0,t)) if orient=="v" else (lambda t:(t,c0))
        (x1,y1),(x2,y2)=P(a),P(b)
        o.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c["room"]}" stroke-width="5"/>')
        w=b-a
        if kind=="door":
            H,E=(P(a),P(b)) if hg=="a" else (P(b),P(a))
            O=(H[0]+d*w,H[1]) if orient=="v" else (H[0],H[1]+d*w)
            cr=(O[0]-H[0])*(E[1]-H[1])-(O[1]-H[1])*(E[0]-H[0])
            o.append(f'<path d="M{H[0]} {H[1]} L{O[0]} {O[1]} A{w} {w} 0 0 {1 if cr>0 else 0} {E[0]} {E[1]}" fill="none" stroke="{c["sub"]}" stroke-width="1"/>')
        elif kind=="slide":
            m=(a+b)/2
            o.append(f'<line x1="{c0-2}" y1="{a}" x2="{c0-2}" y2="{m+3}" stroke="{c["sub"]}" stroke-width="2"/>')
            o.append(f'<line x1="{c0+2}" y1="{m-3}" x2="{c0+2}" y2="{b}" stroke="{c["sub"]}" stroke-width="2"/>')
        else:
            o.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c["sub"]}" stroke-width="1" stroke-dasharray="3 3"/>')
    for rid,label,area,pts,(x,y),balc in rooms:
        if not label: continue
        small = rid in ("wc","storage","bath","balcony")
        fs = 7 if small else 9 if rid=="entry" else 11  # entry label sits in the narrow leg of the L
        if rid=="balcony":
            o.append(f'<text x="{x}" y="{y}" font-size="7" fill="{c["sub"]}" text-anchor="middle" transform="rotate(-90 {x} {y})">{label}</text>')
            continue
        o.append(f'<text x="{x}" y="{y+fs*0.35:.0f}" font-size="{fs}" font-weight="500" fill="{c["text"]}" text-anchor="middle">{label}</text>')
    # Side panels (plan is x 80..520; panels -10..80 and 520..610): captions and button plates.
    # Clickable areas and icons are picture-elements on top (card.yaml), positions from SIDE_* below.
    def cap(x, y, t):
        o.append(f'<text x="{x}" y="{y}" font-size="8" font-weight="600" fill="{c["sub"]}" text-anchor="middle" letter-spacing=".6">{t}</text>')
    def btn(x0, yc, t):
        o.append(f'<rect x="{x0}" y="{yc-14}" width="74" height="28" rx="6" fill="{c["room"]}" stroke="{c["wall"]}" stroke-width="1"/>')
        fs = 8.5 if len(t) <= 9 else 7  # long captions ("Малый коридор") must fit next to the icon
        o.append(f'<text x="{x0+45}" y="{yc+3}" font-size="{fs}" fill="{c["text"]}" text-anchor="middle">{t}</text>')
    def hbtn(x0, yc, t):  # half-width plate, two per row
        o.append(f'<rect x="{x0}" y="{yc-14}" width="36" height="28" rx="6" fill="{c["room"]}" stroke="{c["wall"]}" stroke-width="1"/>')
        o.append(f'<text x="{x0+25}" y="{yc+3}" font-size="8" fill="{c["text"]}" text-anchor="middle">{t}</text>')
    cap(35, 492, "УБОРКА")
    for i, (t, _seg, _icon) in enumerate(SIDE_ROOMS):
        btn(-2, 514 + 33*i, t)
    cap(565, 492, "ПОГОДА")
    cap(565, 548, "КАМЕРА")
    cap(565, 628, "СВЕТ")
    hbtn(528, 660, "Вкл")
    hbtn(566, 660, "Выкл")
    cap(565, 692, "ПЫЛЕСОС")
    btn(528, 742, "Старт")
    btn(528, 775, "Пауза")
    btn(528, 808, "На базу")
    o.append('</svg>')
    open(f"floorplan-{name}.svg","w").write("\n".join(o))

# Room light overlays for picture-elements (same viewBox as the plan, shown on top when a light is on).
HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="80 465 440 395">'
glow = {"bath": "vannaia", "corridor2": "koridor"}
open("fp-empty.svg", "w").write(HEAD + '</svg>')
for rid, name in glow.items():
    pts = next(r[3] for r in rooms if r[0] == rid)
    open(f"fp-light-{name}.svg", "w").write(
        HEAD + f'<polygon points="{pts}" fill="#ffc107" fill-opacity=".38" stroke="#ffc107" stroke-opacity=".7" stroke-width="2"/></svg>')

# Main corridor (11,2): chandelier = room fill, perimeter lights = glowing inset outline.
cor = next(r[3] for r in rooms if r[0] == "corridor")
open("fp-light-koridor-main.svg", "w").write(
    HEAD + f'<polygon points="{cor}" fill="#ffc107" fill-opacity=".38" stroke="#ffc107" stroke-opacity=".7" stroke-width="2"/></svg>')
open("fp-light-koridor-perim.svg", "w").write(
    HEAD + '<rect x="307" y="622" width="58" height="91" rx="4" fill="none" stroke="#ffc107" stroke-opacity=".25" stroke-width="7"/>'
    '<rect x="307" y="622" width="58" height="91" rx="4" fill="none" stroke="#ffd54f" stroke-width="2"/></svg>')

# Entry hall (L-shaped): perimeter lights = glowing inset outline; WC = room fill.
ent_in = "237,727 363,727 363,818 327,818 327,768 237,768"
open("fp-light-prikhozhaia-perim.svg", "w").write(
    HEAD + f'<polygon points="{ent_in}" fill="none" stroke="#ffc107" stroke-opacity=".25" stroke-width="7" stroke-linejoin="round"/>'
    f'<polygon points="{ent_in}" fill="none" stroke="#ffd54f" stroke-width="2" stroke-linejoin="round"/></svg>')
wc = next(r[3] for r in rooms if r[0] == "wc")
open("fp-light-tualet.svg", "w").write(
    HEAD + f'<polygon points="{wc}" fill="#ffc107" fill-opacity=".38" stroke="#ffc107" stroke-opacity=".7" stroke-width="2"/></svg>')

# Entry hall chandelier = fill of the whole hall.
ent = next(r[3] for r in rooms if r[0] == "entry")
open("fp-light-prikhozhaia-main.svg", "w").write(
    HEAD + f'<polygon points="{ent}" fill="#ffc107" fill-opacity=".38" stroke="#ffc107" stroke-opacity=".7" stroke-width="2"/></svg>')

# Storage room light = room fill.
st = next(r[3] for r in rooms if r[0] == "storage")
open("fp-light-kladovka.svg", "w").write(
    HEAD + f'<polygon points="{st}" fill="#ffc107" fill-opacity=".38" stroke="#ffc107" stroke-opacity=".7" stroke-width="2"/></svg>')

# Kitchen: chandelier over the table = small glow at the table (TABLE), perimeter lights light the whole
# kitchen = room fill + glowing inset outline.
kit = next(r[3] for r in rooms if r[0] == "kitchen")
TABLE = (195, 795)
tx, ty = TABLE
open("fp-light-kukhnia-main.svg", "w").write(
    HEAD + f'<circle cx="{tx}" cy="{ty}" r="26" fill="#ffc107" fill-opacity=".18"/>'
    f'<circle cx="{tx}" cy="{ty}" r="17" fill="#ffc107" fill-opacity=".3"/>'
    f'<circle cx="{tx}" cy="{ty}" r="9" fill="#ffd54f" fill-opacity=".45"/></svg>')
kit_in = "130,727 223,727 223,818 102,818 102,754"
open("fp-light-kukhnia-perim.svg", "w").write(
    HEAD + f'<polygon points="{kit}" fill="#ffc107" fill-opacity=".3"/>'
    f'<polygon points="{kit_in}" fill="none" stroke="#ffc107" stroke-opacity=".25" stroke-width="7" stroke-linejoin="round"/>'
    f'<polygon points="{kit_in}" fill="none" stroke="#ffd54f" stroke-width="2" stroke-linejoin="round"/></svg>')

# Camera C700: small corridor next to the bath, looking at the entrance door. Faint field-of-view cone,
# always shown (static overlay, not tied to a state).
CAM = (336, 609)
cx, cy = CAM
open("fp-camera-fov.svg", "w").write(
    HEAD + f'<polygon points="{cx},{cy} 330,825 370,825" fill="#4fc3f7" fill-opacity=".10" stroke="#4fc3f7" '
    f'stroke-opacity=".35" stroke-width="1" stroke-dasharray="3 3"/></svg>')

# Living room (Зал) main light = room fill.
zal = next(r[3] for r in rooms if r[0] == "hall")
open("fp-light-zal.svg", "w").write(
    HEAD + f'<polygon points="{zal}" fill="#ffc107" fill-opacity=".38" stroke="#ffc107" stroke-opacity=".7" stroke-width="2"/></svg>')

# Bedroom main light (Yeelight) = room fill.
bed = next(r[3] for r in rooms if r[0] == "bedroom")
open("fp-light-spalnia.svg", "w").write(
    HEAD + f'<polygon points="{bed}" fill="#ffc107" fill-opacity=".38" stroke="#ffc107" stroke-opacity=".7" stroke-width="2"/></svg>')

# Camera motion frame: drawn around the camera snapshot on the right panel (conditional element in card.yaml).
open("fp-camera-motion.svg", "w").write(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 48"><rect x="1.5" y="1.5" width="77" height="45" rx="6" '
    'fill="none" stroke="#ff5252" stroke-width="3"/></svg>')

# Motion (Xiaomi BLE sensors): pulsing cyan outline of the room (SMIL, runs inside <img>), so it doesn't mix with
# the yellow light fill. Kitchen has three sensors: room outline, a ring at the table and a ring at the cat's fountain.
PULSE = '<animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite"/>'
def motion_room(fname, pts):
    open(fname, "w").write(HEAD + f'<g>{PULSE}<polygon points="{pts}" fill="#29b6f6" fill-opacity=".12" '
        f'stroke="#29b6f6" stroke-width="3" stroke-linejoin="round" stroke-dasharray="8 4"/></g></svg>')
def motion_spot(fname, x, y, r):
    open(fname, "w").write(HEAD + f'<g>{PULSE}<circle cx="{x}" cy="{y}" r="{r}" fill="#29b6f6" fill-opacity=".18" '
        f'stroke="#29b6f6" stroke-width="2.5" stroke-dasharray="5 3"/></g></svg>')
room_pts = {r[0]: r[3] for r in rooms}
motion_room("fp-motion-kukhnia.svg", room_pts["kitchen"])
motion_room("fp-motion-koridor.svg", room_pts["corridor"])
motion_room("fp-motion-tualet.svg", room_pts["wc"])
motion_room("fp-motion-prikhozhaia.svg", room_pts["entry"])
motion_spot("fp-motion-kukhnia-stol.svg", tx, ty, 22)
FOUNTAIN = (110, 812)  # cat's water fountain, kitchen bottom-left corner (approximate)
motion_spot("fp-motion-avtopoilka.svg", *FOUNTAIN, 11)
