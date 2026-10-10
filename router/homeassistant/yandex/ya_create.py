# Запуск на роутере: docker exec homeassistant python3 /config/ya_create.py (сессия — из интеграции yandex_station).
"""Create or update Yandex scenarios for voice cleaning. The verb picks the vacuum, the rest picks the room:
«Пылесось: <комната>» — dry (S5), «Помой: <комната>» — wet (Qrevo), «Уборка: <комната>» — both (dry, then wet),
«Уборка: пауза» — both vacuums pause, «Уборка: стоп» — both home. Each scenario: voice phrases -> the speaker that heard runs the silent command
«ничего не делай»; HA gets yandex_scenario with scenario_name (automation fp_vacuum_voice).
Our scenarios (same prefixes) that are no longer generated, e.g. after a room rename, are deleted."""
import asyncio, json, sys
sys.path.insert(0, "/config")
import aiohttp
from custom_components.yandex_station.core.yandex_session import YandexSession

# room: (where — «в зале», what — «зал»)
ROOMS = {
    "зал": ("в зале", "зал"),
    "кухня": ("на кухне", "кухню"),
    "спальня": ("в спальне", "спальню"),
    "детская": ("в детской", "детскую"),
    "прихожая": ("в прихожей", "прихожую"),
    "коридор": ("в коридоре", "коридор"),
    "малый коридор": ("в малом коридоре", "малый коридор"),
    "проход в коридоре": ("в проходе", "проход в коридоре"),
    "вся квартира": ("везде", "всю квартиру"),
}
VERBS = {"Пылесось": ["пропылесось"], "Помой": ["помой", "помой пол"], "Уборка": ["убери", "сделай уборку"]}


def scenarios():
    out = {}
    for prefix, verbs in VERBS.items():
        for room, (where, what) in ROOMS.items():
            phrases = [f"{verbs[0]} {what}", f"{verbs[0]} {where}"]
            if len(verbs) > 1:
                phrases.append(f"{verbs[1]} {where}")
            out[f"{prefix}: {room}"] = phrases
    out["Уборка: пауза"] = ["останови уборку", "поставь уборку на паузу", "пауза уборки"]
    out["Уборка: стоп"] = ["пылесосы на базу", "отправь пылесосы на базу", "хватит убирать"]
    return out


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
    dry = "--dry" in sys.argv
    entry = next(e for e in json.load(open("/config/.storage/core.config_entries"))["data"]["entries"]
                 if e["domain"] == "yandex_station")
    async with aiohttp.ClientSession() as s:
        ya = YandexSession(s, **entry["data"])
        have = {x["name"]: x["id"] for x in
                (await (await ya.get("https://iot.quasar.yandex.ru/m/user/scenarios")).json())["scenarios"]}
        want = scenarios()
        # Delete, then update, then create: a phrase moved between scenarios must be free before the new one is created,
        # otherwise Yandex refuses the duplicate trigger.
        for name, sid in have.items():
            if name.split(":")[0] in VERBS and name not in want:
                if dry:
                    print("delete:", name); continue
                r = await ya.request("delete", f"https://iot.quasar.yandex.ru/m/user/scenarios/{sid}")
                print("delete:", name, (await r.json()).get("status"))
        for name in sorted(want, key=lambda n: n not in have):
            phrases = want[name]
            if dry:
                print(name, phrases); continue
            if name in have:
                r = await ya.put(f"https://iot.quasar.yandex.ru/m/v4/user/scenarios/{have[name]}", json=payload(name, phrases))
                print("update:", name, (await r.json()).get("status"))
            else:
                r = await ya.post("https://iot.quasar.yandex.ru/m/v4/user/scenarios", json=payload(name, phrases))
                print("create:", name, (await r.json()).get("status"))

asyncio.run(main())
