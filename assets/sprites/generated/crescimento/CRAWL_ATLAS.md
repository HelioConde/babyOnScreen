# Novo ciclo de engatinhar (8 frames)

O motor de sprites já aceita o atlas `crawl_sheet.webp` nesta pasta, mas **o arquivo binário precisa ser enviado aqui** para ativar a nova animação. Até isso acontecer, o jogo mantém a animação antiga automaticamente.

## Formato

- Arquivo: `assets/sprites/generated/crescimento/crawl_sheet.webp`
- Dimensões: **256 × 128 px**
- Grade: **4 colunas × 2 linhas**
- Cada quadro: **64 × 64 px**
- Quadros: 8, em ordem de leitura, 8 FPS
- Transparência real, sem fundo quadriculado
- Personagem virada à esquerda; direita é espelhada pelo jogo

O arquivo está incluído no pacote `baby_crawl_github_ready.zip`, junto com os oito PNGs individuais e um GIF de prévia. No GitHub, entre nesta pasta e use **Add file → Upload files** para enviar somente `crawl_sheet.webp`. O manifesto `app/sprite-manifest.js` já aponta para o nome correto.

O atlas foi gerado com limpeza automática de fundo e alinhamento. **A qualidade do ciclo de movimento ainda exige revisão visual**, pois a geração original tem pequenas diferenças de pose.
