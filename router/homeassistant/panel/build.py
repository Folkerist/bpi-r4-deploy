#!/usr/bin/env python3
"""Собирает src/*.js в один home-panel.js (кладётся на роутер в /config/www/home-panel/)."""
import hashlib, pathlib
here = pathlib.Path(__file__).parent
parts = ["core", "styles", "plan", "card", "modals", "tail"]
body = "\n".join((here / "src" / f"{p}.js").read_text() for p in parts)
ver = hashlib.sha1(body.encode()).hexdigest()[:8]
out = ("// Панель дома для Home Assistant. Собрано build.py из src/ — не править вручную.\n"
       "(() => {\n\"use strict\";\n" + body.replace("__VERSION__", ver) + "\n})();\n")
(here / "home-panel.js").write_text(out)
print(f"home-panel.js {len(out)//1024} КБ, версия {ver}")
