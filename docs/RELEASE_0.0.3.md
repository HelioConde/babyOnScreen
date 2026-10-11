# Baby On Screen 0.0.3 — Atualização automática no PC

A partir desta versão, o jogo instalado pelo **Setup** pode verificar e baixar novas versões oficiais do GitHub em segundo plano.

## Como funciona

- Ao abrir, verifica novas versões após aproximadamente 15 segundos e a cada quatro horas enquanto estiver ativo.
- Quando houver uma release nova, baixa o pacote automaticamente e mostra o progresso em **Atualizações**.
- Após o download, mostra o botão **Reiniciar e atualizar**; o progresso é salvo antes da reinicialização.
- No ícone da bandeja do Windows, há a opção **Verificar atualizações**.
- A **Portable** avisa sobre versões novas e oferece o download manual, sem executar instalações inesperadas.

## Para quem tem a versão 0.0.2

A versão anterior não possuía atualizador. Instale a **0.0.3 manualmente uma vez** para habilitar as próximas atualizações automáticas.

## Publicação das próximas versões

Uma nova versão estável enviada ao `package.json` na branch `master` dispara a compilação, a validação dos executáveis e a publicação da nova release com os arquivos `latest.yml` e Setup/Portable.

## Segurança e limitações

Atualizações são obtidas somente da release oficial, com integridade SHA-512 verificada pelo `electron-updater`. Os executáveis ainda não são assinados digitalmente; assinatura Authenticode é recomendada antes da distribuição em larga escala. O aplicativo permanece offline para as funções de jogo; a atualização requer conexão com a internet.
