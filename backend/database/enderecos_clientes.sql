-- =====================================================================
-- Tabela enderecos_clientes
-- Endereços dos clientes para o serviço de leva e traz.
--
-- Um cliente pode ter vários endereços (casa, trabalho...) e no máximo
-- um marcado como principal. As coordenadas ficam em DECIMAL para o
-- cálculo de distância e para abrir o endereço no mapa.
--
-- Depende da tabela `clientes` (id INT). Requer MySQL 8.0.16+ para as
-- regras CHECK serem aplicadas (a Aiven usa MySQL 8).
-- =====================================================================

CREATE TABLE IF NOT EXISTS enderecos_clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    apelido VARCHAR(50) NULL COMMENT 'Ex: Casa, Trabalho',

    cep CHAR(8) NOT NULL COMMENT 'Somente dígitos, sem hífen',
    rua VARCHAR(150) NOT NULL,
    numero VARCHAR(10) NOT NULL COMMENT 'Texto para aceitar "S/N" e "120A"',
    complemento VARCHAR(100) NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    uf CHAR(2) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Sigla em maiúsculas, ex: SP',
    referencia VARCHAR(255) NULL COMMENT 'Ponto de referência para o motorista',

    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,

    principal BOOLEAN NOT NULL DEFAULT FALSE,
    -- Preenchida só quando principal = TRUE; o índice único abaixo
    -- garante no máximo um endereço principal por cliente.
    cliente_principal INT AS (IF(principal, cliente_id, NULL)) VIRTUAL,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_enderecos_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,

    CONSTRAINT chk_enderecos_cep CHECK (cep REGEXP '^[0-9]{8}$'),
    CONSTRAINT chk_enderecos_uf CHECK (uf REGEXP '^[A-Z]{2}$'),
    CONSTRAINT chk_enderecos_latitude CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CONSTRAINT chk_enderecos_longitude CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    -- Latitude e longitude vêm juntas ou não vêm
    CONSTRAINT chk_enderecos_coordenadas CHECK ((latitude IS NULL) = (longitude IS NULL)),

    UNIQUE KEY uq_enderecos_um_principal (cliente_principal),
    INDEX idx_enderecos_cliente (cliente_id),
    INDEX idx_enderecos_cep (cep)
);

-- Exemplo de uso:
-- INSERT INTO enderecos_clientes
--     (cliente_id, apelido, cep, rua, numero, bairro, cidade, uf, latitude, longitude, principal)
-- VALUES
--     (1, 'Casa', '01310100', 'Avenida Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', -23.56518800, -46.65221300, TRUE);
--
-- Endereço principal de um cliente:
-- SELECT * FROM enderecos_clientes WHERE cliente_id = 1 AND principal = TRUE;
