# -*- coding: utf-8 -*-
r"""Card do aspirador: chip na Geral que abre um popup com tudo o que ele expoe.

O que o aparelho **de fato** oferece, medido e nao suposto:

  supported_features 12824 = START, STOP, RETURN_HOME, LOCATE, STATE
  ⚠️ **nao** tem PAUSE, FAN_SPEED, BATTERY nem MAP na entidade `vacuum`.
  Bateria e potencia moram em entidades separadas.

Por isso o popup nao usa o `tile` de vacuum com todos os comandos: metade nao
existiria. Usa os quatro que existem.

⚠️ **Potencia vem em chines** (`安静`/`标准`/`中档`/`强力`) e o `select` nativo
mostraria assim. A solucao aqui sao quatro botoes com rotulo em portugues que
chamam `select.select_option` com o valor original -- o aparelho continua
recebendo o que entende, e a tela fala portugues.

⚠️ Popup do Browser Mod: `button-card` com `custom_fields` aninhados **nao
recebe `hass`** e abre em branco (armadilha ja registrada no CLAUDE.md). Por
isso o conteudo usa `tile`/`entities` nativos e button-cards **simples**.

O vidro do dialogo e copiado do popup do PC, para nao divergir.
"""
import copy
import json
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

P = 'sensor.dreame_us_415783444_mc1808_'
VAC = 'vacuum.dreame_us_415783444_mc1808'
SEL = 'select.dreame_us_415783444_mc1808_mode_p_18_6'

POTENCIA = [('Silencioso', '安静'), ('Padrão', '标准'), ('Médio', '中档'), ('Turbo', '强力')]


def botao_potencia(rotulo, valor):
    """Botao simples: rotulo em portugues, valor original para o aparelho."""
    return {
        "type": "custom:button-card",
        "name": rotulo,
        "show_icon": False,
        "show_name": True,
        "entity": SEL,
        "tap_action": {
            "action": "call-service",
            "service": "select.select_option",
            "service_data": {"entity_id": SEL, "option": valor},
        },
        "styles": {
            "card": [{"height": "38px", "border-radius": "12px", "padding": "0px",
                      "background": "[[[ return states['%s'].state === %s "
                                    "? 'rgba(255,159,10,0.22)' : 'rgba(255,255,255,0.06)' ]]]"
                                    % (SEL, json.dumps(valor, ensure_ascii=False))}],
            "name": [{"font-size": "12.5px", "font-weight": "550",
                      "color": "[[[ return states['%s'].state === %s "
                               "? '#FF9F0A' : 'rgba(255,255,255,0.75)' ]]]"
                               % (SEL, json.dumps(valor, ensure_ascii=False))}],
        },
    }


def rotulo(texto):
    return {
        "type": "custom:button-card", "name": texto,
        "show_name": True, "show_icon": False, "show_state": False,
        "tap_action": {"action": "none"},
        "styles": {
            "card": [{"background": "transparent", "box-shadow": "none", "height": "20px",
                      "padding": "10px 2px 2px 2px", "justify-content": "start",
                      "border-radius": "0px"}],
            "name": [{"font-size": "11px", "font-weight": "700",
                      "color": "rgba(255,255,255,0.4)", "text-transform": "uppercase",
                      "letter-spacing": "0.06em", "justify-self": "start"}],
        },
    }


CONTEUDO = {
    "type": "vertical-stack",
    "cards": [
        # --- estado e comandos ------------------------------------------
        {"type": "tile", "entity": VAC, "name": "Aspirador",
         "icon": "mdi:robot-vacuum",
         "features": [{"type": "vacuum-commands",
                       "commands": ["start_pause", "stop", "return_home", "locate"]}]},

        # --- bateria e carga --------------------------------------------
        rotulo("Bateria"),
        {"type": "grid", "columns": 2, "square": False, "cards": [
            {"type": "tile", "entity": P + "battery_level_p_2_1", "name": "Carga",
             "icon": "mdi:battery-charging"},
            {"type": "tile", "entity": P + "charging_state_p_2_2", "name": "Estado",
             "icon": "mdi:power-plug"},
        ]},

        # --- potencia ----------------------------------------------------
        rotulo("Potência de sucção"),
        {"type": "grid", "columns": 4, "square": False,
         "cards": [botao_potencia(r, v) for r, v in POTENCIA]},

        # --- consumiveis --------------------------------------------------
        rotulo("Consumíveis"),
        {"type": "entities", "cards": [], "entities": [
            {"entity": P + "filter_life_level_p_27_1", "name": "Filtro"},
            {"entity": P + "brush_life_level_p_26_2", "name": "Escova principal"},
            {"entity": P + "brush_life_level_p_28_2", "name": "Escova lateral"},
        ]},

        # --- historico ----------------------------------------------------
        rotulo("Histórico"),
        {"type": "entities", "entities": [
            {"entity": P + "total_clean_times_p_18_14", "name": "Limpezas"},
            {"entity": P + "total_clean_area_p_18_15", "name": "Área acumulada"},
            {"entity": P + "total_clean_time_p_18_13", "name": "Tempo acumulado"},
            {"entity": P + "fault_p_3_1", "name": "Falhas"},
        ]},
    ],
}

cfg = load()
config = cfg['data']['config']


def achar_vidro(node):
    """O card_mod do dialogo do popup do PC, para o vidro nao divergir."""
    if isinstance(node, dict):
        ta = node.get('tap_action') or {}
        bm = (ta.get('browser_mod') or {}) if isinstance(ta, dict) else {}
        dados = bm.get('data') or {}
        if str(dados.get('title', '')).startswith('PC'):
            return dados.get('card_mod')
        for v in node.values():
            r = achar_vidro(v)
            if r:
                return r
    elif isinstance(node, list):
        for v in node:
            r = achar_vidro(v)
            if r:
                return r
    return None


vidro = achar_vidro(config['views'][0])
assert vidro, 'nao achei o card_mod do popup do PC para copiar'

CHIP = {
    "type": "template",
    "entity": P + "battery_level_p_2_1",
    "icon": "mdi:robot-vacuum",
    "icon_color": "{{ 'green' if is_state('%s','cleaning') else 'grey' }}" % VAC,
    "content": "{{ states('%s') }}%%" % (P + "battery_level_p_2_1"),
    "tap_action": {
        "action": "fire-dom-event",
        "browser_mod": {
            "service": "popup",
            "data": {"title": "Aspirador", "content": CONTEUDO,
                     "initial_style": "normal", "card_mod": copy.deepcopy(vidro)},
        },
    },
}

chips = config['views'][0]['cards'][0]['cards'][0]['cards'][1]
assert chips.get('type') == 'custom:mushroom-chips-card', \
    'esperava o chips-card da Geral, achei %r' % chips.get('type')
assert not any(c.get('icon') == 'mdi:robot-vacuum' for c in chips['chips']), \
    'o chip do aspirador ja existe'

chips['chips'].append(CHIP)
print('chip do aspirador acrescentado (%d chips na Geral)' % len(chips['chips']))
print('popup com %d blocos' % len(CONTEUDO['cards']))

save(cfg, tag='card_aspirador')
restart()
