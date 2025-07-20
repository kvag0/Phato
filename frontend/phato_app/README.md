# Phato - Aplicativo Front-end (Flutter)

Este diretório contém o código-fonte do aplicativo móvel do Phato, desenvolvido com o framework Flutter.

## 🚀 Visão Geral

O aplicativo é a interface principal para os utilizadores interagirem com o ecossistema Phato. Ele é responsável por:

* Apresentar os artigos de notícias de forma clara e intuitiva.
* Permitir que os utilizadores explorem as análises de factos e narrativas geradas pela I.A.
* Gerir a autenticação e os perfis dos utilizadores.
* Comunicar-se de forma segura com a API do back-end para obter e enviar dados.

## 🛠️ Tech Stack e Dependências Principais

* **Framework:** Flutter
* **Linguagem:** Dart
* **Gestão de Estado:** (A definir - ex: Provider, BLoC, Riverpod)
* **Comunicação HTTP:** `http`
* **Gestão de Variáveis de Ambiente:** `flutter_dotenv`
* **Linter (Padrão de Código):** `lint`

## ⚙️ Configuração do Ambiente de Desenvolvimento

### Pré-requisitos

* Garanta que tem o **Flutter SDK** instalado. Para este projeto, estamos a usar a versão:
    * **Flutter:** `3.x.x` (ou a versão que estiver a usar)
    * **Dart:** `3.x.x`

### Instalação

1.  **Navegue até esta pasta** (`frontend/phato_app/`).

2.  **Crie o seu ficheiro de ambiente:**
    * Copie o ficheiro `.env.example` para um novo ficheiro chamado `.env`.
        ```bash
        cp .env.example .env
        ```
    * Este ficheiro já está pré-configurado para se conectar à API local do back-end.

3.  **Instale as dependências do projeto:**
    ```bash
    flutter pub get
    ```

4.  **Execute o aplicativo:**
    * Certifique-se de que tem um emulador a correr ou um dispositivo físico conectado.
    * Execute o seguinte comando no terminal:
        ```bash
        flutter run
        ```

## 📂 Estrutura de Pastas (Arquitetura)

O projeto segue uma arquitetura limpa para separar as responsabilidades. A estrutura principal dentro da pasta `lib/` é:

lib/
├── api/              # Lógica de comunicação com a API (ex: ApiService)
├── models/           # Modelos de dados (ex: Article, User)
├── views/ ou pages/  # As telas/páginas da aplicação (a UI)
├── widgets/          # Widgets reutilizáveis (botões, cards, etc.)
├── utils/            # Funções utilitárias, constantes, etc.
└── main.dart         # Ponto de entrada da aplicação


## ✅ Padrões de Código

* **Formatação:** Antes de fazer um `commit`, execute sempre `flutter format .` para garantir a consistência do código.
* **Linter:** O ficheiro `analysis_options.yaml` contém as nossas regras de código. A sua IDE (VS Code/Android Studio) irá sublinhar automaticamente quaisquer violações a estas regras.
