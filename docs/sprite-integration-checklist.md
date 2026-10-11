# Integração dos sprites — Baby On Screen (Windows)

Em 10/10/2026 foram confirmados **565 PNGs** em `assets/sprites/generated/`, divididos em dez categorias. A versão Electron agora carrega as sequências de PNGs por meio de `app/sprite-manifest.js` e mantém o desenho CSS original quando um sprite não está mapeado ou não carrega.

## Implementado
- **Recém-nascida:** piscar/expressão em repouso; alimentação, sono, fralda, brinquedo e carinho.
- **Bebê curiosa:** repouso, engatinhar lateral/frontal, alimentação, sono, fralda, brinquedo e carinho.
- **Primeiros passos:** repouso, caminhada lateral/frontal, alimentação, sono, fralda, brinquedo e carinho.
- **Criança:** continua com o sprite CSS anterior até a revisão de imagens específicas dessa faixa etária.
- Carregamento assíncrono, cache de imagens, dimensionamento automático para 64×72 px, espelhamento horizontal e fallback.
- Os recortes selecionados foram inspecionados e os nomes dos PNGs referenciados no manifesto foram confirmados no repositório. **A aparência dentro do Electron ainda precisa de validação visual.**

## Arquivos
- `app/sprite-runtime.js`: lógica de quadros, desenho e caminhos permitidos
- `app/sprite-controller.js`: carregamento de PNGs, cache e renderização
- `app/sprite-integration.js`: seleção por idade, ação e direção
- `app/sprite-manifest.js`: sequências de arquivos existentes
- `app/renderer.js`: sincronização com o jogo
- `tests/sprite-runtime.test.cjs`: testes do manifesto, quadros e fallback

## Como validar
Na branch `feat/revival-windows-2026`:

```powershell
git pull --ff-only origin feat/revival-windows-2026
npm install
npm run check
npm test
npm start
```

Teste a personagem em repouso e movimento, depois **mamadeira, dormir, fralda, brinquedo e carinho**. Confirme que os sprites mantêm o tamanho e a transparência ao arrastar o bebê e que a fase **Criança** continua usando o desenho anterior.

Para empacotar no Windows:

```powershell
npm run build:win
```

**Pendências:** validar o visual real em Windows, ajustar resíduos vermelhos e alinhamento em alguns recortes automáticos, revisar as transições entre poses e mapear um conjunto próprio para a fase Criança. A publicação do código não substitui a validação do executável.
