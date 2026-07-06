CREATE TABLE public.colaboradores (
    id serial4 NOT NULL,
    nome varchar(255) NOT NULL,
    email varchar(255) NULL,
    criado_em timestamp DEFAULT now() NULL,
    CONSTRAINT colaboradores_email_key UNIQUE (email),
    CONSTRAINT colaboradores_pkey PRIMARY KEY (id)
);