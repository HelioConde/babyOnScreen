# Baby On Screen 0.0.7 — compatibilidade com vídeos ao fundo

## Correção no overlay Windows

O problema relatado era o vídeo de fundo ficar **desfocado quando o cursor passava sobre a bebê ou o painel**, não uma falha dos cliques.

A versão anterior mantinha uma janela transparente do Electron abrangendo praticamente o monitor inteiro. Essa construção pode interferir com a oclusão e a composição acelerada de vídeos em navegadores Chromium.

Na versão 0.0.7, o Windows recebe apenas pequenas regiões nativas para os elementos visíveis do jogo (bebê, balão de fala, botão e HUD). O restante do monitor fica fora da região desenhada, mesmo que seja transparente no HTML. O mouse continua atravessando as partes externas; bebê e botões permanecem interativos. Durante a movimentação por arrastar, a região volta a cobrir a área necessária e depois é reduzida novamente.

## Validações

Os testes de código e do Electron empacotado passaram. No monitor virtual do ambiente Windows, a região recortada foi aplicada com quatro retângulos, cobrindo cerca de 36,5% da área. O painel, os sprites, o nome e as funções de atualização continuaram acessíveis.

**Importante:** o teste automatizado não reproduz um Chrome com vídeo acelerado atrás do jogo em todas as combinações de Windows e GPU. Confirme reproduzindo o mesmo vídeo e passando o mouse sobre a personagem e o HUD. Não é possível garantir que o desfoque tenha desaparecido antes desse teste físico.

## Atualização

Quem utiliza o instalador Setup a partir da 0.0.3 pode abrir **Atualizações → Verificar agora**, aguardar o download e selecionar **Reiniciar e atualizar**. A edição Portable precisa de novo download.

O progresso da bebê é mantido. Os links permanentes no README apontam para os dois formatos de EXE e esta release inclui o manifesto `latest.yml`.

[Releases](https://github.com/HelioConde/babyOnScreen/releases/latest) · [Repositório](https://github.com/HelioConde/babyOnScreen)
