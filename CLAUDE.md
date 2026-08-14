# Brik

## Visão geral

Monitoramento de ofertas de marketplaces do mercado de usados

## Regras de desenvolvimento

- Não alterar APIs existentes sem verificar os usos atuais.
- Reutilizar componentes e funções existentes antes de criar novos.
- Manter o código simples e consistente com o projeto.
- Não adicionar dependências sem necessidade.

## Banco de dados

Para qualquer tarefa relacionada ao PostgreSQL/Supabase:

- Consultar a skill `supabase-postgres-best-practices` antes de fazer alterações.
- Aplicar as recomendações da skill para schema, migrations, índices, RLS, queries e performance.
- Nunca modificar o banco diretamente sem considerar as migrations existentes.
- Sempre verificar possíveis impactos em RLS e relacionamentos.

## Segurança

- Nunca colocar secrets diretamente no código.
- Nunca commitar `.env`.
- Não expor chaves privadas no frontend.
- Validar permissões e RLS antes de criar endpoints que acessam dados.

## Git

- Não fazer commits sem solicitação explícita.
- Não alterar ou remover trabalho existente sem verificar primeiro.
- Manter commits pequenos e relacionados a uma única mudança.

## Antes de finalizar

- Verificar se o código compila.
- Executar os testes relevantes.
- Verificar erros de lint, quando aplicável.
- Resumir as alterações realizadas.