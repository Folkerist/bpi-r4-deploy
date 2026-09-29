# Запуск на роутере: docker exec homeassistant python3 /config/ya_create.py [комната ...] (сессия — из интеграции yandex_station).
"""Create Yandex scenarios «Уборка: <комната>» (voice phrases -> the speaker that heard runs the silent command
«ничего не делай»; HA gets yandex_scenario with scenario_name). Skips names that already exist."""
import asyncio, json, sys
sys.path.insert(0, "/config")
import aiohttp
from custom_components.yandex_station.core.yandex_session import YandexSession

ROOMS = {
    "зал": ["убери в зале", "пропылесось зал", "убери зал"],
    "кухня": ["убери на кухне", "пропылесось кухню", "убери кухню"],
    "спальня": ["убери в спальне", "пропылесось спальню", "убери спальню"],
    "детская": ["убери в детской", "пропылесось детскую", "убери детскую"],
    "прихожая": ["убери в прихожей", "пропылесось прихожую", "убери прихожую"],
    "коридор": ["убери в коридоре", "пропылесось коридор", "убери коридор"],
    "малый коридор": ["убери в малом коридоре", "пропылесось малый коридор"],
    "проход к кухне": ["убери проход к кухне", "пропылесось проход к кухне"],
    "вся квартира": ["убери всю квартиру", "пропылесось всю квартиру", "убери везде"],
}

def payload(name, phrases):
    return {
        "name": name, "icon": "home",
        "triggers": [{"trigger": {"type": "scenario.trigger.voice", "value": p}} for p in phrases],
        "steps": [{"type": "scenarios.steps.actions.v2", "parameters": {"items": [{
            "id": "requested-device", "type": "step.action.item.requested_device_with_assistant",
            "value": {"type": "devices.capabilities.quasar.server_action",
                      "state": {"instance": "text_action", "value": "ничего не делай"},
                      "parameters": {"instance": "text_action"}}}]}}],
    }

async def main():
    only = sys.argv[1:]  # room names to create; empty = all
    entry = next(e for e in json.load(open("/config/.storage/core.config_entries"))["data"]["entries"] if e["domain"] == "yandex_station")
    async with aiohttp.ClientSession() as s:
        ya = YandexSession(s, **entry["data"])
        have = {x["name"] for x in (await (await ya.get("https://iot.quasar.yandex.ru/m/user/scenarios")).json())["scenarios"]}
        for room, phrases in ROOMS.items():
            if only and room not in only: continue
            name = f"Уборка: {room}"
            if name in have:
                print("exists:", name); continue
            r = await ya.post("https://iot.quasar.yandex.ru/m/v4/user/scenarios", json=payload(name, phrases))
            print("create:", name, "->", await r.json())
asyncio.run(main())
