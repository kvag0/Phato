# Projeto Phato 📸

O Phato é um aplicativo que busca transformar a maneira como consumimos notícias. Ele agrega conteúdo de múltiplas fontes globais, utiliza inteligência artificial para realizar análises, extrair fatos e identificar diferentes narrativas presentes na cobertura de um mesmo evento.

## Tech Stack

| Área        | Tecnologia                                                                                                                                                                                                                                 |
| :---------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** | `Flutter`, `Dart`, `http`, `flutter_dotenv`                                                                                                                                                                                                  |
| **Backend** | ...                                                              |

## 📂 Estrutura do Projeto

Este é um monorepo que contém tanto o código do front-end quanto do back-end.

phato/
├── backend/      # API em Node.js e Express (Responsabilidade: Rafael)
├── frontend/     # Aplicativo móvel em Flutter (Responsabilidade: [Seu Nome])
└── README.md     # Este arquivo que você está lendo

## 🚀 Começando

Siga estas instruções para ter o ambiente de desenvolvimento completo rodando na sua máquina.

### Fluxo de Trabalho e Colaboração

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
