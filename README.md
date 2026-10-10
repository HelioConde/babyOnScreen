# 👶 Baby On Screen

## 🌐 Versão web — jogue sem instalar

**[👶 Experimentar Baby On Screen no GitHub Pages](https://helioconde.github.io/babyOnScreen/)**

A versão web gratuita usa o mesmo motor de necessidades da versão Windows e os sprites originais do projeto. Funciona em navegadores modernos, no computador e no celular.

**Como experimentar:** abra o link, arraste o bebê dentro da tela simulada e clique em Alimentar, Dormir, Trocar fralda ou Cuidar. O progresso, a velocidade, a pausa e a preferência de som ficam guardados localmente no navegador (localStorage). Para recomeçar, abra Preferências e clique em Recomeçar o progresso.

**Diferença importante:** navegadores não podem criar um personagem que ande livremente sobre as outras janelas do sistema operacional. Essa função existe somente na versão Electron para Windows; na web o bebê permanece dentro do playground ilustrado.

**Arquivos web:** \`web/index.html\`, \`web/style.css\`, \`web/app.js\`, além de \`engine.js\` e dos diretórios de sprites e áudio já usados pela versão Windows. A raiz \`index.html\` redireciona ao jogo. A branch \`gh-pages\` é a fonte de publicação; o GitHub Pages publica da pasta \`/(root)\` dessa branch.

Para atualizar o site, sincronize a branch \`gh-pages\` com as alterações testadas na branch de desenvolvimento; não altere a \`master\` histórica para publicar o site. O workflow \`web-validation.yml\` verifica o código web sempre que há commits.


Bebê virtual que passeia pela área de trabalho do **Windows**. Um relançamento do protótipo de julho de 2020, com sprites e sons originais preservados.

**Status: beta 1.0.0-beta.1.** A lógica possui testes automatizados; a transparência, a interação com o Windows e os executáveis ainda necessitam de validação visual antes do lançamento estável.

## Recursos

- Pixel art original, movimentos aleatórios e bebê arrastável.
- Cliques atravessam as partes vazias da janela; o bebê e o painel são interativos.
- Painel de cuidados em português: alimentação, energia, higiene e saúde.
- Ações: alimentar, dormir, trocar fralda e dar remédio.
- XP, níveis, áudio opcional, pausa e velocidade ajustável.
- Progresso salvo no computador e bandeja do Windows com mostrar, ocultar e sair.
- Instalador NSIS e executável portátil gerados no GitHub Actions.

## Instalação e desenvolvimento

Requer Windows 10/11, Node.js 22+ e npm.

1. Clone o repositório: git clone https://github.com/HelioConde/babyOnScreen.git
2. Entre na pasta babyOnScreen.
3. Durante o desenvolvimento da beta, use a branch feat/revival-windows-2026.
4. Execute npm install e npm start.
5. Teste: npm run check e npm test.
6. Gere os executáveis Windows: npm run build:win (saída na pasta dist).

No painel, clique em um cuidado para satisfazer a necessidade do bebê. Clique no próprio bebê para abrir o painel ou arraste-o pela tela. A opção Ocultar permite restaurar o app pela bandeja do sistema. Recomeçar solicita confirmação antes de apagar progresso.

## Organização

- app/main.cjs: janela transparente, bandeja e detecção de regiões clicáveis.
- app/preload.cjs: ponte IPC com APIs restritas.
- app/index.html, app/style.css, app/renderer.js: interface.
- engine.js: regras do jogo independentes do Electron.
- tests/: testes unitários do motor.
- sprits/ e som/: recursos originais de 2020.

Os scripts históricos demo.js, demo.css e electron-transparency-mouse-fix não são mais carregados pela versão nova.

Segurança: integração Node desativada no renderizador, isolamento de contexto e sandbox ativados, política de conteúdo restritiva, canais IPC explícitos. Nenhum dado do jogo é transmitido a servidores e **não há atualização automática** habilitada.

## Checklist de lançamento

- [ ] Validar janela realmente transparente no Windows 10 e Windows 11.
- [ ] Confirmar clique-through sem bloquear outros programas.
- [ ] Arrastar o bebê, testar 4 cuidados e reiniciar para validar salvamento.
- [ ] Conferir bandeja, ocultar/mostrar, som, velocidade e pausa.
- [ ] Testar múltiplos monitores e escalas 125% / 150%.
- [ ] Instalar e executar ambos os formatos de .exe.
- [ ] Avaliar assinatura digital (executáveis não assinados podem acionar SmartScreen).

## Histórico

A versão 0.0.1 de 2020 pode ser consultada em https://github.com/HelioConde/babyOnScreen/releases. Crescimento do bebê, brinquedos e animais de estimação são ideias futuras, não funcionalidades atuais.

Criado por Hélio Conde.
