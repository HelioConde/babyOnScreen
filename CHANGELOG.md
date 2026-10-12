# Histórico de versões

## [0.0.10] — 12/10/2026

- Novo cabeçalho da janela Windows separado do conteúdo: X de fechar, nome e alça de movimentação permanecem estáticos.
- Apenas a área abaixo do cabeçalho tem rolagem própria, evitando que a caixinha de cuidados desapareça atrás do título.
- Confirmada a prioridade: mamadeira, fralda, berço e demais ações antes das informações; configurações e atualizações no final.
- Mantidos os tempos da versão PC pela metade, sem controles de velocidade, pausa ou reinício de teste.
- Teste real do Electron valida rolagem completa, estabilidade do X, painel estável com opções expandidas e ausência de comandos de teste.
- Preservados os saves, o atualizador automático, os downloads Setup e Portable, e a versão Web.

## [0.0.9] — 12/10/2026

- HUD Windows reorganizado para abrir com a caixinha de cuidados imediatamente abaixo do cabeçalho, antes do ciclo do dia e das estatísticas.
- Seletor de monitor e atalho de atualização rápida movidos para **Configurações → Monitor e aplicativo**, recolhido por padrão.
- Preferências e salvamento, monitor e atualizações agrupados no final do painel, reduzindo a poluição visual durante o jogo.
- Mantidos tempos de ação reduzidos no PC, opções de jogo sem controles de teste, cabeçalho fixo com X e salvamentos anteriores.
- Teste Windows empacotado verifica ordem das seções, configurações no final e X visível ao rolar.

## [0.0.8] — 12/10/2026

- Intervalos das ações no Windows reduzidos em 50% sem alterar os tempos da Web.
- Temporizadores ativos criados por versões anteriores ajustados na primeira abertura após a atualização.
- Mamadeira, fralda e berço em destaque antes das barras de necessidades.
- Botão de fechar e cabeçalho fixos enquanto o painel rola.
- Removidas da interface Windows as opções de desenvolvimento de velocidade, pausa e recomeçar; opções essenciais e salvamentos preservados.
- Preparados textos e checklist para publicação gratuita com contribuições voluntárias na itch.io.

## [0.0.7] — 11/10/2026

- Corrigida a superfície nativa do overlay Windows para restringir o desenho da janela transparente à bebê, balão, botão e painel, reduzindo risco de desfoque/oclusão de vídeos reproduzidos atrás do jogo.
- Clique-through permanece independente da região visual; o balão pode ser desenhado sem capturar o mouse.
- Arrastar expande temporariamente a superfície para evitar cortes do personagem durante a movimentação.
- Novas verificações de limites e região nativa no Windows real. A qualidade de vídeo ao fundo exige confirmação física em diferentes GPUs.

## [0.0.6] — 11/10/2026

- Seleção nativa do monitor da janela Electron, evitando o problema da janela transparente gigante.
- Nova opção `Mover para monitor` no menu de bandeja do Windows.
- Persistência do monitor escolhido, com recuperação e centralização da bebê/painel.
- Campo de nome da bebê dentro do primeiro passo do tutorial; persistência do nome no mesmo save.
- Atalho para Atualizações automáticas no painel, sem reinstalação manual da versão Setup.
- Testes de seleção de monitor, IDs inválidos, onboarding e inicialização real do Windows.

## [0.0.5] — 11/10/2026

- Ciclo de quatro períodos: madrugada (0–6h), manhã (6–12h), tarde (12–18h) e noite (18–24h), compartilhado pelas regras Web e Windows.
- Mostrador do período em ambas as versões; Web ajusta automaticamente a iluminação ao período, mantendo alternância manual possível.
- Mamadeira, berço e fralda com intervalo mínimo de 25 minutos reais e necessidades reabastecidas a 100% após cada cuidado.
- Redução da velocidade de desgaste para suportar vídeos e episódios, mesmo com velocidade acelerada no navegador.
- Painel do desktop com altura estável e rolagem interna: abrir opções expansíveis não o envia para outro monitor.
- Testes de relógio, cooldown, ritmo de necessidades e regressão visual do painel.

## [0.0.4] — 11/10/2026

- Overlay transparente cobre a união de todos os monitores conectados, inclusive posicionados à esquerda ou acima do principal.
- Bebê pode ser arrastada livremente entre monitores; novo seletor Monitor centraliza bebê e painel na tela escolhida.
- Painel de cuidados pode ser arrastado pelo cabeçalho e ajustado pelo teclado com as setas.
- Posições são lembradas sem alterar o save da bebê; controles são realocados se um monitor for desconectado.
- Botão Minha amiguinha fica na mesma tela da personagem.
- Testes de geometria com coordenadas negativas, layout de várias telas, clique transparente e movimentação real do painel.
- Links permanentes para Setup e Portable preservados; atualização automática continua disponível aos usuários da 0.0.3.

## [0.0.3] — 11/10/2026

- Links de download permanentes para Setup e Portable, com nomes fixos nas releases seguintes e preservação dos nomes versionados.

- Verificação periódica e download de atualizações oficiais do GitHub no aplicativo Setup.
- Aviso de download concluído e instalação ao reiniciar, preservando o progresso.
- Painel Atualizações e opção de checagem pela bandeja do Windows.
- Aviso de atualização para a edição Portable, com download manual.
- Workflow para publicar releases em novos números de versão com `latest.yml` e verificação SHA-512.

## [0.0.2] — 11/10/2026

Reformulação do Baby On Screen e nova release para Windows.

### Adicionado
- Jogo Web com quatro fases de crescimento e sete itens de cuidado/interação.
- Tutorial inicial de cinco passos e botão **Como jogar** na versão Windows.
- Animação real dos sprites da personagem no guia de boas-vindas.
- Quarto Web, modo dia/noite, missões, rotinas diárias, recompensa XP, escola infantil e nome personalizável.
- Salvamento e exportação/importação de progresso entre Web e PC.
- Instalador e executável portátil para Windows x64, com publicação dos arquivos na release.

### Melhorado
- Visual da personagem padronizado em Web e Windows com PNG/WebP compartilhados (128 × 128 px).
- Ritmo de fome, energia, higiene e saúde, com ajuste de velocidade.
- Transparência do overlay, regiões interativas, retorno pela bandeja, acessibilidade e testes de interface.
- Validações automatizadas em GitHub Actions para Windows e Web.

### Pendente
- Teste manual de uso prolongado no Windows, DPI, múltiplos monitores e clique através da transparência.
- Sprites dedicados às fases mais avançadas e conteúdo adicional de escola.

Veja os detalhes em [Notas da versão 0.0.2](docs/RELEASE_0.0.2.md).

## [0.0.1] — 25/07/2020

- Ajuste do tempo de jogo.
- Inclusão de remédio.

## [0.0.0] — 20/07/2020

- Primeira versão publicada.
