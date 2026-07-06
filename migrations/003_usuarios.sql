CREATE TABLE public.usuarios (
    id serial4 NOT NULL,
    colaborador_id int4 NULL,
    email varchar(255) NOT NULL,
    senha_hash varchar(255) NOT NULL,
    "role" varchar(20) DEFAULT 'user'::character varying NULL,
    criado_em timestamp DEFAULT now() NULL,
    CONSTRAINT usuarios_email_key UNIQUE (email),
    CONSTRAINT usuarios_pkey PRIMARY KEY (id)
);


-- public.usuarios chaves estrangeiras

ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES public.colaboradores(id);