Projeto_FlexWash_216 🚗💦
Projeto de Desenvolvimento de Software de Gerenciamento de Lava Rápido.

👥 Integrantes
Leonardo Konishi Brito (Scrum Master)
Rilary Fantine Lima Gomes
Gustavo Melo Pereira
Geovana Souza Corrêa
Alexandre Guilherme dos Santos Nascimento
Henrique Nunes Silva

🎯 Escopo
A proposta do sistema é criar uma plataforma simples e eficiente para o gerenciamento completo da empresa Lava Rápido Flex. O software permitirá o cadastro de clientes, registro de veículos, controle dos tipos de lavagem e gerenciamento das comissões dos funcionários.
A aplicação será utilizada no dia a dia da empresa, auxiliando no atendimento e na administração dos serviços prestados. Com isso, a empresa terá maior organização, agilidade e controle financeiro.

💻 Tecnologias Utilizadas
- Front-end: React, Vite, Tailwind CSS e React Router DOM (Single Page Application).
- Back-end: Node.js, Express.js, CORS e JWT (Autenticação).
- Banco de Dados: MySQL.
- Hospedagem/Deploy: Vercel (Ambiente Serverless com rotas de API).

🗄️ Arquitetura e Banco de Dados
O sistema segue a arquitetura cliente-servidor, separando o Front-end do Back-end com comunicação via API RESTful. O banco de dados relacional no MySQL foi modelado com 13 tabelas estruturadas para abranger:
- Cadastros Base: Usuários, clientes, veículos e portes.
- Operação: Ordens de serviço, itens, serviços, pátio, status do pátio e logística (leva e traz).
- Financeiro: Caixa, pagamentos e logs do sistema.

🚀 Funcionalidades Implementadas (Última Atualização)
- Autenticação Segura: Sistema de login com geração e validação de tokens JWT.
- Rotas Protegidas: Bloqueio de acesso no Front-end ao painel administrativo para usuários não autenticados.
- Dashboard Administrativo: Painel dinâmico exibindo métricas financeiras diárias, faturamento, contagem de portes de veículos e listagem em tempo real do pátio.
- Gestão de Serviços: Funcionalidade para concluir ordens de serviço via API, atualizando o status do veículo e as métricas.
- Integração na Nuvem: API configurada com CORS tolerante e preflight requests (OPTIONS) para comunicação contínua e sem bloqueios na Vercel.
