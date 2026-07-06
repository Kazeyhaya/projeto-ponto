CREATE TABLE public.batidas_ponto (
    id serial4 NOT NULL,
    colaborador_id int4 NOT NULL,
    colaborador_nome varchar(255) NOT NULL,
    tipo_batida varchar(20) NOT NULL,
    data_hora timestamp DEFAULT now() NULL,
    localizacao text NULL,
    CONSTRAINT batidas_ponto_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_batidas_colaborador_data ON public.batidas_ponto USING btree (colaborador_id, data_hora);
CREATE INDEX idx_batidas_data ON public.batidas_ponto USING btree (date(data_hora))