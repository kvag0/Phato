# Projeto Phato 📸

[![Status da Build](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge)](https://github.com) 
[![Licença](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](https://opensource.org/licenses/MIT)

O Phato é um aplicativo que busca transformar a maneira como consumimos notícias. Ele agrega conteúdo de múltiplas fontes globais, utiliza inteligência artificial para realizar análises, extrair fatos e identificar diferentes narrativas presentes na cobertura de um mesmo evento.

## ✨ Principais Funcionalidades

* **Agregação de Notícias:** Integração com múltiplas APIs de notícias, como NewsAPI, The Guardian API e The New York Times API, para uma cobertura ampla.
* **Análise com I.A.:** Utiliza o modelo `gemini-1.5-flash` do Google para analisar o conteúdo dos artigos.
* **Extração de Fatos:** Identifica os elementos factuais de uma notícia (Quem, O quê, Quando, Onde, Porquê).
* **Análise de Narrativas:** Mapeia as diferentes perspectivas e ênfases (ex: centro-esquerda, direita) na cobertura de um evento.
* **Navegação por Categorias:** Permite filtrar e explorar o conteúdo por categorias temáticas.

## 🛠️ Tech Stack

| Área        | Tecnologia                                                                                                                                                                                                                                 |
| :---------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** | `Flutter`, `Dart`, `http`, `flutter_dotenv`                                                                                                                                                                                                  |
| **Backend** | `Node.js` (ES Modules), `Express.js`, `MongoDB`, `Mongoose`, `Google Generative AI (Gemini)`, `Axios`, `dotenv`                                                               |

## 📂 Estrutura do Projeto

Este é um monorepo que contém tanto o código do front-end quanto do back-end.

phato/
├── backend/      # API em Node.js e Express (Responsabilidade: Rafael)
├── frontend/     # Aplicativo móvel em Flutter (Responsabilidade: [Seu Nome])
└── README.md     # Este arquivo que você está lendo

## 🚀 Começando

Siga estas instruções para ter o ambiente de desenvolvimento completo rodando na sua máquina.

### Pré-requisitos

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/) (versão especificada no `backend/README.md`)
* [Flutter SDK](https://flutter.dev/docs/get-started/install) (versão especificada no `frontend/README.md`)
* [MongoDB](https://www.mongodb.com/try/download/community) rodando localmente.

### Instalação

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/](https://github.com/)[seu-usuario]/phato.git
    cd phato
    ```

2.  **Configure as Variáveis de Ambiente:**
    * **Para o Back-end:** Navegue até a pasta `backend/`, copie o arquivo `.env.example` para um novo arquivo chamado `.env` e preencha as chaves de API necessárias.
    * **Para o Front-end:** Navegue até `frontend/phato_app/`, copie o `.env.example` para um novo arquivo `.env`. A URL da API já deve estar configurada para o ambiente local.

3.  **Instale as dependências e rode os servidores:**

    * **Terminal 1 (Back-end):**
        ```bash
        cd backend
        npm install
        npm run dev
        ```
        O servidor da API deverá estar rodando em `http://localhost:3000`.

    * **Terminal 2 (Front-end):**
        ```bash
        cd frontend/phato_app
        flutter pub get
        flutter run
        ```
        O aplicativo Flutter será iniciado em seu emulador ou dispositivo conectado.

## 🔄 Fluxo de Trabalho e Colaboração

Para garantir uma colaboração tranquila e um código organizado, seguimos o seguinte fluxo de trabalho. **É crucial que todos sigam estes passos.**

### A Regra de Ouro
**NUNCA envie código diretamente para a branch `main`.** Todo o trabalho deve ser feito em uma branch separada e integrado via Pull Request.

### O Ciclo de Desenvolvimento (Seu dia a dia)

1.  **Sincronize seu repositório local (Passo mais importante!):**
    Antes de começar a trabalhar, **sempre** puxe as últimas alterações da `main`. Isso evita conflitos.
    ```bash
    git checkout main
    git pull origin main
    ```

2.  **Crie uma Nova Branch:**
    Crie uma branch a partir da `main` para a sua nova tarefa. O nome deve ser descritivo.
    ```bash
    # Para novas funcionalidades
    git checkout -b feature/nome-da-feature (ex: feature/frontend-tela-login)

    # Para correções de bugs
    git checkout -b fix/nome-do-bug (ex: fix/backend-erro-paginacao)
    ```

3.  **Trabalhe e Faça Commits:**
    Faça seu trabalho. Salve seu progresso em pequenos commits lógicos usando o padrão de commits abaixo.
    ```bash
    git add .
    git commit -m "feat: adiciona componente de botão principal"
    ```

4.  **Envie sua Branch para o GitHub:**
    ```bash
    git push origin feature/nome-da-feature
    ```

5.  **Abra um Pull Request (PR):**
    No GitHub, abra um Pull Request da sua branch (`feature/nome-da-feature`) para a `main`. Descreva o que você fez e, se for o caso, marque o outro colaborador para revisar.

6.  **Review e Merge:**
    Após o PR ser revisado e aprovado, ele será "mergeado" (unido) à branch `main`. Agora sua contribuição faz parte oficial do projeto!

## ✍️ Padrões de Commit

Usamos "Commits Semânticos" para manter nosso histórico limpo e legível. A estrutura é: `<tipo>: <descrição>`

* `feat`: Uma nova funcionalidade.
* `fix`: Uma correção de bug.
* `chore`: Mudanças de build, configuração, tarefas de manutenção.
* `docs`: Alterações na documentação.
* `style`: Mudanças de formatação e estilo de código (linter).
* `refactor`: Refatoração de código que não altera a funcionalidade.
* `test`: Adição ou correção de testes.

**Exemplo:** `feat: implementa login com e-mail e senha`

## 👥 Equipe

| Papel       | Membro                                       |
| :---------- | :------------------------------------------- |
| **Front-end** | `Caio Sobrinho` ([GitHub de Caio](https://github.com/kvag0))) |
| **Back-end** | `Rafael` ([GitHub de Rafael](https://github.com/rafamontilla))   |
