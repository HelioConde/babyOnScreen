# Baby On Screen 0.0.10 — HUD pronto para o jogador

## Organização do painel Windows

- Os cuidados mais importantes estão em primeiro plano: **Mamadeira, Fralda, Berço**, seguidos por remédio, brinquedo, cartinha e desenho.
- O estado da bebê, as barras de necessidades, crescimento, missões e rotina aparecem depois dos cuidados.
- **Configurações**, incluindo som, nome, exportar/importar, monitor e atualizações, permanecem no final e recolhidas.
- O **cabeçalho e o X para fechar** não fazem mais parte da rolagem: só o conteúdo abaixo rola, sem encobrir botões.
- Expandir as opções não move nem redimensiona o painel.

## Tempos e controles de jogador

- Mamadeira, fralda e berço na versão PC: **12min30s de intervalo** (metade dos 25 minutos anteriores).
- Demais ações e escola também usam intervalos 50% menores no PC.
- Comandos de teste para pausa, aumento de velocidade e recomeçar não estão no HUD.
- Regras da versão Web continuam inalteradas.

## Testes

No Electron Windows empacotado, os testes automatizados confirmaram que o painel mantém sua posição e altura ao abrir opções; o X permaneceu em sua posição durante 635 pixels de rolagem, enquanto a caixinha de cuidados continuou antes das informações. A verificação do instalador, Portable e do mecanismo de atualização permanece obrigatória.

## Distribuição

A publicação está sendo preparada para uma futura página itch.io com download gratuito e contribuição voluntária. **Ainda não existe página/pagamento ativo por esta release.** Os arquivos oficiais estão disponíveis pelo GitHub, nos links permanentes Setup e Portable.

O instalador não possui assinatura digital, de modo que o Microsoft Defender SmartScreen ainda poderá mostrar um aviso.
