# Histórico de versões

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
