# DESIGN.md — Painel de Automação Residencial

## Status
Superfície nova (greenfield). Ainda não existe identidade visual definida — este
documento cobre só as **restrições funcionais** que qualquer direção estética precisa
respeitar. A direção em si (paleta, tipografia, tom, referências) fica para a sessão
`impeccable new-work`, guiada por briefing na hora, em vez de travada aqui de antemão.

## Restrições funcionais (valem para qualquer estética escolhida)
- **Legibilidade à distância:** o uso principal é um tablet fixo na parede, visto de
  alguns passos de distância — não uma tela de colo. Contraste e tamanho de elemento de
  estado (ligado/desligado, aberto/fechado) precisam funcionar nessa distância.
- **Dois modos de uso:** modo ambiente/passivo (tela quase sempre ligada, só mostrando
  estado) e modo interativo (toque para controlar). A estética precisa funcionar nos
  dois sem virar ruído visual no modo passivo.
- **Planta como camada de fundo:** a base visual vai ser uma planta real da casa
  (provavelmente escaneada via LiDAR do iPhone/iPad Pro — ver PRODUCT.md). A estética
  escolhida precisa deixar espaço pra essa planta ser a protagonista visual — evitar
  fundos/texturas pesadas que competem com ela.
- **Estado tem que ser instantaneamente legível:** cor/ícone/animação de cada dispositivo
  precisa comunicar estado sem precisar ler texto — é um painel de relance, não um
  formulário.
- **Tema claro/escuro:** o tablet provavelmente fica ligado o dia todo; a interface
  precisa se comportar bem em ambiente iluminado e escurecido (casa à noite).

## Em aberto — decidir na sessão new-work da Impeccable
- Paleta e tom (minimalista/técnico vs. mais orgânico, cores por tipo de dispositivo etc.)
- Tipografia
- Estilo de ícone/representação de dispositivo sobre a planta
- Motion (transições de estado, feedback de toque)
