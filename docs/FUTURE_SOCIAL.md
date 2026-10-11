# Baby On Screen — arquitetura futura de rotina e convívio

**Planejamento, não implementado:** não há Socket aberto, contas, chat nem coleta de dados de outros jogadores na versão 0.0.5.

## Agenda e horário
O motor compartilhado disponibiliza `dayPeriods` e `timePeriod(timestamp)`, com horários locais:
- Madrugada 00–06: dormir, sonhos e cuidados.
- Manhã 06–12: café, escola conforme idade, encontros.
- Tarde 12–18: brincadeiras, visitar amigos, passeios.
- Noite 18–24: retornar à casa, banho, atividades calmas.

Para multiplayer, o servidor deve ser a autoridade do horário da sala: `serverTime` e `timezone` próprios da sala, nunca confiar no relógio ou idade anunciados pelo cliente. A decisão de atividade deve continuar no servidor e ser replicada para os clientes.

## Escopo por fases
1. **Atual:** rotina e cuidados locais, quatro períodos, progresso offline.
2. **Criança:** cenário de escola, NPCs e horários de chegada/saída, missões em sala.
3. **Amigos:** convites explícitos entre contas, sala privada criada pelo servidor e presença de personagens.
4. **Visitas:** entrar em casa apenas com aprovação do anfitrião, permissões temporárias e opção de expulsar/bloquear.
5. **Passeios:** espaços instanciados, convites, sincronização de movimentos e recompensas calculadas no servidor.

## Segurança e privacidade
- Autenticação em cada conexão WebSocket com token de sessão curto; rejeitar IDs/idade declarados pelo cliente.
- Salas privadas por padrão; somente contatos aprovados podem entrar. Limitar tamanho da sala.
- Sem bate-papo livre ou compartilhamento de informações pessoais por padrão, especialmente para usuários menores; preferir frases predefinidas e gestos.
- Ferramentas de bloquear, denunciar, controles etários e moderação antes de qualquer lançamento público social.
- Não sincronizar automaticamente saves locais completos nem disponibilizar nomes reais, localização ou outros dados privados.
- Limites de frequência, validação de mensagens e logs mínimos, com política de retenção e exclusão.

## Compatibilidade
A versão Web e a versão Windows usam a mesma lógica. Guardar IDs estáveis para cada fase, evento, período e atividade; a camada de rede apenas transportará eventos autorizados. Não exigir conexão para manter o jogo individual funcional.
