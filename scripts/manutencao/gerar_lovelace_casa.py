"""Gera a configuração do dashboard Lovelace "Casa" (/lovelace-casa) a partir dos registros da HA.

Somente leitura: lê core.area_registry, core.device_registry e core.entity_registry e imprime o JSON
da configuração (cards nativos, visão em seções). Não fala com a HA nem aciona nada.

Uso (PowerShell):
    docker cp scripts/manutencao/gerar_lovelace_casa.py homeassistant:/tmp/g.py
    docker exec homeassistant python /tmp/g.py > config/www/lovelace-casa.json

Regras: entidade com hidden_by/disabled_by ou entity_category (config/diagnostic) fica de fora; dispositivo
desativado também. Dispositivos sem área entram na aba "Sistema".
"""
import json
import os
from collections import defaultdict

S = os.environ.get("HA_STORAGE", "/config/.storage/")


def ler(nome):
    with open(os.path.join(S, nome), encoding="utf-8") as f:
        return json.load(f)["data"]


AREAS = ler("core.area_registry")["areas"]
DEVS = {d["id"]: d for d in ler("core.device_registry")["devices"]}
ENTS = ler("core.entity_registry")["entities"]

IGNORAR_DOMINIOS = {"ai_task", "conversation", "stt", "tts", "event", "remote", "select", "notify",
                    "update", "button", "device_tracker", "input_boolean", "automation", "todo"}

ICONE_AREA = {"copa": "mdi:silverware-variant", "corredor": "mdi:door-open", "area_gourmet": "mdi:grill"}


def visiveis():
    for e in ENTS:
        if e.get("hidden_by") or e.get("disabled_by") or e.get("entity_category"):
            continue
        d = DEVS.get(e.get("device_id")) or {}
        if d.get("disabled_by"):
            continue
        yield e, d


por_area = defaultdict(list)
for e, d in visiveis():
    por_area[e.get("area_id") or d.get("area_id")].append((e, d))


def tile(eid, **extra):
    c = {"type": "tile", "entity": eid}
    c.update(extra)
    return c


NOMES_ASPIRADOR = {
    "battery_level_p_2_1": "Bateria", "charging_state_p_2_2": "Carregamento", "fault_p_3_1": "Falhas",
    "brush_life_level_p_26_2": "Escova principal (vida)", "brush_left_time_p_26_1": "Escova principal (horas)",
    "brush_life_level_p_28_2": "Escova lateral (vida)", "brush_left_time_p_28_1": "Escova lateral (horas)",
    "filter_life_level_p_27_1": "Filtro (vida)", "filter_left_time_p_27_2": "Filtro (horas)",
}


def curto(e):
    """Nome curto (só o da entidade, sem o do dispositivo) para sensores: evita "Sensor temper…" cortado."""
    if e.get("name"):
        return {}
    eid = e["entity_id"]
    for chave, nome in NOMES_ASPIRADOR.items():
        if chave in eid:
            return {"name": nome}
    n = e.get("original_name")
    return {"name": n} if n and e.get("device_id") else {}


def heading(texto, icone=None, badges=None):
    h = {"type": "heading", "heading": texto, "heading_style": "title"}
    if icone:
        h["icon"] = icone
    if badges:
        h["badges"] = badges
    return h


def secao(titulo, icone, cards, badges=None):
    return {"type": "grid", "cards": [heading(titulo, icone, badges)] + cards}


def card_luz(e):
    eid = e["entity_id"]
    modos = (e.get("capabilities") or {}).get("supported_color_modes") or []
    feats = []
    if any(m != "onoff" for m in modos):
        feats.append({"type": "light-brightness"})
    if "color_temp" in modos:
        feats.append({"type": "light-color-temp"})
    if feats:
        return tile(eid, features=feats, features_position="bottom", vertical=False,
                    grid_options={"columns": 12})
    return tile(eid, grid_options={"columns": 6})


def card_fan(e):
    feats = []
    if (e.get("supported_features") or 0) & 1:
        feats.append({"type": "fan-speed"})
    return tile(e["entity_id"], features=feats, features_position="bottom", grid_options={"columns": 6})


def subvisao(area):
    aid = area["id"]
    itens = [(e, d) for e, d in por_area.get(aid, [])
             if e["entity_id"].split(".")[0] not in IGNORAR_DOMINIOS]
    grupos = defaultdict(list)
    for e, d in sorted(itens, key=lambda x: x[0]["entity_id"]):
        dom = e["entity_id"].split(".")[0]
        eid = e["entity_id"]
        nome_dev = (d.get("name_by_user") or d.get("name") or "").lower()
        if dom == "light":
            grupos["luzes"].append(card_luz(e))
        elif dom == "fan":
            grupos["clima"].append(card_fan(e))
        elif dom == "media_player":
            if (e.get("supported_features") or 0) & 4096:  # STOP: TV (o PS5 não tem)
                grupos["midia"].append({"type": "media-control", "entity": eid, "grid_options": {"columns": 12}})
            else:
                grupos["midia"].append(tile(eid, grid_options={"columns": 6}))
        elif dom == "vacuum":
            grupos["aspirador"].append(tile(eid, features=[{"type": "vacuum-commands", "commands": [
                "start_pause", "stop", "return_home", "locate"]}], features_position="bottom",
                grid_options={"columns": 12}))
        elif dom == "switch":
            grupos["tomadas"].append(tile(eid, grid_options={"columns": 6}))
        elif dom == "scene" or dom == "script":
            grupos["cenas"].append(tile(eid, vertical=True, grid_options={"columns": 6, "rows": 2}))
        elif dom == "binary_sensor":
            grupos["sensores"].append(tile(eid, grid_options={"columns": 6}, **curto(e)))
        elif dom == "camera":
            grupos["cameras"].append({"type": "picture-entity", "entity": eid, "show_state": False})
        elif dom == "weather":
            continue  # vai para a tela inicial
        elif dom == "sensor":
            if "roteador" in nome_dev or "speedtest" in nome_dev:
                grupos["rede"].append(tile(eid, grid_options={"columns": 4, "rows": 2}, vertical=True))
            elif "dreame" in eid:
                grupos["aspirador_info"].append(tile(eid, grid_options={"columns": 6}, **curto(e)))
            elif any(k in eid for k in ("_energia", "_corrente", "_tensao")):
                grupos["energia"].append(tile(eid, grid_options={"columns": 6}, **curto(e)))
            else:
                grupos["sensores"].append(tile(eid, grid_options={"columns": 6}, **curto(e)))
    ordem = [("luzes", "Luzes", "mdi:lightbulb-group"), ("clima", "Ventilação", "mdi:fan"),
             ("midia", "Mídia", "mdi:television-play"), ("cenas", "Cenas", "mdi:palette"),
             ("tomadas", "Tomadas", "mdi:power-socket-de"), ("aspirador", "Aspirador", "mdi:robot-vacuum"),
             ("aspirador_info", "Manutenção do aspirador", "mdi:wrench-clock"),
             ("sensores", "Sensores", "mdi:motion-sensor"), ("energia", "Energia", "mdi:lightning-bolt"),
             ("rede", "Rede", "mdi:router-wireless"), ("cameras", "Câmeras", "mdi:cctv")]
    secoes = [secao(t, i, grupos[k]) for k, t, i in ordem if grupos.get(k)]
    topo = {"type": "area", "area": aid, "display_type": "picture" if area.get("picture") else "compact",
            "alert_classes": ["door", "motion", "moisture"], "sensor_classes": ["temperature", "humidity"],
            "grid_options": {"columns": "full"}}
    return {"title": area["name"], "path": aid, "icon": area.get("icon") or ICONE_AREA.get(aid, "mdi:home"),
            "subview": True, "back_path": "/lovelace-casa/inicio", "type": "sections", "max_columns": 3,
            "sections": [{"type": "grid", "cards": [topo], "column_span": 3}] + secoes}


def inicio():
    areas_cards = []
    for a in AREAS:
        areas_cards.append({
            "type": "area", "area": a["id"], "display_type": "compact",
            "navigation_path": "/lovelace-casa/" + a["id"],
            "alert_classes": ["door", "motion"], "sensor_classes": ["temperature", "humidity"],
            "features": [{"type": "area-controls", "controls": ["light", "fan", "switch"]}],
            "features_position": "inline", "grid_options": {"columns": 6},
        })
    cenas = [tile(s, vertical=True, grid_options={"columns": 3, "rows": 2},
                  icon_tap_action={"action": "toggle"}, tap_action={"action": "more-info"})
             for s in ("script.cena_chegar", "script.cena_cinema", "script.cena_gamer", "script.cena_dormir")]
    return {
        "title": "Início", "path": "inicio", "icon": "mdi:home", "type": "sections", "max_columns": 3,
        "header": {"card": {"type": "markdown", "text_only": True, "content":
            "# {% set h = now().hour %}{{ 'Bom dia' if h < 12 else ('Boa tarde' if h < 18 else 'Boa noite') }}, André\n"
            "{{ states('sensor.luzes_acesas_total') }} luzes acesas · "
            "{{ states('sensor.sensor_temperatura_e_humidade_temperatura') }} °C na sala"}},
        "badges": [
            {"type": "entity", "entity": "person.andre", "show_name": False},
            {"type": "entity", "entity": "binary_sensor.internet_no_ar", "name": "Internet", "show_name": True},
            {"type": "entity", "entity": "sensor.luzes_acesas_total", "name": "Luzes acesas", "show_name": True,
             "icon": "mdi:lightbulb-on"},
            {"type": "entity", "entity": "binary_sensor.pc_andre", "name": "PC", "show_name": True},
        ],
        "sections": [
            {"type": "grid", "column_span": 2, "cards": [heading("Cômodos", "mdi:floor-plan")] + areas_cards},
            {"type": "grid", "cards": [
                heading("Tempo", "mdi:weather-partly-cloudy"),
                {"type": "weather-forecast", "entity": "weather.forecast_casa", "forecast_type": "daily",
                 "show_current": True, "show_forecast": True, "grid_options": {"columns": 12}},
                heading("Cenas", "mdi:palette")] + cenas + [
                tile("scene.ligar_tv", vertical=True, grid_options={"columns": 6, "rows": 2},
                     tap_action={"action": "more-info"}),
                tile("sensor.luzes_acesas_total", grid_options={"columns": 6, "rows": 2}, vertical=True,
                     icon="mdi:lightbulb-group"),
            ]},
            {"type": "grid", "column_span": 3, "cards": [heading("Câmeras", "mdi:cctv")] + [
                {"type": "picture-entity", "entity": c, "show_state": False, "show_name": True,
                 "camera_view": "auto", "grid_options": {"columns": 6}}
                for c in ("camera.rua_canal_2", "camera.rua_canal_4")]},
        ],
    }


def sistema():
    sem = [e for e, d in por_area.get(None, [])]
    ids = {e["entity_id"] for e in sem}

    def ex(lista):
        return [x for x in lista if x in ids]

    pc = ex(["sensor.pc_andre_cpu_load", "sensor.pc_andre_memory_usage", "sensor.pc_andre_c_disk_usage",
             "sensor.pc_andre_d_disk_usage", "sensor.pc_andre_g_disk_usage", "sensor.pc_andre_uptime"])
    rede = ex(["binary_sensor.internet_no_ar", "binary_sensor.rede_gateway", "binary_sensor.rede_dvr",
               "binary_sensor.rede_no_sala_online", "binary_sensor.rede_no_gourmet_online",
               "binary_sensor.rede_internet_cloudflare", "binary_sensor.rede_internet_google",
               "sensor.rede_diagnostico"])
    cel = ex(["sensor.iphone_de_andre_battery_level", "sensor.iphone_de_andre_battery_state",
              "sensor.iphone_de_andre_geocoded_location", "sensor.iphone_de_andre_focus_name",
              "sensor.ipad_de_andre_battery_level", "sensor.ipad_de_andre_battery_state",
              "sensor.ipad_de_andre_geocoded_location", "sensor.ipad_de_andre_steps"])
    saude = ex(["sensor.saude_passos", "sensor.saude_distancia", "sensor.saude_calorias",
                "sensor.saude_sono", "sensor.saude_fc_de_repouso", "sensor.saude_atualizado_em"])
    backup = ex(["sensor.backup_backup_manager_state", "sensor.backup_last_successful_automatic_backup",
                 "sensor.backup_next_scheduled_automatic_backup"])
    luzes = sorted(e for e in ids if e.startswith("sensor.luzes_") and e != "sensor.luzes_acesas_total")
    usados = set(pc + rede + cel + saude + backup + luzes)
    resto = sorted(e for e in ids if e not in usados and e.split(".")[0] not in IGNORAR_DOMINIOS
                   and not e.startswith(("sensor.pc_andre_", "sensor.ipad_", "sensor.iphone_", "sensor.sun_",
                                         "sensor.backup_", "camera.", "script.cena_", "scene.ligar_tv",
                                         "sensor.imap_")))

    def grade(lst, col=6):
        return [tile(x, grid_options={"columns": col}) for x in lst]

    secoes = [
        secao("PC André", "mdi:desktop-tower-monitor", [tile("binary_sensor.pc_andre", grid_options={"columns": 12})]
              # tile e não gauge: com o PC desligado (Glances fora) o gauge vira aviso amarelo
              + grade(pc)),
        secao("Rede", "mdi:router-network", grade(rede)),
        secao("iPhone e iPad", "mdi:cellphone", grade(cel)),
        secao("Saúde", "mdi:heart-pulse", grade(saude)),
        secao("Luzes por cômodo", "mdi:lightbulb-group", grade(luzes, 4)),
        secao("Backup", "mdi:backup-restore", grade(backup, 12)),
    ]
    if resto:
        secoes.append(secao("Outros", "mdi:dots-horizontal", grade(resto)))
    return {"title": "Sistema", "path": "sistema", "icon": "mdi:server", "type": "sections",
            "max_columns": 3, "sections": [s for s in secoes if len(s["cards"]) > 1]}


config = {"title": "Casa", "views": [inicio(), sistema()] + [subvisao(a) for a in AREAS]}
print(json.dumps(config, ensure_ascii=False, indent=1))
