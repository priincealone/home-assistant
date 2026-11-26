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
ENT_POR_ID = {e["entity_id"]: e for e in ENTS}

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
    "brush_life_level_p_26_2": "Escova · vida", "brush_left_time_p_26_1": "Escova · horas",
    "brush_life_level_p_28_2": "Lateral · vida", "brush_left_time_p_28_1": "Lateral · horas",
    "filter_life_level_p_27_1": "Filtro · vida", "filter_left_time_p_27_2": "Filtro · horas",
}


def nome_rede(eid):
    """Roteadores e SpeedTest: "Roteador Sala  Router Download Speed" corta no iPhone."""
    if eid.startswith("sensor.speedtest_"):
        return {"name": {"download": "Teste ↓", "upload": "Teste ↑", "ping": "Ping"}.get(eid.rsplit("_", 1)[-1], None) or eid}
    for chave, nome in (("connected_device_number", "Aparelhos"), ("download_speed", "Download"),
                        ("upload_speed", "Upload")):
        if chave in eid:
            return {"name": nome}
    return {}


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


# kiosk-mode (HACS, NemesisRE/kiosk-mode) esconde o cabeçalho até esta largura (iPhone); acima dela
# (iPad, computador) o cabeçalho continua. Abrir com ?disable_km na URL desliga o kiosk-mode.
LARGURA_CELULAR = 600
SO_CELULAR = [{"condition": "screen", "media_query": f"(max-width: {LARGURA_CELULAR}px)"}]


def voltar(titulo, destino="/lovelace-casa/inicio"):
    """Substitui a seta de voltar do cabeçalho, que o kiosk-mode esconde no iPhone."""
    return {"type": "heading", "heading": titulo, "heading_style": "title", "icon": "mdi:arrow-left",
            "tap_action": {"action": "navigate", "navigation_path": destino}, "visibility": SO_CELULAR}


def atalho(nome, icone, destino):
    return {"type": "button", "name": nome, "icon": icone, "show_state": False, "icon_height": "32px",
            "tap_action": {"action": "navigate", "navigation_path": destino},
            "grid_options": {"columns": 6, "rows": 2}}


def secao(titulo, icone, cards, badges=None):
    return {"type": "grid", "cards": [heading(titulo, icone, badges)] + cards}


AREA_NOME = {a["id"]: a["name"] for a in AREAS}


def sem_area(e):
    """Dentro da aba do cômodo o nome do cômodo sobra: "Plafon Área Gourmet" vira "Plafon"."""
    n = e.get("name") or ""
    an = AREA_NOME.get(e.get("area_id"), "")
    for alvo in {an, an.replace("Area", "Área")} - {""}:
        if n.endswith(" " + alvo) and n[: -len(alvo) - 1].strip():
            return {"name": n[: -len(alvo) - 1].strip()}
    return {}


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
    return tile(eid, grid_options={"columns": 6}, **sem_area(e))


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
            grupos["aspirador"].append(tile(eid, name="Aspirador", features=[{"type": "vacuum-commands", "commands": [
                "start_pause", "stop", "return_home", "locate"]}], features_position="bottom",
                grid_options={"columns": 12}))
        elif dom == "switch":
            # "Computador Socket 1" corta no iPhone: vira "Computador 1"
            extra = {}
            orig = e.get("original_name") or ""
            dev = (d.get("name_by_user") or d.get("name") or "").strip()
            if not e.get("name") and dev and orig.split(" ")[0] in ("Socket", "Switch") and orig.split(" ")[-1].isdigit():
                extra["name"] = f"{dev.replace('Tomada inteligente', 'Tomada')} {orig.split(' ')[-1]}"
            grupos["tomadas"].append(tile(eid, grid_options={"columns": 6}, **extra))
        elif dom == "scene" or dom == "script":
            grupos["cenas"].append(tile(eid, vertical=True, grid_options={"columns": 6, "rows": 2}))
        elif dom == "binary_sensor":
            grupos["sensores"].append(tile(eid, grid_options={"columns": 6}, **curto(e)))
        elif dom == "camera":
            grupos["cameras"].append({"type": "picture-entity", "entity": eid, "show_state": False})
        elif dom == "weather":
            continue  # a temperatura atual fica no topo da tela inicial
        elif dom == "sensor":
            if "roteador" in nome_dev or "speedtest" in nome_dev:
                grupos["rede"].append(tile(eid, grid_options={"columns": 4, "rows": 2}, vertical=True,
                                           **nome_rede(eid)))
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
            "sections": [{"type": "grid", "cards": [voltar(area["name"]), topo], "column_span": 3}] + secoes}


CENAS = [("script.cena_chegar", "Chegar"), ("script.cena_cinema", "Cinema"),
         ("script.cena_gamer", "Gamer"), ("script.cena_dormir", "Dormir")]


def inicio():
    # Pensado para iPhone (~390 px, uma coluna): cenas primeiro (o que se usa com uma mão), depois os
    # cômodos em duas colunas com os atalhos embaixo do nome, e as câmeras por último.
    areas_cards = []
    for a in AREAS:
        areas_cards.append({
            "type": "area", "area": a["id"], "display_type": "compact",
            "navigation_path": "/lovelace-casa/" + a["id"],
            "alert_classes": ["door", "motion"], "sensor_classes": ["temperature"],
            "features": [{"type": "area-controls", "controls": ["light", "fan", "switch"]}],
            "features_position": "bottom", "grid_options": {"columns": 6},
        })
    cenas = [tile(s, name=n, vertical=True, hide_state=True, grid_options={"columns": 3, "rows": 2},
                  icon_tap_action={"action": "toggle"}, tap_action={"action": "more-info"})
             for s, n in CENAS]
    return {
        "title": "Início", "path": "inicio", "icon": "mdi:home", "type": "sections", "max_columns": 3,
        "header": {"card": {"type": "markdown", "text_only": True, "content":
            "# {% set h = now().hour %}{{ 'Bom dia' if h < 12 else ('Boa tarde' if h < 18 else 'Boa noite') }}, André\n"
            "{{ states('sensor.luzes_acesas_total') }} luzes acesas · "
            "{{ states('sensor.sensor_temperatura_e_humidade_temperatura') }} °C na sala"}},
        # três emblemas cabem numa linha do iPhone; luzes acesas já estão na saudação e o PC na aba Sistema
        "badges": [
            {"type": "entity", "entity": "person.andre", "show_name": False},
            # só a temperatura atual (o card de previsão saiu a pedido do André, 25/11/2026)
            {"type": "entity", "entity": "weather.forecast_casa", "name": "Lá fora", "show_name": True,
             "state_content": "temperature"},
            {"type": "entity", "entity": "binary_sensor.internet_no_ar", "name": "Internet", "show_name": True},
        ],
        "sections": [
            {"type": "grid", "cards": [heading("Cenas", "mdi:palette")] + cenas + [
                tile("scene.ligar_tv", name="Ligar TV", hide_state=True, icon="mdi:television",
                     grid_options={"columns": 12}, tap_action={"action": "more-info"},
                     icon_tap_action={"action": "toggle"}),
            ]},
            {"type": "grid", "column_span": 2, "cards": [heading("Cômodos", "mdi:floor-plan")] + areas_cards},
            {"type": "grid", "column_span": 3, "cards": [heading("Câmeras", "mdi:cctv")] + [
                {"type": "picture-entity", "entity": c, "show_state": False, "show_name": True,
                 "camera_view": "auto", "grid_options": {"columns": 6}}
                for c in ("camera.rua_canal_2", "camera.rua_canal_4")]},
            # Sistema é página separada (subvisão), pouco usada: assim a tela inicial fica sem abas (26/11/2026)
            {"type": "grid", "column_span": 3, "cards": [
                tile("binary_sensor.pc_andre", name="Sistema · PC, rede e celulares", icon="mdi:server",
                     tap_action={"action": "navigate", "navigation_path": "/lovelace-casa/sistema"},
                     icon_tap_action={"action": "navigate", "navigation_path": "/lovelace-casa/sistema"},
                     hide_state=True, grid_options={"columns": 12}),
            ]},
        ],
    }


NOMES_SISTEMA = {
    "binary_sensor.pc_andre": "Ligado", "sensor.pc_andre_cpu_load": "Processador",
    "sensor.pc_andre_memory_usage": "Memória", "sensor.pc_andre_c_disk_usage": "Disco C:",
    "sensor.pc_andre_d_disk_usage": "Disco D:", "sensor.pc_andre_g_disk_usage": "Disco G:",
    "sensor.pc_andre_uptime": "Ligado desde",
    "binary_sensor.internet_no_ar": "Internet", "binary_sensor.rede_gateway": "Roteador",
    "binary_sensor.rede_dvr": "DVR", "binary_sensor.rede_no_sala_online": "Nó Sala",
    "binary_sensor.rede_no_gourmet_online": "Nó Gourmet", "binary_sensor.rede_internet_cloudflare": "Cloudflare",
    "binary_sensor.rede_internet_google": "Google", "sensor.rede_diagnostico": "Diagnóstico",
    "sensor.iphone_de_andre_geocoded_location": "iPhone · local", "sensor.iphone_de_andre_focus_name": "iPhone · foco",
    "sensor.ipad_de_andre_geocoded_location": "iPad · local", "sensor.ipad_de_andre_steps": "iPad · passos",
    "sensor.saude_passos": "Passos", "sensor.saude_distancia": "Distância", "sensor.saude_calorias": "Calorias",
    "sensor.saude_sono": "Sono", "sensor.saude_fc_de_repouso": "FC de repouso", "sensor.saude_atualizado_em": "Atualizado",
    "sensor.backup_backup_manager_state": "Estado", "sensor.backup_last_successful_automatic_backup": "Último backup",
    "sensor.backup_next_scheduled_automatic_backup": "Próximo backup",
    "sensor.luzes_sala_de_estar": "Sala", "sensor.luzes_cozinha": "Cozinha", "sensor.luzes_copa": "Copa",
    "sensor.luzes_lavanderia": "Lavanderia", "sensor.luzes_area_gourmet": "Gourmet",
    "sensor.luzes_quarto_do_luca": "Quarto Luca", "sensor.luzes_banheiro": "Banheiro",
    "sensor.luzes_circulacao": "Circulação", "sensor.luzes_closet": "Closet",
    "sensor.luzes_indisponiveis": "Indisponíveis", "sensor.luzes_acesas_total": "Luzes acesas",
    "binary_sensor.iphone_de_andre_focus": "Foco iPhone", "binary_sensor.ipad_de_andre_focus": "Foco iPad",
    "binary_sensor.iphone_de_andre_kiosk_screensaver": "Tela iPhone",
}


def nome_sistema(x):
    if x in NOMES_SISTEMA:
        return NOMES_SISTEMA[x]
    e = ENT_POR_ID.get(x) or {}
    if e.get("name"):
        return None
    n = e.get("original_name") or ""
    for pre, novo in (("Iphone de André ", "iPhone · "), ("iPad de André ", "iPad · ")):
        if n.startswith(pre):
            return novo + n[len(pre):]
    return None


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
        # nome curto em português: no iPhone o tile de meia largura corta "PC André C:\ disk usage"
        return [tile(x, grid_options={"columns": col}, **({"name": nome_sistema(x)} if nome_sistema(x) else {}))
                for x in lst]

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
    # Sem cabeçalho no iPhone não há ☰ nem ⋮: estes atalhos levam ao resto da HA
    menu = {"type": "grid", "column_span": 3, "cards": [
        voltar("Sistema"), heading("Atalhos", "mdi:menu"),
        atalho("Configurações", "mdi:cog", "/config/dashboard"),
        atalho("Perfil", "mdi:account-circle", "/profile/general"),
        atalho("Painel Secundário", "mdi:view-dashboard", "/painel-secundario"),
        atalho("Editar dashboard", "mdi:pencil", "/lovelace-casa/inicio?edit=1&disable_km"),
    ]}
    return {"title": "Sistema", "path": "sistema", "icon": "mdi:server", "type": "sections",
            "subview": True, "back_path": "/lovelace-casa/inicio", "max_columns": 3,
            "sections": [menu] + [s for s in secoes if len(s["cards"]) > 1]}


config = {"title": "Casa", "views": [inicio(), sistema()] + [subvisao(a) for a in AREAS],
          "kiosk_mode": {"mobile_settings": {"hide_header": True, "custom_width": LARGURA_CELULAR}}}
# O cabeçalho compacto do iPhone vem do tema config/themes/casa_iphone.yaml, escolhido no perfil do
# aparelho; "theme" por visão não alcança o cabeçalho (testado em 26/11/2026), por isso não vai aqui.
print(json.dumps(config, ensure_ascii=False, indent=1))
