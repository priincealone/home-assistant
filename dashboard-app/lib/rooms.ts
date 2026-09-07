// Gerado a partir de manifesto-comodos.json + DECISOES-V1.md
// Não editar à mão — regenerar com tools/gerar_manifesto.py + scripts/gen_rooms.py

export type Ponto = {
  id: string;
  entityId: string;
  dominio: "light" | "switch";
  nome: string;
  /** entidades que controlam o mesmo ponto físico por um interruptor em outro local */
  aliases: string[];
};

export type Comodo = {
  id: string;
  nome: string;
  rota: string;
  pontos: Ponto[];
  /** sem nenhum ponto integrado ainda — placeholder na planta */
  vazio: boolean;
};

export const comodos: Comodo[] = [
  {
    "id": "sala_de_estar",
    "nome": "Sala de Estar",
    "rota": "/minha-casa/sala-de-estar",
    "pontos": [
      {
        "id": "luz_sala",
        "entityId": "light.luz_sala",
        "dominio": "light",
        "nome": "Luz Sala",
        "aliases": []
      },
      {
        "id": "painel",
        "entityId": "light.painel",
        "dominio": "light",
        "nome": "Painel",
        "aliases": []
      }
    ],
    "vazio": false
  },
  {
    "id": "cozinha",
    "nome": "Cozinha",
    "rota": "/minha-casa/cozinha",
    "pontos": [
      {
        "id": "cozinha",
        "entityId": "light.cozinha_copa_varanda_switch_3",
        "dominio": "light",
        "nome": "Cozinha",
        "aliases": []
      }
    ],
    "vazio": false
  },
  {
    "id": "copa",
    "nome": "Copa",
    "rota": "/minha-casa/copa",
    "pontos": [
      {
        "id": "copa",
        "entityId": "light.cozinha_copa_varanda_switch_2",
        "dominio": "light",
        "nome": "Copa",
        "aliases": []
      }
    ],
    "vazio": false
  },
  {
    "id": "lavanderia",
    "nome": "Lavanderia",
    "rota": "/minha-casa/lavanderia",
    "pontos": [
      {
        "id": "lavanderia",
        "entityId": "light.cozinha_copa_varanda_switch_1",
        "dominio": "light",
        "nome": "Lavanderia",
        "aliases": []
      }
    ],
    "vazio": false
  },
  {
    "id": "area_gourmet",
    "nome": "Área Gourmet",
    "rota": "/minha-casa/area-gourmet",
    "pontos": [
      {
        "id": "circulacao",
        "entityId": "light.luzes_externas_switch_1",
        "dominio": "light",
        "nome": "Circulação",
        "aliases": []
      },
      {
        "id": "pendente",
        "entityId": "light.luzes_externas_switch_2",
        "dominio": "light",
        "nome": "Pendente",
        "aliases": []
      },
      {
        "id": "led",
        "entityId": "light.luzes_externas_switch_3",
        "dominio": "light",
        "nome": "Led",
        "aliases": []
      },
      {
        "id": "spots",
        "entityId": "light.luzes_externas_switch_4",
        "dominio": "light",
        "nome": "Spots",
        "aliases": []
      }
    ],
    "vazio": false
  },
  {
    "id": "quarto_luca",
    "nome": "Quarto Luca",
    "rota": "/minha-casa/quarto-luca",
    "pontos": [
      {
        "id": "luz",
        "entityId": "light.quarto_luca_switch_1",
        "dominio": "light",
        "nome": "Luz",
        "aliases": []
      }
    ],
    "vazio": false
  },
  {
    "id": "banheiro",
    "nome": "Banheiro",
    "rota": "/minha-casa/banheiro",
    "pontos": [
      {
        "id": "banheiro_switch_1",
        "entityId": "switch.banheiro_switch_1",
        "dominio": "switch",
        "nome": "Banheiro Switch 1",
        "aliases": []
      },
      {
        "id": "banheiro_switch_2",
        "entityId": "switch.banheiro_switch_2",
        "dominio": "switch",
        "nome": "Banheiro Switch 2",
        "aliases": []
      }
    ],
    "vazio": false
  },
  {
    "id": "circulacao",
    "nome": "Circulação",
    "rota": "/minha-casa/circulacao",
    "pontos": [
      {
        "id": "muro",
        "entityId": "light.circulacao_switch_1",
        "dominio": "light",
        "nome": "Muro",
        "aliases": [
          "switch.entrada_switch_1"
        ]
      },
      {
        "id": "corredor",
        "entityId": "light.circulacao_switch_2",
        "dominio": "light",
        "nome": "Corredor",
        "aliases": [
          "switch.entrada_switch_2"
        ]
      }
    ],
    "vazio": false
  },
  {
    "id": "closet",
    "nome": "Closet",
    "rota": "/minha-casa/closet",
    "pontos": [
      {
        "id": "closet",
        "entityId": "light.closet_switch_1",
        "dominio": "light",
        "nome": "Closet",
        "aliases": []
      },
      {
        "id": "led_escritorio",
        "entityId": "light.led_escritorio_sonoff_1001dff472",
        "dominio": "light",
        "nome": "Led escritório ",
        "aliases": []
      }
    ],
    "vazio": false
  },
  {
    "id": "quarto",
    "nome": "Quarto",
    "rota": "/minha-casa/quarto",
    "pontos": [],
    "vazio": true
  }
];

export const todasEntidades: string[] = comodos.flatMap(c => c.pontos.map(p => p.entityId));
