# 👶 Baby On Screen — infância, cuidados e primeiras palavras

Projeto iniciado em 2020, renovado como simulador de cuidados e crescimento de uma personagem virtual. A personagem começa como recém-nascida, aprende a balbuciar, dá seus primeiros passos e cresce até a infância.

## 🌐 Jogue a versão Web

**[Abrir o jogo no GitHub Pages](https://helioconde.github.io/babyOnScreen/)**

A página web agora tem uma tela unificada: quatro necessidades, uma personagem animada e uma caixinha de objetos. **Arraste um objeto até ela** para cuidar ou brincar; no celular e por teclado, selecione o objeto e depois toque ou ative a personagem. Quando uma necessidade está baixa, ela pede ajuda; se estiver crítica, começa a chorar. O áudio pode ser ligado ou desligado.

- Mamadeira: alimentação. Berço: energia. Fralda: higiene. Remédio: saúde. Esses itens só funcionam quando a necessidade está baixa e fora do intervalo de recarga.
- Brinquedo: brincadeiras e felicidade. Cartinha: vínculo e lembranças. Desenho: criatividade e memórias. Todos têm intervalo de uso.
- Preferências de som, pausa e velocidade, álbum de memórias, XP e conquistas.

## 🌱 Crescimento

| Fase | Tempo ativo mínimo | Cuidados mínimos | Linguagem |
|---|---:|---:|---|
| Recém-nascida | 0 min | 0 | Gugu, dada, choro |
| Bebê curiosa | 10 min | 8 | Sílabas e palavras |
| Primeiros passos | 35 min | 26 | Frases curtas |
| Criança | 90 min | 65 | Frases completas |

O motor combina tempo ativo e cuidados: nenhuma fase depende só de deixar a aba aberta. **Na Web o tempo de jogo avança três vezes mais rápido** enquanto a página está ativa; no Windows passa em tempo real. Esses valores serão balanceados com testes de jogadores. Cada fase tem sprite e falas próprios.

## 💻 Versão Windows

A versão Windows usa Electron e acompanha a área de trabalho com uma janela transparente e cliques que atravessam regiões vazias. Compartilha necessidades, crescimento, sprites e memórias com a Web. Quando chegar à infância, a personagem pode participar de uma **primeira escola experimental**: escolha leitura, números ou artes, responda a uma pergunta e aprenda a habilidade correspondente. Não é ainda um mapa de escola navegável.

Requisitos: Windows 10/11, Node.js 22+ e npm. No terminal:

    git clone https://github.com/HelioConde/babyOnScreen.git
    cd babyOnScreen
    git checkout feat/revival-windows-2026
    npm install
    npm run check
    npm test
    npm start

Para gerar o instalador e o executável portátil em Windows, use **npm run build:win**. Os workflows GitHub Actions também validam e compilam a beta.

## 💾 Transferir progresso da Web para o PC

Na Web, clique em **Salvar progresso** para baixar o JSON. No PC, abra **Preferências e salvamento > Importar** e selecione esse arquivo. A direção contrária também funciona. Faça um backup antes de importar: a importação pede confirmação e substitui o progresso atual. Não há sincronização em nuvem nem contas online.

O formato compartilhado (versão 2) registra tempo ativo, necessidades, estágio, XP, cuidados, memórias, conquistas, habilidades, cooldowns e escola. Dados ficam apenas no computador ou navegador do jogador.

## Arquitetura

- **engine.js:** motor puro compartilhado, sem acesso a navegador ou Electron.
- **web/:** jogo web responsivo publicado via branch gh-pages.
- **app/:** versão Electron segura com preload e canais IPC controlados.
- **assets/icons/:** ícones SVG independentes de emojis do sistema.
- **assets/growth/:** sprites pixelados SVG para fases posteriores.
- **sprits/** e **som/:** recursos originais do projeto de 2020.
- **tests/:** testes de lógica, web e desktop.

## Status honesto

**Implementado no código:** quatro fases, falas por idade, pedidos/choro, sete itens arrastáveis, cooldown, álbum de memórias, XP, novos sprites, transferir saves e escola experimental no PC.

**Em planejamento para uma versão PC mais completa:** mapa escolar com caminho até a escola, colegas NPCs, amizades, rotinas aprofundadas, calendário, roupas e brinquedos colecionáveis. O recurso de escola atual é um mini-jogo de perguntas, não toda essa simulação.

**Antes da release estável:** validar manualmente clique-through e DPI no Windows, interação móvel, importação em ambas as direções e funcionamento dos instaladores.

Desenvolvido por Hélio Conde.

## Novidades de experiência (outubro de 2026)
- Quarto da Web mais completo, com móveis decorativos responsivos e iluminação dia/noite ajustável, sem impacto no consumo das necessidades.
- Seis pequenas missões de cuidado, brincadeira, cartinha, desenho e crescimento. Recompensas de XP e felicidade podem ser resgatadas uma vez e acompanham os saves Web/Windows.
- Tamanhos de textos e destaque visual da personagem revisados para facilitar as interações.

O catálogo tem 565 PNGs e um atlas WebP, mas apenas quadros revisados estão vinculados às ações. Os minijogos avançados, o cenário navegável da escola e a revisão final no Windows ainda são etapas futuras.

As recompensas também podem ser resgatadas no painel da versão Windows, em **Missões e recompensas**. Na Web, as primeiras recompensas de brincadeira e desenho também personalizam detalhes do quarto.

### Escola no navegador
Ao alcançar a fase **Criança**, aparece um minijogo de escola também na Web: leitura, matemática básica e artes, com três opções por pergunta, XP e novas memórias. O motor compartilhado valida necessidade de descanso/alimentação e intervalo de aula, igual ao Windows.

## Rotinas diárias e felicidade
A experiência Web e o painel Windows compartilham uma pequena rotina renovável por data local: dois cuidados, uma brincadeira e uma atividade criativa. Na fase Criança, a rotina inclui uma aula escolar. Cada atividade contabiliza somente ações realmente concluídas, e cada recompensa pode ser resgatada uma vez por dia. O save JSON preserva os resgates e permite continuar nas duas plataformas.

A felicidade agora aparece com uma barra na Web e no Windows; as recomendações Web indicam quando cuidar das necessidades ou brincar. O jogo permanece offline, sem sincronização em nuvem.

## Personalização da personagem
O nome da bebê pode ser definido em **Preferências e salvamento** na Web e no Windows. É opcional, tem até 20 caracteres e fica registrado no mesmo progresso JSON usado para transferir a personagem entre plataformas. A interface atualiza o nome sem perder os cuidados ou as conquistas.
