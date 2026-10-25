<div align="center">

<h1>👶 Baby On Screen</h1>

<strong>Um bebê virtual que acompanha a sua rotina na tela</strong>

<p>Alimente, cuide, personalize e acompanhe o desenvolvimento da personagem em uma experiência leve para Windows e navegador.</p>

<a href="https://github.com/HelioConde/babyOnScreen/releases/latest"><img alt="Downloads para Windows" src="https://img.shields.io/badge/Windows-Setup%20%2B%20Portable-2563eb?style=for-the-badge"></a>
<a href="https://helioconde.github.io/babyOnScreen/"><img alt="Versão web" src="https://img.shields.io/badge/Vers%C3%A3o-Web-16a34a?style=for-the-badge"></a>

<p><a href="https://github.com/HelioConde/babyOnScreen/releases/latest"><strong>Baixar para Windows</strong></a> · <a href="https://helioconde.github.io/babyOnScreen/"><strong>Jogar no navegador</strong></a> · <a href="CHANGELOG.md"><strong>Novidades e versões</strong></a></p>

</div>

---

## O que é Baby On Screen?

Um experimento de mascote virtual que transforma pequenos cuidados em uma rotina. A personagem fica com fome, sono e outras necessidades; você cuida dela, acompanha seu progresso e desbloqueia atividades ao longo do tempo.

A versão **Windows**, feita com Electron, utiliza uma janela integrada à área de trabalho. A versão **Web** pode ser aberta no navegador, sem instalador. **As duas edições não têm exatamente os mesmos temporizadores e recursos.**

## Escolha como jogar

| Edição | Como começar | Observações |
| --- | --- | --- |
| **Windows — instalador** | [Download da versão estável](https://github.com/HelioConde/babyOnScreen/releases/latest/download/Baby-On-Screen-Setup-x64.exe) | Instalação e atualização do aplicativo |
| **Windows — portátil** | [Download Portable](https://github.com/HelioConde/babyOnScreen/releases/latest/download/Baby-On-Screen-Portable-x64.exe) | Executa sem instalação tradicional |
| **Navegador** | [Abrir Baby On Screen Web](https://helioconde.github.io/babyOnScreen/) | Progresso local do navegador |

**Se o download direto estiver indisponível**, abra [Releases](https://github.com/HelioConde/babyOnScreen/releases/latest) para conferir os arquivos da versão publicada.

## Principais recursos

- **Cuidados e rotina:** mamadeira, descanso, fralda, brincadeiras e outras interações.
- **Evolução:** necessidades, missões, etapas e atividades adicionais ao longo da experiência.
- **Personalização:** nome definitivo da personagem na edição Windows, preferências e recursos visuais.
- **Experiência desktop:** janela própria, opções de posição/monitor e verificação de atualização.
- **Progresso:** persistência local com mecanismos de exportação/transferência descritos no projeto.

### Versão estável 0.0.12

A versão Windows **0.0.12** (identificada no `package.json`) ajusta os tempos dos cuidados para 30% dos intervalos originais: ações como mamadeira, fralda e berço passam a **7min30s**. A versão Web mantém suas regras próprias, incluindo intervalos diferentes.

Leia as [notas da 0.0.12](docs/RELEASE_0.0.12.md) ou o [histórico completo](CHANGELOG.md). Betas e funcionalidades experimentais podem seguir outro ritmo de publicação; consulte a página Releases antes de instalar.

## Desenvolvimento local (Windows)

O aplicativo usa JavaScript, Electron e recursos de interface web.

```bash
git clone https://github.com/HelioConde/babyOnScreen.git
cd babyOnScreen
npm install
npm start
```

Para verificar ou gerar instaladores:

```bash
npm run check
npm test
npm run build:win
```

O build Windows depende do ambiente e das ferramentas nativas necessárias ao Electron Builder. Os comandos acima são os scripts declarados em `package.json`; seus resultados devem ser verificados no ambiente usado.

### Estrutura resumida

```text
app/          Aplicativo Electron e interface desktop
web/          Experiência e recursos da edição web
assets/       Artes e recursos do personagem
sprits/       Sprites preservados do projeto
som/          Efeitos sonoros
tests/        Verificações automatizadas
docs/         Notas de versões e documentação
CHANGELOG.md  Histórico de lançamentos
```

## Salvamento e atualização

O progresso não é uma conta na nuvem: **o armazenamento é local** e difere entre Web e Windows. Faça backup antes de limpar os dados do navegador, desinstalar o aplicativo ou importar outro salvamento.

Para quem usa Windows, o instalador e o sistema de atualização acompanham as versões estáveis publicadas. O fluxo de transferência de progresso possui particularidades; consulte a [documentação histórica preservada](docs/README_HISTORY_2026-10-25.md) quando precisar de instruções detalhadas.

## Situação do projeto

Baby On Screen tem **versões distribuídas para Windows e Web** e continua recebendo melhorias. Novos recursos, artes e versões beta não devem ser confundidos com a funcionalidade da versão estável instalada.

[**Ver changelog**](CHANGELOG.md) · [**Notas de releases**](docs/RELEASE_0.0.12.md) · [**Documentação anterior**](docs/README_HISTORY_2026-10-25.md)

---

<div align="center"><strong>Desenvolvido por <a href="https://github.com/HelioConde">Hélio Conde</a></strong></div>
