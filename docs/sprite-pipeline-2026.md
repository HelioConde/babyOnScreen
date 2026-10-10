# Pipeline de sprites 2026

O pacote de 10 folhas de sprites foi preparado fora do repositório (arquivos PNG binários). Os recortes são experimentais e **não devem substituir os sprites existentes sem revisão visual**.

## Pastas planejadas

- `assets/sprites/banho/`
- `assets/sprites/fralda/`
- `assets/sprites/alimentacao/`
- `assets/sprites/sono/`
- `assets/sprites/crescimento/`
- `assets/sprites/quarto/`
- `assets/sprites/casa/`
- `assets/sprites/quintal/`
- `assets/sprites/escola/`
- `assets/sprites/npcs/`

Cada pasta contém `sheet.png` original e recortes `element_XXX.png`, além de um `manifest.json` global com coordenadas.

## Integração e critérios de aceite

1. Conferir bordas, alfa, resíduos e quadros sobrepostos.
2. Mapear cada quadro a `personagem/fase/acao/direcao/frame`.
3. Normalizar pivô dos pés, canvas e FPS por animação (sem redimensionar a arte).
4. Montar cenas a partir de pisos/paredes/objetos independentes; marcar estados de dia/noite, portas e móveis.
5. Completar **quadros que faltam** para quatro direções e interações; espelhamento apenas quando visualmente apropriado.
6. Integrar à Web e Windows, testar troca de fases, ações e regressões visuais.

**Situação:** recorte inicial pronto em pacote local; upload de binários ainda pendente. Não declarar esses cinco itens concluídos até testes de animação e revisão manual.
