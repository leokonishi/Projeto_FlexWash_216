#  FlexWash — Sistema de Gerenciamento de Lava-Rápido 

O **FlexWash** é uma aplicação web desenvolvida para automatizar e centralizar a operação de lava-rápidos e centros de estética automotiva. O sistema conta com controlo de acessos por perfil (Administrador, Funcionário e Cliente), gestão de cadastros, agendamentos/ordens de serviço e acompanhamento operacional.

---

##  Arquitetura e Estrutura do Projeto

O projeto utiliza **React + Vite** no frontend com estilização em **Tailwind CSS** e CSS modularizado por página, além de integração com API para persistência de dados e deploy configurado para a **Vercel**.

```text
Projeto_FlexWash_216/
├── public/                  # Ficheiros estáticos (favicon, ícones SVG)
├── src/
│   ├── assets/              # Imagens e recursos visuais
│   ├── backend/             # Lógica de servidor, rotas e regras de negócio
│   ├── config/
│   │   └── api.js           # Configuração de conexão e endpoints da API[cite: 1]
│   ├── paginas/
│   │   ├── gestao/          # Subpáginas e módulos administrativos[cite: 1]
│   │   ├── cadastro_cliente.jsx[cite: 1]
│   │   ├── Login.jsx[cite: 1]
│   │   ├── pagina_admin.jsx[cite: 1]
│   │   ├── pagina_cliente.jsx[cite: 1]
│   │   └── PaginaCliente.jsx[cite: 1]
│   ├── paginas_css/         # Folhas de estilo específicas por ecrã
│   ├── App.jsx              # Componente principal e configuração de rotas
│   ├── main.jsx             # Ponto de entrada da aplicação React
│   └── rotas_protegidas.jsx # Controlo de autenticação e proteção de rotas
├── index.html               # Estrutura HTML base[cite: 2]
├── package.json             # Dependências e scripts do projeto[cite: 2]
├── tailwind.config.js       # Configuração do Tailwind CSS[cite: 2]
├── vercel.json              # Configuração de rotas e deploy na Vercel[cite: 2]
├── vite.config.js           # Configuração do bundler Vite[cite: 2]
└── README.md                # Documentação técnica do projeto[cite: 2]
