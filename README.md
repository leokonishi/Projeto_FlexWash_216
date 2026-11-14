# Projeto_FlexWash_216 🚗💦

Projeto de Desenvolvimento de Software de Gerenciamento de Lava Rápido.

## 👥 Integrantes
* **Leonardo Konishi Brito**
* **Rilary Fantine Lima Gomes**
* **Gustavo Melo Pereira**
* **Geovana Souza Corrêa**
* **Alexandre Guilherme dos Santos Nascimento**
* **Henrique Nunes Silva**

---

## 🎯 Escopo

A proposta do sistema é criar uma plataforma simples e eficiente para o gerenciamento completo da empresa Lava Rápido Flex. O software permitirá o cadastro de clientes, registro de veículos, controle dos tipos de lavagem, gestão de comissões dos funcionários e suporte a serviços de entrega e recolha (Leva e Trás).

A aplicação será utilizada no dia a dia da empresa, auxiliando no atendimento e na administração dos serviços prestados. Com isso, a empresa terá maior organização, agilidade, autonomia para os clientes e controlo financeiro centralizado.

---

## 💻 Tecnologias Utilizadas

- **Front-end**: React, Vite, Tailwind CSS, Lucide React e React Router DOM (Single Page Application).
- **Back-end**: Node.js, Express.js, CORS e JWT (Autenticação baseada em tokens).
- **Banco de Dados**: MySQL.
- **Hospedagem/Deploy**: Vercel (Ambiente Serverless com rotas de API) e Render.

---

## 🗄️ Arquitetura e Estrutura do Projeto

O projeto utiliza React + Vite no frontend com estilização em Tailwind CSS e CSS modularizado por página, além de integração com API para persistência de dados e deploy configurado para a Vercel. O banco de dados relacional em MySQL foi modelado para abranger cadastros base, operações e o financeiro.

```text
Projeto_FlexWash_216/
├── public/                  # Ficheiros estáticos (favicon, ícones SVG)
├── src/
│   ├── assets/              # Imagens e recursos visuais
│   ├── backend/             # Lógica de servidor, rotas e regras de negócio
│   ├── config/
│   │   └── api.js           # Configuração de conexão e endpoints da API[span_0](start_span)[span_0](end_span)
│   ├── paginas/
│   │   ├── gestao/          # Subpáginas e módulos administrativos[span_1](start_span)[span_1](end_span)
│   │   ├── cadastro_cliente.jsx[span_2](start_span)[span_2](end_span)
│   │   ├── Login.jsx[span_3](start_span)[span_3](end_span)
│   │   ├── pagina_admin.jsx[span_4](start_span)[span_4](end_span)
│   │   ├── pagina_cliente.jsx[span_5](start_span)[span_5](end_span)
│   │   └── PaginaCliente.jsx[span_6](start_span)[span_6](end_span)
│   ├── paginas_css/         # Folhas de estilo específicas por ecrã
│   ├── App.jsx              # Componente principal e configuração de rotas
│   ├── main.jsx             # Ponto de entrada da aplicação React
│   └── rotas_protegidas.jsx # Controlo de autenticação e proteção de rotas
├── index.html               # Estrutura HTML base[span_7](start_span)[span_7](end_span)
├── package.json             # Dependências e scripts do projeto[span_8](start_span)[span_8](end_span)
├── tailwind.config.js       # Configuração do Tailwind CSS[span_9](start_span)[span_9](end_span)
├── vercel.json              # Configuração de rotas e deploy na Vercel[span_10](start_span)[span_10](end_span)
├── vite.config.js           # Configuração do bundler Vite[span_11](start_span)[span_11](end_span)
└── README.md                # Documentação técnica do projeto[span_12](start_span)[span_12](end_span)
