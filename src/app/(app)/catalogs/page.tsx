import { EmptyState } from "@/ui/feedback/EmptyState";
import { FormField } from "@/ui/forms/FormField";

export default function CatalogsPage() {
  return (
    <div className="flex flex-col gap-10">
      <EmptyState
        title="Cadastros ainda vazios"
        message="Áreas e domínios serão gerenciados aqui. Usuários autorizados aparecerão como opções de responsáveis e participantes na entrega seguinte."
      />
      <section
        aria-labelledby="catalog-form-pattern-title"
        className="max-w-md rounded-lg border border-dashed border-zinc-300 bg-white p-4"
      >
        <h2 id="catalog-form-pattern-title" className="text-sm font-semibold text-zinc-900">
          Padrão de validação de formulário
        </h2>
        <p className="mt-1 text-sm leading-5 text-zinc-600">
          Erros de campo aparecem logo abaixo do controle, com mensagem acessível.
        </p>
        <form className="mt-4 flex flex-col gap-4" noValidate aria-label="Exemplo de validação">
          <FormField
            id="area-nome"
            label="Nome da área"
            required
            error="Informe um nome com pelo menos 2 caracteres."
            description="Exemplo ilustrativo — o cadastro real entra na próxima entrega."
          >
            <input
              id="area-nome"
              name="area-nome"
              type="text"
              defaultValue="A"
              aria-invalid="true"
              aria-describedby="area-nome-error"
              disabled
              className="w-full rounded-md border border-red-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed"
            />
          </FormField>
        </form>
      </section>
    </div>
  );
}
