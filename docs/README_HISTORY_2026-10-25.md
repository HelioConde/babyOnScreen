# Histórico anterior do README — babyOnScreen

> Arquivo de referência preservado durante a reorganização da documentação em 25/10/2026. Para instalação e estado atual, consulte [README principal](../README.md).

---

# Baby On Screen — seu mascote virtual na tela 👶

**Cuide de um bebê virtual, acompanhe seu crescimento e descubra atividades na versão Windows ou no navegador.**

[**Baixar para Windows**](https://github.com/HelioConde/babyOnScreen/releases/latest) · [**Jogar na Web**](https://helioconde.github.io/babyOnScreen/)

![Electron](https://img.shields.io/badge/Electron-Windows-47848F?logo=electron&logoColor=white) ![Web](https://img.shields.io/badge/Web-navegador-1572B6) ![Status](https://img.shields.io/badge/status-em%20evolução-64748b)

## Primeiros passos

- **Windows:** escolha o instalador ou a versão portátil na tabela de downloads abaixo.
- **Web:** acesse o jogo diretamente pelo navegador, sem instalação.
- **Progresso:** consulte as seções de salvamento e transferência antes de trocar de dispositivo.
- **Novidades:** as notas de versão abaixo detalham mudanças específicas entre Windows e Web.

> Os recursos e intervalos de ações variam por edição. Confirme a versão instalada antes de comparar com as notas históricas.

---

## ⬇️ Baixar Baby On Screen — sempre a versão mais recente

| Download | Link permanente |
|---|---|
| 🖥️ **Instalador Windows (Setup, recomendado)** | **[Baixar Baby On Screen para Windows](https://github.com/HelioConde/babyOnScreen/releases/latest/download/Baby-On-Screen-Setup-x64.exe)** |
| 📦 **Versão Portable (não precisa instalar)** | **[Baixar Baby On Screen Portable](https://github.com/HelioConde/babyOnScreen/releases/latest/download/Baby-On-Screen-Portable-x64.exe)** |
| 📋 **Todas as opções e notas da versão** | [Ver downloads no GitHub](https://github.com/HelioConde/babyOnScreen/releases/latest) |
| 🎮 **Jogar no navegador** | [Abrir versão Web](https://helioconde.github.io/babyOnScreen/) |

**Estes endereços não mudam entre as versões**: por exemplo, da 0.0.3 para a 0.0.4 ou posteriores. Cada release manterá tanto o nome versionado para histórico quanto o nome fixo para download direto. Links permanentes apontam para a **última release estável**; betas ainda precisam ser baixadas pela página específica da beta.

## Baby On Screen 0.0.12 — intervalos de 30% no Windows

Os tempos de espera para ações na versão **PC** agora equivalem a **30% dos tempos originais**. Mamadeira, fralda e berço passam de 12min30s para **7min30s**; outras interações e escola também usam 30%. A edição **Web mantém seus intervalos existentes**, inclusive os 25 minutos dos cuidados principais.

Se o jogador já estiver esperando a conclusão de uma ação, a atualização reduz uma única vez o temporizador pendente da versão anterior. Não reinicia o progresso, não muda o nome definitivo e mantém o painel organizado sem os controles de teste.

## Baby On Screen 0.0.11 — escolha definitiva do nome da bebê

Na primeira abertura do jogo para Windows, se a bebê **ainda não tiver um nome**, aparece automaticamente uma tela integrada ao próprio HUD e ao tutorial, com a animação da personagem. Digite o nome desejado (até 20 caracteres) e clique em **Confirmar nome 💕**. Antes de confirmar, é possível corrigir a escrita; depois disso, o nome fica definitivo.

**Jogadores existentes:** se o progresso já contém um nome, nada muda e a tela não aparece. Se você já jogou mas nunca deu um nome, a atualização apresenta **somente a etapa de nomeação** — sem repetir o tutorial e sem apagar seu progresso, nível, conquistas ou cuidados. A etapa não pode ser pulada nem encerrada sem confirmar.

Após a escolha, o nome aparece como **Nome definitivo da bebê** nas Preferências, apenas para consulta. Reabrir o tutorial ou importar outro salvamento **não muda o nome escolhido**. A identidade é mantida também em um registro local separado do save do jogo.

**Atualização:** quem usa o Setup pode abrir **Atualizações → Verificar agora** e aguardar o botão **Reiniciar e atualizar**. Os links fixos de Setup/Portable acima sempre apontam para a última versão estável.

## Baby On Screen 0.0.10 — HUD organizado e cabeçalho sempre visível

Na versão Windows, o painel agora usa um **cabeçalho fixo independente** e uma área de rolagem interna: o nome da bebê, a alça para arrastar o painel e o **X para fechar nunca desaparecem** nem cobrem os cuidados enquanto você rola. O conteúdo mantém a posição da caixa mesmo quando Preferências, Monitor ou Atualizações são abertos.

O jogo continua mostrando primeiro **Mamadeira → Fralda → Berço**, seguidos pelos outros cuidados; depois aparecem relógio do dia, necessidades, evolução, missões e rotina. **Configurações e atualizações ficam somente no final**, recolhidas inicialmente.

Os tempos das ações da versão Windows seguem **50% menores**, incluindo mamadeira, berço e fralda a **12min30s**, sem mudar os 25 minutos da Web. Controles de testes (velocidade, pausa e reset) permanecem fora do HUD. Saves e preferências do jogador são preservados.

A estrutura, a rolagem e a posição fixa do X foram verificadas no Electron Windows empacotado. A página [itch.io](docs/ITCH_IO_STORE.md) continua como preparação para uma futura publicação gratuita com apoio voluntário; pagamentos ainda não estão ativos.

## Baby On Screen 0.0.9 — cuidados na frente, configurações no final

O painel da edição **Windows** agora abre diretamente com as opções de cuidado: **Mamadeira → Fralda → Berço**, seguidas de remédio, brinquedo, cartinha e desenho. Depois aparecem o ciclo do dia, bem-estar, evolução, escola, memórias, missões e rotina.

**Todas as configurações estão reunidas na parte inferior do HUD**. Para escolher outro monitor, abra **⚙️ Configurações → 🖥️ Monitor e aplicativo**. O painel já inicia com essa seção recolhida. **Preferências e salvamento** e **Atualizações** também ficam no final. O botão X acompanha a rolagem no topo, sem alterar a posição da janela.

A edição Windows preserva os intervalos **50% menores** lançados na 0.0.8 (mamadeira, fralda e berço: **12min30s**). Velocidade, pausa e reinício de testes não reaparecem. A Web permanece inalterada.

## Baby On Screen 0.0.8 — painel pronto para jogadores e distribuição

Na versão **Windows**, as ações e cuidados agora aguardam **metade do tempo anterior**: mamadeira, fralda e berço passam de 25 min para **12 min e 30 s**. Brinquedo, cartinha, desenho, remédio e escola também usam metade dos intervalos anteriores. As animações de uso da mamadeira e de descanso foram encurtadas. A **versão Web continua com as regras anteriores de 25 minutos**.

A **Caixinha de cuidados** aparece antes das barras de necessidades, destacando **mamadeira, fralda e berço**. O cabeçalho acompanha a rolagem: o botão **X** para fechar continua visível. Removidos da edição Windows os controles de desenvolvimento de velocidade, pausa e recomeçar. Permanecem som, nome, exportação/importação do progresso e atualizações automáticas. Preferências antigas de pausa/velocidade são ignoradas na versão Windows; o save da bebê é mantido.

### Preparação para itch.io e apoio voluntário

- [Rascunho completo da página de divulgação e descrição do jogo](docs/ITCH_IO_STORE.md)
- [Checklist de lançamento, direitos autorais e testes](docs/ITCH_IO_CHECKLIST.md)

**Publicação e pagamentos ainda dependem da criação/configuração da página na itch.io e da verificação de licenças de imagens, sprites, músicas e fontes.** Não há ligação de pagamento ativa dentro do jogo.

## 0.0.7 — compatibilidade do overlay com vídeos em segundo plano

A versão Windows passou a usar **regiões nativas limitadas** para a janela transparente do Electron. Antes, mesmo sem pixels visíveis, o overlay se estendia por todo o monitor e podia ser considerado uma janela oclusiva pelo compositor de vídeo do Chrome/Windows. Agora, só a área visível da bebê, balão, botão e painel participa da superfície nativa, preservando a passagem de mouse do restante. Durante um arrasto a região é ampliada temporariamente para que o cursor não seja cortado.

A mudança foi testada no Electron Windows empacotado: os elementos foram desenhados, as regiões foram aplicadas (quatro regiões, aproximadamente 36,5% do monitor virtual de teste) e os testes de movimentação e painel passaram. **A reprodução de vídeos por GPU no seu computador ainda precisa de teste manual**: não é possível garantir uma correção universal para todos os drivers de vídeo sem reproduzir o problema na sua máquina. Se persistir, informe a versão do Windows, navegador e placa de vídeo.

## 0.0.6 — monitor 2, nome no tutorial e atualização sem reinstalar

**Trocar de monitor no PC:** no painel, escolha **Monitor 1** ou **Monitor 2**. A janela transparente do Windows é movida fisicamente para a tela selecionada (antes os personagens apenas mudavam de coordenadas dentro de uma janela virtual enorme). A seleção é lembrada ao iniciar. Como alternativa, use o ícone do jogo ao lado do relógio do Windows → **Mover para monitor**. Escolher o monitor atual também traz a bebê e a caixa para o centro da tela. Se somente um monitor aparecer, confirme que o Windows está em **Estender estes vídeos** nas configurações de Tela.

**Dar nome à bebê:** no primeiro passo do tutorial, escreva um nome de até 20 caracteres ou deixe em branco. O nome é salvo no progresso local e também aparece em **Preferências e salvamento**; não apagamos os saves anteriores. Quem já concluiu o tutorial pode abri-lo novamente em **? Como jogar** e nomeá-la ali.

**Atualizar o jogo sem baixar novos EXEs:** instale a versão **Setup** uma única vez. Novas releases oficiais são verificadas automaticamente, baixadas em segundo plano e ficam prontas em **Atualizações automáticas → Reiniciar e atualizar**. Também é possível abrir **Atualizações automáticas** no topo do painel ou **Verificar atualizações** pelo ícone da bandeja. A versão **Portable** não instala atualizações sozinha; ela informa a disponibilidade de uma nova versão e oferece o GitHub. O Windows ainda pode apresentar aviso SmartScreen, pois o executável não possui assinatura digital.

## 0.0.5 — quatro períodos e cuidados para acompanhar um episódio

O ciclo acompanha o horário local e é dividido em **Madrugada (00h–06h), Manhã (06h–12h), Tarde (12h–18h) e Noite (18h–00h)**. A Web mostra a iluminação correspondente ao período, e o Windows exibe a rotina atual no painel. Os horários são uma referência local por enquanto; em futuras salas com amigos, um servidor poderá definir o relógio compartilhado.

**Mamadeira, berço e fralda:** após cada cuidado bem-sucedido, a necessidade volta a 100% e a próxima utilização só fica disponível depois de **25 minutos reais**. O desgaste foi reduzido inclusive para a velocidade 2× no navegador, permitindo assistir a um vídeo ou episódio sem interrupções frequentes. Brincadeiras e outras interações mantêm seus próprios intervalos.

**Painel Windows:** abrir Preferências, Rotina e outras caixas não deve deslocar o painel para outro monitor. A janela mantém altura e posição fixas e seu conteúdo interno rola normalmente.

## 🖥️ Baby On Screen 0.0.4 — vários monitores e painel móvel

Na versão Windows é possível **arrastar a bebê até outro monitor** e **mover a caixa de cuidados** pelo cabeçalho, usando o botão ⠿ como alça. No painel, o seletor **Monitor** leva tanto a bebê quanto o painel para a tela escolhida. O botão “Minha amiguinha” acompanha a tela da personagem e continua disponível.

O jogo guarda a posição escolhida, mantém a passagem de cliques nas áreas transparentes e tenta reposicionar os controles para um monitor disponível caso outro seja desconectado. O movimento automático da bebê permanece limitado ao monitor atual; para mudar de tela, arraste-a ou use o seletor. O suporte a diferentes escalas de DPI precisa ser conferido em uso real.

**SmartScreen:** o aviso “Fornecedor desconhecido” acontece porque os instaladores ainda **não têm assinatura digital Authenticode**. As alterações de interface não removem esse aviso. A solução para a distribuição futura é assinar os executáveis com um certificado de publicação confiável e desenvolver reputação no SmartScreen. Não desative a segurança global do Windows.

## Versão 0.0.3 — atualizações automáticas para Windows

A partir da versão **0.0.3**, o aplicativo instalado via Setup pode verificar, baixar e instalar futuras releases oficiais automaticamente. Consulte [Baby On Screen 0.0.3](https://github.com/HelioConde/babyOnScreen/releases/tag/v0.0.3).

A verificação começa após aproximadamente 15 segundos, repetindo-se a cada quatro horas. O jogo baixa a atualização e apresenta a opção **Reiniciar e atualizar**, salvando a bebê primeiro. A versão Portable apenas oferece o download manual da nova release.

**A 0.0.2 ainda precisa de uma atualização manual para a 0.0.3**, porque foi publicada antes do atualizador existir. As próximas versões são compiladas e publicadas automaticamente após atualizar a versão do `package.json` em `master` e passar nos testes. A release precisa conter `latest.yml`.

Os executáveis ainda não têm assinatura digital; teste novas versões no Windows antes de divulgação ampla.

## Versão 0.0.2 — atualização de 2026

A versão pública seguinte à 0.0.1 (2020) reúne as melhorias feitas na renovação do projeto. **[Ver a release 0.0.2 e baixar para Windows](https://github.com/HelioConde/babyOnScreen/releases/tag/v0.0.2)**.

Disponíveis para Windows x64: **Setup** (instalação) e **Portable** (sem instalação). A versão Web continua em [GitHub Pages](https://helioconde.github.io/babyOnScreen/). Consulte as [notas da versão 0.0.2](docs/RELEASE_0.0.2.md) e o [histórico de mudanças](CHANGELOG.md).

**Importante:** a 0.0.2 foi a primeira release pública renovada (a 0.0.3 é mais recente), com testes automatizados aprovados. Ainda faltam testes manuais em Windows 10/11 (transparência, DPI e cliques através da janela). Os executáveis não possuem assinatura digital. Os números 1.1.0-beta.2 até 1.1.0-beta.5 abaixo representam builds de desenvolvimento anteriores, não releases públicas.

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

    git clone --branch feat/revival-windows-2026 https://github.com/HelioConde/babyOnScreen.git
    cd babyOnScreen
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

## Instaladores Windows
O GitHub Actions gera **dois executáveis distintos** na branch `feat/revival-windows-2026`:
- `Baby-On-Screen-Setup-VERSAO-x64.exe`: instalador com escolha de pasta e atalhos;
- `Baby-On-Screen-Portable-VERSAO-x64.exe`: aplicativo sem instalação.

O workflow verifica que os dois arquivos são produzidos, não estão vazios e têm conteúdo diferente. Para baixar, abra o último workflow **Baby On Screen - Windows beta**, depois **Artifacts**. Ambos vêm juntos no arquivo compactado. Os arquivos não são assinados digitalmente, portanto o Windows pode exibir um aviso SmartScreen. Nunca desative globalmente as proteções do sistema.

A validação automática não substitui uma sessão manual de uso no Windows 10/11, especialmente para transparência e interação entre monitores com DPI diferente.

### Beta 1.1.0-beta.2 — revisão de qualidade
Esta revisão amplia os sprites no Windows, melhora regiões de clique em monitores secundários, reabre a janela pelo ícone da bandeja se ela for fechada, separa de forma segura os arquivos **Setup** e **Portable** e acrescenta testes de inicialização da janela e do painel do aplicativo real. Essa versão substitui os pacotes da beta.1. Use sempre os executáveis identificados como **1.1.0-beta.2**.

Para a aprovação final de uso diário, ainda é necessário testar pessoalmente transparência, passar cliques para janelas atrás do jogo, mudança de DPI, dois monitores e fechamento/retorno pela bandeja. Os testes automáticos do GitHub não substituem essa etapa.

### Beta 1.1.0-beta.3 — sprites iguais aos da Web
As duas versões usam o **mesmo manifesto de sprites** em `app/sprite-manifest.js`, incluindo as animações `crawl_sheet.webp`, mamadeira, berço, fralda, brinquedo, cartinha, desenho e evolução.
- Desenho e área de clique do bebê padronizados em **128 × 128**, com ampliação visual **1,06×** e transparência preservada na janela do Windows;
- sprites carregados pelo mesmo `sprite-controller.js` e `sprite-cleaner.js` em Web e Windows, com `image-rendering: pixelated`;
- verificação Windows exige um **quadro real visível no canvas** (`sprite-ready` e pixels opacos), não apenas existência do manifesto;
- controles de movimento, posicionamento e arrastar respeitam o novo tamanho sem alterar as necessidades ou o progresso salvo.

Baixe a **beta.3** depois do workflow de compilação ser aprovado. Versões anteriores não têm a apresentação de sprites idêntica.

### Beta 1.1.0-beta.4 — apresentação inicial do overlay
No primeiro acesso ao aplicativo Windows, um guia de **5 passos** aparece automaticamente no painel: apresentação da bebê, arrastar e carinho, cuidados, transparência/bandeja do Windows, progressão e salvamento. A abordagem é inspirada na descoberta progressiva de controles dos mascotes de desktop como Desktop Mate e Shimeji, com texto e arte próprios.
- Botões **Próximo**, **Voltar**, **Pular guia** e **Começar a cuidar**; setas esquerda/direita e Escape com foco no guia;
- o tempo e a movimentação automática ficam pausados durante a apresentação, sem modificar a velocidade escolhida;
- conclusão gravada na preferência local `baby-on-screen-guide-v1`, independente do save da bebê;
- tutorial acessível novamente por **? Como jogar** no rodapé do painel;
- a janela transparente continua permitindo interação com outros aplicativos fora das regiões ativas do jogo.
O teste da beta abre o Electron real, navega pelas cinco telas, verifica o armazenamento e captura a apresentação no Windows.

### Beta 1.1.0-beta.5 — tutorial com a personagem de verdade
A apresentação inicial usa uma prévia animada dos mesmos quadros do canvas principal, com limpeza, transparência e estilo pixel art compartilhados com a versão Web. O teste Windows confirma pixels visíveis na prévia, além dos cinco passos interativos.
