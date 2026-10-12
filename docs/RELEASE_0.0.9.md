# Baby On Screen 0.0.9 — Cuidados primeiro, configurações no final

## Interface Windows mais simples

O HUD foi reorganizado a partir do feedback dos jogadores. Ao abrir, os primeiros controles são os da bebê, principalmente **Mamadeira, Fralda e Berço**, seguidos de Remédio, Brinquedo, Cartinha e Desenho.

Depois dos cuidados são exibidos o período do dia, as necessidades, a evolução, a escola, as memórias, as missões e a rotina.

As opções técnicas não atrapalham mais a área de jogo:
- **⚙️ Configurações**, no final do painel;
- **Preferências e salvamento**, com nome, sons, exportação e importação do progresso;
- **Monitor e aplicativo**, recolhido por padrão, com seletor para trocar de monitor e atalho para atualizações;
- **Atualizações**, com busca manual, download e instalação da nova versão.

O cabeçalho permanece fixo durante a rolagem para que o botão **X** continue acessível até o fim da lista. A caixa mantém altura estável.

## Ritmo dos cuidados

Os tempos reduzidos em 50% na versão 0.0.8 são mantidos somente na edição PC:
- Mamadeira, fralda e berço: **12 minutos e 30 segundos**;
- Brinquedo, cartinha, desenho, remédio e escola também utilizam metade dos intervalos anteriores;
- A versão Web conserva seus intervalos originais.

Os controles de teste de velocidade, pausa e reinício não aparecem no jogo Windows. Todos os progressos salvos permanecem válidos.

## Preparação para itch.io

Os documentos de apresentação e checklist continuam em `docs/ITCH_IO_STORE.md` e `docs/ITCH_IO_CHECKLIST.md`. A loja e o apoio voluntário ainda não foram publicados: é necessário confirmar a autoria/licença comercial dos sprites e demais recursos, e configurar o recebimento.

## Atualização

Quem já usa o **Setup** pode acessar **Atualizações → Verificar agora** e, após baixar, **Reiniciar e atualizar**. A versão Portable requer download manual. Os links permanentes no README continuam válidos.

O workflow valida código, gera Setup/Portable, verifica `latest.yml` e testa o aplicativo Electron antes de publicar. O executável ainda não possui assinatura digital.
