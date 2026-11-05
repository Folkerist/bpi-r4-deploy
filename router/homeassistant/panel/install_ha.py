# Выполняется внутри контейнера HA (deploy.sh): ресурс /local/home-panel/home-panel.js?v=<версия> и дашборд «Дом».
# Токен — первой строкой в stdin, версия — первым аргументом.
import asyncio, json, sys, aiohttp
tok = sys.stdin.readline().strip(); ver = sys.argv[1]
URL = f"/local/home-panel/home-panel.js?v={ver}"
async def main():
    async with aiohttp.ClientSession() as s:
        async with s.ws_connect("http://127.0.0.1:8123/api/websocket") as ws:
            await ws.receive_json(); await ws.send_json({"type": "auth", "access_token": tok}); await ws.receive_json()
            n = [0]
            async def call(msg):
                n[0] += 1; await ws.send_json(dict(msg, id=n[0]))
                while True:
                    m = await ws.receive_json()
                    if m.get("id") == n[0]: return m
            res = (await call({"type": "lovelace/resources"}))["result"]
            old = [r for r in res if "/home-panel/home-panel.js" in r["url"]]
            if old: r = await call({"type": "lovelace/resources/update", "resource_id": old[0]["id"], "res_type": "module", "url": URL}); print("ресурс обновлён:", r["success"])
            else: r = await call({"type": "lovelace/resources/create", "res_type": "module", "url": URL}); print("ресурс добавлен:", r["success"], r.get("error"))
            dbs = (await call({"type": "lovelace/dashboards/list"}))["result"]
            if not any(d["url_path"] == "dashboard-dom" for d in dbs):
                r = await call({"type": "lovelace/dashboards/create", "url_path": "dashboard-dom", "title": "Дом", "icon": "mdi:home-heart",
                                "show_in_sidebar": True, "require_admin": False, "mode": "storage"}); print("дашборд создан:", r["success"], r.get("error"))
            else: print("дашборд уже есть")
            cfg = {"title": "Дом", "views": [{"title": "Дом", "path": "home", "type": "panel", "cards": [{"type": "custom:home-panel-card"}]}]}
            r = await call({"type": "lovelace/config/save", "url_path": "dashboard-dom", "config": cfg}); print("конфиг сохранён:", r["success"], r.get("error"))
asyncio.run(main())
