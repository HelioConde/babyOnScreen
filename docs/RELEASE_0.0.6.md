# Baby On Screen 0.0.6 — Monitor 2, seu nome e atualizações fáceis

## Melhorias no Windows

- **Mover a bebê de verdade para o outro monitor:** o jogo não depende mais de uma janela transparente atravessando vários monitores. Ao selecionar Monitor 2, o aplicativo pede ao Windows para mudar a posição da janela nativa e confirma onde ela está.
- **Pelo ícone ao lado do relógio:** opção **Mover para monitor**, útil para recuperar a personagem se a interface estiver fora da tela.
- O monitor escolhido fica registrado localmente e é tentado novamente ao iniciar. Se o monitor foi desconectado, o jogo utiliza uma tela disponível.
- Se a escolha de Monitor 1/2 não aparecer, confira em Configurações de Tela do Windows se os monitores estão no modo **Estender**.
- A experiência de arrasto entre telas pode depender de escala/DPI; o seletor e a bandeja são as formas recomendadas de mover a janela.

## Nome da bebê no tutorial

No primeiro passo da apresentação aparece **Como vai se chamar sua bebê?**. O nome opcional (máximo 20 caracteres) é salvo automaticamente no progresso atual, continua editável em Preferências e salvamento, e também pode ser alterado ao reabrir **? Como jogar**.

## Atualizações da versão Setup

O sistema de atualização já instalado desde 0.0.3 continua verificando releases do GitHub. Um novo atalho visível no painel facilita o acesso. A atualização deve baixar em segundo plano e ser instalada pelo botão **Reiniciar e atualizar**, sem procurar o novo instalador a cada versão.

A versão Portable continua avisando sobre novidades, mas requer baixar o novo executável. Não há atualização de contas ou nuvem, e os dados de progresso locais continuam preservados.

## Testes e segurança

A interface Electron, o motor de jogo e o empacotamento Windows devem passar nos testes antes da publicação. O CI normal não tem dois monitores físicos com escalas diferentes; é recomendado confirmar no seu equipamento a troca e a persistência da tela escolhida. O instalador ainda é **não assinado**, podendo exibir SmartScreen.

[Versão mais recente](https://github.com/HelioConde/babyOnScreen/releases/latest) · [Código fonte](https://github.com/HelioConde/babyOnScreen)
