# Integração dos sprites — Baby On Screen

A versão Windows carrega os módulos de sprites, mas mantém o desenho original como fallback até existir um manifesto válido.

## Arquivos
- `app/sprite-runtime.js`: animação por quadros
- `app/sprite-controller.js`: carregamento e desenho em canvas
- `app/sprite-integration.js`: seleção e fallback
- `app/sprite-manifest.js`: cadastro explícito dos quadros
- `app/renderer.js`: sincroniza idade, direção e ação

## Mapeamento
`stage`: `newborn`, `baby`, `toddler`, `child`.
`action`: `idle`, `walk`, `feed`, `sleep`.
`direction`: `up`, `down`, `left`, `right`.

Exemplo a adicionar a `window.BabySpriteManifest` **somente após conferir as dimensões e o arquivo real**:

```js
window.BabySpriteManifest = {
  newborn: {
    idle: {
      down: {
        category: 'crescimento',
        filename: 'element_001.png',
        frames: [{ x: 0, y: 0, w: 48, h: 48, pivotX: 24, pivotY: 48 }],
        fps: 4,
        loop: true
      }
    }
  }
};
```

O exemplo acima é ilustrativo: não representa um arquivo ou recorte já validado.

## Checklist de validação
1. Enviar PNGs para `assets/sprites/generated/<categoria>/`.
2. Conferir transparência, dimensões, pivô e limites dos quadros.
3. Preencher `sprite-manifest.js` com os valores reais.
4. Abrir a versão Electron e confirmar que os sprites aparecem.
5. Testar arrastar o bebê, clicar, alimentar, dormir, pausar, redimensionar e alternar fases.
6. Se uma imagem não carregar, confirmar que o visual CSS continua aparecendo.

Não há confirmação de teste visual ou de empacotamento Windows nesta etapa.
