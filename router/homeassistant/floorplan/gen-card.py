#!/usr/bin/env python3
"""Builds the «Карта» view of card.yaml: the desktop map from map-desktop.yaml plus a phone version derived from it.

Phone (screen < 768px): plan without side panels (floorplan-m-*.svg, viewBox 80 465 440 395) at full width, icon and
text sizes in cqw (relative to the card width, card-mod sets container-type) so nothing overlaps on a narrow screen;
only temperature is shown on the plan (humidity — on tap). The side panels become ordinary cards below the plan.
"""
import copy, re, yaml

src = yaml.safe_load(open("map-desktop.yaml"))[0]
full = yaml.safe_load(open("card.yaml"))
vac_cards = next(v["cards"] for v in full["views"] if v.get("path") == "vacuum")
vac_grid = next(c for c in vac_cards if c.get("title") == "Убрать комнату")
who_grid = next(c for c in vac_cards if c.get("type") == "grid" and any(
    x.get("entity") == "input_select.fp_vacuum" for x in c["cards"]))

def pct(v): return float(str(v).rstrip("%"))
def fmt(v): return f"{v:.1f}%".replace(".0%", "%")
def x_of(left): return pct(left) * 6.2 - 10          # desktop % -> plan x
def to_m(x): return (x - 80) / 4.4                     # plan x -> phone %

def is_side(el):
    st = el.get("style") or {}
    if el["type"] == "conditional":
        return all(is_side(e) for e in el["elements"])
    return "left" in st and not 80 <= x_of(st["left"]) <= 520

def walk(items):
    for el in items:
        yield el
        if el["type"] == "conditional": yield from walk(el["elements"])
def label_of(el, suffix): return el["type"] == "state-label" and el.get("entity", "").endswith(suffix)
def room_of(el): return el["entity"].rsplit("_", 1)[0]

hum = {room_of(el): x_of(el["style"]["left"]) for el in walk(src["elements"]) if label_of(el, "_humidity")}
# Temperature on the phone: centre of the old temp+humidity pair.
temp_x = {room_of(el): (x_of(el["style"]["left"]) + hum.get(room_of(el), x_of(el["style"]["left"]))) / 2
          for el in walk(src["elements"]) if label_of(el, "_temperature")}

def to_phone(el):
    """Desktop element -> phone element (None = not shown on the phone)."""
    el = copy.deepcopy(el)
    if el["type"] == "conditional":
        if all(label_of(e, "_humidity") for e in el["elements"]):
            # Humidity is hidden on the phone, except the «too humid» warning: under the temperature.
            if not any("above" in c for c in el["conditions"]): return None
            for e in el["elements"]:
                e["style"].update(left=fmt(to_m(temp_x[room_of(e)])), top=fmt(pct(e["style"]["top"]) + 4.5))
                e["style"]["font-size"] = "2.4cqw"
            return el
        el["elements"] = [p for p in map(to_phone, el["elements"]) if p]
        return el
    if label_of(el, "_humidity"):
        return None
    st = el.get("style") or {}
    if "left" in st:
        x = x_of(st["left"])
        if label_of(el, "_temperature"):
            x = temp_x[room_of(el)]
            st["font-size"] = "2.8cqw"
        elif el["type"] == "state-label" and str(st.get("font-size", "")).endswith("px"):
            st["font-size"] = f'{int(st["font-size"].rstrip("px")) * 0.2:.1f}cqw'
        if pct(st.get("width", "0")) == 70.97:          # room overlay: whole picture
            st["left"], st["width"] = "50%", "100%"
        else:
            st["left"] = fmt(to_m(x))
            if "width" in st: st["width"] = fmt(pct(st["width"]) * 6.2 / 4.4)
    if str(st.get("max-width", "")).endswith("px"):         # track title under a station: same scale as fonts
        st["max-width"] = f'{int(st["max-width"].rstrip("px")) * 0.2:.1f}cqw'
    if "--mdc-icon-size" in st:
        st["--mdc-icon-size"] = f'{int(st["--mdc-icon-size"].rstrip("px")) * 0.128:.1f}cqw'
    return el

els = [p for p in (to_phone(el) for el in src["elements"] if not is_side(el)) if p]

LIGHTS = next(el for el in src["elements"] if el.get("tap_action", {}).get("perform_action") == "homeassistant.turn_off"
              )["tap_action"]["target"]["entity_id"]
def all_lights(svc, name, icon, q):
    return {"type": "button", "name": name, "icon": icon, "tap_action": {
        "action": "perform-action", "perform_action": f"homeassistant.{svc}",
        "target": {"entity_id": LIGHTS}, "confirmation": {"text": q}}}

phone = {"type": "vertical-stack", "cards": [
    {"type": "picture-elements",
     "image": src["image"].replace("floorplan-", "floorplan-m-"),
     "dark_mode_image": src["dark_mode_image"].replace("floorplan-", "floorplan-m-"),
     "card_mod": {"style": "ha-card { container-type: inline-size; }\n"},
     "elements": els},
    {"type": "grid", "columns": 2, "square": False, "cards": [
        {"type": "weather-forecast", "entity": "weather.pavshino", "forecast_type": "daily",
         "show_current": True, "show_forecast": False},
        {"type": "picture-entity", "entity": "camera.c700", "name": "Прихожая", "show_state": False,
         "camera_view": "auto",
         # red frame while the camera sees motion (same sensor as on the desktop map)
         "card_mod": {"style": "ha-card { {% if is_state('binary_sensor.c700_motion','on') %}"
                               "box-shadow: 0 0 0 3px #ff5252;{% endif %} }\n"}}]},
    {"type": "grid", "columns": 3, "square": False, "cards": [
        {"type": "tile", "entity": "sensor.lights_on", "name": "Горит", "icon": "mdi:lightbulb-on"},
        all_lights("turn_on", "Весь свет", "mdi:lightbulb-group", "Включить весь свет?"),
        all_lights("turn_off", "Выключить", "mdi:lightbulb-group-off", "Выключить весь свет?")]},
    # Яндекс Станции: плитка видна, только когда что-то играет; нажатие — какие и что (атрибут stations).
    {"type": "conditional", "conditions": [{"condition": "numeric_state", "entity": "sensor.fp_media_playing", "above": 0}],
     "card": {"type": "tile", "entity": "sensor.fp_media_playing", "name": "Играет", "icon": "mdi:music", "color": "pink"}},
    {"type": "tile", "entity": "vacuum.koridor_roborock_qrevo", "name": "Мокрый (Qrevo)", "features_position": "bottom",
     "features": [{"type": "vacuum-commands", "commands": ["start_pause", "stop", "return_home"]}]},
    {"type": "tile", "entity": "vacuum.roborock_s5_8159_robot_cleaner", "name": "Сухой (S5)", "features_position": "bottom",
     "features": [{"type": "vacuum-commands", "commands": ["start_pause", "stop", "return_home"]}]},
    who_grid,
    dict(vac_grid, columns=4),
]}

def block(obj_text, ind):
    return "\n".join((" " * ind + l) if l.strip() else "" for l in obj_text.rstrip("\n").split("\n"))

desk_txt = "\n".join(l for l in open("map-desktop.yaml").read().split("\n") if not l.startswith("# "))
desk_txt = re.sub(r"^- ", "  ", desk_txt, count=1)     # list item -> plain mapping under «card:»
phone_txt = yaml.safe_dump(phone, allow_unicode=True, sort_keys=False, width=200)
out = f"""      # BEGIN map (генерирует gen-card.py из map-desktop.yaml — не править вручную)
      - type: vertical-stack
        cards:
          # Компьютер / планшет / телефон боком.
          - type: conditional
            conditions: [{{condition: screen, media_query: "(min-width: 768px)"}}]
            card:
{block(desk_txt, 12)}
          # Телефон: план на всю ширину, боковые панели — карточками ниже.
          - type: conditional
            conditions: [{{condition: screen, media_query: "(max-width: 767px)"}}]
            card:
{block(phone_txt, 14)}
      # END map"""
t = open("card.yaml").read()
t = re.sub(r"      # BEGIN map.*?      # END map", lambda m: out, t, flags=re.S)
open("card.yaml", "w").write(t)
yaml.safe_load(t)
print("ok,", len(els), "phone elements")
