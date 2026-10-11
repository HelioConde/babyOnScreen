# Atlas de engatinhar do Baby On Screen

O arquivo **`crawl_sheet.webp` já foi enviado para o GitHub** e é usado nas fases recém-nascida e bebê. O atlas substitui as poses laterais antigas e também é reutilizado temporariamente nas direções verticalizadas para evitar mudanças abruptas entre estilos.

- Caminho: `assets/sprites/generated/crescimento/crawl_sheet.webp`
- Dimensões: **256 × 128 px**
- Grade: **4 colunas × 2 linhas**
- Frame: **64 × 64 px**; oito frames, **8 FPS**
- Transparência real; personagem olha para a esquerda; direita é espelhada pelo motor

O motor não usa interpolação com vizinhos ao desenhar células do atlas, evitando resíduos de borda. Se o WebP falhar, existe um fallback com PNGs anteriores. Durante cartinha, desenho e outros cuidados, a posição do bebê permanece independente da animação.

**Pendente:** revisão artística do ciclo diagonal de mãos e joelhos e poses específicas para frente e trás; o código não corrige diferenças anatômicas dos quadros gerados.
